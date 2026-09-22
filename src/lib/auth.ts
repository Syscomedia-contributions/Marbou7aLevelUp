export const AUTH_CHANGE_EVENT = "mlu-auth-change";

const TOKEN_KEY = "mlu_token";
const USER_KEY = "mlu_user";

export interface AuthUser {
  id: string;
  phone: string;
  pseudo: string;
  role?: "player" | "admin";
}

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getCurrentUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
};

export const isAuthed = (): boolean => !!getToken();

export const isAdmin = (): boolean => getCurrentUser()?.role === "admin";

export const setSession = (token: string, user: AuthUser) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
};

export const clearSession = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
};
