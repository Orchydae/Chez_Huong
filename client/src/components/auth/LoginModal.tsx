import { useState, type SubmitEvent } from 'react';
import { Mail, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../api/auth.api';
import { apiErrorKey } from '../../lib/apiError';
import Modal from '../ui/Modal';
import TextField from '../ui/TextField';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

interface LoginModalProps {
  onClose: () => void;
  onSwitchToRegister: () => void;
}

export default function LoginModal({ onClose, onSwitchToRegister }: LoginModalProps) {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      onClose();
    } catch (err) {
      // shown inline (not a toast), so map to a key directly; 0 → network and
      // the fallback → generic come from the shared defaults
      setError(
        t(
          apiErrorKey(err, {
            401: 'auth.errorInvalidCredentials',
            429: 'auth.errorTooManyAttempts',
          }),
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="mb-6 text-center">
        <h2 className="text-3xl">{t('auth.loginTitle')}</h2>
        <p className="mt-1 text-sm text-forest/60">{t('auth.loginSubtitle')}</p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={e => void handleSubmit(e)}>
        <TextField
          id="login-email"
          type="email"
          label={
            <>
              <Mail size={14} /> {t('auth.email')}
            </>
          }
          placeholder={t('auth.emailPlaceholder')}
          value={email}
          onChange={e => {
            setEmail(e.target.value);
            setError(null);
          }}
          required
          autoComplete="email"
        />
        <TextField
          id="login-password"
          type="password"
          label={
            <>
              <Lock size={14} /> {t('auth.password')}
            </>
          }
          placeholder="••••••••"
          value={password}
          onChange={e => {
            setPassword(e.target.value);
            setError(null);
          }}
          required
          autoComplete="current-password"
        />

        {error && <p className="text-sm text-coral">{error}</p>}

        <Button type="submit" disabled={loading}>
          {loading ? <Spinner size={18} /> : t('auth.submitLogin')}
        </Button>
      </form>

      <button
        type="button"
        className="mt-4 w-full text-center text-sm text-forest/60 underline-offset-2 hover:underline"
        onClick={onSwitchToRegister}
      >
        {t('auth.switchToRegister')}
      </button>
    </Modal>
  );
}
