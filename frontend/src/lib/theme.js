export const THEME_STORAGE_KEY = 'talentai-theme';

/** Saved choice wins; with no (or an invalid) saved value the app is light. The OS setting is deliberately ignored. */
export function resolveTheme(saved) {
  return saved === 'dark' || saved === 'light' ? saved : 'light';
}
