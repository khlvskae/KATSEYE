import { Logo } from '../components/ui';

// Shown until the .env file has your Supabase URL and key
export default function SetupNotice() {
  return (
    <div className="auth-page">
      <div className="auth-art">
        <Logo />
        <h1>Almost <span>ready.</span></h1>
        <span className="eyebrow" style={{ color: '#cfc9d6' }}>Hope, Inc. ERP</span>
      </div>
      <div className="auth-panel">
        <div className="auth-card">
          <span className="eyebrow">Setup</span>
          <h2>Connect Supabase</h2>
          <p className="sub">The app needs your Supabase project details before anyone can sign in.</p>
          <ol style={{ paddingLeft: 20, display: 'grid', gap: 10, color: 'var(--text)' }}>
            <li>Copy the file <code>.env.example</code> and name the copy <code>.env</code>.</li>
            <li>In Supabase, open <b>Project Settings → API</b>. Paste the Project URL and the <b>anon public</b> key into <code>.env</code>.</li>
            <li>Stop the dev server (Ctrl + C) and run <code>npm run dev</code> again.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
