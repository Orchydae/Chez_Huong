import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="mt-16 bg-forest py-10 text-cream">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 text-center sm:px-6">
        <img src="/chezhuonglogo.webp" alt="Chez Huong" width="37" height="36" className="h-9 w-auto opacity-90" />
        <p className="text-sm opacity-70">{t('footer.tagline')}</p>
      </div>
    </footer>
  );
}
