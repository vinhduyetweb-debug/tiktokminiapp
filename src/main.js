import { apps } from './data/apps.js';
import './styles/style.css';
import { deleteAppViaApi, setupAddAppModal } from './core/addAppModal.js';
import {
  getVisibleRegistryApps,
  renderApps,
  renderCategoryFilter
} from './core/renderApps.js';

const canAttemptAdminLogin = new URLSearchParams(window.location.search).get('admin') === '1';
const isDebugMode = new URLSearchParams(window.location.search).get('debug') === '1';
const isDevelopment = import.meta.env.DEV;

let adminSecret = '';
let isAdmin = false;

const registry = {
  current: normalizeApps(apps)
};

const state = {
  search: '',
  category: ''
};

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

function refresh(nextApps = registry.current) {
  registry.current = normalizeApps(nextApps);

  const elements = getElements();
  const visibleApps = getVisibleRegistryApps(registry.current);
  renderDiagnostics(elements, visibleApps.length);

  const apps = renderApps({
    apps: registry.current,
    feedElement: elements.feed,
    countElement: elements.count,
    filters: state,
    isAdmin,
    onDelete: handleDelete,
    debug: isDevelopment
  });

  renderCategoryFilter(elements.category, apps, state.category);
}

function renderDiagnostics(elements, visibleCount) {
  if (!isDebugMode) {
    return;
  }

  let panel = document.getElementById('appDebugPanel');

  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'appDebugPanel';
    panel.setAttribute('aria-label', 'App rendering diagnostics');
    panel.style.cssText = [
      'margin:16px 20px',
      'padding:16px',
      'border:1px solid #facc15',
      'border-radius:8px',
      'background:#422006',
      'color:#fef3c7',
      'font:14px/1.5 Arial,sans-serif',
      'white-space:pre-wrap'
    ].join(';');

    document.querySelector('main')?.prepend(panel);
  }

  const diagnostics = {
    'imported apps count': normalizeApps(apps).length,
    'registry.current count': registry.current.length,
    'visible registry count': visibleCount,
    'current search value': state.search || '',
    'current category value': state.category || '',
    'appFeed exists': Boolean(elements.feed),
    'appCount exists': Boolean(elements.count)
  };

  panel.textContent = Object.entries(diagnostics)
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');
}

function normalizeApps(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.apps)) {
    return value.apps;
  }

  return [];
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

async function loadRegistry() {
  registry.current = normalizeApps(apps);

  if (isDevelopment) {
    const visibleApps = getVisibleRegistryApps(registry.current);
    console.info('[TikTokMiniApp] raw apps loaded:', registry.current.length);
    console.info('[TikTokMiniApp] after hub exclusion:', visibleApps.length);
  }
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
  refresh();
}

async function handleDelete(appId) {
  if (!isAdmin || !adminSecret) {
    return;
  }

  if (!window.confirm('Delete this user-added app from apps.json?')) {
    return;
  }

  try {
    const nextApps = await deleteAppViaApi({
      adminSecret,
      appId,
      apps: registry
    });

    refresh(nextApps);
  } catch (error) {
    window.alert(error.message || 'Unable to delete app.');
  }
}

function bindFilters() {
  const elements = getElements();

  elements.search?.addEventListener('input', (event) => {
    state.search = event.target.value;
    refresh();
  });

  elements.category?.addEventListener('change', (event) => {
    state.category = event.target.value;
    refresh();
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

    refresh();
  });
}

function updateAdminUi() {
  const elements = getElements();

  elements.addApp?.classList.toggle('hidden', !isAdmin);
  elements.adminLogin?.classList.toggle('hidden', !canAttemptAdminLogin || isAdmin);
  elements.adminNote?.classList.toggle('hidden', !isAdmin);
}

async function boot() {
  loadRegistry();
  bindFilters();
  getElements().adminLogin?.addEventListener('click', handleAdminLogin);
  updateAdminUi();
  setupAddAppModal({
    apps: registry,
    getAdminSecret: () => adminSecret,
    onSave: async (nextApps) => {
      refresh(nextApps);
    }
  });
  refresh();
}

boot();
