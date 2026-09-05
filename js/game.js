/* =========================================================================
   CASTLEVANIA — game: state machine, spawns, camera, HUD, main loop
   ========================================================================= */
'use strict';

/* ------------------------- enemy placement ------------------------- */
function S(type, x, y, vx) { return { type: type, x: x, y: y, vx: vx || 0, active: false, killed: false }; }

var SPAWNS = [
  /* --- Zone A: courtyard --- */
  S('zombie', 13, 0), S('bat', 19, 3.4), S('zombie', 27, 0), S('bat', 33, 4.2),
  S('zombie', 37, 0), S('bat', 44, 3.2), S('fleaman', 51, 0), S('skeleton', 56, 0),
  S('zombie', 61, 0), S('skeleton', 67, 2.5), S('bat', 74, 7), S('zombie', 78, 4.1),
  S('fleaman', 84, 4.1), S('bat', 88, 8), S('skeleton', 92, 4.1),
  /* --- Zone B: great hall --- */
  S('skeleton', 113, 0), S('bat', 117, 6), S('ghost', 121, 2.5), S('zombie', 125, 0),
  S('skeleton', 129, 0), S('bat', 133, 7), S('axearmor', 136, 0), S('zombie', 140, 0),
  S('medusa', 149, 4.2, -2.6), S('zombie', 151, 0), S('bonepillar', 154, 0),
  S('skeleton', 158, 0),
  S('medusa', 161, 5.4, -2.4), S('ghost', 158, 3), S('axearmor', 163, 0),
  S('zombie', 165, 0),
  /* --- Zone C: the chasm --- */
  S('bat', 183, 4.5), S('bonepillar', 189, 0), S('bat', 191, 6),
  S('medusa', 197, 5.5, -2.5), S('medusa', 203, 7, -2.3), S('medusa', 208, 4.5, -2.6),
  S('bat', 205, 9), S('skeleton', 213, 0), S('axearmor', 218, 0),
  S('fleaman', 222, 0), S('bonepillar', 225, 0),
  /* --- Zone D: throne room approach --- */
  S('bat', 231, 5), S('zombie', 234, 0)
];

var CHECKPOINTS = [3, 112, 160, 181, 230];
var ZONES = [
  { x: 97.6, key: 'courtyard', name: 'COURTYARD', num: 'I' },
  { x: 179.4, key: 'hall', name: 'GREAT HALL', num: 'II' },
  { x: 228.2, key: 'chasm', name: 'THE CHASM', num: 'III' },
  { x: 9999, key: 'boss', name: 'THRONE ROOM', num: 'IV' }
];

/* ------------------------- game state ------------------------- */
var G = {
  state: 'boot', t: 0, score: 0, kills: 0, shake: 0, freeze: 0,
  camX: 6, camY: 4, bossStarted: false, midbossStarted: false, midbossDone: false,
  elapsed: 0, toastT: 0, cardT: 0, stopwatch: 0, cine: 0,
  combo: 0, comboT: 0, zone: -1, best: 0, hurtFx: 0, beatT: 0, candleT: 0, nextLife: 25000,

  addScore: function (n) {
    this.score += n;
    while (this.score >= this.nextLife) {          // arcade-style extra man
      this.nextLife += 25000;
      P.lives++;
      A.crystal(); this.toast('1UP'); this.flash();
    }
  },
  registerKill: function (base) {
    this.comboT = 2.6;
    this.combo = Math.min(5, this.combo + 1);
    this.addScore(base * this.combo);
    this.kills++;
    if (this.combo > 1) this.toast('x' + this.combo + '  ' + (base * this.combo));
  },
  hitstop: function (s) { if (s > this.freeze) this.freeze = s; },
  toast: function (txt) {
    var el = $('toast'); el.innerHTML = txt; el.style.opacity = '1'; this.toastT = 1.4;
  },
  card: function (num, name) {
    var el = $('card');
    var top = num ? ('STAGE ' + num) : 'THE MASTER OF THE CASTLE';
    el.innerHTML = '<span class="cnum">' + top + '</span><span class="cname">' + name + '</span>';
    el.style.opacity = '1'; this.cardT = 2.4;
  },
  flash: function () {
    var el = $('flash'); el.style.transition = 'none'; el.style.opacity = '0.85';
    setTimeout(function () { el.style.transition = 'opacity .5s'; el.style.opacity = '0'; }, 20);
  },

  respawn: function () {
    P.lives--;
    if (P.lives < 0) { setState('gameover'); return; }
    clearActors();
    P.dead = false; P.deadT = 0; P.hp = P.maxHp; P.inv = 1.8;
    P.x = P.checkpoint.x; P.y = P.checkpoint.y;
    P.vx = P.vy = 0; P.atk = 0; P.atkCool = 0; P.jumps = 0; P.spin = 0;
    setCrouch(false);
    P.g.rotation.set(0, 0, 0); P.g.visible = true;
    this.stopwatch = 0; this.combo = 0;
    this.camX = clamp(P.x, HALF_W, LEVEL_MAX - HALF_W);
    this.bossStarted = false;
    this.midbossStarted = false;
    this.zone = -1;
    if (!A.playing && A.on) A.start();
  },

  win: function () {
    if (this.score > this.best) { this.best = this.score; saveBest(this.best); }
    setState('win');
    A.fanfare();
    this.flash();
  }
};

