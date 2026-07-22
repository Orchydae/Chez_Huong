import { useState, type SubmitEvent } from 'react';
import { Mail, Lock, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../api/auth.api';
import { apiErrorKey } from '../../lib/apiError';
import Modal from '../ui/Modal';
import TextField from '../ui/TextField';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

interface RegisterModalProps {
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export default function RegisterModal({ onClose, onSwitchToLogin }: RegisterModalProps) {
  const { t } = useTranslation();
  const { register } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register({ firstName, lastName, email, password });
      onClose();
    } catch (err) {
      // shown inline (not a toast); 0 → network and the fallback → generic come
      // from the shared defaults. The server owns validation — for a 400 we only
      // translate its (English) verdict into the matching localized line.
      setError(
        t(
          apiErrorKey(err, {
            409: 'auth.errorEmailTaken',
            429: 'auth.errorTooManyAttempts',
            400: reason =>
              reason.includes('password')
                ? 'auth.passwordHint'
                : reason.includes('email')
                  ? 'auth.errorEmailInvalid'
                  : undefined,
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
        <h2 className="text-3xl">{t('auth.registerTitle')}</h2>
        <p className="mt-1 text-sm text-forest/60">{t('auth.registerSubtitle')}</p>
      </div>

      {/* native validation handles email format + required fields in the
          browser's language; everything else is validated by the server */}
      <form className="flex flex-col gap-4" onSubmit={e => void handleSubmit(e)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            id="register-firstname"
            label={
              <>
                <User size={14} /> {t('auth.firstName')}
              </>
            }
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            required
            autoComplete="given-name"
          />
          <TextField
            id="register-lastname"
            label={t('auth.lastName')}
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            required
            autoComplete="family-name"
          />
        </div>
        <TextField
          id="register-email"
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
          id="register-password"
          type="password"
          label={
            <>
              <Lock size={14} /> {t('auth.password')}
            </>
          }
          placeholder="••••••••"
          hint={t('auth.passwordHint')}
          value={password}
          onChange={e => {
            setPassword(e.target.value);
            setError(null);
          }}
          required
          autoComplete="new-password"
        />

        {error && <p className="text-sm text-coral">{error}</p>}

        <Button type="submit" disabled={loading}>
          {loading ? <Spinner size={18} /> : t('auth.submitRegister')}
        </Button>
      </form>

      <button
        type="button"
        className="mt-4 w-full text-center text-sm text-forest/60 underline-offset-2 hover:underline"
        onClick={onSwitchToLogin}
      >
        {t('auth.switchToLogin')}
      </button>
    </Modal>
  );
}
