import { Heart, Clock, Star } from 'lucide-react';
import type { RecipeDTO } from '../hooks/useRecipes';

// Helper: format prepTime + cookTime into a display string
function formatTotalTime(prepTime: number, prepUnit: string, cookTime: number, cookUnit: string): string {
    const toMinutes = (val: number, unit: string) => unit === 'HOURS' ? val * 60 : val;
    const total = toMinutes(prepTime, prepUnit) + toMinutes(cookTime, cookUnit);
    if (total >= 60) {
        const h = Math.floor(total / 60);
        const m = total % 60;
        return m > 0 ? `${h}h ${m}min` : `${h}h`;
    }
    return `${total} min`;
}

// Fallback image when no imageUrl is set
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1582878826629-29b7ad1cb438?auto=format&fit=crop&q=80&w=800';

interface RecipeCardProps {
    recipe: RecipeDTO;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
    const totalTime = formatTotalTime(recipe.prepTime, recipe.prepTimeUnit, recipe.cookTime, recipe.cookTimeUnit);

    return (
        <div className="recipe-card">
            <div className="recipe-image-container">
                <img
                    src={recipe.imageUrl ?? FALLBACK_IMAGE}
                    alt={recipe.title_fr ?? recipe.title}
                    className="recipe-image"
                />
                <button className="favorite-btn">
                    <Heart size={24} fill="transparent" color="white" />
                </button>
            </div>

            <div className="recipe-content">
                <h3 className="recipe-card-title">{recipe.title_fr ?? recipe.title}</h3>

                <div className="recipe-meta">
                    <div className="recipe-rating">
                        <div className="stars">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} size={12} fill="var(--text-primary)" color="var(--text-primary)" />
                            ))}
                        </div>
                    </div>

                    <div className="recipe-time">
                        <Clock size={14} />
                        <span>{totalTime}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
