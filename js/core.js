/* =========================================================================
   CASTLEVANIA — core: helpers, input, audio engine
   ========================================================================= */
'use strict';

var $ = function (id) { return document.getElementById(id); };

/* ------------------------- constants ------------------------- */
var GRAV = -36, MOVE = 7.0, JUMP = 14.6, JUMP2 = 12.6, VIEW_Z = 11;
var LEVEL_MIN = -6, LEVEL_MAX = 268, DEATH_Y = -10;
var BOSS_GATE = 228, BOSS_CAM = 246;
var MIDBOSS_X = 169, MIDBOSS_CAM = 173.5;
var COYOTE = 0.13, JUMP_BUFFER = 0.14;

/* ------------------------- difficulty ------------------------- */
var DIFFS = [
  { name: 'FLEDGLING', hp: 26, lives: 6, dmg: 0.5, bossHp: 0.6, bossDmg: 0.5, hearts: 12, tint: '#7fd48a' },
  { name: 'HUNTER', hp: 20, lives: 4, dmg: 1.0, bossHp: 1.0, bossDmg: 1.0, hearts: 8, tint: '#e5d3a2' },
  { name: 'NIGHTMARE', hp: 16, lives: 2, dmg: 1.6, bossHp: 1.35, bossDmg: 1.5, hearts: 5, tint: '#e0554a' }
];
var diffIdx = 0;
function D() { return DIFFS[diffIdx]; }
function edmg(base) { return Math.max(1, Math.round(base * D().dmg)); }

/* ------------------------- helpers ------------------------- */
function rnd(a, b) { return a + Math.random() * (b - a); }
function irnd(a, b) { return Math.floor(rnd(a, b + 1)); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function hits(a, b) { return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h; }
function pad(n, l) { n = '' + Math.floor(n); while (n.length < l) n = '0' + n; return n; }

/* ------------------------- input ------------------------- */
var KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
  ArrowDown: 'down', KeyS: 'down',
  KeyJ: 'attack', KeyZ: 'attack', KeyK: 'sub', KeyX: 'sub',
  Enter: 'start', NumpadEnter: 'start', KeyP: 'pause', KeyM: 'music', KeyR: 'restart'
};
/* fallback by e.key for browsers/automation that omit e.code */
var KEYMAP2 = {
  arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right',
  arrowup: 'jump', w: 'jump', ' ': 'jump', spacebar: 'jump', space: 'jump',
  arrowdown: 'down', s: 'down',
  j: 'attack', z: 'attack', k: 'sub', x: 'sub',
  enter: 'start', p: 'pause', m: 'music', r: 'restart'
};
var input = {}, pressed = {};
function tap(k) { if (pressed[k]) { pressed[k] = false; return true; } return false; }
function mapKey(e) {
  var k = e.code ? KEYMAP[e.code] : null;
  if (k) return k;
  return KEYMAP2[(e.key || '').toLowerCase()];
}
addEventListener('keydown', function (e) {
  var k = mapKey(e); if (!k) return; e.preventDefault();
  if (!input[k]) pressed[k] = true;
  input[k] = 1;
});
addEventListener('keyup', function (e) {
  var k = mapKey(e); if (!k) return; e.preventDefault(); input[k] = 0;
});

/* =========================================================================
   AUDIO — multi-track chiptune sequencer with per-zone themes
   ========================================================================= */