function saveBest(v) { try { localStorage.setItem('cv_best', '' + v); } catch (e) { } }
function loadBest() { try { return parseInt(localStorage.getItem('cv_best') || '0', 10) || 0; } catch (e) { return 0; } }
function saveDiff() { try { localStorage.setItem('cv_diff', '' + diffIdx); } catch (e) { } }
function loadDiff() {
  try {
    var v = parseInt(localStorage.getItem('cv_diff'), 10);
    return (v >= 0 && v < DIFFS.length) ? v : 0;
  } catch (e) { return 0; }
}

function clearActors() {
  var i;
  for (i = 0; i < enemies.length; i++) scene.remove(enemies[i].g);
  enemies.length = 0;
  for (i = 0; i < projectiles.length; i++) scene.remove(projectiles[i].g);
  projectiles.length = 0;
  for (i = 0; i < items.length; i++) scene.remove(items[i].g);
  items.length = 0;
  for (i = 0; i < SPAWNS.length; i++) SPAWNS[i].active = false;
  if (boss) { scene.remove(boss.g); boss = null; }
  openArena();
  if (!G.midbossDone) openMidArena();
  $('bossrow').className = '';
}

/* ------------------------- screens ------------------------- */
var FRAMES = {
  title: function () {
    var d = D();
    return '<h1>CASTLEVANIA</h1>' +
      '<h2>Shadow of the Crimson Moon</h2>' +
      '<div class="rule"></div>' +
      '<div class="diffpick">&larr;&nbsp; <span style="color:' + d.tint + '">' + d.name + '</span> &nbsp;&rarr;' +
      '<div class="diffsub">' + d.hp + ' HP &middot; ' + d.lives + ' Leben &middot; ' +
      (d.dmg < 1 ? 'halber' : (d.dmg > 1 ? 'erhöhter' : 'normaler')) + ' Schaden' +
      '<br><span style="color:#6d6553">Pfeiltasten links/rechts zum Wechseln</span></div></div>' +
      '<div class="rule"></div>' +
      '<div class="keys">' +
      '<div><b>A / D</b> oder <b>&larr; &rarr;</b> — Laufen</div>' +
      '<div><b>&uarr; / W / LEERTASTE</b> — Springen</div>' +
      '<div><b>2&times; Sprung</b> — Doppelsprung</div>' +
      '<div><b>J</b> oder <b>Z</b> — Peitsche</div>' +
      '<div><b>K</b> oder <b>X</b> — Subwaffe (Herzen)</div>' +
      '<div><b>S / &darr;</b> — Ducken, + Sprung: runter</div>' +
      '<div><b>P</b> Pause &middot; <b>M</b> Musik &middot; <b>R</b> Neustart</div>' +
      '<div>Beste Punktzahl: <b>' + pad(G.best, 6) + '</b></div>' +
      '</div>' +
      '<div class="press">PRESS <b>ENTER</b> TO ENTER THE CASTLE</div>' +
      '<div class="note">FAN TRIBUTE &middot; BUILT WITH THREE.JS</div>';
  },
  pause: function () {
    return '<h1>PAUSED</h1><div class="rule"></div>' +
      '<div class="sub">Musik: <b>' + (A.on ? 'AN' : 'AUS') + '</b> &nbsp;(Taste M)<br>' +
      'SCORE <b>' + pad(G.score, 6) + '</b></div>' +
      '<div class="press">PRESS <b>P</b> TO CONTINUE</div>';
  },
  gameover: function () {
    return '<div class="big">GAME OVER</div>' +
      '<div class="rule"></div>' +
      '<div class="sub">Die Nacht gehört Dracula.<br>SCORE <b>' + pad(G.score, 6) +
      '</b> &nbsp;·&nbsp; KILLS <b>' + G.kills + '</b> &nbsp;·&nbsp; BEST <b>' + pad(G.best, 6) + '</b></div>' +
      '<div class="press">PRESS <b>ENTER</b> TO RISE AGAIN</div>';
  },
  win: function () {
    var mins = Math.floor(G.elapsed / 60), secs = Math.floor(G.elapsed % 60);
    return '<div class="big win">THE COUNT HAS FALLEN</div>' +
      '<div class="rule"></div>' +
      '<div class="sub">Das Schloss zerfällt zu Staub. Bis zum nächsten Jahrhundert.<br>' +
      'SCORE <b>' + pad(G.score, 6) + '</b> &nbsp;·&nbsp; KILLS <b>' + G.kills + '</b> &nbsp;·&nbsp; TIME <b>' +
      pad(mins, 2) + ':' + pad(secs, 2) + '</b> &nbsp;·&nbsp; BEST <b>' + pad(G.best, 6) + '</b></div>' +
      '<div class="press">PRESS <b>ENTER</b> TO PLAY AGAIN</div>';
  }
};

