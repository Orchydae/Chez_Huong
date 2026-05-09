import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, Users, Globe, Edit } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth.tsx';
import './ReadRecipe.css';

interface IngredientRow {
    ingredientName: string;
    quantity: string;
    unit: string;
}

interface IngredientSection {
    name: string;
    ingredients: IngredientRow[];
}

interface StepRow {
    description: string;
    mediaUrl?: string;
}

interface StepSection {
    title: string;
    steps: StepRow[];
}

interface Recipe {
    id: number;
    title: string;
    description: string | null;
    locale: string;
    prepTime: number;
    prepTimeUnit: string;
    cookTime: number;
    cookTimeUnit: string;
    difficulty: string;
    type: string;
    cuisine: string;
    servings: number;
    imageUrl: string | null;
    ingredientSections: IngredientSection[];
    stepSections: StepSection[];
}

const DIFFICULTY_LABELS: Record<string, string> = {
    EASY: 'Facile',
    MEDIUM: 'Intermédiaire',
    HARD: 'Difficile',
};

const TYPE_LABELS: Record<string, string> = {
    BREAKFAST: 'Petit-déjeuner',
    MAIN: 'Plat principal',
    SIDE: 'Accompagnement',
    DESSERT: 'Dessert',
    APPETIZER: 'Entrée',
    SALAD: 'Salade',
    SNACK: 'Collation',
};

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export default function ReadRecipe() {
    const { id } = useParams<{ id: string }>();
    const { auth } = useAuth();
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchRecipe() {
            try {
                const res = await fetch(`${API_BASE_URL}/recipes/${id}`);
                if (!res.ok) throw new Error('Recipe not found');
                const data = await res.json();
                setRecipe(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchRecipe();
    }, [id]);

    if (loading) return <div className="read-recipe-page container">Chargement...</div>;
    if (error || !recipe) return <div className="read-recipe-page container">Erreur: {error || 'Recette introuvable'}</div>;

    return (
        <div className="read-recipe-page">
            <div className="cr-hero" style={recipe.imageUrl ? { backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.5)), url(${recipe.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
                <div className="cr-hero-content container">
                    <div className="cr-locale-selector">
                        <Globe size={16} />
                        <span>{recipe.locale.toUpperCase()}</span>
                        <div className="cr-hero-type">
                            <span>{TYPE_LABELS[recipe.type] || recipe.type}</span>
                        </div>
                    </div>
                    <h1 className="cr-hero-input" style={{ border: 'none', background: 'transparent', color: 'white' }}>{recipe.title}</h1>
                    {(auth.user?.role === 'ADMIN' || auth.user?.role === 'WRITER') && (
                        <Link to={`/recipes/${id}/modify`} className="edit-recipe-link">
                            <Edit size={20} /> Modifier
                        </Link>
                    )}
                </div>
            </div>

            <div className="cr-stats-bar">
                <div className="container cr-stats-grid">
                    <div className="cr-stat">
                        <Globe size={24} />
                        <div>
                            <span className="cr-stat-label">Cuisine</span>
                            <span className="cr-stat-value">{recipe.cuisine}</span>
                        </div>
                    </div>
                    <div className="cr-stat">
                        <Users size={24} />
                        <div>
                            <span className="cr-stat-label">Portions</span>
                            <span className="cr-stat-value">{recipe.servings}</span>
                        </div>
                    </div>
                    <div className="cr-stat">
                        <Clock size={24} />
                        <div>
                            <span className="cr-stat-label">Préparation</span>
                            <span className="cr-stat-value">{recipe.prepTime} {recipe.prepTimeUnit.toLowerCase()}</span>
                        </div>
                    </div>
                    <div className="cr-stat">
                        <Clock size={24} />
                        <div>
                            <span className="cr-stat-label">Cuisson</span>
                            <span className="cr-stat-value">{recipe.cookTime} {recipe.cookTimeUnit.toLowerCase()}</span>
                        </div>
                    </div>
                    <div className="cr-stat">
                        <div className="cr-puzzle-icon">🧩</div>
                        <div>
                            <span className="cr-stat-label">Difficulté</span>
                            <span className="cr-stat-value">{DIFFICULTY_LABELS[recipe.difficulty] || recipe.difficulty}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="cr-description-container container">
                <p className="cr-description-text">{recipe.description}</p>
            </div>

            <div className="container cr-main-content">
                <div className="cr-col-left">
                    <h3 className="cr-section-title">Ingrédients</h3>
                    {recipe.ingredientSections.map((section: IngredientSection, sIdx: number) => (
                        <div className="cr-ingredient-section" key={sIdx}>
                            {section.name && <h4 className="cr-section-subtitle">{section.name}</h4>}
                            <ul className="read-ingredient-list">
                                {section.ingredients.map((ing: IngredientRow, iIdx: number) => (
                                    <li className="read-ingredient-item" key={iIdx}>
                                        <span className="ing-qty">{ing.quantity}</span>
                                        <span className="ing-unit">{ing.unit}</span>
                                        <span className="ing-name">{ing.ingredientName}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="cr-col-right">
                    <h3 className="cr-section-title">Préparation</h3>
                    {recipe.stepSections.map((section: StepSection, sIdx: number) => (
                        <div className="cr-step-section" key={sIdx}>
                            {section.title && <h4 className="cr-section-subtitle">{section.title}</h4>}
                            <div className="cr-step-list">
                                {section.steps.map((step: StepRow, stIdx: number) => (
                                    <div className="cr-step" key={stIdx}>
                                        <span className="cr-step-number">{stIdx + 1}.</span>
                                        <div className="cr-step-content-row">
                                            <p className="cr-step-text-display">{step.description}</p>
                                            {step.mediaUrl && (
                                                <div className="cr-step-media">
                                                    <img src={step.mediaUrl} alt={`Step ${stIdx + 1}`} className="step-img" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