var THEMES = {
  title: {
    tempo: 0.30, drums: 0, pad: 1, leadGain: 0.085,
    bass: [45, 0, 0, 0, 45, 0, 0, 0, 41, 0, 0, 0, 41, 0, 0, 0,
           43, 0, 0, 0, 43, 0, 0, 0, 40, 0, 0, 0, 40, 0, 0, 0],
    arp:  [57, 0, 60, 0, 64, 0, 60, 0, 53, 0, 57, 0, 60, 0, 57, 0,
           55, 0, 59, 0, 62, 0, 59, 0, 52, 0, 56, 0, 59, 0, 56, 0],
    mel:  [69, 0, 0, 72, 0, 0, 76, 0, 0, 0, 74, 0, 0, 72, 0, 0,
           71, 0, 0, 74, 0, 0, 77, 0, 0, 0, 76, 0, 74, 0, 72, 0]
  },
  courtyard: {
    tempo: 0.1875, drums: 1, leadGain: 0.115,
    bass: [45, 45, 52, 45, 45, 45, 52, 45, 41, 41, 48, 41, 41, 41, 48, 41,
           43, 43, 50, 43, 43, 43, 50, 43, 40, 40, 47, 40, 40, 40, 47, 40],
    arp:  [57, 60, 64, 60, 57, 60, 64, 60, 53, 57, 60, 57, 53, 57, 60, 57,
           55, 59, 62, 59, 55, 59, 62, 59, 52, 56, 59, 56, 52, 56, 59, 56],
    mel:  [69, 0, 72, 0, 76, 0, 74, 72, 71, 0, 74, 0, 77, 0, 76, 74,
           72, 0, 76, 0, 79, 0, 77, 76, 80, 79, 77, 76, 74, 72, 71, 69]
  },
  hall: {
    tempo: 0.175, drums: 1, leadGain: 0.115,
    bass: [38, 38, 45, 38, 38, 38, 45, 38, 34, 34, 41, 34, 34, 34, 41, 34,
           36, 36, 43, 36, 36, 36, 43, 36, 33, 33, 40, 33, 33, 33, 40, 33],
    arp:  [50, 53, 57, 53, 50, 53, 57, 53, 46, 50, 53, 50, 46, 50, 53, 50,
           48, 52, 55, 52, 48, 52, 55, 52, 45, 49, 52, 49, 45, 49, 52, 49],
    mel:  [74, 0, 77, 0, 81, 0, 79, 77, 70, 0, 74, 0, 77, 0, 76, 74,
           72, 0, 76, 0, 79, 0, 77, 76, 81, 79, 77, 76, 74, 73, 74, 0]
  },
  chasm: {
    tempo: 0.16, drums: 1, leadGain: 0.105,
    bass: [40, 40, 40, 46, 40, 40, 45, 44, 40, 40, 40, 46, 40, 40, 45, 44,
           38, 38, 38, 44, 38, 38, 43, 42, 37, 37, 37, 43, 37, 36, 35, 34],
    arp:  [52, 55, 59, 55, 52, 55, 59, 55, 52, 55, 59, 55, 52, 55, 59, 55,
           50, 53, 57, 53, 50, 53, 57, 53, 49, 52, 56, 52, 49, 52, 56, 52],
    mel:  [76, 0, 0, 79, 0, 78, 0, 76, 75, 0, 0, 78, 0, 77, 0, 75,
           74, 0, 0, 77, 0, 76, 0, 74, 73, 72, 71, 70, 69, 68, 67, 66]
  },
  boss: {
    tempo: 0.142, drums: 2, leadGain: 0.125,
    bass: [40, 40, 40, 47, 40, 40, 46, 45, 38, 38, 38, 45, 38, 38, 44, 43,
           40, 40, 40, 47, 40, 40, 46, 45, 44, 44, 44, 51, 44, 43, 42, 41],
    arp:  [52, 56, 59, 56, 52, 56, 59, 56, 50, 53, 57, 53, 50, 53, 57, 53,
           52, 56, 59, 56, 52, 56, 59, 56, 56, 59, 63, 59, 56, 59, 63, 59],
    mel:  [76, 0, 75, 0, 76, 75, 76, 79, 74, 0, 73, 0, 74, 73, 74, 77,
           76, 0, 75, 0, 76, 75, 76, 79, 81, 80, 79, 78, 77, 76, 75, 74]
  },
  midboss: {
    tempo: 0.155, drums: 2, leadGain: 0.12, organ: 1,
    bass: [45, 45, 45, 52, 45, 44, 43, 42, 41, 41, 41, 48, 41, 40, 39, 38,
           45, 45, 45, 52, 45, 44, 43, 42, 47, 47, 47, 54, 47, 46, 45, 44],
    arp:  [57, 60, 64, 60, 57, 60, 64, 60, 53, 57, 60, 57, 53, 57, 60, 57,
           57, 60, 64, 60, 57, 60, 64, 60, 59, 62, 66, 62, 59, 62, 66, 62],
    mel:  [81, 0, 79, 0, 81, 79, 81, 84, 79, 0, 77, 0, 79, 77, 79, 81,
           81, 0, 79, 0, 81, 79, 81, 84, 86, 84, 83, 81, 79, 77, 76, 74]
  },
  victory: {
    tempo: 0.20, drums: 1, leadGain: 0.13, organ: 1,
    bass: [36, 36, 43, 36, 36, 36, 43, 36, 41, 41, 48, 41, 41, 41, 48, 41,
           38, 38, 45, 38, 38, 38, 45, 38, 43, 43, 50, 43, 31, 31, 43, 43],
    arp:  [48, 52, 55, 52, 48, 52, 55, 52, 53, 57, 60, 57, 53, 57, 60, 57,
           50, 53, 57, 53, 50, 53, 57, 53, 55, 59, 62, 59, 55, 59, 62, 59],
    mel:  [72, 0, 76, 0, 79, 0, 84, 0, 81, 0, 79, 0, 77, 0, 76, 0,
           74, 0, 77, 0, 81, 0, 79, 77, 79, 0, 81, 0, 84, 0, 0, 0]
  },
  gameover: {
    tempo: 0.34, drums: 0, pad: 1, organ: 1, leadGain: 0.09,
    bass: [45, 0, 0, 0, 44, 0, 0, 0, 43, 0, 0, 0, 41, 0, 0, 0,
           40, 0, 0, 0, 39, 0, 0, 0, 38, 0, 0, 0, 33, 0, 0, 0],
    arp:  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
           0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    mel:  [69, 0, 0, 68, 0, 0, 67, 0, 0, 65, 0, 0, 64, 0, 0, 0,
           63, 0, 0, 62, 0, 0, 61, 0, 0, 60, 0, 0, 57, 0, 0, 0]
  }
};