function setState(s) {
  G.state = s;
  var screen = $('screen'), hud = $('hud');
  if (s === 'play') {
    screen.className = 'screen hide';
    hud.className = 'show';
  } else {
    if (s === 'gameover' && G.score > G.best) { G.best = G.score; saveBest(G.best); }
    $('frame').innerHTML = FRAMES[s] ? FRAMES[s]() : '';
    screen.className = 'screen';
    hud.className = (s === 'pause') ? 'show' : '';
  }
  if (s === 'title') { A.danger = false; A.setTheme('title', true); A.muteAmbience(); }
  if (s === 'gameover') { A.danger = false; A.muteAmbience(); A.setTheme('gameover', true); A.resume(); if (A.on) A.start(); }
  if (s === 'win') { A.danger = false; A.muteAmbience(); A.setTheme('victory', true); A.resume(); if (A.on) A.start(); }
}

function startRun() {
  G.score = 0; G.kills = 0; G.elapsed = 0;
  G.bossStarted = false; G.midbossStarted = false; G.midbossDone = false;
  G.stopwatch = 0; G.combo = 0; G.comboT = 0; G.zone = -1; G.freeze = 0;
  G.cine = 0; G.hurtFx = 0; G.candleT = 0; G.nextLife = 25000;
  clearActors();
  P.maxHp = D().hp;
  P.hp = P.maxHp; P.hearts = D().hearts; P.lives = D().lives;
  P.whipLvl = 0; P.sub = null; P.subMul = 1;
  P.dead = false; P.deadT = 0; P.inv = 0; P.atk = 0; P.atkCool = 0;
  P.x = 3; P.y = 2; P.vx = 0; P.vy = 0; P.face = 1; P.jumps = 0; P.spin = 0;
  setCrouch(false);
  P.checkpoint = { x: 3, y: 2 };
  P.g.rotation.set(0, 0, 0); P.g.visible = true;
  for (var i = 0; i < SPAWNS.length; i++) { SPAWNS[i].active = false; SPAWNS[i].killed = false; }
  for (var c = 0; c < candles.length; c++) {
    if (!candles[c].alive) { candles[c].alive = true; scene.add(candles[c].g); }
  }
  resetBreakWalls();
  G.camX = clamp(P.x, HALF_W, LEVEL_MAX - HALF_W); G.camY = 4;
  buildBars();
  lastHud = {};
  $('diffname').textContent = D().name;
  $('diffname').style.color = D().tint;
  A.resume(); A.danger = false; A.setTheme('courtyard', true); A.start();
  setState('play');
}

