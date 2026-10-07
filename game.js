(function () {
  'use strict';
  var Core = window.SquirrelGameCore;
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var stage = document.getElementById('gameStage');
  var scoreValue = document.getElementById('scoreValue');
  var heartsValue = document.getElementById('heartsValue');
  var statusText = document.getElementById('gameStatus');
  var startOverlay = document.getElementById('startOverlay');
  var gameOverOverlay = document.getElementById('gameOverOverlay');
  var pauseNote = document.getElementById('pauseNote');
  var finalScore = document.getElementById('finalScore');
  var W = 960, H = 600;
  var scaleX = 1, scaleY = 1;
  var state = Core.createInitialState();
  state.items = [];
  var player = { x: 480, targetX: 480, dragging: false, pointerId: null, bounce: 0 };
  var squirrel = { x: 500, targetX: 500, throwTimer: 0, blink: 0 };
  var particles = [];
  var leaves = Array.from({ length: 14 }, function (_, i) { return { x: (i * 83) % W, y: 90 + (i * 37) % 210, phase: i * .8, speed: .5 + i % 3 * .18 }; });
  var lastTime = performance.now();
  var spawnTimer = 720;
  var damagePulse = 0;
  var toast = { text: '', time: 0, color: '#fff' };
  var pausedByVisibility = false;

  function resizeCanvas() {
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    scaleX = rect.width / W; scaleY = rect.height / H;
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  function setText(el, value) { if (el.textContent !== value) el.textContent = value; }
  function updateHud() {
    setText(scoreValue, String(state.score));
    setText(heartsValue, '♥ '.repeat(Math.max(0, state.lives)).trim() + (state.lives ? '' : '—'));
    heartsValue.setAttribute('aria-label', '剩餘 ' + state.lives + ' 顆心');
  }
  function announce(message) { statusText.textContent = message; toast.text = message; toast.time = 1250; }
  function resetGame() {
    state = Core.createInitialState(); state.phase = 'running'; state.items = [];
    player.x = player.targetX = W / 2; player.dragging = false; player.pointerId = null;
    squirrel.x = 500; squirrel.targetX = 500; squirrel.throwTimer = 0; particles = []; spawnTimer = 650; damagePulse = 0;
    startOverlay.classList.add('is-hidden'); gameOverOverlay.classList.add('is-hidden'); pauseNote.classList.add('is-hidden');
    updateHud(); announce('遊戲開始！拖曳角色接住蘋果。');
  }
  function endGame() {
    state.phase = 'over'; player.dragging = false; gameOverOverlay.classList.remove('is-hidden');
    finalScore.textContent = String(state.score); announce('遊戲結束，你得到 ' + state.score + ' 分。');
  }
  function loseLife(message) {
    state.lives = Math.max(0, state.lives - 1); damagePulse = 1; updateHud(); announce(message);
    stage.classList.remove('hit-flash'); void stage.offsetWidth; stage.classList.add('hit-flash');
    if (state.lives === 0) endGame();
  }
  function spawnItem() {
    var difficulty = Core.difficultyForScore(state.score);
    var type = Math.random() < difficulty.chestnutChance ? 'chestnut' : 'apple';
    squirrel.targetX = 180 + Math.random() * 600;
    state.items.push({ type: type, x: squirrel.x, y: 150, previousY: 150, vy: difficulty.fallSpeed * (.88 + Math.random() * .22), vx: (Math.random() - .5) * 45, rotation: Math.random() * Math.PI * 2, spin: (Math.random() - .5) * 2.4, radius: type === 'apple' ? 18 : 21 });
  }
  function addParticles(x, y, color, count) {
    for (var i = 0; i < count; i++) particles.push({ x: x, y: y, vx: (Math.random() - .5) * 100, vy: -40 - Math.random() * 85, life: .5 + Math.random() * .35, maxLife: .85, color: color, size: 3 + Math.random() * 4 });
  }
  function toWorldPoint(event) {
    var rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * W, y: (event.clientY - rect.top) / rect.height * H };
  }
  function movePlayer(event) {
    var point = toWorldPoint(event);
    player.targetX = Core.clamp(point.x, 74, W - 74);
  }
  canvas.addEventListener('pointerdown', function (event) {
    if (state.phase !== 'running' || event.clientY === undefined) return;
    var point = toWorldPoint(event);
    if (point.y < 350 && Math.abs(point.x - player.x) > 145) return;
    player.dragging = true; player.pointerId = event.pointerId; canvas.setPointerCapture(event.pointerId); canvas.classList.add('is-dragging'); movePlayer(event); event.preventDefault();
  });
  canvas.addEventListener('pointermove', function (event) { if (player.dragging && event.pointerId === player.pointerId) { movePlayer(event); event.preventDefault(); } });
  function stopDrag(event) { if (event.pointerId === player.pointerId) { player.dragging = false; player.pointerId = null; canvas.classList.remove('is-dragging'); } }
  canvas.addEventListener('pointerup', stopDrag); canvas.addEventListener('pointercancel', stopDrag); canvas.addEventListener('lostpointercapture', function () { player.dragging = false; player.pointerId = null; canvas.classList.remove('is-dragging'); });
  document.getElementById('startButton').addEventListener('click', resetGame);
  document.getElementById('restartButton').addEventListener('click', resetGame);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state.phase === 'running') { pausedByVisibility = true; pauseNote.classList.remove('is-hidden'); }
    if (!document.hidden && pausedByVisibility) { pausedByVisibility = false; pauseNote.classList.add('is-hidden'); lastTime = performance.now(); announce('繼續接蘋果吧！'); }
  });

  function update(dt) {
    leaves.forEach(function (leaf) { leaf.y += leaf.speed * dt * 18; leaf.x += Math.sin(leaf.phase + leaf.y * .01) * dt * 4; if (leaf.y > 560) leaf.y = 75; });
    squirrel.x += (squirrel.targetX - squirrel.x) * Math.min(1, dt * 2.2); squirrel.blink += dt;
    player.x += (player.targetX - player.x) * Math.min(1, dt * 16); player.bounce += dt * (player.dragging ? 10 : 3);
    damagePulse = Math.max(0, damagePulse - dt * 3.3); toast.time = Math.max(0, toast.time - dt * 1000);
    particles.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt; p.life -= dt; }); particles = particles.filter(function (p) { return p.life > 0; });
    if (state.phase !== 'running' || pausedByVisibility) return;
    var difficulty = Core.difficultyForScore(state.score);
    spawnTimer -= dt * 1000;
    if (spawnTimer <= 0) { spawnItem(); spawnTimer = difficulty.spawnInterval * (.85 + Math.random() * .3); }
    for (var i = state.items.length - 1; i >= 0; i--) {
      var item = state.items[i]; item.previousY = item.y; item.y += item.vy * dt; item.x += item.vx * dt; item.vx *= .998; item.rotation += item.spin * dt;
      var basketTop = 447, basketBottom = 494, caught = item.x > player.x - 66 && item.x < player.x + 66 && item.y + item.radius > basketTop && item.previousY + item.radius <= basketBottom;
      if (caught) { var catchResult = Core.outcomeFor(item.type, true); state.score += catchResult.scoreDelta; addParticles(item.x, item.y, item.type === 'apple' ? '#ffb544' : '#c58d58', 9); state.items.splice(i, 1); if (catchResult.lifeDelta < 0) loseLife(catchResult.message); else announce(catchResult.message); updateHud(); if (state.phase === 'over') break; continue; }
      if (item.y - item.radius > 555) { var missResult = Core.outcomeFor(item.type, false); state.items.splice(i, 1); if (missResult.lifeDelta < 0) loseLife(missResult.message); if (state.phase === 'over') break; }
    }
  }

  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function draw() {
    ctx.save(); ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    var sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#9edcf0'); sky.addColorStop(.62, '#d9f1d1'); sky.addColorStop(1, '#9bcf75'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffe7a6'; ctx.beginPath(); ctx.arc(780, 103, 50, 0, Math.PI * 2); ctx.fill();
    drawCloud(140, 112, .9); drawCloud(390, 80, .65); drawCloud(650, 188, .7);
    ctx.fillStyle = '#b4da9a'; ctx.beginPath(); ctx.moveTo(0, 345); ctx.quadraticCurveTo(190, 250, 360, 347); ctx.quadraticCurveTo(570, 240, 760, 342); ctx.quadraticCurveTo(870, 285, 960, 328); ctx.lineTo(960, 600); ctx.lineTo(0, 600); ctx.fill();
    drawTree(94, 236, .94, true); drawTree(858, 245, .9, false); drawMainCanopy();
    leaves.forEach(function (leaf) { ctx.save(); ctx.translate(leaf.x, leaf.y); ctx.rotate(Math.sin(leaf.phase + leaf.y * .02)); ctx.fillStyle = '#80b966'; ctx.beginPath(); ctx.ellipse(0, 0, 4, 9, .5, 0, Math.PI * 2); ctx.fill(); ctx.restore(); });
    ctx.fillStyle = '#80bb68'; ctx.fillRect(0, 532, W, 68); ctx.fillStyle = '#6ba758'; ctx.fillRect(0, 548, W, 52);
    for (var i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? '#f5d472' : '#e98e62'; ctx.beginPath(); ctx.arc(40 + i * 88, 569 + (i % 2) * 9, 3, 0, Math.PI * 2); ctx.fill(); }
    drawSquirrel(); state.items.forEach(drawItem); drawPlayer(); drawParticles();
    if (toast.time > 0 && state.phase === 'running') drawToast();
    if (damagePulse > 0) { ctx.fillStyle = 'rgba(238,91,81,' + (damagePulse * .13) + ')'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }
  function drawCloud(x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.beginPath(); ctx.arc(-32, 9, 18, 0, Math.PI * 2); ctx.arc(-7, -3, 25, 0, Math.PI * 2); ctx.arc(22, 8, 18, 0, Math.PI * 2); ctx.roundRect(-46, 7, 85, 22, 12); ctx.fill(); ctx.restore(); }
  function drawTree(x, y, s, left) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = '#9a633f'; roundRect(-20, 55, 40, 245, 14); ctx.fill(); ctx.fillStyle = '#ad7245'; ctx.fillRect(-7, 75, 7, 210); ctx.fillStyle = '#79ad60'; [[-49,45,55], [32,47,54], [0,0,68], [left ? -7 : 8,86,48]].forEach(function (c) { ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, Math.PI * 2); ctx.fill(); }); ctx.restore(); }
  function drawMainCanopy() { ctx.fillStyle = '#5b984f'; [[250,88,106],[380,62,132],[535,75,123],[670,92,107],[760,126,88]].forEach(function (c) { ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, Math.PI * 2); ctx.fill(); }); ctx.fillStyle = '#76b75c'; [[300,80,67],[456,39,88],[615,79,74],[712,125,54]].forEach(function (c) { ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, Math.PI * 2); ctx.fill(); }); }
  function drawSquirrel() { var x = squirrel.x, y = 122 + Math.sin(squirrel.blink * 2) * 2; ctx.save(); ctx.translate(x, y); ctx.scale(.86, .86); ctx.fillStyle = '#c97d47'; ctx.beginPath(); ctx.moveTo(-20, 19); ctx.bezierCurveTo(-86, -2, -71, -71, -27, -52); ctx.bezierCurveTo(-57, -27, -39, 7, -4, 3); ctx.fill(); ctx.fillStyle = '#e8a263'; ctx.beginPath(); ctx.ellipse(0, 14, 27, 32, -.15, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#c97d47'; ctx.beginPath(); ctx.arc(0, -17, 25, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(-20, -32); ctx.lineTo(-26, -57); ctx.lineTo(-4, -39); ctx.fill(); ctx.beginPath(); ctx.moveTo(20, -32); ctx.lineTo(28, -57); ctx.lineTo(6, -39); ctx.fill(); ctx.fillStyle = '#4f3b36'; ctx.beginPath(); ctx.arc(-9, -19, 3, 0, Math.PI * 2); ctx.arc(9, -19, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff3df'; ctx.beginPath(); ctx.arc(0, -9, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#815043'; ctx.beginPath(); ctx.arc(0, -10, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#efc068'; roundRect(-41, 17, 23, 9, 5); ctx.fill(); ctx.restore(); }
  function drawItem(item) { ctx.save(); ctx.translate(item.x, item.y); ctx.rotate(item.rotation); if (item.type === 'apple') { ctx.fillStyle = '#e95b50'; ctx.beginPath(); ctx.arc(0, 2, 18, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#f77d61'; ctx.beginPath(); ctx.arc(-6, -5, 5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#6f9f4b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(4, -25); ctx.stroke(); ctx.fillStyle = '#78ad55'; ctx.beginPath(); ctx.ellipse(10, -22, 8, 4, -.5, 0, Math.PI * 2); ctx.fill(); } else { ctx.fillStyle = '#855b3d'; ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.fill(); for (var a = 0; a < 8; a++) { var angle = a * Math.PI / 4; ctx.fillStyle = '#996d45'; ctx.beginPath(); ctx.moveTo(Math.cos(angle) * 13, Math.sin(angle) * 13); ctx.lineTo(Math.cos(angle) * 28, Math.sin(angle) * 28); ctx.lineTo(Math.cos(angle + .25) * 11, Math.sin(angle + .25) * 11); ctx.fill(); } ctx.fillStyle = '#e2aa67'; ctx.beginPath(); ctx.ellipse(0, 3, 8, 11, 0, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }
  function drawPlayer() { var x = player.x, y = 512 + Math.sin(player.bounce) * (player.dragging ? 3 : 1); ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#d78652'; ctx.beginPath(); ctx.arc(-25, 7, 8, 0, Math.PI * 2); ctx.arc(25, 7, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#4d83a8'; roundRect(-30, 5, 60, 45, 18); ctx.fill(); ctx.fillStyle = '#ffd2ad'; ctx.beginPath(); ctx.arc(0, -21, 22, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#8b5c40'; ctx.beginPath(); ctx.arc(0, -29, 23, Math.PI, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#4d3b38'; ctx.beginPath(); ctx.arc(-8, -20, 2.5, 0, Math.PI * 2); ctx.arc(8, -20, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#d9826d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -14, 6, 0, Math.PI); ctx.stroke(); ctx.strokeStyle = '#9a633f'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(-34, 10); ctx.lineTo(-56, -18); ctx.moveTo(34, 10); ctx.lineTo(56, -18); ctx.stroke(); ctx.fillStyle = '#d89b57'; roundRect(-67, -48, 134, 45, 16); ctx.fill(); ctx.fillStyle = '#f5c875'; roundRect(-60, -43, 120, 30, 12); ctx.fill(); ctx.strokeStyle = '#9a633f'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, -40, 48, Math.PI, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  function drawParticles() { particles.forEach(function (p) { ctx.globalAlpha = Math.max(0, p.life / p.maxLife); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1; }
  function drawToast() { ctx.save(); ctx.globalAlpha = Math.min(1, toast.time / 280); ctx.font = '800 16px Nunito, Noto Sans TC, sans-serif'; var width = ctx.measureText(toast.text).width + 34; ctx.fillStyle = 'rgba(255,253,247,.92)'; roundRect((W - width) / 2, 95, width, 36, 18); ctx.fill(); ctx.fillStyle = '#805b4b'; ctx.textAlign = 'center'; ctx.fillText(toast.text, W / 2, 119); ctx.restore(); }
  function loop(now) { var dt = Math.min(.04, (now - lastTime) / 1000); lastTime = now; update(dt); draw(); requestAnimationFrame(loop); }
  updateHud(); requestAnimationFrame(loop);
  window.__squirrelGame = { getState: function () { return { phase: state.phase, score: state.score, lives: state.lives, itemCount: state.items.length }; }, start: resetGame, restart: resetGame };
}());
