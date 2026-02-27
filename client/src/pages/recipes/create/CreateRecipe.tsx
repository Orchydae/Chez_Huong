import { useState } from 'react';
import { Camera, Clock, Users, Globe, ChevronDown, Heart } from 'lucide-react';
import './CreateRecipe.css';

export default function CreateRecipe() {
    const [title, setTitle] = useState('');
    const [locale, setLocale] = useState('vi');
    const [prepTime, setPrepTime] = useState('');
    const [cookTime, setCookTime] = useState('');
    const [servings, setServings] = useState('');
    const [difficulty] = useState('Intermédiaire');
    const [cuisine] = useState('Viêt Nam');

    return (
        <div className="create-recipe-page">
            {/* HERO SECTION */}
            <div className="cr-hero">
                <div className="cr-bg-upload">
                    <button className="cr-upload-btn">
                        <Camera size={32} />
                        <span>Ajouter une grande photo</span>
                    </button>
                </div>
                <div className="cr-hero-content container">
                    <input
                        className="cr-hero-input-vi"
                        placeholder="Titre de la recette (ex: Phở Bò)"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                    <div className="cr-locale-selector">
                        <Globe size={16} />
                        <select value={locale} onChange={(e) => setLocale(e.target.value)}>
                            <option value="vi">Tiếng Việt</option>
                            <option value="fr">Français</option>
                            <option value="en">English</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* STATS BAR */}
            <div className="cr-stats-bar">
                <div className="container cr-stats-grid">
                    <div className="cr-stat">
                        <Globe size={24} />
                        <div>
                            <span className="cr-stat-label">Cuisine</span>
                            <div className="cr-stat-dropdown">
                                <span>{cuisine}</span>
                                <ChevronDown size={14} />
                            </div>
                        </div>
                    </div>

                    <div className="cr-stat">
                        <Users size={24} />
                        <div>
                            <span className="cr-stat-label">Portions</span>
                            <input
                                className="cr-stat-input"
                                placeholder="4 personnes"
                                value={servings}
                                onChange={(e) => setServings(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="cr-stat">
                        <Clock size={24} />
                        <div>
                            <span className="cr-stat-label">Préparation</span>
                            <input
                                className="cr-stat-input"
                                placeholder="20 minutes"
                                value={prepTime}
                                onChange={(e) => setPrepTime(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="cr-stat">
                        <Clock size={24} />
                        <div>
                            <span className="cr-stat-label">Cuisson</span>
                            <input
                                className="cr-stat-input"
                                placeholder="6 heures"
                                value={cookTime}
                                onChange={(e) => setCookTime(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="cr-stat">
                        <div className="cr-puzzle-icon">🧩</div>
                        <div>
                            <span className="cr-stat-label">Difficulté</span>
                            <div className="cr-stat-dropdown">
                                <span>{difficulty}</span>
                                <ChevronDown size={14} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="container cr-main-content">

                {/* LEFT COLUMN: Ingredients */}
                <div className="cr-col-left">
                    <p className="cr-description-input" contentEditable suppressContentEditableWarning>
                        Des recettes personnelles, héritage d'un secret qui perdure...
                    </p>
                    <div className="cr-actions">
                        <button className="cr-btn-secondary">Valeur nutritive</button>
                        <Heart size={24} />
                    </div>

                    <h3 className="cr-section-title">Ingrédients</h3>

                    {/* Add sections here... (To be expanded) */}
                    <div className="cr-ingredient-section">
                        <input className="cr-section-input" placeholder="Titre de la section (ex: Pour le bouillon)" />
                        <div className="cr-ingredient-list">
                            <input className="cr-ingredient-input" placeholder="• 1-3 kg d'os de boeuf" />
                            <button className="cr-add-btn">+ Ajouter un ingrédient</button>
                        </div>
                        <button className="cr-add-section-btn">+ Ajouter une section</button>
                    </div>

                    <h3 className="cr-section-title" style={{ marginTop: '40px' }}>Catégories associées</h3>
                    <div className="cr-tags">
                        <span className="cr-tag">viétnami</span>
                        <span className="cr-tag">soupes</span>
                        <span className="cr-tag">nouilles</span>
                        <span className="cr-tag cr-tag-add">+</span>
                    </div>
                </div>

                {/* RIGHT COLUMN: Preparation */}
                <div className="cr-col-right">
                    <h3 className="cr-section-title">Préparation</h3>

                    {/* Add steps here... (To be expanded) */}
                    <div className="cr-step-section">
                        <input className="cr-section-input" placeholder="Titre de la section (ex: Préparation du bouillon)" />
                        <div className="cr-step-list">
                            <div className="cr-step">
                                <span className="cr-step-number">1.</span>
                                <div className="cr-step-content-col">
                                    <input className="cr-step-title-input" placeholder="Titre de l'étape" />
                                    <textarea className="cr-step-text" placeholder="Description de l'étape..." rows={4} />
                                </div>
                            </div>
                            <button className="cr-add-btn">+ Ajouter une étape</button>
                        </div>
                        <button className="cr-add-section-btn">+ Ajouter une section</button>
                    </div>

                    <button className="cr-submit-btn">Sauvegarder la recette</button>
                </div>
            </div>
        </div>
    );
}