/* ------------------------- HUD ------------------------- */
function buildBars() {
  var pb = $('pbar'), bb = $('bbar'), i, d;
  pb.innerHTML = '';
  for (i = 0; i < (P ? P.maxHp : 20); i++) { d = document.createElement('div'); d.className = 'seg'; pb.appendChild(d); }
  if (!bb.children.length) {
    for (i = 0; i < 20; i++) { d = document.createElement('div'); d.className = 'seg'; bb.appendChild(d); }
  }
}
var lastHud = {};
function updateHUD() {
  var i, segs = $('pbar').children;
  for (i = 0; i < segs.length; i++) segs[i].className = 'seg' + (i < P.hp ? ' on' : '');
  if (lastHud.score !== G.score) { $('score').textContent = pad(G.score, 6); lastHud.score = G.score; }
  if (lastHud.hearts !== P.hearts) { $('hearts').textContent = pad(P.hearts, 2); lastHud.hearts = P.hearts; }
  if (lastHud.lives !== P.lives) { $('lives').textContent = pad(Math.max(0, P.lives), 2); lastHud.lives = P.lives; }
  var subTxt = P.sub ? (P.sub.toUpperCase() + (P.subMul > 1 ? ' x' + P.subMul : '')) : '—';
  if (lastHud.sub !== subTxt) { $('subicon').textContent = subTxt; lastHud.sub = subTxt; }
  if (lastHud.whip !== P.whipLvl) { $('whiplvl').textContent = WHIPS[P.whipLvl].name; lastHud.whip = P.whipLvl; }

  var zi = 0;
  for (i = 0; i < ZONES.length; i++) { if (P.x < ZONES[i].x) { zi = i; break; } }
  if (lastHud.zone !== zi) {
    $('stage').innerHTML = ZONES[zi].num + ' &middot; ' + ZONES[zi].name;
    lastHud.zone = zi;
  }

  var cw = (G.combo > 1) ? ('COMBO x' + G.combo) : '';
  if (lastHud.combo !== cw) { $('combo').textContent = cw; lastHud.combo = cw; }
  var sw = G.stopwatch > 0 ? ('TIME STOP ' + G.stopwatch.toFixed(1)) : '';
  if (lastHud.sw !== sw) { $('stopwatch').textContent = sw; lastHud.sw = sw; }

  if (boss) {
    $('bossrow').className = 'show';
    if (lastHud.bname !== boss.name) { $('bossname').textContent = boss.name; lastHud.bname = boss.name; }
    var bs = $('bbar').children, n = Math.ceil(boss.hp / boss.maxHp * 20);
    for (i = 0; i < bs.length; i++) bs[i].className = 'seg' + (i < n ? ' on' : '');
  } else if ($('bossrow').className) $('bossrow').className = '';
}

/* ------------------------- spawn / camera ------------------------- */
function updateSpawns() {
  for (var i = 0; i < SPAWNS.length; i++) {
    var d = SPAWNS[i];
    if (d.active || d.killed) continue;
    if (Math.abs(d.x - G.camX) < HALF_W + 9) {
      var st = ESTATS[d.type];
      var e = spawnEnemy(d.type, d.x, d.y + st.h / 2, d);
      e.vx = d.vx;
      if (d.vx) e.face = d.vx > 0 ? 1 : -1;
      d.active = true;
    }
  }
}

function updateCamera(dt) {
  var tx = boss ? boss.camX : (P.x + P.vx * 0.18);
  tx = clamp(tx, LEVEL_MIN + HALF_W + 4, LEVEL_MAX - HALF_W);
  G.camX = lerp(G.camX, tx, Math.min(1, dt * 5.5));

  var ty = boss ? (boss.kind === 'bat' ? 5.2 : 4.4) : clamp(P.y + 1.0, 2.9, 10.5);
  G.camY = lerp(G.camY, ty, Math.min(1, dt * 3.2));

  var sx = 0, sy = 0;
  if (G.shake > 0) {
    G.shake = Math.max(0, G.shake - dt * 1.6);
    sx = rnd(-1, 1) * G.shake * 0.7; sy = rnd(-1, 1) * G.shake * 0.7;
  }
  camera.position.set(G.camX + sx, G.camY + sy, VIEW_Z);
  camera.lookAt(G.camX + sx, G.camY + sy, 0);
}

