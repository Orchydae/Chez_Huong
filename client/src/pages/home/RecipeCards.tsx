import { ChevronDown } from 'lucide-react';
import RecipeCard from './components/RecipeCard';
import './RecipeCards.css';

// Mock data derived from the image
const recipes = [
    {
        id: 1,
        title: "Soupe tonkinoise au boeuf (Phở Bò)",
        reviews: 391,
        time: "6 h",
        image: "https://images.unsplash.com/photo-1761839259484-4741afbbdcbf?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDF8MHxmZWF0dXJlZC1waG90b3MtZmVlZHwxfHx8ZW58MHx8fHx8",
        favorite: false
    },
    {
        id: 2,
        title: "Riz frit vietnamien",
        reviews: 391,
        time: "30 min",
        image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80&w=800", // Placeholder for fried rice
        favorite: true
    },
    {
        id: 3,
        title: "Soupe tonkinoise au boeuf (Phở Bò)",
        reviews: 391,
        time: "6 h",
        image: "https://images.unsplash.com/photo-1548943487-a2e4b43b4853?auto=format&fit=crop&q=80&w=800", // Placeholder for pho
        favorite: true
    },
    {
        id: 4,
        title: "Crêpe croustillante (Bánh Xèo)",
        reviews: 391,
        time: "30 min",
        image: "https://images.unsplash.com/photo-1627308595229-7830f5c9c66e?auto=format&fit=crop&q=80&w=800", // Placeholder for crepe/omelet
        favorite: false
    },
    {
        id: 5,
        title: "Soupe tonkinoise au boeuf (Phở Bò)",
        reviews: 391,
        time: "6 h",
        image: "https://images.unsplash.com/photo-1582878826629-29b7ad1cb438?auto=format&fit=crop&q=80&w=800",
        favorite: false
    },
    {
        id: 6,
        title: "Soupe de nouilles au porc et boeuf (Bún Bò Huế)",
        reviews: 391,
        time: "6 h",
        image: "https://images.unsplash.com/photo-1548943487-a2e4b43b4853?auto=format&fit=crop&q=80&w=800",
        favorite: false
    }
];

export default function RecipeCards() {
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
                {recipes.map((recipe) => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
            </div>
        </section>
    );
}
