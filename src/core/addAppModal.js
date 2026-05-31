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

function getValue(form, name) {
  return form.elements[name]?.value.trim() || '';
}

function createPayload(form) {
  return {
    name: getValue(form, 'name'),
    liveUrl: getValue(form, 'liveUrl'),
    githubUrl: getValue(form, 'githubUrl'),
    description: getValue(form, 'description'),
    category: getValue(form, 'category'),
    icon: getValue(form, 'icon')
  };
}

function hasDuplicateLiveUrl(apps, liveUrl) {
  const liveUrlKey = String(liveUrl || '').trim().replace(/\/+$/, '').toLowerCase();
  return apps.some((app) => String(app.liveUrl || '').trim().replace(/\/+$/, '').toLowerCase() === liveUrlKey);
}

function setBusy(form, isBusy) {
  [...form.elements].forEach((element) => {
    element.disabled = isBusy;
  });
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || 'Request failed.');
  }

  return payload;
}

export function setupAddAppModal({ apps, getAdminSecret, onSave }) {
  const modal = document.getElementById('addAppModal');
  const form = document.getElementById('addAppForm');
  const error = document.getElementById('addAppError');
  const status = document.getElementById('addAppStatus');
  const openButton = document.getElementById('addAppBtn');
  const closeButton = document.getElementById('closeAddAppBtn');
  const cancelButton = document.getElementById('cancelAddAppBtn');

  function openModal() {
    error.textContent = '';
    status.textContent = '';
    modal.classList.remove('hidden');
    form.elements.name?.focus();
  }

  function closeModal() {
    modal.classList.add('hidden');
    error.textContent = '';
    status.textContent = '';
    form.reset();
    setBusy(form, false);
  }

  openButton?.addEventListener('click', openModal);
  closeButton?.addEventListener('click', closeModal);
  cancelButton?.addEventListener('click', closeModal);

  modal?.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const adminSecret = getAdminSecret();
    const payload = createPayload(form);
    const urlError = validateVercelUrl(payload.liveUrl);
    const githubUrlError = validateOptionalUrl(payload.githubUrl, 'GitHub URL', 'github.com');

    if (!adminSecret) {
      error.textContent = 'Please log in as admin first.';
      return;
    }

    if (!payload.name) {
      error.textContent = 'Please enter an app name.';
      return;
    }

    if (urlError) {
      error.textContent = urlError;
      return;
    }

    if (githubUrlError) {
      error.textContent = githubUrlError;
      return;
    }

    if (hasDuplicateLiveUrl(apps.current, payload.liveUrl)) {
      error.textContent = 'This Vercel URL is already in apps.json.';
      return;
    }

    setBusy(form, true);
    error.textContent = '';
    status.textContent = 'Saving to GitHub through secure API...';

    try {
      const result = await requestJson('/api/apps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret
        },
        body: JSON.stringify(payload)
      });

      apps.current = result.apps;
      status.textContent = 'Saved to GitHub.';
      closeModal();
      onSave?.(result.apps);
    } catch (saveError) {
      error.textContent = saveError.message || 'Unable to save app.';
      setBusy(form, false);
      status.textContent = '';
    }
  });
}

export async function deleteAppViaApi({ adminSecret, appId, apps }) {
  const result = await requestJson('/api/apps', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': adminSecret
    },
    body: JSON.stringify({ id: appId })
  });

  apps.current = result.apps;
  return result.apps;
}
