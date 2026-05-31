import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const GENERATED_PATH = path.join(ROOT, 'apps.generated.json');
const EXISTING_PATH = path.join(ROOT, 'public', 'apps.json');
const VERCEL_PROJECTS_PATH = path.join(ROOT, 'tools', 'vercel-projects.json');
const FINAL_PATH = path.join(ROOT, 'apps.final.json');
const REPORT_PATH = path.join(ROOT, 'tools', 'final-registry-report.md');

const EXCLUDED_REPOS = new Set(['tiktokminiapp', 'vinh.test1', 'vinh.test2']);
const KEEP_REPOS = new Set([
  'pccckv8',
  'uocmonghenghiep',
  'vinh_crypto',
  'vinh.doandovat',
  'vinh.doannghenghiep',
  'vinh.ghepanh',
  'vinh.tindung',
  'vinh.tiktok'
]);

const KNOWN_LIVE_URLS = new Map([
  ['abcmyanh', 'https://abcmyanh.vercel.app/'],
  ['vinh.khobaukyuc', 'https://vinh-khobaukyuc.vercel.app/'],
  ['vinh.paint', 'https://vinh-paint.vercel.app/'],
  ['vinh.tracuutailieu', 'https://vinhtracuutailieu.vercel.app/'],
  ['vinh.xemvideo', 'https://vinh-xemvideo.vercel.app/'],
  ['vinh.doantraicay', 'https://vinh-doantraicay.vercel.app/'],
  ['vinh.doanconvat', 'https://vinh-doanconvat.vercel.app/'],
  ['vinhqr', 'https://vinhqr.vercel.app/'],
  ['vinh_crypto', 'https://vinhcrypto.vercel.app/'],
  ['vinh.tiktok', 'https://vinh-tiktok.vercel.app/']
]);

const PREFERRED_COPY = new Map([
  ['abcmyanh', { name: 'ABCMYANH', description: 'Mini app học chữ cái và số cho trẻ em.', category: 'education', icon: '📚' }],
  ['vinh.khobaukyuc', { name: 'Kho Báu Ký Ức', description: 'Mini game rèn luyện trí nhớ.', category: 'game', icon: '🧠' }],
  ['vinh.paint', { name: 'Vinh Paint', description: 'Ứng dụng tô màu sáng tạo.', category: 'creative', icon: '🎨' }],
  ['vinh.tracuutailieu', { name: 'Tra Cứu Tài Liệu', description: 'Công cụ tra cứu tài liệu nhanh.', category: 'tool', icon: '📖' }],
  ['vinh.xemvideo', { name: 'Xem Video', description: 'Mini app xem video giải trí.', category: 'media', icon: '🎬' }],
  ['vinh.doantraicay', { name: 'Đoán Trái Cây', description: 'Mini game học trái cây qua câu đố.', category: 'education', icon: '🍎' }],
  ['vinh.doanconvat', { name: 'Đoán Con Vật', description: 'Mini game đoán con vật cho trẻ em.', category: 'education', icon: '🐶' }],
  ['vinhqr', { name: 'Vinh QR', description: 'Ứng dụng tạo mã QR.', category: 'tool', icon: '🔳' }],
  ['vinh_btc', { name: 'Vinh BTC', description: 'Ứng dụng theo dõi Bitcoin.', category: 'finance', icon: '₿' }],
  ['vinh_crypto', { name: 'Vinh Crypto', description: 'Ứng dụng theo dõi thị trường crypto.', category: 'finance', icon: '💰' }],
  ['vinh.doandovat', { name: 'Đoán Đồ Vật', description: 'Mini game đoán đồ vật cho trẻ em.', category: 'education', icon: '🧸' }],
  ['vinh.doannghenghiep', { name: 'Đoán Nghề Nghiệp', description: 'Mini game khám phá nghề nghiệp.', category: 'education', icon: '👨‍🚒' }],
  ['vinh.ghepanh', { name: 'Vinh Ghép Ảnh', description: 'Ứng dụng ghép ảnh sáng tạo.', category: 'creative', icon: '🖼️' }],
  ['vinh.tindung', { name: 'Vinh Tín Dụng', description: 'Ứng dụng tính toán hoặc tra cứu tín dụng.', category: 'finance', icon: '💳' }],
  ['vinh.tiktok', { name: 'Vinh TikTok', description: 'Mini app trải nghiệm video dọc.', category: 'media', icon: '📱' }],
  ['pccckv8', { name: 'PCCCK V8', description: 'Mini app portfolio được phát hiện từ GitHub.', category: 'portfolio', icon: '📱' }],
  ['uocmonghenghiep', { name: 'Ước Mộng Hề Nghiệp', description: 'Mini app portfolio được phát hiện từ GitHub.', category: 'portfolio', icon: '🌟' }]
]);

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function normalizeRepoKey(app) {
  const githubUrl = String(app.githubUrl || '').trim();
  const repoName = githubUrl.split('/').filter(Boolean).pop() || app.id || app.name;
  return repoName.toLowerCase();
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '').toLowerCase();
}

