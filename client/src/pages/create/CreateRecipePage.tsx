import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RecipeForm, { type SubmitIntent } from '../../components/recipe/RecipeForm';
import { useCreateRecipe } from '../../api/recipes.api';
import type { UpdateRecipePayload } from '../../api/types';
import { toast } from '../../lib/toast';

export default function CreateRecipePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createRecipe = useCreateRecipe();

  const handleSubmit = async (payload: UpdateRecipePayload, intent: SubmitIntent) => {
    // create accepts a status choice in the body: DRAFT (private) or PUBLISHED
    const created = await createRecipe.mutateAsync({
      ...payload,
      status: intent === 'publish' ? 'PUBLISHED' : 'DRAFT',
    });
    toast.success(
      intent === 'publish' ? t('createRecipe.successPublished') : t('createRecipe.successDraft'),
    );
    void navigate(`/recipes/${created.slug}`);
  };

  return (
    <div>
      <h1 className="sr-only">{t('createRecipe.title')}</h1>
      <RecipeForm mode="create" onSubmit={handleSubmit} />
    </div>
  );
}