/* ------------------------- progression ------------------------- */
function updateProgress(dt) {
  for (var i = CHECKPOINTS.length - 1; i >= 0; i--) {
    if (P.x > CHECKPOINTS[i] - 1 && P.checkpoint.x < CHECKPOINTS[i]) {
      P.checkpoint = { x: CHECKPOINTS[i], y: 2 };
      break;
    }
  }

  var zi = 0;
  for (i = 0; i < ZONES.length; i++) { if (P.x < ZONES[i].x) { zi = i; break; } }
  if (zi !== G.zone) {
    if (G.zone >= 0) { G.card(ZONES[zi].num, ZONES[zi].name); A.stageJingle(); }
    G.zone = zi;
    if (!boss) A.setTheme(ZONES[zi].key === 'boss' ? 'chasm' : ZONES[zi].key);
    A.setAmbience(zi === 0 ? 'wind' : 'hall');
  }

  if (!G.midbossDone && !G.midbossStarted && P.x > MIDBOSS_X) {
    G.midbossStarted = true;
    sealMidArena();
    spawnMidBoss();
    bossIntro();
  }
  if (!G.bossStarted && P.x > 233) {
    G.bossStarted = true;
    sealArena();
    spawnBoss();
    bossIntro();
  }
}

function bossIntro() {
  G.cine = 2.1;
  G.shake = 0.6;
  G.flash();
  A.sting();
  G.card('', boss.name);
  G.cardT = 2.4;
}

/* relight arena candles so a long boss fight never starves you of hearts */
function respawnArenaCandles(dt) {
  if (!boss || boss.dead) return;
  G.candleT -= dt;
  if (G.candleT > 0) return;
  G.candleT = 7;
  var lo = boss.kind === 'bat' ? 166 : 228, hi = boss.kind === 'bat' ? 180 : 268;
  for (var i = 0; i < candles.length; i++) {
    var c = candles[i];
    if (!c.alive && c.x > lo && c.x < hi) {
      c.alive = true; scene.add(c.g);
      spawnParticles(c.x, c.y + 0.5, 1.2, 0xffd070, 8, 3, 0.5, 0.11);
      return;
    }
  }
}

/* ------------------------- adaptive resolution -------------------------
   Fill rate is the usual bottleneck on this kind of scene, so the render
   scale is trimmed automatically until frames land inside the budget. */
var RES = { cur: 1, max: 1, acc: 0, n: 0, fps: 60, cool: 0 };
function initRes() {
  RES.max = Math.min(window.devicePixelRatio || 1, 2);
  RES.cur = RES.max;
  applyRes();
}
function applyRes() {
  renderer.setPixelRatio(RES.cur);
  renderer.setSize(Math.max(1, innerWidth), Math.max(1, innerHeight), false);
}
function trackFps(raw) {
  RES.acc += raw; RES.n++;
  if (RES.cool > 0) RES.cool--;
  if (RES.n < 24) return;
  var avg = RES.acc / RES.n;
  RES.acc = 0; RES.n = 0;
  RES.fps = Math.round(1 / Math.max(0.001, avg));
  var el = $('fps');
  if (el) { el.textContent = RES.fps; el.className = RES.fps < 45 ? 'low' : ''; }
  if (RES.cool > 0) return;
  if (avg > 0.0215 && RES.cur > 0.55) {
    RES.cur = Math.max(0.55, RES.cur - 0.15); applyRes(); RES.cool = 3;
  } else if (avg < 0.0135 && RES.cur < RES.max) {
    RES.cur = Math.min(RES.max, RES.cur + 0.1); applyRes(); RES.cool = 6;
  }
}

