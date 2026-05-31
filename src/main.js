import { apps } from './data/apps.js';
import './styles/style.css';
import { setupAddAppModal } from './core/addAppModal.js';

const canAttemptAdminLogin = new URLSearchParams(window.location.search).get('admin') === '1';

let adminSecret = '';
let isAdmin = false;
let registry = normalizeApps(apps).filter(isVisibleApp);

const state = {
  search: '',
  category: ''
};

function normalizeApps(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.apps)) {
    return value.apps;
  }

  return [];
}

function normalizeUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '').toLowerCase();
}

function isVisibleApp(app) {
  if (!app || typeof app !== 'object' || !app.id || !app.name) {
    return false;
  }

  const id = String(app.id).trim().toLowerCase();
  const githubUrl = normalizeUrl(app.githubUrl);
  const liveUrl = normalizeUrl(app.liveUrl);

  return !(
    id === 'tiktokminiapp' ||
    id === 'tiktok-miniapp' ||
    githubUrl.includes('/tiktokminiapp') ||
    liveUrl === 'https://tiktokminiapp.vercel.app'
  );
}

function getElements() {
  return {
    feed: document.getElementById('appFeed'),
    count: document.getElementById('appCount'),
    search: document.getElementById('searchInput'),
    category: document.getElementById('categoryFilter'),
    clear: document.getElementById('clearFiltersBtn'),
    addApp: document.getElementById('addAppBtn'),
    adminLogin: document.getElementById('adminLoginBtn'),
    adminNote: document.getElementById('adminNote')
  };
}

function openExternal(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function matchesFilters(app) {
  const search = state.search.trim().toLowerCase();
  const category = state.category;
  const text = `${app.name} ${app.description || ''}`.toLowerCase();

  return (!search || text.includes(search)) && (!category || app.category === category);
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

function createCard(app) {
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

  card.append(icon, content, actions);
  return card;
}

function renderCategories() {
  const elements = getElements();

  if (!elements.category) {
    return;
  }

  const currentValue = state.category;
  const categories = [...new Set(registry.map((app) => app.category).filter(Boolean))].sort();

  elements.category.replaceChildren();

  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'All categories';
  elements.category.appendChild(allOption);

  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    elements.category.appendChild(option);
  });

  elements.category.value = currentValue;
}

function renderGallery() {
  const elements = getElements();
  const visibleApps = registry.filter(matchesFilters);

  if (elements.count) {
    elements.count.textContent = String(visibleApps.length);
  }

  if (!elements.feed) {
    return;
  }

  if (!visibleApps.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = registry.length
      ? 'No apps match the current search or filter.'
      : 'No apps found. Check src/data/apps.js.';
    elements.feed.replaceChildren(empty);
    return;
  }

  elements.feed.replaceChildren(...visibleApps.map(createCard));
}

function refresh(nextApps = registry) {
  registry = normalizeApps(nextApps).filter(isVisibleApp);
  renderCategories();
  renderGallery();
}

async function verifyAdminSecret(secret) {
  const response = await fetch('/api/admin', {
    method: 'POST',
    headers: {
      'x-admin-secret': secret
    }
  });

  return response.ok;
}

async function handleAdminLogin() {
  const secret = window.prompt('Admin secret:');

  if (!secret) {
    return;
  }

  const isVerified = await verifyAdminSecret(secret);

  if (!isVerified) {
    window.alert('Invalid admin secret.');
    return;
  }

  adminSecret = secret;
  isAdmin = true;
  updateAdminUi();
}

function bindFilters() {
  const elements = getElements();

  elements.search?.addEventListener('input', (event) => {
    state.search = event.target.value;
    renderGallery();
  });

  elements.category?.addEventListener('change', (event) => {
    state.category = event.target.value;
    renderGallery();
  });

  elements.clear?.addEventListener('click', () => {
    state.search = '';
    state.category = '';

    if (elements.search) {
      elements.search.value = '';
    }

    if (elements.category) {
      elements.category.value = '';
    }

    renderGallery();
  });
}

function updateAdminUi() {
  const elements = getElements();

  elements.addApp?.classList.toggle('hidden', !isAdmin);
  elements.adminLogin?.classList.toggle('hidden', !canAttemptAdminLogin || isAdmin);
  elements.adminNote?.classList.toggle('hidden', !isAdmin);
}

function boot() {
  renderCategories();
  renderGallery();
  bindFilters();

  getElements().adminLogin?.addEventListener('click', handleAdminLogin);
  updateAdminUi();

  setupAddAppModal({
    apps: { current: registry },
    getAdminSecret: () => adminSecret,
    onSave: (nextApps) => {
      refresh(nextApps);
    }
  });
}

boot();
