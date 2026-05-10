class MiniAppEngine{
constructor(dataset){
this.dataset = dataset;
this.current = 0;
this.score = 0;
}

getQuestion(){
return this.dataset[this.current];
}

nextQuestion(){
this.current++;

if(this.current >= this.dataset.length){
this.current = 0;
}
}

addScore(){
this.score++;

let coins = parseInt(localStorage.getItem('coins') || 0);
coins += 5;

localStorage.setItem('coins', coins);
}
}
