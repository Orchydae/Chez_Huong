// Combining diacritical marks (the accents NFD splits off). Built via the
// RegExp constructor so the source stays plain ASCII and readable.
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

/**
 * Turns a recipe title into a clean, ASCII, URL-safe slug.
 *
 * Vietnamese diacritics are flattened ("Banh Mi" from "Bánh Mì") via Unicode
 * NFD decomposition; the letter d-stroke (which NFD does NOT decompose) is
 * handled explicitly. Returns an empty string when the title has no usable
 * ASCII characters; the caller (RecipesService) substitutes a fallback and
 * owns database uniqueness (the "-2" suffix). See ADR-03.
 */
export function slugify(input: string): string {
    return input
        .normalize('NFD') // split accented letters into base + combining mark
        .replace(COMBINING_MARKS, '') // strip the combining marks
        .replace(/[đĐ]/g, 'd') // d-stroke (đ / Đ) -> d
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') // any run of non-alphanumerics -> single hyphen
        .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
}
