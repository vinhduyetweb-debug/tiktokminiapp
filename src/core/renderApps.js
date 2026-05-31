const SELF_APP_IDS = new Set(['tiktokminiapp', 'tiktok-miniapp']);
const SELF_LIVE_URL = 'https://tiktokminiapp.vercel.app';
const SELF_NAME = 'TikTokMiniApp';

function normalizeUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '').toLowerCase();
}

function openExternal(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function isSelfApp(app) {
  const id = String(app.id || '').trim().toLowerCase();
  const name = String(app.name || '').trim();
  const githubUrl = normalizeUrl(app.githubUrl);

  return (
    SELF_APP_IDS.has(id) ||
    name === SELF_NAME ||
    githubUrl.includes('/tiktokminiapp') ||
    normalizeUrl(app.liveUrl) === SELF_LIVE_URL
  );
}

function isValidApp(app) {
  return Boolean(app && typeof app === 'object' && app.id && app.name);
}

export function getVisibleRegistryApps(apps) {
  const seenLiveUrls = new Set();
  const result = [];

  const sourceApps = Array.isArray(apps) ? apps : [];

  sourceApps.forEach((app) => {
    if (!isValidApp(app) || isSelfApp(app)) {
      return;
    }

    const liveUrlKey = normalizeUrl(app.liveUrl);

    if (liveUrlKey && seenLiveUrls.has(liveUrlKey)) {
      return;
    }

    if (liveUrlKey) {
      seenLiveUrls.add(liveUrlKey);
    }

    result.push(app);
  });

  return result;
}

function getCategories(apps) {
  return [...new Set(apps.map((app) => app.category).filter(Boolean))].sort();
}

function matchesFilters(app, filters) {
  const term = String(filters.search || '').trim().toLowerCase();
  const category = filters.category || '';
  const searchableText = `${app.name} ${app.description}`.toLowerCase();

  return (!term || searchableText.includes(term)) && (!category || app.category === category);
}

function createButton(label, className, onClick, disabled = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener('click', onClick);
  return button;
}

function getStatusLabel(status) {
  if (status === 'github-only') {
    return 'GitHub only';
  }

  if (status === 'archived') {
    return 'Archived';
  }

  return 'Live';
}

function createAppCard(app, handlers) {
  const card = document.createElement('article');
  card.className = 'app-card';

  const icon = document.createElement('div');
  icon.className = 'app-icon';
  icon.textContent = app.icon || '📱';

  const content = document.createElement('div');
  content.className = 'app-content';

  const title = document.createElement('h2');
  title.textContent = app.name;

  const description = document.createElement('p');
  description.textContent = app.description || 'Portfolio mini app.';

  const badges = document.createElement('div');
  badges.className = 'badges';

  const category = document.createElement('span');
  category.className = 'badge';
  category.textContent = app.category || 'uncategorized';

  const status = document.createElement('span');
  status.className = `badge status-${app.status || 'live'}`;
  status.textContent = getStatusLabel(app.status);

  badges.append(category, status);
  content.append(title, description, badges);

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  if (app.liveUrl && app.status !== 'archived') {
    actions.appendChild(createButton('Open App', 'primary-action', () => openExternal(app.liveUrl)));
  } else {
    actions.appendChild(createButton('No Live URL', 'secondary-action', () => {}, true));
  }

  if (app.githubUrl) {
    actions.appendChild(createButton('GitHub', 'secondary-action', () => openExternal(app.githubUrl)));
  }

  if (handlers.isAdmin && app.editable === true && app.source === 'user') {
    actions.appendChild(createButton('Delete', 'danger-action', () => handlers.onDelete(app.id)));
  }

  card.append(icon, content, actions);
  return card;
}

export function renderCategoryFilter(selectElement, apps, selectedCategory) {
  if (!selectElement) {
    return;
  }

  const categories = getCategories(apps);
  const currentValue = selectedCategory || '';

  selectElement.replaceChildren();

  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'All categories';
  selectElement.appendChild(allOption);

  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    selectElement.appendChild(option);
  });

  selectElement.value = currentValue;
}

export function renderApps({ apps, feedElement, countElement, filters, isAdmin, onDelete, debug = false }) {
  const registryApps = getVisibleRegistryApps(apps);
  const visibleApps = registryApps.filter((app) => matchesFilters(app, filters));

  if (debug) {
    console.info('[TikTokMiniApp] apps after search/category filter:', visibleApps.length);
  }

  if (countElement) {
    countElement.textContent = String(visibleApps.length);
  }

  if (!feedElement) {
    return registryApps;
  }

  if (!visibleApps.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = registryApps.length
      ? 'No apps match the current search or filter.'
      : 'No apps found. Check public/apps.json.';
    feedElement.replaceChildren(empty);
    return registryApps;
  }

  feedElement.replaceChildren(
    ...visibleApps.map((app) => createAppCard(app, { isAdmin, onDelete }))
  );

  return registryApps;
}
