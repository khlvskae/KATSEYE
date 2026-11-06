import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase, signupClient, setRememberMe, friendlyError, SET_PASSWORD_URL, LINK, SUPABASE_READY } from '../lib/supabase';
import { randomPassword } from '../lib/format';

const AuthContext = createContext(null);

// Turns an app_user row + permission rows into the signed-in user object.
export function mapUser(u, permRows = []) {
  const perms = {};
  permRows.filter(p => p.user_id === u.id).forEach(p => { perms[p.right_code] = true; });
  return {
    id: u.id, email: u.email, role: u.role, status: u.status, perms,
    firstName: u.first_name || '', lastName: u.last_name || '',
    name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
  };
}

export function AuthProvider({ children }) {
  // status: loading | signedOut | signedIn | setPassword
  const [status, setStatus] = useState(SUPABASE_READY ? 'loading' : 'signedOut');
  const [user, setUser] = useState(null);
  const [notice, setNotice] = useState('');           // message for the login page
  const [linkEmail, setLinkEmail] = useState('');     // email on an invite / reset link
  const userRef = useRef(null);
  userRef.current = user;

  // Loads the person's Hope, Inc. account. Returns a reason when they cannot enter.
  const enterApp = useCallback(async authUser => {
    const { data: p, error } = await supabase.from('app_user').select('*').eq('id', authUser.id).maybeSingle();
    if (error) throw error;
    let reason = null;
    if (!p || p.is_deleted) reason = 'No Hope, Inc. account is linked to this login. Ask a superadmin to check it.';
    else if (p.status === 'pending') reason = 'Your account is waiting for approval by an administrator.';
    else if (p.status === 'blocked') reason = 'This account is blocked. Contact an administrator.';
    else if (p.status === 'disapproved') reason = 'This registration was not approved.';
    if (reason) {
      await supabase.auth.signOut();
      setUser(null); setStatus('signedOut');
      return reason;
    }
    const { data: perms, error: e2 } = await supabase.from('user_permission')
      .select('user_id,right_code').eq('user_id', p.id).eq('is_deleted', false);
    if (e2) throw e2;
    setUser(mapUser(p, perms));
    setStatus('signedIn');
    return null;
  }, []);

  // Start-up: finish an emailed link, or restore a saved session
  useEffect(() => {
    if (!SUPABASE_READY) return undefined;
    let cancelled = false;
    (async () => {
      if (LINK.error) {
        setNotice(/expired|invalid/i.test(`${LINK.errorCode} ${LINK.error}`)
          ? 'That link has expired or was already used. Request a new one with Forgot password.'
          : `That link did not work: ${LINK.error}`);
        setStatus('signedOut');
        return;
      }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session) { setStatus('signedOut'); return; }
        if (LINK.type === 'recovery' || LINK.type === 'invite') {
          setLinkEmail(session.user.email); setStatus('setPassword'); return;
        }
        const reason = await enterApp(session.user);
        if (reason) setNotice(reason);
      } catch (err) {
        setNotice('Could not restore your session: ' + friendlyError(err));
        setStatus('signedOut');
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) { setLinkEmail(session.user.email); setStatus('setPassword'); }
      if (event === 'SIGNED_OUT' && userRef.current) {
        setUser(null); setStatus('signedOut');
        setNotice('Your session has ended. Sign in again.');
      }
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [enterApp]);

  const signIn = useCallback(async (email, password, remember) => {
    setRememberMe(remember);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return friendlyError(error);
    try { return await enterApp(data.user); }
    catch (err) { return 'Signed in, but the account could not be loaded: ' + friendlyError(err); }
  }, [enterApp]);

  const signOut = useCallback(async () => {
    setStatus('signedOut');
    setUser(null);
    try { await supabase.auth.signOut(); } catch { /* already signed out */ }
  }, []);

  // Creates a pending account. The user sets a password from the emailed link after approval.
  const register = useCallback(async ({ firstName, lastName, email }) => {
    const { data, error } = await signupClient.auth.signUp({
      email, password: randomPassword(), options: { data: { first_name: firstName, last_name: lastName } },
    });
    if (error) return { error: friendlyError(error) };
    if (!data.user || (Array.isArray(data.user.identities) && data.user.identities.length === 0)) {
      return { error: 'An account with this email already exists. Sign in, or use Forgot password.' };
    }
    await signupClient.auth.signOut();
    return { id: data.user.id };
  }, []);

  const sendPasswordLink = useCallback(async email => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: SET_PASSWORD_URL });
    return error ? friendlyError(error) : null;
  }, []);

  const setPassword = useCallback(async password => {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) {
      return /session/i.test(error.message)
        ? 'This link has expired or was already used. Use Forgot password to get a new one.'
        : friendlyError(error);
    }
    window.history.replaceState(null, '', window.location.pathname);
    const reason = await enterApp(data.user);
    if (reason) { setNotice('Password saved. ' + reason); return null; }
    return null;
  }, [enterApp]);

  const can = useCallback(perm => {
    if (!user) return false;
    if (user.role === 'superadmin' || user.role === 'admin') return true;
    return !!user.perms[perm];
  }, [user]);

  const value = {
    status, user, notice, setNotice, linkEmail,
    signIn, signOut, register, sendPasswordLink, setPassword, can,
    isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
    isSuper: user?.role === 'superadmin',
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
