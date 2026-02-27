import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Clock, Users, Globe, Plus, Trash2, CircleStop } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth.tsx';
import './CreateRecipe.css';

/* ── Enums mirroring backend ────────────────────────────── */
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
type TimeUnit = 'MINUTES' | 'HOURS';
type RecipeType = 'BREAKFAST' | 'MAIN' | 'SIDE' | 'DESSERT' | 'APPETIZER' | 'SALAD' | 'SNACK';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
    EASY: 'Facile',
    MEDIUM: 'Intermédiaire',
    HARD: 'Difficile',
};

const TYPE_LABELS: Record<RecipeType, string> = {
    BREAKFAST: 'Petit-déjeuner',
    MAIN: 'Plat principal',
    SIDE: 'Accompagnement',
    DESSERT: 'Dessert',
    APPETIZER: 'Entrée',
    SALAD: 'Salade',
    SNACK: 'Collation',
};

/* ── Local form types ───────────────────────────────────── */
interface IngredientRow {
    ingredientName: string;
    quantity: string;
    unit: string;
}

interface IngredientSearchResult {
    id: string;
    name: string;
}

interface IngredientSectionForm {
    name: string;
    ingredients: IngredientRow[];
}

interface StepRow {
    description: string;
}

interface StepSectionForm {
    title: string;
    steps: StepRow[];
}

