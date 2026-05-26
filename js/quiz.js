/**
 * QuizEngine: クイズのロジック（問題生成、正誤判定）を管理します。
 */
class QuizEngine {
  constructor(data, questionCount = 10) {
    this.allData = data;
    // データが10件未満の場合（現状は5件）に対応するため、少ない方を問題数とする
    this.questionCount = Math.min(questionCount, data.length);
    
    this.questions = [];
    this.currentIndex = 0;
    this.score = 0;
    this.newlyCleared = []; // 今回のプレイで新しくクリアした自治体
  }

  generateQuestions() {
    // 問題をランダムに生成
    const shuffled = [...this.allData].sort(() => Math.random() - 0.5);
    const targetData = shuffled.slice(0, this.questionCount);

    this.questions = targetData.map(correctMuni => {
      // 正解以外の自治体をフィルタリング
      const others = this.allData.filter(m => m.id !== correctMuni.id);
      const shuffledOthers = [...others].sort(() => Math.random() - 0.5);
      
      // ダミーの選択肢を最大3つ選出
      const dummys = shuffledOthers.slice(0, 3);
      
      // 正解とダミーを混ぜて選択肢を生成
      const options = [correctMuni, ...dummys].sort(() => Math.random() - 0.5);
      
      return {
        correct: correctMuni,
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
      correctMuni: currentQ.correct
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
