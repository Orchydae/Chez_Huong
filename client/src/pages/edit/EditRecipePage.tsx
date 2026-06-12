import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RecipeForm, { type SubmitIntent } from '../../components/recipe/RecipeForm';
import RecipeLinkManager from '../../components/recipe/RecipeLinkManager';
import {
  usePublishRecipe,
  useRecipe,
  useUnpublishRecipe,
  useUpdateRecipe,
} from '../../api/recipes.api';
import type { UpdateRecipePayload } from '../../api/types';
import { useAuth } from '../../api/auth.api';
import { ApiError } from '../../api/client';
import { toast } from '../../lib/toast';
import Spinner from '../../components/ui/Spinner';

export default function EditRecipePage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: recipe, isPending, isError, error } = useRecipe(id);
  const updateRecipe = useUpdateRecipe();
  const publishRecipe = usePublishRecipe();
  const unpublishRecipe = useUnpublishRecipe();

  if (isPending) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={32} />
      </div>
    );
  }

  if (isError || !recipe) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="text-3xl">{notFound ? t('recipe.notFound') : t('recipe.loadError')}</h1>
        <Link to="/" className="text-sm underline underline-offset-2">
          {t('notFound.backHome')}
        </Link>
      </div>
    );
  }

  // RequireRole only checks the role — a WRITER can still type another
  // author's /recipes/:id/edit URL. The server would 403 every action anyway;
  // say so up front instead of presenting a form that can never save.
  const canEdit = user && (user.role === 'ADMIN' || user.userId === recipe.authorId);
  if (!canEdit) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="text-3xl">{t('common.errorForbidden')}</h1>
        <Link to="/" className="text-sm underline underline-offset-2">
          {t('notFound.backHome')}
        </Link>
      </div>
    );
  }

  const handleSubmit = async (payload: UpdateRecipePayload, intent: SubmitIntent) => {
    // The server ignores a status field in a PUT body — lifecycle changes from
    // the edit screen are PUT (save content) then PATCH /publish or /unpublish.
    let saved = await updateRecipe.mutateAsync({ id: recipe.id, payload });
    if (intent === 'publish') {
      saved = await publishRecipe.mutateAsync(recipe.id);
      toast.success(t('editRecipe.successPublished'));
    } else if (intent === 'unpublish') {
      saved = await unpublishRecipe.mutateAsync(recipe.id);
      toast.success(t('editRecipe.successUnpublished'));
    } else {
      toast.success(t('editRecipe.successSaved'));
    }
    void navigate(`/recipes/${saved.slug}`);
  };

  return (
    <div>
      <h1 className="sr-only">{t('editRecipe.title')}</h1>
      <RecipeForm mode="edit" initial={recipe} onSubmit={handleSubmit} />
      <RecipeLinkManager recipeId={recipe.id} />
    </div>
  );
}
