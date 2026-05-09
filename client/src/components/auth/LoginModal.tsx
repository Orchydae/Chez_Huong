import { useState, type FormEvent } from 'react';
import { X, Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import './LoginModal.css';

interface LoginModalProps {
    onClose: () => void;
}

export default function LoginModal({ onClose }: LoginModalProps) {
    const { login, loading, error, setError } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const success = await login(email, password);
        if (success) onClose();
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div className="modal-overlay" onClick={handleBackdropClick}>
            <div className="modal-panel">
                {/* Close */}
                <button className="modal-close" onClick={onClose}>
                    <X size={20} />
                </button>

                {/* Header */}
                <div className="modal-header">
                    <h2 className="modal-title">Bon retour</h2>
                    <p className="modal-subtitle">Connectez-vous pour accéder à vos recettes</p>
                </div>

                {/* Form */}
                <form className="modal-form" onSubmit={handleSubmit} noValidate>
                    <div className="form-field">
                        <label className="form-label" htmlFor="login-email">
                            <Mail size={14} />
                            Adresse courriel
                        </label>
                        <input
                            id="login-email"
                            type="email"
                            className="form-input"
                            placeholder="vous@exemple.com"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setError(null); }}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-field">
                        <label className="form-label" htmlFor="login-password">
                            <Lock size={14} />
                            Mot de passe
                        </label>
                        <input
                            id="login-password"
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(null); }}
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    {error && (
                        <p className="form-error">{error}</p>
                    )}

                    <button
                        type="submit"
                        className="form-submit"
                        disabled={loading}
                    >
                        {loading ? <Loader2 size={18} className="spin" /> : 'Se connecter'}
                    </button>
                </form>
            </div>
        </div>
    );
}
