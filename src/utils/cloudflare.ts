/**
 * Cloudflare Backend Utilities
 * Handles communication with Cloudflare Worker API, D1 queries, and R2 asset storage.
 */

export const getWorkerBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_WORKER_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  const localSaved = localStorage.getItem('laclasse_worker_url');
  if (localSaved && localSaved.trim() !== '') {
    return localSaved.trim().replace(/\/+$/, '');
  }
  return '';
};

export const setWorkerBaseUrl = (url: string) => {
  if (url) {
    localStorage.setItem('laclasse_worker_url', url.trim());
  } else {
    localStorage.removeItem('laclasse_worker_url');
  }
};

export const getAdminSecret = (): string => {
  const envSecret = import.meta.env.VITE_ADMIN_SECRET;
  if (envSecret && typeof envSecret === 'string' && envSecret.trim() !== '') {
    return envSecret.trim();
  }
  return localStorage.getItem('laclasse_admin_secret') || '';
};

export const setAdminSecret = (secret: string) => {
  if (secret) {
    localStorage.setItem('laclasse_admin_secret', secret.trim());
    localStorage.setItem('laclasse_admin_auth', 'true');
  } else {
    localStorage.removeItem('laclasse_admin_secret');
    localStorage.removeItem('laclasse_admin_auth');
  }
};

export const isCloudflareConfigured = (): boolean => {
  return true;
};

/**
 * Ensures every API request prepends the `/api/` base prefix to the sanitized Worker URL:
 * Base URL is sanitized with `.replace(/\/+$/, '')`
 * Targets `${BASE_URL}/api/<endpoint>`
 */
export const buildApiUrl = (endpoint: string): string => {
  const rawBase = getWorkerBaseUrl().replace(/\/+$/, '');
  
  let cleanEndpoint = endpoint.trim();
  if (!cleanEndpoint.startsWith('/')) {
    cleanEndpoint = `/${cleanEndpoint}`;
  }

  // Ensure path starts with /api
  let apiPath = cleanEndpoint;
  if (!apiPath.startsWith('/api/') && apiPath !== '/api') {
    apiPath = `/api${cleanEndpoint}`;
  }

  // Prevent double /api/api if baseUrl already has /api at the end
  if (rawBase.endsWith('/api')) {
    const trimmedBase = rawBase.slice(0, -4);
    return `${trimmedBase}${apiPath}`;
  }

  return `${rawBase}${apiPath}`;
};

/**
 * Validates response Content-Type before parsing JSON.
 * If response header content-type does not include application/json, throws a clear descriptive error
 * instead of calling res.json() directly.
 */
export async function parseJsonResponse<T = any>(response: Response): Promise<T> {
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  
  if (!contentType.includes('application/json')) {
    const rawBody = await response.text();
    const isHtml = rawBody.trim().toLowerCase().startsWith('<!doctype') || 
                   rawBody.trim().toLowerCase().startsWith('<html') ||
                   rawBody.trim().toLowerCase().includes('<head>');

    if (isHtml) {
      throw new Error(
        `Cloudflare Worker API returned an HTML document instead of JSON (HTTP ${response.status}). ` +
        `Expected 'application/json' but received '${contentType || 'text/html'}'. ` +
        `Verify that VITE_WORKER_URL is pointing to an active Cloudflare Worker.`
      );
    }

    throw new Error(
      `Cloudflare Worker API returned non-JSON response (HTTP ${response.status}). ` +
      `Content-Type: '${contentType || 'unknown'}'. Body: ${rawBody.slice(0, 100)}`
    );
  }

  return response.json();
}

/**
 * Perform Fetch request to Cloudflare Worker API with /api/ prepended and headers configured
 */
export async function workerFetch(
  endpoint: string,
  options: RequestInit = {},
  requireAdmin: boolean = false
): Promise<Response> {
  const fullUrl = buildApiUrl(endpoint);

  const headers = new Headers(options.headers || {});
  
  if (requireAdmin) {
    const secret = getAdminSecret();
    if (secret) {
      headers.set('Authorization', `Bearer ${secret}`);
    }
  }

  // Do not set Content-Type for FormData
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(fullUrl, {
    ...options,
    headers,
  });
}
