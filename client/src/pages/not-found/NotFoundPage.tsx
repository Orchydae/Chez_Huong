import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="font-serif text-7xl font-bold text-forest/20">404</p>
      <h1 className="text-3xl">{t('notFound.title')}</h1>
      <p className="text-forest/60">{t('notFound.message')}</p>
      <Link
        to="/"
        className="mt-2 rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-forest/90"
      >
        {t('notFound.backHome')}
      </Link>
    </div>
  );
}