function normalizeVercelProjects(projects) {
  if (Array.isArray(projects)) return projects;
  if (Array.isArray(projects?.projects)) return projects.projects;
  if (Array.isArray(projects?.data)) return projects.data;
  return [];
}

function findVercelUrl(repoKey, app, vercelProjects) {
  if (KNOWN_LIVE_URLS.has(repoKey)) {
    return KNOWN_LIVE_URLS.get(repoKey);
  }

  const appLiveUrl = String(app.liveUrl || '').trim();
  if (appLiveUrl) {
    return appLiveUrl;
  }

  const normalizedRepo = normalizeName(repoKey);
  const project = vercelProjects.find((item) => {
    const names = [
      item.name,
      item.projectName,
      item.link?.repo,
      item.link?.repoName
    ].filter(Boolean).map(normalizeName);

    return names.includes(normalizedRepo);
  });

  if (!project) {
    return '';
  }

  const urls = [
    project.latestDeployments?.[0]?.url,
    project.targets?.production?.url,
    project.alias?.[0],
    project.url
  ].filter(Boolean);

  const url = urls.find((value) => typeof value === 'string');
  if (!url) return '';

  return url.startsWith('http') ? url : `https://${url.replace(/^\/+/, '')}/`;
}

function getStatus(app, liveUrl) {
  if (app.status === 'archived') return 'archived';
  return liveUrl ? 'live' : 'github-only';
}

function cleanApp(app, vercelProjects) {
  const repoKey = normalizeRepoKey(app);
  const preferred = PREFERRED_COPY.get(repoKey) || {};
  const liveUrl = findVercelUrl(repoKey, app, vercelProjects);

  return {
    id: normalizeName(preferred.name || app.id || repoKey),
    name: preferred.name || app.name || repoKey,
    description: preferred.description || app.description || `Portfolio mini app from ${repoKey}.`,
    category: preferred.category || app.category || 'portfolio',
    icon: preferred.icon || app.icon || '📱',
    liveUrl,
    githubUrl: app.githubUrl || '',
    status: getStatus(app, liveUrl),
    source: 'default',
    editable: false
  };
}

function shouldExclude(app) {
  const repoKey = normalizeRepoKey(app);
  const normalizedId = normalizeName(app.id || app.name);

  if (repoKey === 'tiktokminiapp' || normalizedId === 'tiktokminiapp') {
    return { excluded: true, reason: 'hub repository' };
  }

  if (EXCLUDED_REPOS.has(repoKey)) {
    return { excluded: true, reason: 'obvious test repository' };
  }

  return { excluded: false, reason: '' };
}

