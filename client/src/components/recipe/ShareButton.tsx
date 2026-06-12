import { Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '../../lib/toast';

/**
 * Share a recipe by its canonical slug URL (M5). Uses the native share sheet
 * where available (mobile), otherwise copies the link to the clipboard. The
 * URL is always the slug form — the same address the app links everywhere.
 */
export default function ShareButton({ slug, title }: { slug: string; title: string }) {
  const { t } = useTranslation();
  const url = `${window.location.origin}/recipes/${slug}`;

  const share = async () => {
    // navigator.share exists on mobile/secure contexts; a user-cancelled sheet
    // rejects with AbortError, which is not an error worth surfacing.
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') console.error(err);
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('recipe.linkCopied'));
    } catch (err) {
      console.error(err);
      toast.error(t('common.errorGeneric'));
    }
  };

  return (
    <button
      type="button"
      onClick={() => void share()}
      className="flex w-fit items-center gap-2 rounded-full border border-cream/40 px-4 py-2 text-sm transition hover:bg-cream/10"
    >
      <Share2 size={16} />
      {t('recipe.share')}
    </button>
  );
}
