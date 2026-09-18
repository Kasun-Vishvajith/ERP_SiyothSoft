export type CurrentUser = { username: string };
type Csrf = { token: string; headerName: string };

/** Includes the status so the app can separate 401 sign-out from a network outage. */
export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

let csrf: Csrf | null = null;

export async function refreshCsrf(): Promise<void> {
  const response = await fetch("/api/csrf", { credentials: "same-origin" });
  if (!response.ok) throw new HttpError(response.status, "Could not initialise security");
  csrf = await response.json() as Csrf;
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    if (!csrf) await refreshCsrf();
    headers.set(csrf!.headerName, csrf!.token);
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { message?: string } | null;
    const fallback = response.status === 401 ? "Please log in" : `Request failed (${response.status})`;
    // The app handles later expiry globally; bootstrap/login 401s are handled locally.
    if (response.status === 401 && path !== "/me" && path !== "/login") {
      window.dispatchEvent(new Event("erp-session-expired"));
    }
    throw new HttpError(response.status, problem?.message ?? fallback);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function currentUser(): Promise<CurrentUser> {
  return request<CurrentUser>("/me");
}

export async function login(username: string, password: string): Promise<void> {
  await refreshCsrf();
  await request<void>("/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }).toString(),
  });
  // Authentication changes the CSRF token; retrieve the fresh one for later writes.
  csrf = null;
  await refreshCsrf();
}

export async function logout(): Promise<void> {
  await request<void>("/logout", { method: "POST" });
  csrf = null;
}