/* ── Helpers ────────────────────────────────────────────── */
const emptyIngredient = (): IngredientRow => ({ ingredientName: '', quantity: '', unit: '' });
const emptyIngredientSection = (): IngredientSectionForm => ({
    name: '',
    ingredients: [emptyIngredient()],
});
const emptyStep = (): StepRow => ({ description: '' });
const emptyStepSection = (): StepSectionForm => ({
    title: '',
    steps: [emptyStep()],
});

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/* ════════════════════════════════════════════════════════ */
export default function CreateRecipe() {
    const { auth } = useAuth();

    /* ── Scalar fields ─────────────────────────────────── */
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [locale, setLocale] = useState('vi');
    const [prepTime, setPrepTime] = useState<number>(0);
    const [prepTimeUnit, setPrepTimeUnit] = useState<TimeUnit>('MINUTES');
    const [cookTime, setCookTime] = useState<number>(0);
    const [cookTimeUnit, setCookTimeUnit] = useState<TimeUnit>('MINUTES');
    const [difficulty, setDifficulty] = useState<Difficulty>('EASY');
    const [recipeType, setRecipeType] = useState<RecipeType>('MAIN');
    const [cuisine, setCuisine] = useState('Viêt Nam');
    const [servings, setServings] = useState<number>(4);

    /* ── Image state ──────────────────────────── */
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreviewUrl(URL.createObjectURL(file));
    };

    /* Revoke the object URL on unmount or when a new file is selected */
    useEffect(() => {
        return () => {
            if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
        };
    }, [imagePreviewUrl]);

    /* ── Dynamic sections ──────────────────────────────── */
    const [ingredientSections, setIngredientSections] = useState<IngredientSectionForm[]>([
        emptyIngredientSection(),
    ]);
    const [stepSections, setStepSections] = useState<StepSectionForm[]>([
        emptyStepSection(),
    ]);

    /* ── Ingredient search state ──────────────────────── */
    const [ingredientSuggestions, setIngredientSuggestions] = useState<IngredientSearchResult[]>([]);
    const [activeSearch, setActiveSearch] = useState<{ sIdx: number; iIdx: number } | null>(null);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const searchIngredients = useCallback((query: string, sIdx: number, iIdx: number) => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        if (!query.trim()) {
            setIngredientSuggestions([]);
            setActiveSearch(null);
            return;
        }

        setActiveSearch({ sIdx, iIdx });

        searchTimerRef.current = setTimeout(async () => {
            try {
                const res = await fetch(
                    `${API_BASE_URL}/ingredients/search?q=${encodeURIComponent(query.trim())}`,
                );
                if (!res.ok) return;
                const data = await res.json();
                /* API returns { found, ingredients } for local hits,
                   or { found, matches } for USDA suggestions */
                const results: IngredientSearchResult[] = (
                    data.ingredients ?? data.matches ?? []
                ).map((m: any) => ({ id: m.id ?? m.fdcId, name: m.name ?? m.description }));
                setIngredientSuggestions(results);
            } catch {
                /* network error – silently ignore */
            }
        }, 1000);
    }, []);

    /* Cleanup timer on unmount */
    useEffect(() => {
        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        };
    }, []);

    const selectSuggestion = (sIdx: number, iIdx: number, name: string) => {
        updateIngredient(sIdx, iIdx, { ingredientName: name });
        setIngredientSuggestions([]);
        setActiveSearch(null);
    };

    /* ── Ingredient section helpers ─────────────────────── */
    const updateIngSection = (sIdx: number, patch: Partial<IngredientSectionForm>) =>
        setIngredientSections(prev => prev.map((s, i) => (i === sIdx ? { ...s, ...patch } : s)));

    const addIngredient = (sIdx: number) =>
        updateIngSection(sIdx, { ingredients: [...ingredientSections[sIdx].ingredients, emptyIngredient()] });

    const removeIngredient = (sIdx: number, iIdx: number) =>
        updateIngSection(sIdx, { ingredients: ingredientSections[sIdx].ingredients.filter((_, j) => j !== iIdx) });

    const updateIngredient = (sIdx: number, iIdx: number, patch: Partial<IngredientRow>) =>
        updateIngSection(sIdx, {
            ingredients: ingredientSections[sIdx].ingredients.map((ing, j) =>
                j === iIdx ? { ...ing, ...patch } : ing,
            ),
        });

    /* ── Step section helpers ───────────────────────────── */
    const updateStepSection = (sIdx: number, patch: Partial<StepSectionForm>) =>
        setStepSections(prev => prev.map((s, i) => (i === sIdx ? { ...s, ...patch } : s)));

    const addStep = (sIdx: number) =>
        updateStepSection(sIdx, { steps: [...stepSections[sIdx].steps, emptyStep()] });

    const removeStep = (sIdx: number, stIdx: number) =>
        updateStepSection(sIdx, { steps: stepSections[sIdx].steps.filter((_, j) => j !== stIdx) });

    const updateStep = (sIdx: number, stIdx: number, patch: Partial<StepRow>) =>
        updateStepSection(sIdx, {
            steps: stepSections[sIdx].steps.map((st, j) => (j === stIdx ? { ...st, ...patch } : st)),
        });

    /* ── Submit ─────────────────────────────────────────── */
    const handleSubmit = async () => {
        if (!auth.user) return;
        setIsSubmitting(true);

        try {
            /* 1. Upload image to NestJS Backend (if one was picked) */
            let imageUrl: string | null = null;
            if (imageFile) {
                const formData = new FormData();
                formData.append('file', imageFile);

                const uploadRes = await fetch(`${API_BASE_URL}/recipes/upload-image`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${auth.token}`,
                    },
                    body: formData,
                });

                if (!uploadRes.ok) {
                    const err = await uploadRes.json().catch(() => ({}));
                    throw new Error(err.message ?? 'Échec du téléchargement de l\'image');
                }

                const data = await uploadRes.json();
                imageUrl = data.imageUrl;
            }

            /* 2. POST recipe to backend */
            const body = {
                title,
                description: description || null,
                locale,
                prepTime,
                prepTimeUnit,
                cookTime,
                cookTimeUnit,
                difficulty,
                type: recipeType,
                cuisine,
                servings,
                authorId: auth.user.userId,
                imageUrl,
                ingredientSections: ingredientSections.map(s => ({
                    name: s.name,
                    ingredients: s.ingredients.map(i => ({
                        ingredientName: i.ingredientName,
                        quantity: i.quantity,
                        unit: i.unit,
                    })),
                })),
                stepSections: stepSections.map(s => ({
                    title: s.title,
                    steps: s.steps.map((st, idx) => ({
                        order: idx + 1,
                        description: st.description,
                    })),
                })),
            };

            const res = await fetch(`${API_BASE_URL}/recipes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${auth.token}`,
                },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                alert('Recette créée avec succès !');
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.message ?? 'Erreur lors de la création');
            }
        } catch (err: any) {
            alert(err.message ?? 'Erreur lors de la création');
        } finally {
            setIsSubmitting(false);
        }
    };

    /* ═══════════════════════════════════════════════ JSX */
    return (
        <div className="create-recipe-page">
            {/* ── HERO ─────────────────────────────── */}
            <div className="cr-hero">
                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageChange}
                />

                <div
                    className="cr-bg-upload"
                    style={imagePreviewUrl ? { backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.5)), url(${imagePreviewUrl})` } : undefined}
                >
                    <button
                        className="cr-upload-btn"
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Camera size={32} />
                        <span>{imagePreviewUrl ? 'Changer la photo' : 'Ajouter une photo'}</span>
                    </button>
                </div>
                <div className="cr-hero-content container">
                    <div className="cr-locale-selector">
                        <Globe size={16} />
                        <select value={locale} onChange={e => setLocale(e.target.value)}>
                            <option value="vi">Tiếng Việt</option>
                            <option value="fr">Français</option>
                            <option value="en">English</option>
                        </select>
                        {/* Recipe type */}
                        <div className="cr-hero-type">
                            <CircleStop size={16} />
                            <div>
                                <select
                                    value={recipeType}
                                    onChange={e => setRecipeType(e.target.value as RecipeType)}
                                >
                                    {Object.entries(TYPE_LABELS).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <input
                        className="cr-hero-input"
                        placeholder="Titre de la recette"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                    />
                </div>
            </div>

            {/* ── STATS BAR ────────────────────────── */}
            <div className="cr-stats-bar">
                <div className="container cr-stats-grid">
                    {/* Cuisine */}
                    <div className="cr-stat">
                        <Globe size={24} />
                        <div>
                            <span className="cr-stat-label">Cuisine</span>
                            <input
                                className="cr-stat-input"
                                value={cuisine}
                                onChange={e => setCuisine(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Portions */}
                    <div className="cr-stat">
                        <Users size={24} />
                        <div>
                            <span className="cr-stat-label">Portions</span>
                            <input
                                className="cr-stat-input"
                                type="number"
                                min={1}
                                value={servings}
                                onChange={e => setServings(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    {/* Prep time */}
                    <div className="cr-stat">
                        <Clock size={24} />
                        <div>
                            <span className="cr-stat-label">Préparation</span>
                            <div className="cr-time-group">
                                <input
                                    className="cr-stat-input cr-time-input"
                                    type="number"
                                    min={0}
                                    value={prepTime}
                                    onChange={e => setPrepTime(Number(e.target.value))}
                                />
                                <select
                                    className="cr-time-unit"
                                    value={prepTimeUnit}
                                    onChange={e => setPrepTimeUnit(e.target.value as TimeUnit)}
                                >
                                    <option value="MINUTES">min</option>
                                    <option value="HOURS">h</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Cook time */}
                    <div className="cr-stat">
                        <Clock size={24} />
                        <div>
                            <span className="cr-stat-label">Cuisson</span>
                            <div className="cr-time-group">
                                <input
                                    className="cr-stat-input cr-time-input"
                                    type="number"
                                    min={0}
                                    value={cookTime}
                                    onChange={e => setCookTime(Number(e.target.value))}
                                />
                                <select
                                    className="cr-time-unit"
                                    value={cookTimeUnit}
                                    onChange={e => setCookTimeUnit(e.target.value as TimeUnit)}
                                >
                                    <option value="MINUTES">min</option>
                                    <option value="HOURS">h</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Difficulty */}
                    <div className="cr-stat">
                        <div className="cr-puzzle-icon">🧩</div>
                        <div>
                            <span className="cr-stat-label">Difficulté</span>
                            <select
                                className="cr-stat-select"
                                value={difficulty}
                                onChange={e => setDifficulty(e.target.value as Difficulty)}
                            >
                                {Object.entries(DIFFICULTY_LABELS).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                </div>
            </div>

            {/* ── MAIN CONTENT ─────────────────────── */}
            <div className="cr-description-container container">
                <textarea
                    className="cr-description-input"
                    placeholder="Description de la recette..."
                    rows={3}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                />
            </div>

            <div className="container cr-main-content">
                {/* LEFT: Ingredients */}
                <div className="cr-col-left">

                    <h3 className="cr-section-title">Ingrédients</h3>

                    {ingredientSections.map((section, sIdx) => (
                        <div className="cr-ingredient-section" key={sIdx}>
                            <div className="cr-section-header">
                                <input
                                    className="cr-section-input"
                                    placeholder="Titre de la section (ex: Pour le bouillon)"
                                    value={section.name}
                                    onChange={e => updateIngSection(sIdx, { name: e.target.value })}
                                />
                                {ingredientSections.length > 1 && (
                                    <button
                                        className="cr-remove-section-btn"
                                        onClick={() => setIngredientSections(prev => prev.filter((_, i) => i !== sIdx))}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>

                            <div className="cr-ingredient-list">
                                {section.ingredients.map((ing, iIdx) => (
                                    <div className="cr-ingredient-row" key={iIdx}>
                                        <input
                                            className="cr-ingredient-input cr-ing-qty"
                                            placeholder="Qté"
                                            value={ing.quantity}
                                            onChange={e => updateIngredient(sIdx, iIdx, { quantity: e.target.value })}
                                        />
                                        <input
                                            className="cr-ingredient-input cr-ing-unit"
                                            placeholder="Unité"
                                            value={ing.unit}
                                            onChange={e => updateIngredient(sIdx, iIdx, { unit: e.target.value })}
                                        />
                                        <div className="cr-ing-name-wrapper">
                                            <input
                                                className="cr-ingredient-input cr-ing-name"
                                                placeholder="Nom de l'ingrédient"
                                                value={ing.ingredientName}
                                                onChange={e => {
                                                    updateIngredient(sIdx, iIdx, { ingredientName: e.target.value });
                                                    searchIngredients(e.target.value, sIdx, iIdx);
                                                }}
                                                onBlur={() => setTimeout(() => {
                                                    if (activeSearch?.sIdx === sIdx && activeSearch?.iIdx === iIdx) {
                                                        setIngredientSuggestions([]);
                                                        setActiveSearch(null);
                                                    }
                                                }, 200)}
                                            />
                                            {activeSearch?.sIdx === sIdx &&
                                                activeSearch?.iIdx === iIdx &&
                                                ingredientSuggestions.length > 0 && (
                                                    <ul className="cr-ingredient-suggestions">
                                                        {ingredientSuggestions.map(s => (
                                                            <li
                                                                key={s.id}
                                                                onMouseDown={() => selectSuggestion(sIdx, iIdx, s.name)}
                                                            >
                                                                {s.name}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                        </div>
                                        {section.ingredients.length > 1 && (
                                            <button className="cr-remove-btn" onClick={() => removeIngredient(sIdx, iIdx)}>
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button className="cr-add-btn" onClick={() => addIngredient(sIdx)}>
                                    <Plus size={14} /> Ajouter un ingrédient
                                </button>
                            </div>
                        </div>
                    ))}

                    <button
                        className="cr-add-section-btn"
                        onClick={() => setIngredientSections(prev => [...prev, emptyIngredientSection()])}
                    >
                        <Plus size={14} /> Ajouter une section d'ingrédients
                    </button>
                </div>

                {/* RIGHT: Steps */}
                <div className="cr-col-right">
                    <h3 className="cr-section-title">Préparation</h3>

                    {stepSections.map((section, sIdx) => (
                        <div className="cr-step-section" key={sIdx}>
                            <div className="cr-section-header">
                                <input
                                    className="cr-section-input"
                                    placeholder="Titre de la section (ex: Préparation du bouillon)"
                                    value={section.title}
                                    onChange={e => updateStepSection(sIdx, { title: e.target.value })}
                                />
                                {stepSections.length > 1 && (
                                    <button
                                        className="cr-remove-section-btn"
                                        onClick={() => setStepSections(prev => prev.filter((_, i) => i !== sIdx))}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>

                            <div className="cr-step-list">
                                {section.steps.map((step, stIdx) => (
                                    <div className="cr-step" key={stIdx}>
                                        <span className="cr-step-number">{stIdx + 1}.</span>
                                        <div className="cr-step-content-col">
                                            <textarea
                                                className="cr-step-text"
                                                placeholder="Description de l'étape..."
                                                rows={3}
                                                value={step.description}
                                                onChange={e => updateStep(sIdx, stIdx, { description: e.target.value })}
                                            />
                                        </div>
                                        {section.steps.length > 1 && (
                                            <button className="cr-remove-btn" onClick={() => removeStep(sIdx, stIdx)}>
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button className="cr-add-btn" onClick={() => addStep(sIdx)}>
                                    <Plus size={14} /> Ajouter une étape
                                </button>
                            </div>
                        </div>
                    ))}

                    <button
                        className="cr-add-section-btn"
                        onClick={() => setStepSections(prev => [...prev, emptyStepSection()])}
                    >
                        <Plus size={14} /> Ajouter une section d'étapes
                    </button>

                    <button
                        className="cr-submit-btn"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Enregistrement...' : 'Sauvegarder la recette'}
                    </button>
                </div>
            </div>
        </div>
    );
}
