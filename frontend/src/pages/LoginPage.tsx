import { ThemeControl } from "../components/ThemeControl";
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
    <main className="auth-shell"><div className="auth-theme"><ThemeControl /></div>
      <section className="auth-card auth-card--minimal" aria-labelledby="login-title">
        <div className="auth-card__brand"><span className="brand-mark" aria-hidden="true">S</span><span>SiyothSoft<span>ERP</span></span></div>
        <div className="auth-card__heading"><h1 id="login-title">Welcome back</h1><p className="auth-card__intro">Sign in to continue.</p></div>
        {error && <div className="alert alert--error" role="alert">{error}</div>}
        <form className="auth-form" onSubmit={submit}>
          <label className="field">
            <span>Username</span>
            <input autoComplete="username" placeholder="Enter your username" value={username} onChange={(event) => setUsername(event.target.value)} required />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <button className="button button--primary" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
