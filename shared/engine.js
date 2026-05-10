class MiniAppEngine {
  constructor(dataset) {
    this.dataset = dataset;
    this.score = 0;
    this.current = 0;
  }

  getQuestion() {
    return this.dataset[this.current];
  }

  nextQuestion() {
    this.current++;
    if (this.current >= this.dataset.length) {
      this.current = 0;
    }
  }

  addScore() {
    this.score++;
  }
}
