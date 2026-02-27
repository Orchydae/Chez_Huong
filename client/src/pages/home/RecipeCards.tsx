import { ChevronDown } from 'lucide-react';
import { useRecipes } from './hooks/useRecipes';
import RecipeCard from './components/RecipeCard';
import './RecipeCards.css';

export default function RecipeCards() {
    const { recipes, loading, error } = useRecipes();

    return (
        <section className="recipes-section">
            {/* Header Area */}
            <div className="recipes-header">
                <h2 className="recipes-title">
                    Des recettes au goût <span className="text-accent">raffiné</span>
                </h2>
                <p className="recipes-subtitle">Élégance en bouche, simplicité en cuisine</p>
            </div>

            {/* Filters Bar */}
            <div className="filters-bar">
                <div className="filters-container">
                    <button className="filter-pill">
                        <ChevronDown size={14} />
                        <span>Type de repas</span>
                    </button>
                    <button className="filter-pill">
                        <ChevronDown size={14} />
                        <span>Particularités alimentaires</span>
                    </button>
                    <button className="filter-pill">
                        <ChevronDown size={14} />
                        <span>Cuisine du monde</span>
                    </button>
                    <button className="filter-pill">
                        <ChevronDown size={14} />
                        <span>Filtres avancés</span>
                    </button>
                </div>
            </div>

            {/* Recipe Grid */}
            <div className="recipes-grid">
                {loading && (
                    <p className="recipes-status">Chargement des recettes...</p>
                )}
                {error && (
                    <p className="recipes-status recipes-error">
                        Erreur : {error}
                    </p>
                )}
                {!loading && !error && recipes.length === 0 && (
                    <p className="recipes-status">Aucune recette disponible pour l'instant.</p>
                )}
                {!loading && !error && recipes.map((recipe) => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
            </div>
        </section>
    );
}
