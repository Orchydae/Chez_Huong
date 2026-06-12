import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useDeleteRecipe,
  useMyRecipes,
  usePublishRecipe,
  useUnpublishRecipe,
} from '../../api/recipes.api';
import type { Recipe } from '../../api/types';
import { ApiError } from '../../api/client';
import { toast } from '../../lib/toast';
import { formatDate } from '../../lib/format';
import { FALLBACK_RECIPE_IMAGE } from '../../lib/constants';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Spinner from '../../components/ui/Spinner';

/** Own recipes incl. Drafts; the full Draft ⇄ Published ⇄ gone lifecycle lives here. */
export default function MyRecipesPage() {
  const { t, i18n } = useTranslation();
  const { data: recipes, isPending, isError } = useMyRecipes();
  const publishRecipe = usePublishRecipe();
  const unpublishRecipe = useUnpublishRecipe();
  const deleteRecipe = useDeleteRecipe();

  // per-row in-flight action — keyed by id so concurrent rows never clobber
  // each other's busy state (a single shared id would)
  const [pending, setPending] = useState<Record<number, 'lifecycle' | 'delete'>>({});
  const [toDelete, setToDelete] = useState<Recipe | null>(null);

  const beginAction = (id: number, kind: 'lifecycle' | 'delete') =>
    setPending(prev => ({ ...prev, [id]: kind }));
  const endAction = (id: number) =>
    setPending(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const reportError = (err: unknown) => {
    // raw (English) server text goes to the console only — the rule
    console.error(err);
    if (err instanceof ApiError && err.status === 403) toast.error(t('common.errorForbidden'));
    else if (err instanceof ApiError && err.status === 0) toast.error(t('common.errorNetwork'));
    else toast.error(t('common.errorGeneric'));
  };

  const runLifecycle = async (recipe: Recipe, action: 'publish' | 'unpublish') => {
    if (pending[recipe.id]) return;
    beginAction(recipe.id, 'lifecycle');
    try {
      if (action === 'publish') {
        await publishRecipe.mutateAsync(recipe.id);
        toast.success(t('myRecipes.published'));
      } else {
        await unpublishRecipe.mutateAsync(recipe.id);
        toast.success(t('myRecipes.unpublished'));
      }
    } catch (err) {
      reportError(err);
    } finally {
      endAction(recipe.id);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete || pending[toDelete.id]) return;
    beginAction(toDelete.id, 'delete');
    try {
      await deleteRecipe.mutateAsync({ id: toDelete.id, slug: toDelete.slug });
      toast.success(t('myRecipes.deleted'));
      setToDelete(null);
    } catch (err) {
      reportError(err);
    } finally {
      endAction(toDelete.id);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl">{t('myRecipes.title')}</h1>
        <Link to="/recipes/create">
          <Button>
            <PlusCircle size={16} />
            {t('nav.createRecipe')}
          </Button>
        </Link>
      </div>

      {isPending && (
        <div className="flex justify-center py-16">
          <Spinner size={32} />
        </div>
      )}

      {isError && <p className="py-8 text-coral">{t('myRecipes.error')}</p>}

      {recipes && recipes.length === 0 && (
        <p className="py-8 text-forest/60">{t('myRecipes.empty')}</p>
      )}

      {recipes && recipes.length > 0 && (
        <ul className="divide-y divide-forest/10 rounded-2xl bg-white shadow-sm">
          {recipes.map(recipe => {
            const action = pending[recipe.id];
            const busy = action !== undefined;
            const isDraft = recipe.status === 'DRAFT';
            return (
              <li key={recipe.id} className="flex flex-wrap items-center gap-4 p-4">
                <img
                  src={recipe.imageUrl ?? FALLBACK_RECIPE_IMAGE}
                  alt=""
                  loading="lazy"
                  className="hidden h-14 w-20 rounded-lg object-cover sm:block"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/recipes/${recipe.slug}`}
                    className="block truncate text-lg underline-offset-2 hover:underline"
                  >
                    {recipe.title}
                  </Link>
                  <div className="mt-1 flex items-center gap-2 text-xs text-forest/60">
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium ${
                        isDraft ? 'bg-coral/15 text-coral' : 'bg-leaf/40 text-forest'
                      }`}
                    >
                      {isDraft ? t('myRecipes.statusDraft') : t('myRecipes.statusPublished')}
                    </span>
                    <span>{formatDate(recipe.updatedAt, i18n.language)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/recipes/${recipe.id}/edit`}>
                    <Button variant="ghost" disabled={busy}>
                      <Pencil size={14} />
                      {t('recipe.edit')}
                    </Button>
                  </Link>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void runLifecycle(recipe, isDraft ? 'publish' : 'unpublish')}
                  >
                    {action === 'lifecycle' && <Spinner size={16} />}
                    {isDraft ? t('myRecipes.publish') : t('myRecipes.unpublish')}
                  </Button>
                  <Button
                    variant="danger"
                    disabled={busy}
                    aria-label={t('myRecipes.delete')}
                    onClick={() => setToDelete(recipe)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {toDelete && (
        <ConfirmDialog
          title={t('myRecipes.deleteTitle')}
          message={t('myRecipes.deleteMessage', { title: toDelete.title })}
          confirmLabel={t('myRecipes.delete')}
          busy={pending[toDelete.id] === 'delete'}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
