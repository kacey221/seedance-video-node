import crypto from 'node:crypto';
import type { Express, Request, Response } from 'express';

const pendingStates = new Set<string>();
const COOKIE_NAME = 'pinterest_access_token';
const DEFAULT_SCOPES = 'user_accounts:read,pins:read,boards:read';

function getConfig() {
  const clientId = process.env.PINTEREST_CLIENT_ID;
  const clientSecret = process.env.PINTEREST_CLIENT_SECRET;
  const redirectUri = process.env.PINTEREST_REDIRECT_URI || 'http://localhost:3011/api/pinterest/callback';
  if (!clientId || !clientSecret) {
    throw new Error('Pinterest OAuth is not configured. Set PINTEREST_CLIENT_ID and PINTEREST_CLIENT_SECRET.');
  }
  return { clientId, clientSecret, redirectUri };
}

function getCookie(req: Request): string | undefined {
  return req.headers.cookie?.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`))?.[1];
}

export function registerPinterestRoutes(app: Express): void {
  app.get('/api/pinterest/login', (_req, res) => {
    try {
      const { clientId, redirectUri } = getConfig();
      const state = crypto.randomBytes(24).toString('hex');
      pendingStates.add(state);
      const url = new URL('https://www.pinterest.com/oauth/');
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', process.env.PINTEREST_SCOPES || DEFAULT_SCOPES);
      url.searchParams.set('state', state);
      res.redirect(url.toString());
    } catch (error) {
      res.status(503).send(error instanceof Error ? error.message : 'Pinterest OAuth is unavailable.');
    }
  });

  app.get('/api/pinterest/callback', async (req, res) => {
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    if (!state || !pendingStates.delete(state) || !code) {
      res.status(400).send('Invalid Pinterest OAuth callback.');
      return;
    }

    try {
      const { clientId, clientSecret, redirectUri } = getConfig();
      const response = await fetch('https://api.pinterest.com/v5/oauth/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
      });
      const data = await response.json() as { access_token?: string; error_description?: string };
      if (!response.ok || !data.access_token) throw new Error(data.error_description || 'Pinterest token exchange failed.');
      res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(data.access_token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`);
      res.redirect(process.env.PINTEREST_SUCCESS_REDIRECT_URI || 'http://localhost:3011/?pinterest=connected');
    } catch (error) {
      res.status(502).send(error instanceof Error ? error.message : 'Pinterest login failed.');
    }
  });

  app.get('/api/pinterest/me', async (req, res) => {
    const token = getCookie(req);
    if (!token) {
      res.json({ connected: false });
      return;
    }
    const response = await fetch('https://api.pinterest.com/v5/user_account', {
      headers: { Authorization: `Bearer ${decodeURIComponent(token)}` },
    });
    if (!response.ok) {
      res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
      res.json({ connected: false });
      return;
    }
    res.json({ connected: true, profile: await response.json() });
  });

  app.get('/api/pinterest/content', async (req, res) => {
    const token = getCookie(req);
    if (!token) {
      res.status(401).json({ error: 'Pinterest login is required.' });
      return;
    }

    try {
      const accessToken = decodeURIComponent(token);
      const fetchAll = async (path: string) => {
        const items: unknown[] = [];
        let bookmark = '';
        for (let page = 0; page < 20; page += 1) {
          const url = new URL(`https://api.pinterest.com/v5/${path}`);
          url.searchParams.set('page_size', '100');
          if (bookmark) url.searchParams.set('bookmark', bookmark);
          const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
          const data = await response.json() as { items?: unknown[]; bookmark?: string; message?: string };
          if (!response.ok) throw new Error(data.message || `Pinterest ${path} request failed.`);
          items.push(...(data.items || []));
          if (!data.bookmark || !data.items?.length) break;
          bookmark = data.bookmark;
        }
        return items;
      };

      const profileResponse = await fetch('https://api.pinterest.com/v5/user_account', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = await profileResponse.json();
      if (!profileResponse.ok) throw new Error(profile.message || 'Pinterest profile request failed.');
      const [boards, pins] = await Promise.all([fetchAll('boards'), fetchAll('pins')]);
      res.json({ connected: true, profile, boards, pins });
    } catch (error) {
      res.status(502).json({ error: error instanceof Error ? error.message : 'Pinterest content request failed.' });
    }
  });

  app.post('/api/pinterest/logout', (_req, res) => {
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
    res.json({ connected: false });
  });

  app.get('/api/pinterest/search', async (req, res) => {
    const token = getCookie(req);
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!token || !query) {
      res.status(400).json({ error: 'Pinterest login and a search query are required.' });
      return;
    }
    const url = new URL('https://api.pinterest.com/v5/search/pins');
    url.searchParams.set('query', query);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${decodeURIComponent(token)}` } });
    res.status(response.status).json(await response.json());
  });
}
