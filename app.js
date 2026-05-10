async function loadApps(){

const response = await fetch('./datasets/apps.json');
const apps = await response.json();

document.getElementById('appCount').innerText = apps.length;

const feed = document.getElementById('feed');

apps.forEach(app=>{

const card = document.createElement('div');

card.className = 'card';

card.innerHTML = `
<div>
<div class="emoji">${app.emoji}</div>

<h2>${app.name}</h2>

<p>${app.description}</p>

<div class="tag">${app.category}</div>
</div>

<div>
<button class="play-btn" onclick="playApp('${app.url}')">
▶ PLAY NOW
</button>
</div>
`;

feed.appendChild(card);

});

}

function playApp(url){

let coins = parseInt(localStorage.getItem('coins') || 0);

coins += 2;

localStorage.setItem('coins', coins);

window.location.href = url;

}

function init(){

const coins = localStorage.getItem('coins') || 0;

document.getElementById('coins').innerText = coins;

const achievements =
localStorage.getItem('achievements') || 0;

document.getElementById('achievements').innerText =
achievements;

}

function dailyReward(){

let coins = parseInt(localStorage.getItem('coins') || 0);

coins += 20;

localStorage.setItem('coins', coins);

document.getElementById('coins').innerText = coins;

document.getElementById('rewardModal').classList.remove('hidden');

}

function closeReward(){

document.getElementById('rewardModal').classList.add('hidden');

}

document.getElementById('rewardBtn').onclick = dailyReward;

loadApps();

init();
