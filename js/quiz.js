/**
 * QuizEngine: クイズのロジック（問題生成、正誤判定）を管理します。
 */
class QuizEngine {
  constructor(mode = 'feature', questionCount = 10) {
    this.mode = mode;
    this.allData = (mode === 'ntt') ? window.app.nttOffices : window.app.municipalities;
    this.questionCount = Math.min(questionCount, this.allData.length);
    
    this.questions = [];
    this.currentIndex = 0;
    this.score = 0;
    this.newlyCleared = [];
  }

  generateQuestions() {
    const shuffled = [...this.allData].sort(() => Math.random() - 0.5);
    const targetData = shuffled.slice(0, this.questionCount);

    this.questions = targetData.map(correctItem => {
      const others = this.allData.filter(m => m.id !== correctItem.id);
      const shuffledOthers = [...others].sort(() => Math.random() - 0.5);
      const dummys = shuffledOthers.slice(0, 3);
      const options = [correctItem, ...dummys].sort(() => Math.random() - 0.5);
      
      return {
        correct: correctItem,
        options: options
      };
    });
    this.currentIndex = 0;
    this.score = 0;
    this.newlyCleared = [];
  }

  getCurrentQuestion() {
    if (this.currentIndex >= this.questions.length) return null;
    return this.questions[this.currentIndex];
  }

  submitAnswer(selectedId) {
    const currentQ = this.getCurrentQuestion();
    const isCorrect = currentQ.correct.id === selectedId;
    
    if (isCorrect) {
      this.score++;
    }
    
    return {
      isCorrect,
      correctItem: currentQ.correct
    };
  }

  nextQuestion() {
    this.currentIndex++;
    return this.getCurrentQuestion() !== null;
  }

  getScore() {
    return this.score;
  }

  getTotal() {
    return this.questions.length;
  }
}
