import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RecipeForm, { type SubmitIntent } from '../../components/recipe/RecipeForm';
import { useAutosaveRecipe, useCreateRecipe, usePublishRecipe } from '../../api/recipes.api';
import type { Recipe, UpdateRecipePayload } from '../../api/types';
import { toast } from '../../lib/toast';

export default function CreateRecipePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createRecipe = useCreateRecipe();
  const autosaveRecipe = useAutosaveRecipe();
  const publishRecipe = usePublishRecipe();

  // The first save (autosave or explicit) creates the draft; its id then sticks
  // and every later save is a PUT. Kept in a ref (synchronous) so blurs that fire
  // faster than the first POST resolves can't spawn a second draft — they await
  // the in-flight create and PUT onto it instead.
  const recipeIdRef = useRef<number | null>(null);
  const createInFlight = useRef<Promise<Recipe> | null>(null);

  const ensureDraft = async (payload: UpdateRecipePayload): Promise<Recipe> => {
    if (recipeIdRef.current != null) {
      return autosaveRecipe.mutateAsync({ id: recipeIdRef.current, payload });
    }
    if (createInFlight.current) {
      const created = await createInFlight.current;
      return autosaveRecipe.mutateAsync({ id: created.id, payload });
    }
    const promise = createRecipe.mutateAsync({ payload: { ...payload, status: 'DRAFT' } });
    createInFlight.current = promise;
    try {
      const created = await promise;
      recipeIdRef.current = created.id;
      // Swap the URL to the edit route WITHOUT a router navigation, so the author
      // keeps typing (no remount) but a refresh reloads the draft instead of
      // opening a blank create form and starting a second one. Guard on the
      // current path: if this create resolved from an unmount-flush AFTER the
      // author already navigated away, don't rewrite the destination's URL.
      if (window.location.pathname === '/recipes/create') {
        window.history.replaceState(null, '', `/recipes/${created.id}/edit`);
      }
      return created;
    } finally {
      createInFlight.current = null;
    }
  };

  // Background autosave — persist the draft, creating it on first call. Returns
  // false when it declines (a title-less recipe that hasn't been created yet:
  // we never spawn "Untitled" drafts), so the form can keep the change dirty and
  // not flash a false "Saved". Once a draft exists, every change is saved.
  const handleAutosave = async (payload: UpdateRecipePayload): Promise<boolean> => {
    if (recipeIdRef.current == null && !payload.title.trim()) return false;
    await ensureDraft(payload);
    return true;
  };

  // Explicit Save-as-draft / Publish. Publish may raise RECIPE_INCOMPLETE, which
  // RecipeForm turns into a "publish anyway?" confirm and retries with force.
  const handleSubmit = async (payload: UpdateRecipePayload, intent: SubmitIntent, force: boolean) => {
    const saved = await ensureDraft(payload);
    if (intent === 'publish') {
      const published = await publishRecipe.mutateAsync({ id: saved.id, force });
      toast.success(t('createRecipe.successPublished'));
      void navigate(`/recipes/${published.slug}`);
    } else {
      toast.success(t('createRecipe.successDraft'));
      void navigate(`/recipes/${saved.slug}`);
    }
  };

  return (
    <div>
      <h1 className="sr-only">{t('createRecipe.title')}</h1>
      <RecipeForm
        mode="create"
        onSubmit={handleSubmit}
        onAutosave={handleAutosave}
        onCancel={() => void navigate(-1)}
      />
    </div>
  );
}
