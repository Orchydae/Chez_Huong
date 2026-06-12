/*
 * Auth: login/register against /v1/auth/*, token persisted via client.ts,
 * user identity decoded from the JWT payload (sub, email, role, firstName).
 * Listens for the client's 401 event so an expired login signs out app-wide.
 */
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, clearToken, getToken, setToken, TOKEN_KEY, UNAUTHORIZED_EVENT } from './client';
import type { AuthResponse, AuthUser, RegisterPayload, Role } from './types';

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  firstName: string;
  exp?: number;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as JwtPayload;
  } catch {
    return null;
  }
}

function userFromToken(token: string): AuthUser | null {
  const payload = decodeJwt(token);
  if (!payload) return null;
  if (payload.exp !== undefined && payload.exp * 1000 < Date.now()) return null;
  return {
    userId: payload.sub,
    email: payload.email,
    role: payload.role,
    firstName: payload.firstName,
  };
}

function loadInitialUser(): AuthUser | null {
  const token = getToken();
  if (!token) return null;
  const user = userFromToken(token);
  if (!user) clearToken(); // expired or corrupt — drop it
  return user;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isWriter: boolean; // WRITER or ADMIN — may author recipes
  isAdmin: boolean; // ADMIN only — may manage users
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadInitialUser);
  // The query cache holds user-private data (own drafts via /recipes/mine,
  // draft details), so it is wiped at EVERY auth boundary — login, logout,
  // 401, token expiry — and never crosses accounts on a shared browser.
  const queryClient = useQueryClient();

  const adopt = useCallback(
    (response: AuthResponse): void => {
      setToken(response.access_token);
      setUser(userFromToken(response.access_token));
      queryClient.clear();
    },
    [queryClient],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      adopt(await api.post<AuthResponse>('/auth/login', { email, password }));
    },
    [adopt],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      adopt(await api.post<AuthResponse>('/auth/register', payload));
    },
    [adopt],
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  // client.ts fires this whenever the server answers 401
  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      queryClient.clear();
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [queryClient]);

  // A login/logout in ANOTHER tab swaps the shared localStorage token. That is
  // an auth boundary too: requests here already carry the new token (client.ts
  // reads it per request), so without this listener this tab would keep the
  // old account's navbar and query cache while acting as the new account.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      // e.key === null means localStorage.clear(); otherwise filter to our key
      if (e.key !== null && e.key !== TOKEN_KEY) return;
      const token = getToken();
      setUser(token ? userFromToken(token) : null);
      queryClient.clear();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [queryClient]);

  // Sign out the moment the token expires. Read endpoints use the server's
  // OptionalJwtAuthGuard, which silently treats an expired token as anonymous —
  // without this timer a browsing user would keep a "signed in" navbar while
  // their own drafts 404.
  useEffect(() => {
    if (!user) return;
    const token = getToken();
    const exp = token ? decodeJwt(token)?.exp : undefined;
    if (exp === undefined) return;
    const delay = Math.min(exp * 1000 - Date.now(), 2 ** 31 - 1);
    const timer = setTimeout(() => {
      clearToken();
      setUser(null);
      queryClient.clear();
    }, Math.max(delay, 0));
    return () => clearTimeout(timer);
  }, [user, queryClient]);

  const isWriter = user?.role === 'ADMIN' || user?.role === 'WRITER';
  const isAdmin = user?.role === 'ADMIN';

  return createElement(
    AuthContext.Provider,
    { value: { user, isWriter, isAdmin, login, register, logout } },
    children,
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
