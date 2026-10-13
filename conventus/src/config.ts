/**
 * Application Configuration
 * Stored directly in TypeScript files without relying on .env files.
 */
export const APP_CONFIG = {
  appName: 'Conventus',
  tagline: 'The meeting point of all study tools',
  /**
   * Base URL for the backend API.
   * Empty string ('') allows relative requests like '/api/...' to use the Vite dev server proxy
   * configured to forward to http://127.0.0.1:8000.
   * If running directly without proxy, set to e.g. 'http://127.0.0.1:8000'.
   */
  apiBaseUrl: '',
} as const