function mergeApps(existingApps, generatedApps, vercelProjects) {
  const byGithub = new Map();
  const excluded = [];

  [...generatedApps, ...existingApps].forEach((app) => {
    const decision = shouldExclude(app);
    const repoKey = normalizeRepoKey(app);

    if (decision.excluded) {
      excluded.push({ repo: repoKey, reason: decision.reason });
      return;
    }

    if (!KEEP_REPOS.has(repoKey) && /test[0-9]*$/i.test(repoKey)) {
      excluded.push({ repo: repoKey, reason: 'obvious test repository' });
      return;
    }

    const githubKey = normalizeUrl(app.githubUrl) || repoKey;
    const nextApp = cleanApp(app, vercelProjects);
    const current = byGithub.get(githubKey);

    if (!current || (!current.liveUrl && nextApp.liveUrl)) {
      byGithub.set(githubKey, nextApp);
    }
  });

  const byLiveUrl = new Map();
  const duplicates = [];

  const finalApps = [...byGithub.values()].filter((app) => {
    const liveKey = normalizeUrl(app.liveUrl);

    if (!liveKey) {
      return true;
    }

    if (byLiveUrl.has(liveKey)) {
      duplicates.push({ kept: byLiveUrl.get(liveKey).name, removed: app.name, liveUrl: app.liveUrl });
      return false;
    }

    byLiveUrl.set(liveKey, app);
    return true;
  });

  finalApps.sort((a, b) => a.name.localeCompare(b.name, 'vi'));

  return { finalApps, excluded, duplicates };
}

function listApps(apps) {
  return apps.length
    ? apps.map((app) => `- ${app.name} (${app.status})`).join('\n')
    : '- None';
}

function listExcluded(excluded) {
  return excluded.length
    ? excluded.map((item) => `- ${item.repo}: ${item.reason}`).join('\n')
    : '- None';
}

function listDuplicates(duplicates) {
  return duplicates.length
    ? duplicates.map((item) => `- Kept ${item.kept}, removed ${item.removed}: ${item.liveUrl}`).join('\n')
    : '- None';
}

function createReport({ finalApps, excluded, duplicates, usedVercelProjects }) {
  const liveApps = finalApps.filter((app) => app.status === 'live');
  const githubOnlyApps = finalApps.filter((app) => app.status === 'github-only');
  const archivedApps = finalApps.filter((app) => app.status === 'archived');

  return `# Final Registry Report

Generated: ${new Date().toISOString()}

## Summary

- Total final apps: ${finalApps.length}
- Live apps: ${liveApps.length}
- GitHub-only apps: ${githubOnlyApps.length}
- Archived apps: ${archivedApps.length}
- Used tools/vercel-projects.json: ${usedVercelProjects ? 'yes' : 'no'}

## Live Apps

${listApps(liveApps)}

## GitHub-Only Apps

${listApps(githubOnlyApps)}

## Archived Apps

${listApps(archivedApps)}

## Excluded Repos

${listExcluded(excluded)}

## Possible Duplicates Removed

${listDuplicates(duplicates)}

## Next Step

Review apps.final.json. If it looks correct, replace the active registry with:

\`\`\`powershell
Copy-Item apps.final.json public\\apps.json
cmd /c npm run build
\`\`\`
`;
}

async function main() {
  const [generatedApps, existingApps, rawVercelProjects] = await Promise.all([
    readJson(GENERATED_PATH, []),
    readJson(EXISTING_PATH, []),
    readJson(VERCEL_PROJECTS_PATH, null)
  ]);

  const vercelProjects = normalizeVercelProjects(rawVercelProjects);
  const { finalApps, excluded, duplicates } = mergeApps(existingApps, generatedApps, vercelProjects);
  const report = createReport({
    finalApps,
    excluded,
    duplicates,
    usedVercelProjects: Boolean(rawVercelProjects)
  });

  await fs.writeFile(FINAL_PATH, `${JSON.stringify(finalApps, null, 2)}\n`, 'utf8');
  await fs.writeFile(REPORT_PATH, report, 'utf8');

  console.log(`Total final apps: ${finalApps.length}`);
  console.log(`Live apps: ${finalApps.filter((app) => app.status === 'live').length}`);
  console.log(`GitHub-only apps: ${finalApps.filter((app) => app.status === 'github-only').length}`);
  console.log(`Archived apps: ${finalApps.filter((app) => app.status === 'archived').length}`);
  console.log(`Excluded repos: ${excluded.length}`);
  console.log(`Wrote ${path.relative(ROOT, FINAL_PATH)}`);
  console.log(`Wrote ${path.relative(ROOT, REPORT_PATH)}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
