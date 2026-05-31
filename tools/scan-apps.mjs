import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const OWNER = 'vinhduyetweb-debug';
const EXCLUDED_REPOS = new Set(['tiktokminiapp']);
const ROOT = process.cwd();
const EXISTING_APPS_PATH = path.join(ROOT, 'src', 'data', 'apps.json');
const GENERATED_APPS_PATH = path.join(ROOT, 'apps.generated.json');
const REPORT_PATH = path.join(ROOT, 'tools', 'scan-report.md');
const VERCEL_PROJECTS_PATH = path.join(ROOT, 'tools', 'vercel-projects.json');

const KNOWN_LIVE_URLS = new Map([
  ['abcmyanh', 'https://abcmyanh.vercel.app/'],
  ['vinh.khobaukyuc', 'https://vinh-khobaukyuc.vercel.app/'],
  ['vinh.paint', 'https://vinh-paint.vercel.app/'],
  ['vinh.tracuutailieu', 'https://vinhtracuutailieu.vercel.app/'],
  ['vinh.xemvideo', 'https://vinh-xemvideo.vercel.app/'],
  ['vinh.doantraicay', 'https://vinh-doantraicay.vercel.app/'],
  ['vinh.doanconvat', 'https://vinh-doanconvat.vercel.app/']
]);

const CATEGORY_RULES = [
  { pattern: /abc|alphabet|chu|hoc|doan|quiz|fruit|trai|convat|animal/i, category: 'education', icon: '📚' },
  { pattern: /paint|draw|color|to-?mau/i, category: 'creative', icon: '🎨' },
  { pattern: /video|tiktok|media/i, category: 'media', icon: '🎬' },
  { pattern: /qr|tracuu|tai-?lieu|document|tool/i, category: 'tool', icon: '🔧' },
  { pattern: /btc|crypto|coin|finance/i, category: 'finance', icon: '₿' },
  { pattern: /memory|khobau|game/i, category: 'game', icon: '🎮' }
];

function normalizeRepoName(name) {
  return String(name || '').trim().toLowerCase();
}

function normalizeUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '').toLowerCase();
}

function titleCaseRepoName(name) {
  return String(name || '')
    .replace(/^vinh[._-]?/i, 'Vinh ')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `app-${Date.now()}`;
}

function inferCategoryAndIcon(repo) {
  const source = `${repo.name} ${repo.description || ''}`;
  const match = CATEGORY_RULES.find((rule) => rule.pattern.test(source));

  if (match) {
    return { category: match.category, icon: match.icon };
  }

  return { category: 'portfolio', icon: '📱' };
}

function inferLiveUrl(repoName, vercelProjects) {
  const normalizedName = normalizeRepoName(repoName);

  if (KNOWN_LIVE_URLS.has(normalizedName)) {
    return KNOWN_LIVE_URLS.get(normalizedName);
  }

  const mappedProjectUrl = findVercelProjectUrl(repoName, vercelProjects);

  if (mappedProjectUrl) {
    return mappedProjectUrl;
  }

  if (/^[a-z0-9-]+$/i.test(repoName)) {
    return `https://${repoName.toLowerCase()}.vercel.app/`;
  }

  return '';
}

function findVercelProjectUrl(repoName, vercelProjects) {
  const normalizedRepoName = slugify(repoName);

  for (const project of vercelProjects) {
    const projectName = slugify(project.name || project.projectName || '');

    if (projectName !== normalizedRepoName) {
      continue;
    }

    const targets = [
      project.latestDeployments?.[0]?.url,
      project.targets?.production?.url,
      project.alias?.[0],
      project.url
    ].filter(Boolean);

    const target = targets.find((value) => typeof value === 'string');

    if (!target) {
      return '';
    }

    return target.startsWith('http') ? target : `https://${target.replace(/^\/+/, '')}/`;
  }

  return '';
}

function isLikelyMiniAppRepo(repo) {
  if (repo.fork || repo.archived) {
    return false;
  }

  const name = normalizeRepoName(repo.name);

  if (EXCLUDED_REPOS.has(name)) {
    return false;
  }

  const text = `${repo.name} ${repo.description || ''}`.toLowerCase();

  if (/dotfiles|notes|test-repo|sandbox|config|profile/.test(text)) {
    return false;
  }

  return true;
}

function toApp(repo, vercelProjects) {
  const liveUrl = inferLiveUrl(repo.name, vercelProjects);
  const { category, icon } = inferCategoryAndIcon(repo);

  return {
    id: slugify(repo.name),
    name: titleCaseRepoName(repo.name),
    description: repo.description || `Portfolio mini app from ${repo.name}.`,
    category,
    icon,
    liveUrl,
    githubUrl: repo.html_url,
    status: liveUrl ? 'live' : 'github-only',
    source: 'github-scan',
    editable: false
  };
}

