// モジュール化を解除し、グローバル変数を使用

class App {
  constructor() {
    this.municipalities = [];
    this.quizEngine = null;
    this.collectionMode = 'municipalities';
    this.init();
  }

  init() {
    this.currentPrefecture = 'fukushima';
    this.municipalities = municipalitiesData;
    this.nttOffices = this.nttOffices || window.nttOffices; // fallback if window.nttOffices is defined differently
    if (typeof nttOffices !== 'undefined') this.nttOffices = nttOffices;

    this.cacheDOM();
    this.bindEvents();

    // 前回選択した県を復元（未保存なら福島県）
    let savedPref = 'fukushima';
    try {
      savedPref = localStorage.getItem('selectedPrefecture') || 'fukushima';
    } catch (e) { /* localStorage が使えない環境では既定値 */ }
    if (savedPref === 'miyagi') {
      this.setPrefecture('miyagi');
    } else {
      this.updateTitleProgress();
    }
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
    this.elCollectionListMuni = document.getElementById('collection-list');
    this.elCollectionListNtt = document.getElementById('collection-list-ntt');
    this.tabBtns = document.querySelectorAll('.tab-btn');
    this.modeTabBtns = document.querySelectorAll('.mode-tab-btn');
  }

  bindEvents() {
    // 県切り替え（セグメントボタン）
    document.querySelectorAll('#prefecture-switch .segmented-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.pref !== this.currentPrefecture) {
          this.setPrefecture(btn.dataset.pref);
        }
      });
    });

    // Escキーで詳細モーダルを閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      document.getElementById('details-modal').classList.add('hidden');
    });

    // タイトル画面ボタン
    document.getElementById('btn-start-feature').addEventListener('click', () => this.startQuiz('feature'));
    document.getElementById('btn-start-map').addEventListener('click', () => this.startQuiz('map'));
    document.getElementById('btn-start-ntt').addEventListener('click', () => this.startQuiz('ntt'));
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
        currentMapTracker.resetProgress();
        currentFeatureTracker.resetProgress();
        currentNttTracker.resetProgress();
        this.updateTitleProgress();
        this.renderCollection();
        
        this.sendGAEvent('reset_data', {
          prefecture: this.currentPrefecture
        });

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

    // コレクションの図鑑モード切り替え
    if (this.modeTabBtns) {
      this.modeTabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.modeTabBtns.forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          this.collectionMode = e.target.dataset.mode;
          
          const areaTabs = document.getElementById('muni-area-tabs');
          if (this.collectionMode === 'ntt') {
            areaTabs.classList.add('hidden');
          } else {
            areaTabs.classList.remove('hidden');
          }
          this.renderCollection('all');
        });
      });
    }
  }

  setPrefecture(pref) {
    this.currentPrefecture = pref;

    // 選択状態を保存し、セグメントボタンの表示を更新
    try {
      localStorage.setItem('selectedPrefecture', pref);
    } catch (e) { /* 保存できなくても動作は継続 */ }
    document.querySelectorAll('#prefecture-switch .segmented-btn').forEach(btn => {
      const isActive = btn.dataset.pref === pref;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    if (pref === 'fukushima') {
      currentMapTracker = fukushimaMapTracker;
      currentFeatureTracker = fukushimaFeatureTracker;
      currentNttTracker = nttFukushimaTracker;
      this.municipalities = typeof municipalitiesData !== 'undefined' ? municipalitiesData : [];
      this.nttOffices = typeof nttOffices !== 'undefined' ? nttOffices : [];
      const svgM = document.getElementById('miyagi-svg');
      const svgF = document.getElementById('fukushima-svg');
      if (svgM) svgM.style.display = 'none';
      if (svgF) svgF.style.display = 'block';
      const title = document.getElementById('app-title');
      if (title) title.textContent = '福島県自治体マスター';
      const desc = document.getElementById('app-subtitle');
      if (desc) desc.textContent = '59市町村の特徴を学ぼう！';
      currentMapTracker.totalCount = 59;
      currentFeatureTracker.totalCount = 59;
      currentNttTracker.totalCount = 201;
      
      // エリアボタンの切り替え
      document.querySelectorAll('.fukushima-area-btn').forEach(btn => btn.style.display = 'inline-block');
      document.querySelectorAll('.miyagi-area-btn').forEach(btn => btn.style.display = 'none');
      
      // コレクションマップのキャッシュをクリア
      const mapContainer = document.getElementById('collection-map-container');
      if (mapContainer) mapContainer.innerHTML = '';
    } else {
      currentMapTracker = miyagiMapTracker;
      currentFeatureTracker = miyagiFeatureTracker;
      currentNttTracker = nttMiyagiTracker;
      this.municipalities = typeof miyagiMunicipalities !== 'undefined' ? miyagiMunicipalities : [];
      this.nttOffices = typeof miyagiOffices !== 'undefined' ? miyagiOffices : [];
      const svgM = document.getElementById('miyagi-svg');
      const svgF = document.getElementById('fukushima-svg');
      if (svgM) svgM.style.display = 'block';
      if (svgF) svgF.style.display = 'none';
      const title = document.getElementById('app-title');
      if (title) title.textContent = '宮城県自治体マスター';
      const desc = document.getElementById('app-subtitle');
      if (desc) desc.textContent = `${this.municipalities.length}市町村の特徴を学ぼう！`;
      currentMapTracker.totalCount = this.municipalities.length;
      currentFeatureTracker.totalCount = this.municipalities.length;
      currentNttTracker.totalCount = this.nttOffices.length;
      
      // エリアボタンの切り替え
      document.querySelectorAll('.fukushima-area-btn').forEach(btn => btn.style.display = 'none');
      document.querySelectorAll('.miyagi-area-btn').forEach(btn => btn.style.display = 'inline-block');
      
      // コレクションマップのキャッシュをクリア
      const mapContainer = document.getElementById('collection-map-container');
      if (mapContainer) mapContainer.innerHTML = '';
    }
    
    // タブの「すべて」をアクティブに戻す
    this.tabBtns.forEach(btn => {
      if (btn.dataset.area === 'all') btn.classList.add('active');
      else btn.classList.remove('active');
    });
    // reset collection map
    const mapContainer = document.getElementById('collection-map-container');
    if (mapContainer) mapContainer.innerHTML = '';
    
    this.updateTitleProgress();
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
    // 自治体 (位置と特徴の両方をクリアしていればカウント)
    let count = 0;
    this.municipalities.forEach(city => {
      if (currentMapTracker.isCleared(city.id) && currentFeatureTracker.isCleared(city.id)) {
        count++;
      }
    });
    const total = this.municipalities.length;
    const percent = total === 0 ? 0 : Math.floor((count / total) * 100);
    
    this.elProgressCount.textContent = `${count} / ${total}`;
    this.elProgressPercent.textContent = `${percent}%`;
    this.elProgressBarFill.style.width = `${percent}%`;

    // 位置・特徴それぞれの内訳
    const mapCount = this.municipalities.filter(c => currentMapTracker.isCleared(c.id)).length;
    const featureCount = this.municipalities.filter(c => currentFeatureTracker.isCleared(c.id)).length;
    const elMapCount = document.getElementById('map-progress-count');
    const elFeatureCount = document.getElementById('feature-progress-count');
    if (elMapCount) elMapCount.textContent = `${mapCount}/${total}`;
    if (elFeatureCount) elFeatureCount.textContent = `${featureCount}/${total}`;

    // NTT
    const nttCount = currentNttTracker.getClearedCount();
    const nttTotal = currentNttTracker.totalCount;
    const nttPercent = currentNttTracker.getProgressPercentage();
    
    const elNttCount = document.getElementById('ntt-progress-count');
    const elNttPercent = document.getElementById('ntt-progress-percent');
    const elNttBar = document.getElementById('ntt-progress-bar-fill');
    
    if(elNttCount) elNttCount.textContent = `${nttCount} / ${nttTotal}`;
    if(elNttPercent) elNttPercent.textContent = `${nttPercent}%`;
    if(elNttBar) elNttBar.style.width = `${nttPercent}%`;
  }

  // クイズの開始
  startQuiz(mode = 'feature') {
    this.currentMode = mode;
    this.quizEngine = new QuizEngine(mode, 10);
    this.quizEngine.generateQuestions();
    
    // イベント送信: クイズ開始
    this.sendGAEvent('quiz_start', {
      mode: mode,
      prefecture: this.currentPrefecture
    });
    
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

    // 問題の進捗バーを更新（回答済みの割合）
    const elQuizProgress = document.getElementById('quiz-progress-fill');
    if (elQuizProgress) {
      elQuizProgress.style.width = `${(this.quizEngine.currentIndex / this.quizEngine.getTotal()) * 100}%`;
    }
    // 問題が切り替わったら先頭へ戻す（スマホで下までスクロールした状態を解消）
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // モードごとの表示切り替え
    const elQuestionText = document.getElementById('question-text');
    const elMapContainer = document.getElementById('map-container');
    const elFeatureList = this.elFeaturesList;
    
    if (this.currentMode === 'feature') {
      elFeatureList.classList.remove('hidden');
      elMapContainer.classList.add('hidden');
      elQuestionText.textContent = 'この特徴を持つ市町村はどこ？';
      
      elFeatureList.innerHTML = '';
      q.correct.features.forEach(f => {
        const li = document.createElement('li');
        li.className = 'bg-black/30 p-3 rounded-lg border border-white/10 text-left list-none pl-4 relative';
        li.innerHTML = `<span class="absolute left-1 top-3 text-accent text-xs">✦</span> ${f}`;
        elFeatureList.appendChild(li);
      });
    } else if (this.currentMode === 'map') {
      elFeatureList.classList.add('hidden');
      elMapContainer.classList.remove('hidden');
      elQuestionText.textContent = 'この赤く塗られた市町村はどこ？';
      
      const svgId = this.currentPrefecture === 'fukushima' ? 'fukushima-svg' : 'miyagi-svg';
      const svg = document.getElementById(svgId);
      
      // Hide all svgs in container and show the right one
      const svgs = elMapContainer.querySelectorAll('svg');
      svgs.forEach(s => s.style.display = 'none');
      if (svg) svg.style.display = 'block';
      const allAreas = svg.querySelectorAll('.map-area');
      allAreas.forEach(area => area.classList.remove('highlight-active'));
      const oldDots = svg.querySelectorAll('.ntt-dot');
      oldDots.forEach(dot => dot.remove());
      // 地図クイズでは市町村名テキストを非表示
      svg.querySelectorAll('.map-name-text').forEach(t => t.style.display = 'none');
      
      const targetArea = svg.getElementById(q.correct.id);
      if (targetArea) {
        targetArea.classList.add('highlight-active');
      }
    } else if (this.currentMode === 'ntt') {
      elFeatureList.classList.add('hidden');
      elMapContainer.classList.remove('hidden');
      elQuestionText.textContent = 'この光っているNTT収容局はどこ？';
      
      const svgId = this.currentPrefecture === 'fukushima' ? 'fukushima-svg' : 'miyagi-svg';
      const svg = document.getElementById(svgId);
      
      // Hide all svgs in container and show the right one
      const svgs = elMapContainer.querySelectorAll('svg');
      svgs.forEach(s => s.style.display = 'none');
      if (svg) svg.style.display = 'block';
      const allAreas = svg.querySelectorAll('.map-area');
      allAreas.forEach(area => area.classList.remove('highlight-active'));
      const oldDots = svg.querySelectorAll('.ntt-dot');
      oldDots.forEach(dot => dot.remove());
      // NTTクイズでは市町村名テキストを表示
      svg.querySelectorAll('.map-name-text').forEach(t => t.style.display = '');

      // Draw NTT dots
      const NS = "http://www.w3.org/2000/svg";
      this.nttOffices.forEach(office => {
        const circle = document.createElementNS(NS, 'circle');
        circle.setAttribute('cx', office.x);
        circle.setAttribute('cy', office.y);
        circle.setAttribute('r', '2.5');
        circle.setAttribute('class', 'ntt-dot');
        if (office.id === q.correct.id) {
           circle.setAttribute('r', '8'); // スマホでも見つけやすいよう大きめに
           circle.classList.add('ntt-target');
           // 光っている要素を最前面にするため少し遅れて追加
           setTimeout(() => svg.appendChild(circle), 10);
        } else {
           svg.appendChild(circle);
        }
      });
    }

    // 選択肢の描画
    this.elOptionsGrid.innerHTML = '';
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.dataset.id = opt.id;
      // ふりがなは2行目に小さく表示
      const kanaHtml = opt.kana ? `<span class="option-kana">${opt.kana}</span>` : '';
      btn.innerHTML = `<span>${opt.name}</span>${kanaHtml}`;
      btn.addEventListener('click', () => this.handleAnswerSubmit(opt.id, btn));
      this.elOptionsGrid.appendChild(btn);
    });
  }

  // 解答時の処理
  handleAnswerSubmit(selectedId, buttonEl) {
    // 重複回答を防ぐため全ボタンを無効化
    const btns = this.elOptionsGrid.querySelectorAll('.option-btn');
    btns.forEach(b => b.disabled = true);

    const { isCorrect, correctItem } = this.quizEngine.submitAnswer(selectedId);

    // 回答した時点で進捗バーを進める
    const elQuizProgress = document.getElementById('quiz-progress-fill');
    if (elQuizProgress) {
      elQuizProgress.style.width = `${((this.quizEngine.currentIndex + 1) / this.quizEngine.getTotal()) * 100}%`;
    }
    
    // イベント送信: 回答結果
    this.sendGAEvent('quiz_answer', {
      mode: this.currentMode,
      prefecture: this.currentPrefecture,
      question_id: correctItem.id,
      question_name: correctItem.name,
      is_correct: isCorrect
    });
    
    if (isCorrect) {
      if (this.currentMode === 'map') {
        const newlyCleared = currentMapTracker.markAsCleared(correctItem.id);
        if (newlyCleared) this.quizEngine.newlyCleared.push(correctItem);
      } else if (this.currentMode === 'feature') {
        const newlyCleared = currentFeatureTracker.markAsCleared(correctItem.id);
        if (newlyCleared) this.quizEngine.newlyCleared.push(correctItem);
      } else {
        const newlyCleared = currentNttTracker.markAsCleared(correctItem.id);
        if (newlyCleared) this.quizEngine.newlyCleared.push(correctItem);
      }
      buttonEl.classList.add('correct');
      
      this.elFeedbackResult.textContent = '正解！🎉';
      this.elFeedbackResult.style.color = 'var(--color-correct)';
      this.elFeedbackCard.classList.remove('is-incorrect');
      if (this.currentMode === 'ntt') {
        this.elFeedbackDesc.innerHTML = `<span class="text-xl font-bold">NTT ${correctItem.name}局</span>`;
      } else {
        this.elFeedbackDesc.innerHTML = `<span class="text-xl font-bold">${correctItem.name}</span> <span class="text-sm">(${correctItem.kana})</span><br><br><div class="text-left" style="font-size:0.9rem;">・${correctItem.features.join('<br>・')}</div>`;
      }
    } else {
      buttonEl.classList.add('incorrect');
      
      // 正解のボタンも強調表示
      const correctBtn = Array.from(btns).find(b => b.dataset.id === correctItem.id);
      if (correctBtn) correctBtn.classList.add('correct');
      
      this.elFeedbackResult.textContent = 'ざんねん...';
      this.elFeedbackResult.style.color = 'var(--color-danger)';
      this.elFeedbackCard.classList.add('is-incorrect');
      if (this.currentMode === 'ntt') {
        this.elFeedbackDesc.innerHTML = `正解は <span class="text-xl font-bold text-correct">NTT ${correctItem.name}局</span> でした。`;
      } else {
        this.elFeedbackDesc.innerHTML = `正解は <span class="text-xl font-bold text-correct">${correctItem.name}</span> でした。<br><span class="text-sm">(${correctItem.kana})</span><br><br><div class="text-left" style="font-size:0.9rem;">・${correctItem.features.join('<br>・')}</div>`;
      }
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
    const newClears = this.quizEngine.newlyCleared;

    // イベント送信: クイズ完了
    this.sendGAEvent('quiz_complete', {
      mode: this.currentMode,
      prefecture: this.currentPrefecture,
      score: score,
      total: total,
      new_clears_count: newClears.length
    });
    
    // スコアとトータル問題数の表示を更新
    this.elFinalScore.textContent = score;
    this.elFinalScore.nextElementSibling.textContent = ` / ${total}点`;

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
    
    // イベント送信: コレクション画面閲覧
    this.sendGAEvent('view_collection', {
      prefecture: this.currentPrefecture
    });

    this.renderCollection('all');
  }

  // コレクションの描画処理
  renderCollection(areaFilter = 'all') {
    // 表示するリストを切り替え
    if (this.collectionMode === 'ntt') {
      this.elCollectionListMuni.classList.add('hidden');
      this.elCollectionListNtt.classList.remove('hidden');
    } else {
      this.elCollectionListMuni.classList.remove('hidden');
      this.elCollectionListNtt.classList.add('hidden');
    }

    // 進捗テキスト
    let clearedCount, totalCount;
    if (this.collectionMode === 'ntt') {
      clearedCount = currentNttTracker.getClearedCount();
      totalCount = this.nttOffices.length;
    } else {
      clearedCount = 0;
      this.municipalities.forEach(city => {
        if (currentMapTracker.isCleared(city.id) && currentFeatureTracker.isCleared(city.id)) clearedCount++;
      });
      totalCount = this.municipalities.length;
    }
    document.getElementById('collection-progress-text').textContent = `${clearedCount} / ${totalCount}`;

    // マップの準備（初回のみ生成）
    const mapContainer = document.getElementById('collection-map-container');
    if (!mapContainer.querySelector('svg')) {
      this.generateCollectionMap(mapContainer);
    }

    const svgClone = mapContainer.querySelector('svg');
    const allAreas = svgClone.querySelectorAll('.map-area');
    allAreas.forEach(area => area.classList.remove('cleared-area'));
    
    // 自治体名テキストの表示切り替え
    const muniTexts = svgClone.querySelectorAll('.map-name-text');
    
    if (this.collectionMode === 'ntt') {
      muniTexts.forEach(t => t.style.display = 'none');
    } else {
      muniTexts.forEach(t => t.style.display = 'block');
    }
    
    // NTTドットのスタイルリセット
    const nttDots = svgClone.querySelectorAll('.ntt-col-dot');
    nttDots.forEach(dot => {
      dot.classList.remove('cleared-dot', 'ntt-target', 'uncleared-dot');
      dot.setAttribute('r', '2.5');
      dot.style.display = 'none'; // 自治体モードでは隠す
    });

    if (this.collectionMode === 'municipalities') {
      // ＝＝＝ 自治体モードの描画 ＝＝＝
      this.elCollectionListMuni.innerHTML = '';
      this.municipalities.forEach(city => {
        const isMapCleared = currentMapTracker.isCleared(city.id);
        const isFeatureCleared = currentFeatureTracker.isCleared(city.id);
        const isCleared = isMapCleared && isFeatureCleared;
        
        if (isCleared) {
          const area = svgClone.getElementById(`col-map-${city.id}`);
          if (area) area.classList.add('cleared-area');
        }

        if (areaFilter !== 'all' && city.area !== areaFilter) return;

        const li = document.createElement('li');
        li.className = 'collection-item';
        li.id = `list-item-${city.id}`;
        const header = document.createElement('div');
        header.className = 'collection-item-header';
        
        const statusIcon = isCleared ? '<span class="status-cleared">✅</span>' : '<span class="status-locked" style="color:var(--text-muted);">🔒</span>';
        const nameColor = isCleared ? '' : 'color: var(--text-muted);';

        const mapBadgeHtml = `<span style="padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; background: ${isMapCleared ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.1)'}; color: ${isMapCleared ? '#4ade80' : '#888'};">📍 位置</span>`;
        const featBadgeHtml = `<span style="padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; background: ${isFeatureCleared ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.1)'}; color: ${isFeatureCleared ? '#4ade80' : '#888'};">💡 特徴</span>`;

        header.innerHTML = `
          <div class="flex-between w-full align-center">
            <div class="collection-item-name" style="${nameColor}">
              ${statusIcon} ${city.name} ${city.kana ? `<span style="font-size: 0.8rem; color: var(--text-muted);">（${city.kana}）</span>` : ''}
            </div>
            <div style="display: flex; gap: 4px;">
              ${mapBadgeHtml}
              ${featBadgeHtml}
            </div>
          </div>
        `;
        
        // ポップアップを開く
        header.addEventListener('click', () => {
          this.showDetailsModal(city);
        });
        
        li.appendChild(header);
        this.elCollectionListMuni.appendChild(li);
      });
    } else {
      // ＝＝＝ NTTモードの描画 ＝＝＝
      this.elCollectionListNtt.innerHTML = '';
      this.nttOffices.forEach(office => {
        const isCleared = currentNttTracker.isCleared(office.id);
        
        const dot = svgClone.getElementById(`col-dot-${office.id}`);
        if (dot) {
          dot.style.display = 'block';
          dot.style.fill = ''; // CSSに任せる
          if (isCleared) {
            dot.classList.add('cleared-dot');
            dot.setAttribute('r', '4');
          } else {
            dot.classList.add('uncleared-dot');
            dot.setAttribute('r', '2.5');
          }
        }

        const li = document.createElement('li');
        li.className = 'collection-item ntt-collection-item';
        li.id = `list-item-${office.id}`;
        
        const header = document.createElement('div');
        header.className = 'collection-item-header';
        
        const statusIcon = isCleared ? '<span class="status-cleared" style="color:var(--color-primary);">🏢</span>' : '<span class="status-locked" style="color:var(--text-muted);">🔒</span>';
        const nameColor = isCleared ? '' : 'color: var(--text-muted);';

        header.innerHTML = `
          <div class="collection-item-name" style="${nameColor}">
            ${statusIcon} ${office.name}局 ${office.kana ? `<span style="font-size: 0.8rem; color: var(--text-muted);">（${office.kana}）</span>` : ''}
          </div>
          <div class="text-muted text-xs">▼ 確認する</div>
        `;
        
        // ポップアップを開く
        header.addEventListener('click', () => {
          this.showDetailsModal(office, true);
        });
        
        // ホバーで地図のドットを光らせる
        li.addEventListener('mouseenter', () => {
          if (dot) {
            dot.setAttribute('r', '6');
            dot.classList.add('ntt-target');
            svgClone.appendChild(dot); // 前面に出す
          }
        });
        li.addEventListener('mouseleave', () => {
          if (dot) {
            dot.setAttribute('r', isCleared ? '4' : '2.5');
            dot.classList.remove('ntt-target');
          }
        });

        li.appendChild(header);
        this.elCollectionListNtt.appendChild(li);
      });
    }
  }

  // 詳細モーダルの表示
  showDetailsModal(item, isNtt = false) {
    const modal = document.getElementById('details-modal');
    if (isNtt) {
      document.getElementById('modal-title').textContent = item.name + '局';
      document.getElementById('modal-kana').textContent = 'NTT収容局';
      document.getElementById('modal-features').innerHTML = '<div class="text-muted" style="text-align:center; padding:2rem;">(詳細な特徴データはありません)</div>';
    } else {
      document.getElementById('modal-title').textContent = item.name;
      document.getElementById('modal-kana').textContent = item.kana;
      const featuresHtml = item.features.map(f => `<div class="feature-item" style="font-size:1rem; padding:4px 12px; margin-bottom:8px;">・${f}</div>`).join('');
      document.getElementById('modal-features').innerHTML = featuresHtml;
    }
    
    modal.classList.remove('hidden');
    
    // 閉じるボタンのイベント（1度だけ登録するため上書きかフラグが必要ですが、簡単にはonclickを使用）
    document.getElementById('btn-close-modal').onclick = () => {
      modal.classList.add('hidden');
    };
    modal.onclick = (e) => {
      if(e.target === modal) modal.classList.add('hidden');
    };
  }

  generateCollectionMap(container) {
    // 問題画面のSVGをクローン
    const originalSvg = this.currentPrefecture === 'fukushima' ? document.getElementById('fukushima-svg') : document.getElementById('miyagi-svg');
    const svgClone = originalSvg.cloneNode(true);
    svgClone.style.display = 'block';
    
    // クローンの調整
    svgClone.classList.remove('real-map');
    svgClone.classList.add('collection-map-svg');
    
    // 既存のテキストラベルのIDをコレクション用に変更
    svgClone.querySelectorAll('.map-name-text').forEach(t => {
      const origId = t.id.replace('text_', ''); // ex: 'text_miyagi_xxx' -> 'miyagi_xxx'
      t.id = `col-text-${origId}`;
    });

    // IDの重複を避けるため、クローンのIDを変更
    const paths = svgClone.querySelectorAll('.map-area');
    paths.forEach(p => {
      const origId = p.id;
      p.id = `col-map-${origId}`;
      
      // マップのパスをクリックしたときにリストを展開する機能
      p.style.cursor = 'pointer';
      
      // マウスホバーで文字を強調する
      p.addEventListener('mouseenter', () => {
        if (this.collectionMode !== 'municipalities') return;
        const textEl = svgClone.getElementById(`col-text-${origId}`);
        if (textEl) textEl.classList.add('text-hover');
      });
      p.addEventListener('mouseleave', () => {
        const textEl = svgClone.getElementById(`col-text-${origId}`);
        if (textEl) textEl.classList.remove('text-hover');
      });
      
      p.addEventListener('click', () => {
        if (this.collectionMode !== 'municipalities') return;
        const listItem = document.getElementById(`list-item-${origId}`);
        if (listItem) {
          const header = listItem.querySelector('.collection-item-header');
          if (header && header.style.cursor !== 'default') {
             header.click();
          }
        }
      });
    });

    // NTTのドットも追加しておく
    const NS = "http://www.w3.org/2000/svg";
    this.nttOffices.forEach(office => {
      const circle = document.createElementNS(NS, 'circle');
      circle.setAttribute('cx', office.x);
      circle.setAttribute('cy', office.y);
      circle.setAttribute('r', '1.5');
      circle.setAttribute('class', 'ntt-col-dot');
      circle.setAttribute('id', `col-dot-${office.id}`);
      circle.style.display = 'none'; // 初期状態は非表示
      circle.style.cursor = 'pointer'; // クリック可能にする
      
      // ドットクリックでリストのヘッダーをクリックしたのと同じ処理（モーダル表示）を行う
      circle.addEventListener('click', () => {
        if (this.collectionMode !== 'ntt') return;
        const listItem = document.getElementById(`list-item-${office.id}`);
        if (listItem) {
          const header = listItem.querySelector('.collection-item-header');
          if (header) header.click();
        }
      });
      
      svgClone.appendChild(circle);
    });

    container.appendChild(svgClone);

    // テキスト要素の配置（福島のみ動的生成）
    if (this.currentPrefecture === 'fukushima') {
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
            
            textEl.textContent = city.name.replace(/(市|町|村)$/, '');
            
            svgClone.appendChild(textEl);
          } catch(e) {
            console.log('Error calculating bbox for', city.id);
          }
        }
      });
    }
  }

  // Google Analytics カスタムイベント送信用ヘルパー
  sendGAEvent(eventName, params) {
    if (typeof gtag === 'function') {
      gtag('event', eventName, params);
    } else {
      console.log(`[GA Event Mock] ${eventName}`, params);
    }
  }
}

// DOM読み込み完了時にアプリを起動
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
