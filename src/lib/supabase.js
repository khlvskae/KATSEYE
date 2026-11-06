import { createClient } from '@supabase/supabase-js';

// Your project values come from the .env file (see .env.example).
const url = import.meta.env.VITE_SUPABASE_URL || '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Read what an emailed link put in the address bar, before Supabase clears it.
const hash = new URLSearchParams(window.location.hash.slice(1));
const query = new URLSearchParams(window.location.search);
export const LINK = {
  type: hash.get('type'), // recovery | invite | signup
  error: hash.get('error_description') || query.get('error_description'),
  errorCode: hash.get('error_code') || query.get('error_code'),
};

export const SUPABASE_READY = Boolean(url && anonKey && !url.includes('YOUR-PROJECT') && !anonKey.includes('YOUR-ANON'));

// "Remember me": keep the session after the browser closes, or only for this tab.
const authStorage = {
  pick() {
    try { return localStorage.getItem('hope_remember') === '0' ? sessionStorage : localStorage; } catch { return null; }
  },
  getItem(k) { try { return this.pick()?.getItem(k) ?? null; } catch { return null; } },
  setItem(k, v) { try { this.pick()?.setItem(k, v); } catch { /* storage blocked */ } },
  removeItem(k) { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch { /* storage blocked */ } },
};

// Main client: signed-in session, used for all data.
// flowType 'implicit' lets an emailed link work in any browser (not only the one that asked for it).
export const supabase = SUPABASE_READY
  ? createClient(url, anonKey, {
      auth: { flowType: 'implicit', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: authStorage },
    })
  : null;

// Second client with no saved session. Used to create accounts (Register, Add User)
// without signing the current user out.
export const signupClient = SUPABASE_READY
  ? createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'hope-signup' },
    })
  : null;

export function setRememberMe(on) {
  try { localStorage.setItem('hope_remember', on ? '1' : '0'); } catch { /* storage blocked */ }
}

// Where emailed links (approval, reset) send people back to.
export const SET_PASSWORD_URL = `${window.location.origin}/set-password`;

// Turns database and auth errors into sentences people can act on.
export function friendlyError(err) {
  const m = (err && (err.message || err.error_description)) || String(err || '');
  if (/Invalid login credentials/i.test(m)) return 'The email or password is incorrect.';
  if (/Email not confirmed/i.test(m)) return 'This email has not been confirmed yet.';
  if (/rate limit|too many/i.test(m)) return 'Too many emails were sent recently. Wait a few minutes and try again.';
  if (/violates row-level security/i.test(m)) return 'You do not have the right to make this change.';
  if (/pay_ck/.test(m)) return 'Pay terms must be COD, 30D or 45D.';
  if (/unit_ck/.test(m)) return 'Unit must be pc, ea, mtr, pkg or ltr.';
  if (/gender_ck/.test(m)) return 'Gender must be M or F.';
  if (/unitP_ck|unitp_ck/i.test(m)) return 'Unit price must be greater than zero.';
  if (/duplicate key/i.test(m)) return 'A record with this code already exists.';
  if (/violates foreign key/i.test(m)) return 'This record points to a code that does not exist.';
  if (/value too long/i.test(m)) return 'One of the values is too long for the database.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Could not reach Supabase. Check your internet connection and the URL in .env.';
  return m;
}