var A = {
  ctx: null, master: null, mg: null, sg: null, fx: null, noise: null,
  on: true, playing: false, step: 0, next: 0, timer: null, bar: 0, danger: false,
  theme: THEMES.courtyard, themeName: 'courtyard', pendingTheme: null,

  init: function () {
    if (this.ctx) return;
    var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    var c = this.ctx = new C();

    this.master = c.createGain(); this.master.gain.value = 0.6; this.master.connect(c.destination);
    this.mg = c.createGain(); this.mg.gain.value = 0.26; this.mg.connect(this.master);
    this.sg = c.createGain(); this.sg.gain.value = 0.5; this.sg.connect(this.master);

    // tempo-synced feedback delay for the lead — gives the score depth
    var d = c.createDelay(1.0); d.delayTime.value = 0.28;
    var fb = c.createGain(); fb.gain.value = 0.34;
    var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    var out = c.createGain(); out.gain.value = 0.4;
    d.connect(lp); lp.connect(fb); fb.connect(d); d.connect(out); out.connect(this.mg);
    this.fx = c.createGain(); this.fx.gain.value = 0.5; this.fx.connect(d);
    this.delayNode = d;

    var n = Math.floor(c.sampleRate * 1.2);
    var buf = c.createBuffer(1, n, c.sampleRate), dd = buf.getChannelData(0);
    for (var i = 0; i < n; i++) dd[i] = Math.random() * 2 - 1;
    this.noise = buf;
  },
  resume: function () { this.init(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  f: function (m) { return 440 * Math.pow(2, (m - 69) / 12); },

  tone: function (freq, dur, type, gain, when, slide, dest, detune) {
    if (!this.ctx || !this.on) return;
    var t = when || this.ctx.currentTime;
    var o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (detune) o.detune.setValueAtTime(detune, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain || 0.2, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sg); o.start(t); o.stop(t + dur + 0.02);
    return g;
  },
  hiss: function (dur, gain, f0, f1, when, q, type) {
    if (!this.ctx || !this.on) return;
    var t = when || this.ctx.currentTime;
    var s = this.ctx.createBufferSource(); s.buffer = this.noise;
    var bp = this.ctx.createBiquadFilter(); bp.type = type || 'bandpass'; bp.Q.value = q || 1.2;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(Math.max(60, f1), t + dur);
    var g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp); bp.connect(g); g.connect(this.sg); s.start(t); s.stop(t + dur + 0.02);
  },

  whip:    function () { this.hiss(0.16, 0.34, 900, 5200, 0, 2.5); this.tone(180, 0.08, 'sawtooth', 0.10, 0, 60); },
  jump:    function () { this.tone(320, 0.14, 'square', 0.13, 0, 720); },
  jump2:   function () { var c = this.ctx ? this.ctx.currentTime : 0; this.tone(520, 0.1, 'square', 0.12, c, 980); this.tone(780, 0.14, 'triangle', 0.1, c + 0.05, 1500); this.hiss(0.16, 0.12, 400, 2400); },
  land:    function () { this.hiss(0.07, 0.10, 220, 90); },
  hit:     function () { this.hiss(0.11, 0.26, 1500, 300, 0, 1.2); this.tone(150, 0.1, 'square', 0.14, 0, 70); },
  kill:    function () { this.tone(500, 0.22, 'square', 0.16, 0, 90); this.hiss(0.2, 0.16, 1800, 180); },
  hurt:    function () { this.tone(220, 0.32, 'sawtooth', 0.2, 0, 60); this.hiss(0.22, 0.16, 700, 120); },
  item:    function () { var c = this.ctx ? this.ctx.currentTime : 0; this.tone(880, 0.08, 'square', 0.15, c); this.tone(1320, 0.13, 'square', 0.15, c + 0.08); },
  throwit: function () { this.hiss(0.09, 0.16, 2600, 900, 0, 3); },
  fire:    function () { this.hiss(0.3, 0.2, 300, 1600, 0, 0.8); this.tone(90, 0.3, 'sawtooth', 0.12, 0, 40); },
  boom:    function () { this.hiss(0.7, 0.35, 900, 60, 0, 0.6); this.tone(110, 0.6, 'sawtooth', 0.2, 0, 30); },
  splash:  function () { this.hiss(0.45, 0.24, 2200, 380, 0, 0.9); },
  screech: function () { var c = this.ctx ? this.ctx.currentTime : 0; this.tone(1500, 0.3, 'sawtooth', 0.12, c, 2600); this.tone(1900, 0.25, 'square', 0.07, c + 0.05, 900); },
  thunder: function () {
    if (!this.ctx || !this.on) return;
    var t = this.ctx.currentTime;
    this.hiss(1.5, 0.28, 500, 45, t, 0.5, 'lowpass');
    this.tone(60, 1.2, 'sawtooth', 0.16, t + 0.05, 28);
  },
  tick:    function () { this.tone(1800, 0.05, 'square', 0.1, 0, 1200); },
  power:   function () {
    var c = this.ctx ? this.ctx.currentTime : 0, self = this;
    [659, 784, 988, 1319].forEach(function (f, i) { self.tone(f, 0.14, 'square', 0.16, c + i * 0.07); });
  },
  die: function () {
    var c = this.ctx ? this.ctx.currentTime : 0, self = this;
    [392, 349, 311, 262, 196].forEach(function (f, i) { self.tone(f, 0.3, 'square', 0.17, c + i * 0.16); });
  },
  fanfare: function () {
    var c = this.ctx ? this.ctx.currentTime : 0, self = this;
    [523, 659, 784, 1047, 988, 1047, 1319].forEach(function (f, i) {
      self.tone(f, 0.34, 'square', 0.16, c + i * 0.17);
      self.tone(f / 2, 0.34, 'triangle', 0.12, c + i * 0.17);
    });
  },
  /* dramatic hit when a boss reveals itself */
  sting: function () {
    if (!this.ctx || !this.on) return;
    var c = this.ctx.currentTime, self = this;
    [41, 44, 48].forEach(function (m) {
      self.tone(self.f(m), 2.2, 'sawtooth', 0.13, c, 0, self.mg);
      self.tone(self.f(m + 12), 2.0, 'square', 0.05, c, 0, self.mg);
    });
    this.hiss(1.6, 0.3, 4000, 120, c, 0.5);
    [0, 0.16, 0.32].forEach(function (d, i) {
      self.tone(self.f(69 - i * 5), 0.5, 'square', 0.13, c + d, 0, self.fx);
    });
  },
  crystal: function () {
    var c = this.ctx ? this.ctx.currentTime : 0, self = this;
    [1047, 1319, 1568, 2093, 2637].forEach(function (f, i) {
      self.tone(f, 0.5, 'sine', 0.14, c + i * 0.05, 0, self.fx);
      self.tone(f, 0.3, 'triangle', 0.1, c + i * 0.05);
    });
    this.hiss(0.6, 0.16, 6000, 1200, c, 2);
  },
  heartbeat: function () {
    if (!this.ctx || !this.on) return;
    var c = this.ctx.currentTime, self = this;
    [0, 0.17].forEach(function (d, i) {
      var o = self.ctx.createOscillator(), g = self.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(78, c + d);
      o.frequency.exponentialRampToValueAtTime(32, c + d + 0.16);
      g.gain.setValueAtTime(i ? 0.22 : 0.32, c + d);
      g.gain.exponentialRampToValueAtTime(0.0001, c + d + 0.2);
      o.connect(g); g.connect(self.master); o.start(c + d); o.stop(c + d + 0.22);
    });
  },

  /* ---- sequencer ---- */
  setTheme: function (name, immediate) {
    if (!THEMES[name] || this.themeName === name) return;
    if (immediate) {
      this.themeName = name; this.theme = THEMES[name]; this.step = 0; this.pendingTheme = null;
      if (this.delayNode) this.delayNode.delayTime.value = this.theme.tempo * 1.5;
    } else this.pendingTheme = name;
  },
  start: function () {
    this.init(); if (!this.ctx || this.playing) return;
    this.playing = true; this.next = this.ctx.currentTime + 0.06; this.step = 0;
    var self = this; this.timer = setInterval(function () { self.sched(); }, 25);
  },
  stop: function () { this.playing = false; if (this.timer) clearInterval(this.timer); this.timer = null; },
  sched: function () {
    if (!this.playing || !this.ctx) return;
    var now = this.ctx.currentTime;
    while (this.next < now + 0.2) {
      if (this.step === 0 && this.pendingTheme) {
        this.themeName = this.pendingTheme; this.theme = THEMES[this.pendingTheme]; this.pendingTheme = null;
        if (this.delayNode) this.delayNode.delayTime.value = this.theme.tempo * 1.5;
      }
      this.beat(this.step, this.next);
      this.step = (this.step + 1) % 32;
      if (this.step === 0) this.bar++;
      this.next += this.theme.tempo;
    }
  },
  beat: function (s, t) {
    if (!this.on || !this.ctx) return;
    var T = this.theme, tp = T.tempo;
    var b = T.bass[s], m = T.mel[s], a = T.arp[s];

    if (b) {
      this.tone(this.f(b), tp * 0.92, 'triangle', 0.30, t, 0, this.mg);
      this.tone(this.f(b - 12), tp * 0.9, 'sine', 0.22, t, 0, this.mg);
    }
    if (a && (s % 2 === 0 || T.drums === 2)) this.tone(this.f(a + 12), tp * 0.42, 'square', 0.05, t, 0, this.mg);
    if (m) {
      var g = T.leadGain;
      this.tone(this.f(m), tp * 0.95, 'square', g, t, 0, this.mg);
      this.tone(this.f(m), tp * 0.95, 'square', g * 0.55, t, 0, this.mg, 9);
      this.tone(this.f(m), tp * 0.6, 'square', g * 0.5, t, 0, this.fx);
    }
    if (T.pad && s % 8 === 0 && b) {
      this.tone(this.f(b + 12), tp * 7.5, 'sine', 0.05, t, 0, this.mg);
      this.tone(this.f(b + 19), tp * 7.5, 'sine', 0.035, t, 0, this.mg);
    }
    // cathedral organ chord, sustained across each half-bar
    if (T.organ && s % 8 === 0 && b) {
      var self = this;
      [0, 7, 12, 15].forEach(function (iv, k) {
        self.tone(self.f(b + 12 + iv), tp * 7.6, 'sawtooth', 0.026 - k * 0.004, t, 0, self.mg);
      });
    }
    // low drone that creeps in when the player is nearly dead
    if (this.danger && s % 8 === 0) {
      this.tone(this.f(b ? b - 12 : 28), tp * 8.2, 'sawtooth', 0.07, t, 0, this.mg);
    }
    if (!T.drums) return;

    var fill = this.danger || (s >= 28 && Math.floor(this.bar || 0) % 4 === 3);
    if (fill && s >= 28) {                                          // end-of-phrase tom fill
      var fo = this.ctx.createOscillator(), fg = this.ctx.createGain();
      fo.type = 'triangle';
      fo.frequency.setValueAtTime(220 - (s - 28) * 34, t);
      fo.frequency.exponentialRampToValueAtTime(70, t + 0.12);
      fg.gain.setValueAtTime(0.2, t); fg.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      fo.connect(fg); fg.connect(this.mg); fo.start(t); fo.stop(t + 0.16);
    }
    if (s % 4 === 0 || (T.drums === 2 && s % 8 === 6)) {           // kick
      var kg = this.ctx.createGain(), ko = this.ctx.createOscillator();
      ko.type = 'sine';
      ko.frequency.setValueAtTime(150, t);
      ko.frequency.exponentialRampToValueAtTime(45, t + 0.11);
      kg.gain.setValueAtTime(0.42, t); kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      ko.connect(kg); kg.connect(this.mg); ko.start(t); ko.stop(t + 0.15);
    }
    if (s % 8 === 4) {                                             // snare
      var sn = this.ctx.createBufferSource(); sn.buffer = this.noise;
      var bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.7;
      var sg2 = this.ctx.createGain();
      sg2.gain.setValueAtTime(0.16, t); sg2.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      sn.connect(bp); bp.connect(sg2); sg2.connect(this.mg); sn.start(t); sn.stop(t + 0.15);
    }
    if (s % 2 === 1 || this.danger) {                              // hat
      var hn = this.ctx.createBufferSource(); hn.buffer = this.noise;
      var hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7500;
      var hg = this.ctx.createGain();
      hg.gain.setValueAtTime(0.042, t); hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      hn.connect(hp); hp.connect(hg); hg.connect(this.mg); hn.start(t); hn.stop(t + 0.07);
    }
  }
};
