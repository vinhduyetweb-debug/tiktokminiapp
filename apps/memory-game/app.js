let engine;

async function start(){

const response =
await fetch('./dataset.json');

const dataset =
await response.json();

engine =
new MiniAppEngine(dataset);

render();

}

function render(){

const q =
engine.getQuestion();

document.getElementById('emoji').innerText =
q.emoji;

document.getElementById('question').innerText =
q.question;

const answers =
document.getElementById('answers');

answers.innerHTML = '';

q.answers.forEach(answer=>{

const btn =
document.createElement('button');

btn.innerText = answer;

btn.onclick = ()=>check(answer);

answers.appendChild(btn);

});

}

function check(answer){

const q =
engine.getQuestion();

if(answer === q.correct){

engine.correct();

document.getElementById('score').innerText =
engine.score;

alert('🎉 Correct! +5 Coins');

}else{

alert('❌ Wrong Answer');

}

engine.next();

render();

}

start();
