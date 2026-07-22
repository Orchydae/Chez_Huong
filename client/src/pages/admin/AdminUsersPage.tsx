import { useEffect, useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../api/auth.api';
import { USERS_PAGE_SIZE, useUpdateUserRole, useUsers } from '../../api/users.api';
import { ROLE_VALUES, type Role, type SafeUser } from '../../api/types';
import { toast } from '../../lib/toast';
import { useApiErrorToast, type ErrorOverrides } from '../../lib/apiError';
import Spinner from '../../components/ui/Spinner';

// The server refuses an admin changing their OWN role with a 400 → explain that
// specifically; 403 / 0 / generic use the shared defaults.
const ROLE_ERRORS: ErrorOverrides = { 400: 'admin.errorSelf' };

/** Admin-only user directory: search by name/email, promote/demote to any role (M7). */
export default function AdminUsersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // The box is typed-in freely; `query` (debounced) is what actually hits the
  // server, so a search fires once the admin pauses — not on every keystroke.
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setQuery(input), 300);
    return () => clearTimeout(id);
  }, [input]);

  const { data: users, isPending, isError } = useUsers(query);
  const updateRole = useUpdateUserRole();

  // per-row in-flight state keyed by id so concurrent rows don't clobber each other
  const [pending, setPending] = useState<Record<string, true>>({});

  const reportError = useApiErrorToast();

  const changeRole = async (target: SafeUser, role: Role) => {
    if (role === target.role || pending[target.id]) return;
    setPending(prev => ({ ...prev, [target.id]: true }));
    try {
      const saved = await updateRole.mutateAsync({ id: target.id, role });
      toast.success(
        t('admin.roleUpdated', {
          name: `${saved.firstName} ${saved.lastName}`,
          role: t(`role.${saved.role}`),
        }),
      );
    } catch (err) {
      reportError(err, ROLE_ERRORS);
    } finally {
      setPending(prev => {
        const next = { ...prev };
        delete next[target.id];
        return next;
      });
    }
  };

  const atCap = users !== undefined && users.length >= USERS_PAGE_SIZE;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-2 flex items-center gap-2">
        <ShieldCheck size={26} className="text-forest" />
        <h1 className="text-4xl">{t('admin.title')}</h1>
      </div>
      <p className="mb-8 text-forest/60">{t('admin.subtitle')}</p>

      <div className="relative mb-6 max-w-md">
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-forest/40"
        />
        <input
          type="search"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t('admin.searchPlaceholder')}
          aria-label={t('admin.searchPlaceholder')}
          className="w-full rounded-full border border-forest/20 bg-white py-2.5 pr-4 pl-9 text-sm outline-none transition focus:border-forest/50"
        />
      </div>

      {isPending && (
        <div className="flex justify-center py-16">
          <Spinner size={32} />
        </div>
      )}

      {isError && <p className="py-8 text-coral">{t('admin.error')}</p>}

      {users && users.length === 0 && <p className="py-8 text-forest/60">{t('admin.empty')}</p>}

      {users && users.length > 0 && (
        <ul className="divide-y divide-forest/10 rounded-2xl bg-white shadow-sm">
          {users.map(u => {
            const isSelf = u.id === user?.userId;
            const busy = pending[u.id] === true;
            return (
              <li key={u.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg">
                    {u.firstName} {u.lastName}
                    {isSelf && <span className="ml-2 text-sm text-forest/50">{t('admin.you')}</span>}
                  </p>
                  <p className="truncate text-sm text-forest/60">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {busy && <Spinner size={16} />}
                  <label className="sr-only" htmlFor={`role-${u.id}`}>
                    {t('admin.roleLabel')}
                  </label>
                  <select
                    id={`role-${u.id}`}
                    value={u.role}
                    disabled={isSelf || busy}
                    onChange={e => void changeRole(u, e.target.value as Role)}
                    // an admin can't change their own role (server refuses it too)
                    title={isSelf ? t('admin.selfHint') : undefined}
                    className="rounded-full border border-forest/20 bg-cream px-4 py-2 text-sm outline-none transition focus:border-forest/50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {ROLE_VALUES.map(role => (
                      <option key={role} value={role}>
                        {t(`role.${role}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {atCap && <p className="mt-4 text-sm text-forest/50">{t('admin.capHint')}</p>}
    </div>
  );
}
