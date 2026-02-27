import { Heart, Clock, Star } from 'lucide-react';

export interface Recipe {
    id: number;
    title: string;
    reviews: number;
    time: string;
    image: string;
    favorite: boolean;
}

interface RecipeCardProps {
    recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
    return (
        <div className="recipe-card">
            <div className="recipe-image-container">
                <img src={recipe.image} alt={recipe.title} className="recipe-image" />
                <button className={`favorite-btn ${recipe.favorite ? 'active' : ''}`}>
                    <Heart
                        size={24}
                        fill={recipe.favorite ? "var(--accent-secondary)" : "transparent"}
                        color={recipe.favorite ? "var(--accent-secondary)" : "white"}
                    />
                </button>
            </div>

            <div className="recipe-content">
                <h3 className="recipe-card-title">{recipe.title}</h3>

                <div className="recipe-meta">
                    <div className="recipe-rating">
                        <div className="stars">
                            <Star size={12} fill="var(--text-primary)" color="var(--text-primary)" />
                            <Star size={12} fill="var(--text-primary)" color="var(--text-primary)" />
                            <Star size={12} fill="var(--text-primary)" color="var(--text-primary)" />
                            <Star size={12} fill="var(--text-primary)" color="var(--text-primary)" />
                            <Star size={12} fill="var(--text-primary)" color="var(--text-primary)" />
                        </div>
                        <span className="reviews-count">{recipe.reviews}</span>
                    </div>

                    <div className="recipe-time">
                        <Clock size={14} />
                        <span>{recipe.time}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