async function fetchRepos() {
  const repos = [];
  let page = 1;

  while (true) {
    const url = `https://api.github.com/users/${OWNER}/repos?per_page=100&page=${page}&sort=updated`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'tiktokminiapp-scan-apps'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub repo scan failed: ${response.status} ${response.statusText}`);
    }

    const batch = await response.json();

    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    repos.push(...batch);
    page += 1;
  }

  return repos;
}

async function readJsonFile(filePath, fallback) {
  try {
    const file = await fs.readFile(filePath, 'utf8');
    return JSON.parse(file);
  } catch {
    return fallback;
  }
}

function normalizeVercelProjects(projects) {
  if (Array.isArray(projects)) {
    return projects;
  }

  if (Array.isArray(projects?.projects)) {
    return projects.projects;
  }

  if (Array.isArray(projects?.data)) {
    return projects.data;
  }

  return [];
}

function compareApps(existingApps, generatedApps) {
  const existingByGithub = new Map(existingApps.map((app) => [normalizeUrl(app.githubUrl), app]));
  const existingByLiveUrl = new Map(existingApps.filter((app) => app.liveUrl).map((app) => [normalizeUrl(app.liveUrl), app]));
  const generatedByLiveUrl = new Map();
  const duplicateLiveUrls = [];

  generatedApps.forEach((app) => {
    const liveUrlKey = normalizeUrl(app.liveUrl);

    if (!liveUrlKey) {
      return;
    }

    if (generatedByLiveUrl.has(liveUrlKey)) {
      duplicateLiveUrls.push([generatedByLiveUrl.get(liveUrlKey), app]);
      return;
    }

    generatedByLiveUrl.set(liveUrlKey, app);
  });

  const alreadyListed = generatedApps.filter((app) => existingByGithub.has(normalizeUrl(app.githubUrl)));
  const missingGitHubRepos = generatedApps.filter((app) => !existingByGithub.has(normalizeUrl(app.githubUrl)));
  const missingVercelUrls = generatedApps.filter((app) => !app.liveUrl);
  const githubOnly = generatedApps.filter((app) => app.status === 'github-only');
  const generatedLiveNotListed = generatedApps.filter((app) => app.liveUrl && !existingByLiveUrl.has(normalizeUrl(app.liveUrl)));

  return {
    alreadyListed,
    missingGitHubRepos,
    missingVercelUrls,
    githubOnly,
    duplicateLiveUrls,
    generatedLiveNotListed
  };
}

function formatList(apps, emptyMessage = 'None') {
  if (!apps.length) {
    return `- ${emptyMessage}`;
  }

  return apps.map((app) => `- ${app.name} (${app.githubUrl || app.liveUrl || app.id})`).join('\n');
}

function formatDuplicateList(duplicates) {
  if (!duplicates.length) {
    return '- None';
  }

  return duplicates
    .map(([first, second]) => `- ${first.name} and ${second.name}: ${first.liveUrl}`)
    .join('\n');
}

function createReport({ repos, candidates, existingApps, comparison, usedVercelProjects }) {
  return `# Mini App Scan Report

Generated: ${new Date().toISOString()}

## Summary

- GitHub owner: ${OWNER}
- Public GitHub repos found: ${repos.length}
- App candidates generated: ${candidates.length}
- Existing apps in src/data/apps.json: ${existingApps.length}
- Used tools/vercel-projects.json: ${usedVercelProjects ? 'yes' : 'no'}

## Apps Already Listed

${formatList(comparison.alreadyListed)}

## Missing GitHub Repos

${formatList(comparison.missingGitHubRepos)}

## Missing Vercel URLs

${formatList(comparison.missingVercelUrls)}

## Apps With GitHub Only

${formatList(comparison.githubOnly)}

## Generated Live URLs Not In Existing apps.json

${formatList(comparison.generatedLiveNotListed)}

## Possible Duplicates

${formatDuplicateList(comparison.duplicateLiveUrls)}

## Review Before Replacing apps.json

- Confirm inferred Vercel URLs actually resolve.
- Confirm categories and icons are correct.
- Remove any repos that are not portfolio mini apps.
- Keep TikTokMiniApp excluded from the final registry.
- Copy reviewed entries from apps.generated.json into src/data/apps.json manually.
`;
}

async function main() {
  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });

  const [repos, existingApps, rawVercelProjects] = await Promise.all([
    fetchRepos(),
    readJsonFile(EXISTING_APPS_PATH, []),
    readJsonFile(VERCEL_PROJECTS_PATH, null)
  ]);

  const vercelProjects = normalizeVercelProjects(rawVercelProjects);
  const candidates = repos
    .filter(isLikelyMiniAppRepo)
    .map((repo) => toApp(repo, vercelProjects))
    .sort((a, b) => a.name.localeCompare(b.name));

  const comparison = compareApps(existingApps, candidates);
  const report = createReport({
    repos,
    candidates,
    existingApps,
    comparison,
    usedVercelProjects: Boolean(rawVercelProjects)
  });

  await fs.writeFile(GENERATED_APPS_PATH, `${JSON.stringify(candidates, null, 2)}\n`, 'utf8');
  await fs.writeFile(REPORT_PATH, report, 'utf8');

  console.log(`GitHub repos found: ${repos.length}`);
  console.log(`App candidates generated: ${candidates.length}`);
  console.log(`Already listed: ${comparison.alreadyListed.length}`);
  console.log(`Missing GitHub repos: ${comparison.missingGitHubRepos.length}`);
  console.log(`Missing Vercel URLs: ${comparison.missingVercelUrls.length}`);
  console.log(`GitHub only: ${comparison.githubOnly.length}`);
  console.log(`Possible duplicates: ${comparison.duplicateLiveUrls.length}`);
  console.log(`Wrote ${path.relative(ROOT, GENERATED_APPS_PATH)}`);
  console.log(`Wrote ${path.relative(ROOT, REPORT_PATH)}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
