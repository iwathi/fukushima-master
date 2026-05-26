// モジュール化を解除し、グローバル変数を使用

class App {
  constructor() {
    this.municipalities = [];
    this.quizEngine = null;
    this.init();
  }

  init() {
    // data/municipalities.jsで定義したグローバル変数を使用
    this.municipalities = municipalitiesData;

    this.cacheDOM();
    this.bindEvents();
    this.updateTitleProgress();
  }

  cacheDOM() {
    // 画面(セクション)
    this.screens = {
      title: document.getElementById('title-screen'),
      quiz: document.getElementById('quiz-screen'),
      result: document.getElementById('result-screen'),
      collection: document.getElementById('collection-screen')
    };

    // タイトル画面の要素
    this.elProgressCount = document.getElementById('progress-count');
    this.elProgressPercent = document.getElementById('progress-percent');
    this.elProgressBarFill = document.getElementById('progress-bar-fill');
    
    // クイズ画面の要素
    this.elCurrentQNum = document.getElementById('current-q-num');
    this.elFeaturesList = document.getElementById('features-list');
    this.elOptionsGrid = document.getElementById('options-grid');
    this.elFeedbackOverlay = document.getElementById('feedback-overlay');
    this.elFeedbackCard = this.elFeedbackOverlay.querySelector('.feedback-card');
    this.elFeedbackResult = document.getElementById('feedback-result');
    this.elFeedbackDesc = document.getElementById('feedback-desc');
    
    // リザルト画面の要素
    this.elFinalScore = document.getElementById('final-score');
    this.elNewClearedSection = document.getElementById('new-cleared-section');
    this.elNewClearedList = document.getElementById('new-cleared-list');

    // コレクション画面の要素
    this.elCollectionGrid = document.getElementById('collection-grid');
    this.tabBtns = document.querySelectorAll('.tab-btn');
  }

