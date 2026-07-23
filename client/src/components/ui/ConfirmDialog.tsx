import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import Button from './Button';
import Spinner from './Spinner';

interface ConfirmDialogProps {
  title: string;
  message: string;
  /** Label of the confirming button (e.g. "Supprimer"). */
  confirmLabel: string;
  /** Styling of the confirm button. Defaults to `danger` (destructive actions);
   *  pass `primary` for a non-destructive confirm like "publish anyway". */
  confirmVariant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Disables both buttons and shows a spinner while the action runs. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation dialog: cancel is the safe choice; the confirm button's tone
 *  (destructive vs. plain) is set by `confirmVariant`. */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmVariant = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    // While the action runs, Esc / backdrop / X must NOT dismiss the dialog —
    // a delete that looks cancelled but completes anyway is worse than waiting.
    <Modal
      onClose={() => {
        if (!busy) onCancel();
      }}
    >
      <h2 className="text-2xl">{title}</h2>
      <p className="mt-3 text-sm text-forest/70">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          {t('common.cancel')}
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm} disabled={busy}>
          {busy && <Spinner size={18} />}
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
