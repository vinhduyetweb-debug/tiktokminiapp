
async function loadApps(){

const response = await fetch('./datasets/apps.json');
const apps = await response.json();

document.getElementById('appCount').innerText = apps.length;

const feed = document.getElementById('appFeed');

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

<div class="actions">
<button class="play-btn"
onclick="playApp('${app.url}')">
▶ OPEN APP
</button>
</div>
`;

feed.appendChild(card);

});

}

function playApp(url){

let coins =
parseInt(localStorage.getItem('coins') || 0);

let xp =
parseInt(localStorage.getItem('xp') || 0);

coins += 3;
xp += 1;

localStorage.setItem('coins', coins);
localStorage.setItem('xp', xp);

updateUI();

window.open(url,'_blank');

}

function claimReward(){

let coins =
parseInt(localStorage.getItem('coins') || 0);

coins += 20;

localStorage.setItem('coins', coins);

updateUI();

document.getElementById('rewardModal')
.classList.remove('hidden');

}

function closeReward(){

document.getElementById('rewardModal')
.classList.add('hidden');

}

function updateUI(){

document.getElementById('coins').innerText =
localStorage.getItem('coins') || 0;

document.getElementById('xp').innerText =
localStorage.getItem('xp') || 0;

}

document.getElementById('rewardBtn').onclick =
claimReward;

loadApps();
updateUI();
