async function loadApps() {
  const response = await fetch('./datasets/apps.json');
  const apps = await response.json();

  const container = document.getElementById('appFeed');

  apps.forEach(app => {
    const card = document.createElement('div');
    card.className = 'app-card';

    card.innerHTML = `
      <div>
        <div style="font-size:64px">${app.emoji}</div>
        <h3>${app.name}</h3>
        <p>${app.description}</p>
      </div>

      <button class="play-btn" onclick="openApp('${app.url}')">
        PLAY NOW
      </button>
    `;

    container.appendChild(card);
  });
}

function openApp(url) {
  localStorage.setItem('lastPlayed', url);
  window.location.href = url;
}

loadApps();
