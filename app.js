
async function loadApps(){

const response = await fetch('./datasets/apps.json');
const apps = await response.json();

document.getElementById('appCount').innerText = apps.length;

const feed = document.getElementById('feed');

apps.forEach((app,index)=>{

const nextApp = apps[(index + 1) % apps.length];

const card = document.createElement('div');

card.className = 'card';

card.innerHTML = `
<div>
<div class="emoji">${app.emoji}</div>

<h2>${app.name}</h2>

<p>${app.category} Mini App Experience</p>

<div class="tag">${app.category}</div>

<div class="recommend">
🎯 Recommended Next:
<strong>${nextApp.emoji} ${nextApp.name}</strong>
</div>
</div>

<div class="card-actions">
<button class="play-btn"
onclick="playApp('${app.url}')">
▶ OPEN APP
</button>

<button class="unlock-btn"
onclick="unlockReward()">
🔓 UNLOCK
</button>
</div>
`;

feed.appendChild(card);

});

}

function playApp(url){

let coins = parseInt(localStorage.getItem('coins') || 0);
let xp = parseInt(localStorage.getItem('xp') || 0);
let streak = parseInt(localStorage.getItem('streak') || 1);
let missions = parseInt(localStorage.getItem('missions') || 0);

coins += 5;
xp += 2;
missions += 1;

if(missions >= 3){
coins += 50;
missions = 0;
alert('🎯 Daily Mission Complete! +50 coins');
}

localStorage.setItem('coins', coins);
localStorage.setItem('xp', xp);
localStorage.setItem('missions', missions);
localStorage.setItem('streak', streak);

updateUI();

window.open(url,'_blank');

}

function unlockReward(){

let coins = parseInt(localStorage.getItem('coins') || 0);

if(coins >= 100){

coins -= 100;

alert('🎉 Secret Reward Unlocked!');

}else{

alert('🔒 Need 100 coins to unlock');

}

localStorage.setItem('coins', coins);

updateUI();

}

function claimReward(){

let coins = parseInt(localStorage.getItem('coins') || 0);

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

document.getElementById('streak').innerText =
localStorage.getItem('streak') || 1;

}

document.getElementById('rewardBtn').onclick =
claimReward;

updateUI();
loadApps();
