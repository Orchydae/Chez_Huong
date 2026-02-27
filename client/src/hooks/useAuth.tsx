import { createContext, useContext, useState, type ReactNode } from 'react';

export interface AuthUser {
    email: string;
    firstName: string;
    role: string;
    userId: string;
}

interface AuthState {
    user: AuthUser | null;
    token: string | null;
}

export interface AuthContextValue {
    auth: AuthState;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    loading: boolean;
    error: string | null;
    setError: (e: string | null) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

function decodeJwt(token: string): Record<string, unknown> | null {
    try {
        const base64Payload = token.split('.')[1];
        const json = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function buildUser(token: string): AuthUser | null {
    const payload = decodeJwt(token);
    if (!payload) return null;
    return {
        email: payload.email as string,
        firstName: payload.firstName as string,
        role: payload.role as string,
        userId: payload.sub as string,
    };
}

function loadFromStorage(): AuthState {
    const token = localStorage.getItem('access_token');
    if (!token) return { user: null, token: null };
    const user = buildUser(token);
    return user ? { user, token } : { user: null, token: null };
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [auth, setAuth] = useState<AuthState>(loadFromStorage);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const login = async (email: string, password: string): Promise<boolean> => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                credentials: 'include',
            });

            if (!res.ok) {
                if (res.status === 401) {
                    setError('Email ou mot de passe incorrect');
                } else if (res.status === 429) {
                    setError('Trop de tentatives. Réessayez plus tard.');
                } else {
                    setError('Une erreur est survenue. Réessayez.');
                }
                return false;
            }

            const data: { access_token: string } = await res.json();
            localStorage.setItem('access_token', data.access_token);

            const user = buildUser(data.access_token);
            if (!user) { setError('Token invalide reçu du serveur'); return false; }

            setAuth({ user, token: data.access_token });
            return true;
        } catch {
            setError('Impossible de contacter le serveur');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        setAuth({ user: null, token: null });
    };

    return (
        <AuthContext.Provider value={{ auth, login, logout, loading, error, setError }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}
