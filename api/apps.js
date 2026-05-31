import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_CONFIG = {
  owner: 'vinhduyetweb-debug',
  repo: 'tiktokminiapp',
  branch: 'main',
  path: 'src/data/apps.json'
};

function getConfig() {
  return {
    owner: process.env.GITHUB_OWNER || DEFAULT_CONFIG.owner,
    repo: process.env.GITHUB_REPO || DEFAULT_CONFIG.repo,
    branch: process.env.GITHUB_BRANCH || DEFAULT_CONFIG.branch,
    path: process.env.GITHUB_APPS_PATH || DEFAULT_CONFIG.path
  };
}

function isAuthorized(req) {
  const configuredSecret = process.env.ADMIN_SECRET;
  const providedSecret = req.headers['x-admin-secret'];

  return Boolean(configuredSecret && providedSecret && providedSecret === configuredSecret);
}

function getGitHubToken() {
  return process.env.GITHUB_TOKEN || '';
}

function getContentUrl() {
  const config = getConfig();
  return `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`;
}

function encodeBase64(value) {
  return Buffer.from(value, 'utf8').toString('base64');
}

function decodeBase64(value) {
  return Buffer.from(String(value || '').replace(/\n/g, ''), 'base64').toString('utf8');
}

function normalizeUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '').toLowerCase();
}

function slugify(value) {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || `app-${Date.now()}`;
}

function validateVercelUrl(url) {
  const value = String(url || '').trim();

  if (!value) {
    return 'Please enter a Vercel URL.';
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(value);
  } catch {
    return 'Please enter a valid URL.';
  }

  if (parsedUrl.protocol !== 'https:') {
    return 'Vercel URL must start with https://';
  }

  if (!parsedUrl.hostname.endsWith('.vercel.app')) {
    return 'Vercel URL must use a .vercel.app domain.';
  }

  return '';
}

function validateOptionalUrl(url, label, hostname) {
  const value = String(url || '').trim();

  if (!value) {
    return '';
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(value);
  } catch {
    return `${label} must be a valid URL.`;
  }

  if (parsedUrl.protocol !== 'https:') {
    return `${label} must start with https://`;
  }

  if (hostname && parsedUrl.hostname !== hostname) {
    return `${label} must use ${hostname}.`;
  }

  return '';
}

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

async function readRequestBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  if (typeof req.body === 'string') {
    return JSON.parse(req.body || '{}');
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const body = Buffer.concat(chunks).toString('utf8');
  return body ? JSON.parse(body) : {};
}

async function loadGitHubRegistry() {
  const token = getGitHubToken();
  const config = getConfig();

  if (!token) {
    throw new Error('Missing GITHUB_TOKEN environment variable.');
  }

  const response = await fetch(`${getContentUrl()}?ref=${config.branch}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  if (!response.ok) {
    throw new Error('Unable to load apps.json from GitHub.');
  }

  const file = await response.json();
  const parsed = JSON.parse(decodeBase64(file.content));
  const apps = normalizeRegistry(parsed);

  return {
    apps: Array.isArray(apps) ? apps : [],
    sha: file.sha
  };
}

async function loadStaticRegistry() {
  const filePath = path.join(process.cwd(), 'src', 'data', 'apps.json');
  const file = await fs.readFile(filePath, 'utf8');
  return normalizeRegistry(JSON.parse(file));
}

function normalizeRegistry(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.apps)) {
    return value.apps;
  }

  return [];
}

async function saveGitHubRegistry({ apps, sha, message }) {
  const token = getGitHubToken();
  const config = getConfig();

  const response = await fetch(getContentUrl(), {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({
      message,
      content: encodeBase64(`${JSON.stringify(apps, null, 2)}\n`),
      sha,
      branch: config.branch
    })
  });

  if (!response.ok) {
    throw new Error('Unable to save apps.json to GitHub.');
  }

  return response.json();
}

function createUserApp(body) {
  const name = cleanText(body.name, 80);
  const liveUrl = cleanText(body.liveUrl, 240);
  const githubUrl = cleanText(body.githubUrl, 240);
  const description = cleanText(body.description, 240);
  const category = cleanText(body.category, 40).toLowerCase();
  const icon = cleanText(body.icon, 8);

  return {
    id: `${slugify(name)}-${Date.now()}`,
    name,
    description: description || 'User-added mini app.',
    category: category || 'custom',
    icon: icon || '📱',
    liveUrl,
    githubUrl,
    status: 'live',
    source: 'user',
    editable: true
  };
}

async function addApp(req, res) {
  const body = await readRequestBody(req);
  const name = cleanText(body.name, 80);
  const liveUrl = cleanText(body.liveUrl, 240);
  const urlError = validateVercelUrl(liveUrl);
  const githubUrlError = validateOptionalUrl(body.githubUrl, 'GitHub URL', 'github.com');

  if (!name) {
    return res.status(400).json({ ok: false, error: 'Please enter an app name.' });
  }

  if (urlError) {
    return res.status(400).json({ ok: false, error: urlError });
  }

  if (githubUrlError) {
    return res.status(400).json({ ok: false, error: githubUrlError });
  }

  const registry = await loadGitHubRegistry();
  const liveUrlKey = normalizeUrl(liveUrl);

  if (registry.apps.some((app) => normalizeUrl(app.liveUrl) === liveUrlKey)) {
    return res.status(409).json({ ok: false, error: 'This Vercel URL already exists in apps.json.' });
  }

  const nextApp = createUserApp(body);
  const apps = [...registry.apps, nextApp];

  await saveGitHubRegistry({
    apps,
    sha: registry.sha,
    message: `Add ${nextApp.name} to mini app registry`
  });

  return res.status(200).json({ ok: true, app: nextApp, apps });
}

async function listApps(req, res) {
  try {
    const registry = getGitHubToken()
      ? (await loadGitHubRegistry()).apps
      : await loadStaticRegistry();

    return res.status(200).json({ ok: true, apps: registry });
  } catch {
    const registry = await loadStaticRegistry();
    return res.status(200).json({ ok: true, apps: registry });
  }
}

async function deleteApp(req, res) {
  const body = await readRequestBody(req);
  const appId = String(body.id || '').trim();

  if (!appId) {
    return res.status(400).json({ ok: false, error: 'Missing app id.' });
  }

  const registry = await loadGitHubRegistry();
  const target = registry.apps.find((app) => app.id === appId);

  if (!target || target.source !== 'user' || target.editable !== true) {
    return res.status(403).json({ ok: false, error: 'Only editable user apps can be deleted.' });
  }

  const apps = registry.apps.filter((app) => app.id !== appId);

  await saveGitHubRegistry({
    apps,
    sha: registry.sha,
    message: `Remove ${target.name} from mini app registry`
  });

  return res.status(200).json({ ok: true, apps });
}

export default async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  if (req.method === 'GET') {
    return await listApps(req, res);
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
  }

  try {
    if (req.method === 'POST') {
      return await addApp(req, res);
    }

    return await deleteApp(req, res);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Unable to update apps.json.'
    });
  }
}