  bindEvents() {
    // タイトル画面ボタン
    document.getElementById('btn-start-feature').addEventListener('click', () => this.startQuiz('feature'));
    document.getElementById('btn-start-map').addEventListener('click', () => this.startQuiz('map'));
    document.getElementById('btn-collection').addEventListener('click', () => this.showCollection());
    
    // クイズ画面ボタン
    document.getElementById('btn-quit-quiz').addEventListener('click', () => {
      if (confirm('クイズを途中で終了してタイトルに戻りますか？')) {
        this.switchScreen('title');
      }
    });
    document.getElementById('btn-next-question').addEventListener('click', () => this.handleNextQuestion());
    
    // リザルト画面ボタン
    document.getElementById('btn-result-to-title').addEventListener('click', () => {
      this.updateTitleProgress();
      this.switchScreen('title');
    });

    // コレクション画面ボタン
    document.getElementById('btn-col-to-title').addEventListener('click', () => this.switchScreen('title'));
    document.getElementById('btn-reset-data').addEventListener('click', () => {
      if(confirm('本当に進捗データをすべてリセットしますか？この操作は元に戻せません。')) {
        progressTracker.resetProgress();
        this.updateTitleProgress();
        this.renderCollection();
        alert('データをリセットしました。');
      }
    });

    // コレクションのタブ切り替え
    this.tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.tabBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.renderCollection(e.target.dataset.area);
      });
    });
  }

  // SPAの画面切り替え処理
  switchScreen(screenName) {
    Object.values(this.screens).forEach(screen => {
      screen.classList.add('hidden');
      screen.classList.remove('active');
    });
    
    const target = this.screens[screenName];
    target.classList.remove('hidden');
    // リフローさせてからactiveクラスを付与し、CSSアニメーションを発火させる
    void target.offsetWidth; 
    target.classList.add('active');
  }

  // 進捗状況の表示更新
  updateTitleProgress() {
    const count = progressTracker.getClearedCount();
    const total = progressTracker.totalCount; // 59
    const percent = progressTracker.getProgressPercentage();
    
    this.elProgressCount.textContent = `${count} / ${total}`;
    this.elProgressPercent.textContent = `${percent}%`;
    this.elProgressBarFill.style.width = `${percent}%`;
  }

  // クイズの開始
  startQuiz(mode = 'feature') {
    this.currentMode = mode;
    this.quizEngine = new QuizEngine(this.municipalities, 10);
    this.quizEngine.generateQuestions();
    
    // クイズ画面のトータル問題数表示を更新
    const totalQEl = this.screens.quiz.querySelector('.question-counter');
    totalQEl.innerHTML = `第 <span id="current-q-num" class="text-accent font-bold">1</span> 問 / 全${this.quizEngine.getTotal()}問`;
    this.elCurrentQNum = document.getElementById('current-q-num'); // 再取得

    this.renderQuestion();
    this.switchScreen('quiz');
  }

  // 現在の問題を描画
  renderQuestion() {
    const q = this.quizEngine.getCurrentQuestion();
    
    this.elCurrentQNum.textContent = this.quizEngine.currentIndex + 1;
    
    // モードごとの表示切り替え
    const elQuestionText = document.getElementById('question-text');
    const elMapContainer = document.getElementById('map-container');
    
    if (this.currentMode === 'feature') {
      elQuestionText.textContent = 'これらの特徴を持つ市町村はどこ？';
      this.elFeaturesList.classList.remove('hidden');
      if(elMapContainer) elMapContainer.classList.add('hidden');
      
      // 特徴（ヒント）の描画
      this.elFeaturesList.innerHTML = '';
      q.correct.features.forEach(feature => {
        const li = document.createElement('li');
        li.textContent = feature;
        this.elFeaturesList.appendChild(li);
      });
    } else if (this.currentMode === 'map') {
      elQuestionText.textContent = 'この黄色く光っている市町村はどこ？';
      this.elFeaturesList.classList.add('hidden');
      if(elMapContainer) elMapContainer.classList.remove('hidden');
      
      // マップのハイライト処理
      const allAreas = document.querySelectorAll('.map-area');
      allAreas.forEach(area => area.classList.remove('highlight-active'));
      const targetArea = document.getElementById(q.correct.id);
      if (targetArea) {
        targetArea.classList.add('highlight-active');
      }
    }

    // 選択肢の描画
    this.elOptionsGrid.innerHTML = '';
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `${opt.name} <span style="font-size: 0.8rem; display: block; color: var(--text-secondary); margin-top: 4px;">${opt.kana}</span>`;
      btn.addEventListener('click', () => this.handleAnswerSubmit(opt.id, btn));
      this.elOptionsGrid.appendChild(btn);
    });
  }

  // 解答時の処理
  handleAnswerSubmit(selectedId, buttonEl) {
    // 重複回答を防ぐため全ボタンを無効化
    const btns = this.elOptionsGrid.querySelectorAll('.option-btn');
    btns.forEach(b => b.disabled = true);

    const { isCorrect, correctMuni } = this.quizEngine.submitAnswer(selectedId);
    
    if (isCorrect) {
      buttonEl.classList.add('correct');
      
      // 進捗を追加（初めてクリアした場合はnewlyClearedに記録）
      const newlyCleared = progressTracker.markAsCleared(correctMuni.id);
      if (newlyCleared) {
        this.quizEngine.newlyCleared.push(correctMuni);
      }
      
      this.elFeedbackResult.textContent = '正解！🎉';
      this.elFeedbackResult.style.color = 'var(--color-correct)';
      this.elFeedbackCard.classList.remove('is-incorrect');
      this.elFeedbackDesc.innerHTML = `<span class="text-xl font-bold">${correctMuni.name}</span> <span class="text-sm">(${correctMuni.kana})</span><br><br><div class="text-left" style="font-size:0.9rem;">・${correctMuni.features.join('<br>・')}</div>`;
    } else {
      buttonEl.classList.add('incorrect');
      
      // 不正解の場合、正解のボタンをハイライトする
      const correctBtn = Array.from(btns).find(b => b.innerHTML.includes(correctMuni.name));
      if(correctBtn) correctBtn.classList.add('correct');
      
      this.elFeedbackResult.textContent = 'ざんねん...';
      this.elFeedbackResult.style.color = 'var(--color-incorrect)';
      this.elFeedbackCard.classList.add('is-incorrect');
      this.elFeedbackDesc.innerHTML = `正解は <span class="text-xl font-bold">${correctMuni.name}</span> でした！<br><br><div class="text-left" style="font-size:0.9rem;">・${correctMuni.features.join('<br>・')}</div>`;
    }

    // アニメーションを見せるため少し遅延させてからオーバーレイを表示
    setTimeout(() => {
      this.elFeedbackOverlay.classList.remove('hidden');
    }, 600);
  }

  // 次の問題（またはリザルト）へ進む
  handleNextQuestion() {
    this.elFeedbackOverlay.classList.add('hidden');
    if (this.quizEngine.nextQuestion()) {
      this.renderQuestion();
    } else {
      this.showResult();
    }
  }

  // リザルト画面の表示
  showResult() {
    const score = this.quizEngine.getScore();
    const total = this.quizEngine.getTotal();
    
    // スコアとトータル問題数の表示を更新
    this.elFinalScore.textContent = score;
    this.elFinalScore.nextElementSibling.textContent = ` / ${total}点`;

    const newClears = this.quizEngine.newlyCleared;
    if (newClears.length > 0) {
      this.elNewClearedSection.classList.remove('hidden');
      this.elNewClearedList.innerHTML = '';
      newClears.forEach(m => {
        const li = document.createElement('li');
        li.textContent = m.name;
        this.elNewClearedList.appendChild(li);
      });
    } else {
      this.elNewClearedSection.classList.add('hidden');
    }

    this.switchScreen('result');
  }

  // コレクション画面の表示
  showCollection() {
    this.switchScreen('collection');
    
    // タブのアクティブ状態をリセット
    this.tabBtns.forEach(b => b.classList.remove('active'));
    this.tabBtns[0].classList.add('active'); // 「すべて」をアクティブに
    
    this.renderCollection('all');
  }

  // コレクションの描画処理
  renderCollection(areaFilter = 'all') {
    
    // リストの初期化
    const elList = document.getElementById('collection-list');
    elList.innerHTML = '';
    
    // 進捗テキスト
    const clearedCount = progressTracker.getClearedCount();
    const totalCount = this.municipalities.length;
    document.getElementById('collection-progress-text').textContent = `${clearedCount} / ${totalCount}`;

    // マップの準備（初回のみ生成）
    const mapContainer = document.getElementById('collection-map-container');
    if (!mapContainer.querySelector('svg')) {
      this.generateCollectionMap(mapContainer);
    }

    // マップの色付けをリセット
    const svgClone = mapContainer.querySelector('svg');
    const allAreas = svgClone.querySelectorAll('.map-area');
    allAreas.forEach(area => area.classList.remove('cleared-area'));

    // 全自治体のリスト生成とマップ色付け
    this.municipalities.forEach(city => {
      const isCleared = progressTracker.isCleared(city.id);
      
      // マップの色付け (フィルターに関係なく全県表示)
      if (isCleared) {
        const area = svgClone.getElementById(`col-map-${city.id}`);
        if (area) area.classList.add('cleared-area');
      }

      // フィルター判定
      if (areaFilter !== 'all' && city.area !== areaFilter) return;

      // リストアイテムの生成
      const li = document.createElement('li');
      li.className = 'collection-item';
      li.id = `list-item-${city.id}`;
      
      const header = document.createElement('div');
      header.className = 'collection-item-header';
      
      if (isCleared) {
        header.innerHTML = `
          <div class="collection-item-name">
            <span class="status-cleared">✅</span>
            ${city.name}
          </div>
          <div class="text-muted text-xs">▼ 詳細</div>
        `;
        
        const details = document.createElement('div');
        details.className = 'collection-item-details';
        const featuresHtml = city.features.map(f => `<div class="feature-item">${f}</div>`).join('');
        details.innerHTML = `
          <div class="details-kana">${city.kana}</div>
          <div class="details-features">${featuresHtml}</div>
        `;
        
        // アコーディオン開閉
        header.addEventListener('click', () => {
          li.classList.toggle('expanded');
        });
        
        li.appendChild(header);
        li.appendChild(details);
      } else {
        header.innerHTML = `
          <div class="collection-item-name status-locked">
            <span class="status-locked">🔒</span>
            ？？？
          </div>
        `;
        header.style.cursor = 'default';
        li.appendChild(header);
      }
      
      elList.appendChild(li);
    });
  }

  generateCollectionMap(container) {
    // 問題画面のSVGをクローン
    const originalSvg = document.querySelector('.fukushima-map');
    const svgClone = originalSvg.cloneNode(true);
    
    // クローンの調整
    svgClone.classList.remove('real-map');
    svgClone.classList.add('collection-map-svg');

    // IDの重複を避けるため、クローンのIDを変更
    const paths = svgClone.querySelectorAll('.map-area');
    paths.forEach(p => {
      const origId = p.id;
      p.id = `col-map-${origId}`;
      
      // マップのパスをクリックしたときにリストを展開する機能
      p.style.cursor = 'pointer';
      
      // マウスホバーで文字を強調する
      p.addEventListener('mouseenter', () => {
        const textEl = svgClone.getElementById(`col-text-${origId}`);
        if (textEl) textEl.classList.add('text-hover');
      });
      p.addEventListener('mouseleave', () => {
        const textEl = svgClone.getElementById(`col-text-${origId}`);
        if (textEl) textEl.classList.remove('text-hover');
      });
      
      p.addEventListener('click', () => {
        const listItem = document.getElementById(`list-item-${origId}`);
        if (listItem) {
          listItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (!listItem.classList.contains('expanded')) {
            const header = listItem.querySelector('.collection-item-header');
            if (header && header.style.cursor !== 'default') {
               header.click();
            }
          }
        }
      });
    });

    container.appendChild(svgClone);

    // テキスト要素の配置（SVGがDOMに追加された後でgetBoundingClientRect/getBBoxを使用）
    const NS = "http://www.w3.org/2000/svg";
    this.municipalities.forEach(city => {
      const path = svgClone.getElementById(`col-map-${city.id}`);
      if (path) {
        try {
          const bbox = path.getBBox();
          const cx = bbox.x + bbox.width / 2;
          const cy = bbox.y + bbox.height / 2;
          
          const textEl = document.createElementNS(NS, 'text');
          textEl.setAttribute('x', cx);
          textEl.setAttribute('y', cy);
          textEl.setAttribute('class', 'map-name-text');
          textEl.setAttribute('id', `col-text-${city.id}`);
          
          textEl.textContent = city.name.replace(/(市|町|村)$/, ''); // 末尾を削る
          
          svgClone.appendChild(textEl);
        } catch(e) {
          console.log('Error calculating bbox for', city.id);
        }
      }
    });
  }
}

// DOM読み込み完了時にアプリを起動
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
