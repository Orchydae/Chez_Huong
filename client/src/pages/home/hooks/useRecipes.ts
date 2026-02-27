import { useState, useEffect } from 'react';

// Shape of the Recipe data returned by GET /recipes
export interface RecipeDTO {
    id: number;
    title: string;
    title_fr: string | null;
    description: string | null;
    description_fr: string | null;
    prepTime: number;
    prepTimeUnit: 'MINUTES' | 'HOURS';
    cookTime: number;
    cookTimeUnit: 'MINUTES' | 'HOURS';
    difficulty: string;
    type: string;
    cuisine: string;
    servings: number;
    authorId: string;
    imageUrl: string | null;
    particularities?: string[];
}

interface UseRecipesResult {
    recipes: RecipeDTO[];
    loading: boolean;
    error: string | null;
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function useRecipes(): UseRecipesResult {
    const [recipes, setRecipes] = useState<RecipeDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function fetchRecipes() {
            try {
                setLoading(true);
                setError(null);
                const res = await fetch(`${API_BASE_URL}/recipes`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data: RecipeDTO[] = await res.json();
                if (!cancelled) setRecipes(data);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Unknown error');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchRecipes();
        return () => { cancelled = true; };
    }, []);

    return { recipes, loading, error };
}
