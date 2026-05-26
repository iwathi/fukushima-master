/**
 * ProgressTracker: 福島県自治体マスターの進捗管理クラス
 * localStorageを用いてクリア状況を保存・復元します。
 */
class ProgressTracker {
  constructor(totalCount = 59) {
    this.storageKey = 'fukushimaMasterProgress';
    this.totalCount = totalCount;
    // 初期化時に保存されたデータを読み込む
    this.clearedIds = this.loadProgress();
  }

  /**
   * localStorageから進捗を読み込む
   * @returns {Set<string>} クリア済みの自治体IDのSet
   */
  loadProgress() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return new Set(parsed);
        }
      }
    } catch (e) {
      console.error('進捗データの読み込みに失敗しました:', e);
    }
    return new Set();
  }

  /**
   * 現在の進捗をlocalStorageに保存する
   */
  saveProgress() {
    try {
      const dataToSave = JSON.stringify(Array.from(this.clearedIds));
      localStorage.setItem(this.storageKey, dataToSave);
    } catch (e) {
      console.error('進捗データの保存に失敗しました:', e);
    }
  }

  /**
   * 自治体をクリア済みにする（クイズ正解時に呼び出す）
   * @param {string} id - 市町村ID (例: "07201")
   * @returns {boolean} 新しくクリアされた場合はtrue、既にクリア済みの場合はfalse
   */
  markAsCleared(id) {
    if (this.clearedIds.has(id)) {
      return false; // 既にクリア済み
    }
    this.clearedIds.add(id);
    this.saveProgress();
    return true; // 新規クリア
  }

  /**
   * 特定の自治体がクリア済みかチェックする（コレクション画面の表示切り替え等に使用）
   * @param {string} id - 市町村ID
   * @returns {boolean}
   */
  isCleared(id) {
    return this.clearedIds.has(id);
  }

  /**
   * クリア済みの自治体IDリストを取得する
   * @returns {string[]}
   */
  getClearedList() {
    return Array.from(this.clearedIds);
  }

  /**
   * 現在のクリア数を取得する
   * @returns {number}
   */
  getClearedCount() {
    return this.clearedIds.size;
  }

  /**
   * 進捗率（パーセント）を計算する（プログレスバーの表示に使用）
   * @returns {number} 0 〜 100 の整数
   */
  getProgressPercentage() {
    if (this.totalCount === 0) return 0;
    return Math.floor((this.getClearedCount() / this.totalCount) * 100);
  }

  /**
   * 進捗データをすべてリセットする
   */
  resetProgress() {
    this.clearedIds.clear();
    localStorage.removeItem(this.storageKey);
  }
}

// 外部から利用できるようグローバル変数として定義
const progressTracker = new ProgressTracker(59);