/* ------------------------- main loop ------------------------- */
var lastT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  var raw = (now - lastT) / 1000;
  if (!(raw > 0) || raw > 0.5) raw = 0.016;
  trackFps(raw);
  var dt = Math.min(0.034, raw);
  lastT = now;

  if (tap('music')) {
    A.on = !A.on;
    if (!A.on) { A.stop(); A.muteAmbience(); }
    else { A.resume(); if (G.state === 'play' || G.state === 'title') A.start(); }
    if (G.state === 'pause') $('frame').innerHTML = FRAMES.pause();
  }
  if (tap('start')) {
    A.resume();
    if (G.state === 'title' || G.state === 'gameover' || G.state === 'win') startRun();
  }
  if (tap('pause') && (G.state === 'play' || G.state === 'pause')) {
    if (G.state === 'play') { setState('pause'); A.stop(); }
    else { setState('play'); A.resume(); if (A.on) A.start(); }
  }
  if (tap('restart') && (G.state === 'play' || G.state === 'pause')) startRun();

  if (G.state === 'title' && (tap('left') || tap('right'))) {
    diffIdx = (diffIdx + (input.left ? DIFFS.length - 1 : 1)) % DIFFS.length;
    saveDiff();
    $('frame').innerHTML = FRAMES.title();
    A.item();
  }

  if (G.state === 'play') {
    if (G.freeze > 0) {
      G.freeze -= dt;                     // impact hit-stop
    } else if (G.cine > 0) {
      G.cine -= dt; G.t += dt;            // boss reveal
      if (boss) updateBoss(dt);
      if (G.cine <= 0 && boss) boss.t = 0;
    } else {
      G.t += dt; G.elapsed += dt;
      if (G.stopwatch > 0) {
        G.stopwatch -= dt;
        if (G.stopwatch <= 0) { G.stopwatch = 0; A.tick(); }
        else if (Math.floor(G.stopwatch * 2) !== Math.floor((G.stopwatch + dt) * 2)) A.tick();
      }
      if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
      updateMovers(dt);
      updatePlayer(dt);
      updateEnemies(dt);
      updateProjectiles(dt);
      updateItems(dt);
      if (boss) updateBoss(dt);
      updateSpawns();
      updateProgress(dt);
      respawnArenaCandles(dt);

      // low-health tension: heartbeat, red edges, extra percussion
      var low = P.hp > 0 && P.hp <= P.maxHp * 0.28;
      A.danger = low;
      if (low) {
        G.beatT -= dt;
        if (G.beatT <= 0) { G.beatT = 1.05; A.heartbeat(); }
      } else G.beatT = 0;
    }
    updateCamera(dt);
    updateHUD();
  } else {
    G.t += dt;
    if (G.state !== 'pause') updateCamera(dt);
  }

  if (G.hurtFx > 0) G.hurtFx -= dt * 2.4;
  var lowPulse = (G.state === 'play' && P.hp > 0 && P.hp <= P.maxHp * 0.28)
    ? 0.18 + Math.sin(G.t * 6) * 0.1 : 0;
  $('dmg').style.opacity = Math.max(0, Math.max(G.hurtFx, lowPulse)).toFixed(3);

  if (G.toastT > 0) { G.toastT -= dt; if (G.toastT <= 0) $('toast').style.opacity = '0'; }
  if (G.cardT > 0) { G.cardT -= dt; if (G.cardT <= 0) $('card').style.opacity = '0'; }

  updateParticles(dt);
  updateWorld(dt, G.camX, G.camY);
  renderer.render(scene, camera);
}

/* ------------------------- boot ------------------------- */
function boot() {
  initRenderer();
  initAssets();
  buildSky();
  initParticles();
  buildWeather();
  buildLevel();
  buildRubble();
  optimizeScene();
  createPlayer();
  buildBars();
  initRes();
  G.best = loadBest();
  diffIdx = loadDiff();
  setState('title');
  G.camX = 20; G.camY = 5;
  updateCamera(0.016);
  // browsers need a gesture before audio may start — use the first one for the title theme
  var kick = function () {
    A.resume();
    if (A.on && G.state === 'title') { A.setTheme('title', true); A.start(); }
    removeEventListener('keydown', kick); removeEventListener('pointerdown', kick);
  };
  addEventListener('keydown', kick); addEventListener('pointerdown', kick);

  requestAnimationFrame(function (t) { lastT = t; frame(t); });
}

addEventListener('blur', function () { if (G.state === 'play') { setState('pause'); A.stop(); } });
boot();
