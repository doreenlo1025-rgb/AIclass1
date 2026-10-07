(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SquirrelGameCore = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function difficultyForScore(score) {
    var safeScore = Math.max(0, Number(score) || 0);
    return {
      spawnInterval: Math.max(500, 1060 - safeScore * 22),
      fallSpeed: Math.min(340, 145 + safeScore * 6.5),
      chestnutChance: Math.min(.29, .14 + safeScore * .004)
    };
  }
  function outcomeFor(itemType, caught) {
    if (itemType === 'apple' && caught) return { scoreDelta: 1, lifeDelta: 0, message: '蘋果接到了！+1 分' };
    if (itemType === 'apple' && !caught) return { scoreDelta: 0, lifeDelta: -1, message: '哎呀，蘋果掉下去了！' };
    if (itemType === 'chestnut' && caught) return { scoreDelta: 0, lifeDelta: -1, message: '小心帶刺栗子！' };
    return { scoreDelta: 0, lifeDelta: 0, message: '' };
  }
  function createInitialState() { return { phase: 'idle', score: 0, lives: 3, items: [] }; }
  return { clamp: clamp, difficultyForScore: difficultyForScore, outcomeFor: outcomeFor, createInitialState: createInitialState };
}));
