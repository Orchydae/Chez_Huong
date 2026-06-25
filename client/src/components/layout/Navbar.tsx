import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  ChevronDown,
  Heart,
  LogOut,
  Menu,
  PlusCircle,
  Search,
  Shield,
  User,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../api/auth.api';
import LoginModal from '../auth/LoginModal';
import RegisterModal from '../auth/RegisterModal';
import LanguageSwitcher from './LanguageSwitcher';

type AuthModal = 'login' | 'register' | null;

export default function Navbar() {
  const { t } = useTranslation();
  const { user, isWriter, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [authModal, setAuthModal] = useState<AuthModal>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // The search box mirrors ?q so a shared /?q=pho URL shows up in the box and
  // clearing filters empties it. The input is uncontrolled; the key remounts
  // it whenever the URL's q changes (never while the user is typing).
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQ = searchParams.get('q') ?? '';

  const submitSearch = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const raw = new FormData(e.currentTarget).get('q');
    const q = typeof raw === 'string' ? raw.trim() : '';
    setMobileOpen(false);
    if (pathname === '/') {
      // already on Discovery: searching refines the current filters, it
      // doesn't silently wipe them
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (q) next.set('q', q);
        else next.delete('q');
        return next;
      });
    } else {
      void navigate(q ? `/?q=${encodeURIComponent(q)}` : '/');
    }
  };

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    setMobileOpen(false);
    void navigate('/');
  };

  const closeMenus = () => {
    setDropdownOpen(false);
    setMobileOpen(false);
  };

  const searchForm = (
    <form role="search" className="relative w-full" onSubmit={submitSearch}>
      <input
        key={urlQ}
        name="q"
        type="search"
        defaultValue={urlQ}
        placeholder={t('nav.searchPlaceholder')}
        aria-label={t('nav.search')}
        // native ✕ hidden: it clears the box without submitting, leaving the
        // results stale — submit (Enter / the icon) is the one way to apply.
        // text-base below sm avoids iOS focus-zoom; sm:text-sm keeps desktop size.
        className="w-full rounded-full border border-cream/30 bg-cream/10 px-4 py-2 pr-10 text-base text-cream placeholder:text-cream/50 outline-none transition [&::-webkit-search-cancel-button]:[-webkit-appearance:none] focus:border-cream/60 sm:text-sm"
      />
      <button
        type="submit"
        aria-label={t('nav.search')}
        className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-full p-1.5 transition hover:bg-cream/10"
      >
        <Search size={16} />
      </button>
    </form>
  );

  // Saved list is for every signed-in user (readers included), unlike the
  // authoring links below. py-2 gives each row a ~36px tap target.
  const savedLink = user && (
    <Link to="/saved" className="flex items-center gap-2 py-2 text-sm" onClick={closeMenus}>
      <Heart size={16} />
      {t('nav.saved')}
    </Link>
  );

  // py-2 gives each menu row a ~36px tap target (bare text rows were ~20px)
  const writerLinks = isWriter && (
    <>
      <Link to="/recipes/create" className="flex items-center gap-2 py-2 text-sm" onClick={closeMenus}>
        <PlusCircle size={16} />
        {t('nav.createRecipe')}
      </Link>
      <Link to="/my-recipes" className="flex items-center gap-2 py-2 text-sm" onClick={closeMenus}>
        <BookOpen size={16} />
        {t('nav.myRecipes')}
      </Link>
      {isAdmin && (
        <Link to="/admin/users" className="flex items-center gap-2 py-2 text-sm" onClick={closeMenus}>
          <Shield size={16} />
          {t('nav.admin')}
        </Link>
      )}
    </>
  );

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-cream/15 bg-forest/45 rounded-b-2xl text-cream shadow-sm backdrop-blur-xl backdrop-saturate-150">
        <div className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-12 lg:px-16">
          <Link to="/" className="flex items-center" aria-label="Chez Huong">
            <img src="/chezhuonglogo.webp" alt="Chez Huong" width="41" height="40" className="h-10 w-auto" />
          </Link>

          {/* desktop search */}
          <div className="hidden flex-1 justify-center px-6 sm:flex">
            <div className="w-full max-w-3xl">{searchForm}</div>
          </div>

          {/* desktop */}
          <div className="hidden items-center gap-4 sm:flex">
            <LanguageSwitcher />
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full border border-cream/30 px-4 py-2 text-sm transition hover:bg-cream/10"
                  onClick={() => setDropdownOpen(prev => !prev)}
                >
                  <User size={16} />
                  <span>{user.firstName}</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 flex w-56 flex-col gap-3 rounded-xl bg-cream p-4 text-forest shadow-xl">
                    {savedLink}
                    {writerLinks}
                    <div className="border-t border-forest/10" />
                    <button
                      type="button"
                      className="flex items-center gap-2 py-2 text-sm text-coral"
                      onClick={handleLogout}
                    >
                      <LogOut size={16} />
                      {t('nav.signOut')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-cream/30 px-4 py-2 text-sm transition hover:bg-cream/10"
                onClick={() => setAuthModal('login')}
              >
                <User size={16} />
                {t('nav.signIn')}
              </button>
            )}
          </div>

          {/* mobile */}
          <button
            type="button"
            aria-label={t('nav.menu')}
            className="rounded-lg p-2 transition hover:bg-cream/10 sm:hidden"
            onClick={() => setMobileOpen(prev => !prev)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="flex flex-col gap-4 border-t border-cream/10 px-6 py-4 sm:hidden">
            {searchForm}
            <div className="flex">
              <LanguageSwitcher align="left" />
            </div>
            {user ? (
              <>
                <span className="flex items-center gap-2 text-sm opacity-80">
                  <User size={16} /> {user.firstName}
                </span>
                {savedLink}
                {writerLinks}
                <button
                  type="button"
                  className="flex items-center gap-2 py-2 text-left text-sm text-leaf"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  {t('nav.signOut')}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="flex items-center gap-2 py-2 text-left text-sm"
                onClick={() => {
                  setMobileOpen(false);
                  setAuthModal('login');
                }}
              >
                <User size={16} />
                {t('nav.signIn')}
              </button>
            )}
          </div>
        )}
      </nav>

      {authModal === 'login' && (
        <LoginModal
          onClose={() => setAuthModal(null)}
          onSwitchToRegister={() => setAuthModal('register')}
        />
      )}
      {authModal === 'register' && (
        <RegisterModal
          onClose={() => setAuthModal(null)}
          onSwitchToLogin={() => setAuthModal('login')}
        />
      )}
    </>
  );
}
