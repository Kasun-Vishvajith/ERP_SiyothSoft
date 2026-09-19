import { useState, type FormEvent } from "react";

type LoginPageProps = {
  busy: boolean;
  error?: string;
  onSubmit: (username: string, password: string) => Promise<void>;
};

export function LoginPage({ busy, error, onSubmit }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(username.trim(), password);
    setPassword("");
  }

  return (
    <main className="auth-shell">
      <div className="auth-story"><span className="context-tag">SIYOTHSOFT / ERP</span><h2>Less friction.<br />More <span>forward.</span></h2><p>A clearer view of your business. Bring your inventory, sales, and payments into one connected workspace.</p><div className="auth-art" aria-hidden="true"><div /><div /><div /><div /><span>Everything in balance. ↗</span></div></div>
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-card__brand"><span className="brand-mark" aria-hidden="true">S</span><span>SiyothSoft ERP</span></div>
        <span className="eyebrow">Secure business workspace</span>
        <h1 id="login-title">Welcome back</h1>
        <p className="auth-card__intro">Sign in to continue to your invoices and payment records.</p>
        {error && <div className="alert alert--error" role="alert">{error}</div>}
        <form className="auth-form" onSubmit={submit}>
          <label className="field">
            <span>Username</span>
            <input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <button className="button button--primary" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
