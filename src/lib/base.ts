/**
 * Base URL helper for subfolder deployments.
 * Set BASE_PATH env var (e.g. BASE_PATH=/nippon-island-editor) and Astro will serve
 * the app under that path. This helper prefixes all app links and API calls accordingly.
 */
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Prefix a path with the base URL. */
export function url(path: string): string {
  return `${BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}
