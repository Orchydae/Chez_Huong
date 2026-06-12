import { CreateRecipeDto } from './create-recipe.dto';

/**
 * Recipe update DTO. Inherits the full Create shape — NOT `PartialType` —
 * because the update path wipes and recreates child rows (ingredient sections,
 * step sections, particularities) in a single transaction. There is no partial
 * update: every required field on Create is required on Update too.
 */
export class UpdateRecipeDto extends CreateRecipeDto { }
