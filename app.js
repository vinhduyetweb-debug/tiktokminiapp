async function loadApps() {
  const response = await fetch('./datasets/apps.json');
  const apps = await response.json();

  const container = document.getElementById('appFeed');

  apps.forEach(app => {
    const card = document.createElement('div');
    card.className = 'app-card';

    card.innerHTML = `
      <div>
        <div class="app-emoji">${app.emoji}</div>
        <h2>${app.name}</h2>
        <p>${app.description}</p>
      </div>

      <button class="play-btn" onclick="openApp('${app.url}')">
        ▶ PLAY NOW
      </button>
    `;

    container.appendChild(card);
  });
}

function openApp(url){
  localStorage.setItem('lastPlayed', url);
  window.location.href = url;
}

function initCoins(){
  const coins = localStorage.getItem('coins') || 0;
  document.getElementById('coinCount').innerText = coins;
}

function initLevel(){
  const level = localStorage.getItem('level') || 1;
  document.getElementById('levelCount').innerText = level;
}

function claimDailyReward(){
  let coins = parseInt(localStorage.getItem('coins') || 0);
  coins += 20;

  localStorage.setItem('coins', coins);

  document.getElementById('coinCount').innerText = coins;

  document.getElementById('rewardModal').classList.remove('hidden');
}

function closeReward(){
  document.getElementById('rewardModal').classList.add('hidden');
}

document.getElementById('dailyRewardBtn').onclick = claimDailyReward;

loadApps();
initCoins();
initLevel();
