let engine;

async function startGame() {
  const response = await fetch('./dataset.json');
  const dataset = await response.json();

  engine = new MiniAppEngine(dataset);
  renderQuestion();
}

function renderQuestion() {
  const q = engine.getQuestion();

  document.getElementById('emoji').innerText = q.emoji;
  document.getElementById('question').innerText = q.question;

  const answers = document.getElementById('answers');
  answers.innerHTML = '';

  q.answers.forEach(answer => {
    const button = document.createElement('button');
    button.innerText = answer;
    button.onclick = () => checkAnswer(answer);
    answers.appendChild(button);
  });
}

function checkAnswer(answer) {
  const q = engine.getQuestion();

  if (answer === q.correct) {
    engine.addScore();
    document.getElementById('score').innerText = engine.score;
    alert('🎉 Correct!');
  }

  engine.nextQuestion();

  setTimeout(() => {
    renderQuestion();
  }, 500);
}

startGame();
