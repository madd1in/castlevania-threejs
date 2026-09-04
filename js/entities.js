/* =========================================================================
   CASTLEVANIA — entities: player, whip, enemies, projectiles, items, bosses
   ========================================================================= */
'use strict';

var P = null, enemies = [], projectiles = [], items = [], boss = null;

/* =========================================================================
   COLLISION
   ========================================================================= */
function collide(e, dt) {
  var i, p;
  e.hitWall = false;
  e.x += e.vx * dt;
  for (i = 0; i < platforms.length; i++) {
    p = platforms[i];
    if (p.oneway) continue;
    if (hits(e, p)) {
      if (e.x < p.x) e.x = p.x - (p.w + e.w) / 2; else e.x = p.x + (p.w + e.w) / 2;
      e.vx = 0; e.hitWall = true;
    }
  }
  var py = e.y;
  e.y += e.vy * dt;
  e.onGround = false;
  e.onOneway = false;
  e.ride = null;
  for (i = 0; i < platforms.length; i++) {
    p = platforms[i];
    if (!hits(e, p)) continue;
    var top = p.y + p.h / 2, bot = p.y - p.h / 2;
    if (p.oneway) {
      if (e.vy <= 0 && (py - e.h / 2) >= top - 0.08 && !(e.dropping > 0)) {
        e.y = top + e.h / 2; e.vy = 0; e.onGround = true; e.onOneway = true; e.ride = p;
      }
      continue;
    }
    if (e.vy <= 0 && py - e.h / 2 >= top - 0.35) { e.y = top + e.h / 2; e.vy = 0; e.onGround = true; e.ride = p; }
    else if (e.vy > 0 && py + e.h / 2 <= bot + 0.35) { e.y = bot - e.h / 2; e.vy = -1; }
    else { if (e.x < p.x) e.x = p.x - (p.w + e.w) / 2; else e.x = p.x + (p.w + e.w) / 2; e.hitWall = true; }
  }
}

/* =========================================================================
   PLAYER
   ========================================================================= */
var SKIN = 0xdba077, COAT = 0x8e3f28, PANTS = 0x9c7440, BOOT = 0x4a3020, HAIR = 0x6b3d1c;
var STAND_H = 1.7, CROUCH_H = 1.05;

function buildSimon() {
  var g = new THREE.Group();
  var m = {};
  m.legL = colorBox(0.24, 0.52, 0.3, PANTS, -0.15, -0.44, 0);
  m.legR = colorBox(0.24, 0.52, 0.3, PANTS, 0.15, -0.44, 0);
  m.bootL = colorBox(0.28, 0.22, 0.36, BOOT, -0.15, -0.75, 0.03);
  m.bootR = colorBox(0.28, 0.22, 0.36, BOOT, 0.15, -0.75, 0.03);
  m.torso = colorBox(0.5, 0.62, 0.34, COAT, 0, 0.05, 0);
  m.belt = colorBox(0.54, 0.12, 0.37, 0x2e2013, 0, -0.2, 0);
  m.buckle = colorBox(0.14, 0.14, 0.4, 0xc8a24a, 0, -0.2, 0);
  m.chest = colorBox(0.34, 0.3, 0.36, 0xd8cbb0, 0, 0.16, 0.01);
  m.shoulder = colorBox(0.62, 0.16, 0.36, 0x6a2c1c, 0, 0.3, 0);
  m.armB = colorBox(0.17, 0.42, 0.2, COAT, -0.3, 0.0, -0.08);
  m.armF = colorBox(0.17, 0.42, 0.2, COAT, 0.3, 0.0, 0.1);
  m.handF = colorBox(0.16, 0.14, 0.18, SKIN, 0.3, -0.24, 0.1);
  m.head = colorBox(0.36, 0.36, 0.34, SKIN, 0, 0.46, 0);
  m.hair = colorBox(0.42, 0.14, 0.4, HAIR, 0, 0.66, 0);
  m.hairB = colorBox(0.2, 0.34, 0.16, HAIR, 0, 0.5, -0.19);
  m.band = colorBox(0.4, 0.07, 0.38, 0xb02a2a, 0, 0.56, 0);
  m.eye = colorBox(0.06, 0.07, 0.03, 0x1a1015, 0.1, 0.46, 0.18);
  m.cape = colorBox(0.44, 0.6, 0.08, 0x5a1f18, 0, 0.06, -0.2);
  m.coil = colorBox(0.2, 0.2, 0.16, 0x4a2c14, -0.28, -0.22, 0.16);
  for (var k in m) g.add(m[k]);
  g.userData.m = m;
  return g;
}

function buildWhip() {
  var g = new THREE.Group();
  var segs = [];
  for (var i = 0; i < 7; i++) {
    var s = colorBox(0.3, 0.13, 0.13, i === 6 ? 0xb0b6c2 : 0x5a3418, 0, 0, 0.15);
    g.add(s); segs.push(s);
  }
  var spark = sprite(TEX.glow, 1.4, 0xffd58a, 0.0);
  g.add(spark);
  g.visible = false;
  g.userData.segs = segs;
  g.userData.spark = spark;
  return g;
}

var WHIPS = [
  { name: 'LEATHER', len: 2.3, dmg: 1, col: 0x5a3418 },
  { name: 'CHAIN', len: 3.0, dmg: 2, col: 0x9098a6 },
  { name: 'MORNING STAR', len: 3.6, dmg: 3, col: 0xd8c27a }
];
var SUB_COST = { dagger: 1, axe: 2, cross: 3, holy: 3, watch: 5 };

function createPlayer() {
  var g = buildSimon();
  var whip = buildWhip();
  scene.add(g); scene.add(whip);
  var torch = new THREE.PointLight(0xffb060, 0.9, 9, 2);
  scene.add(torch);
  P = {
    x: 3, y: 2, vx: 0, vy: 0, w: 0.62, h: STAND_H,
    face: 1, onGround: false, onOneway: false, dropping: 0, ride: null,
    hp: 20, maxHp: 20, hearts: 8, lives: 4,
    jumps: 0, maxJumps: 2, coyote: 0, buffer: 0, spin: 0, crouch: false,
    whipLvl: 0, sub: null, subMul: 1,
    atk: 0, atkCool: 0, inv: 0, dead: false, deadT: 0,
    walkT: 0, g: g, whip: whip, torch: torch, checkpoint: { x: 3, y: 2 }
  };
  return P;
}

function setCrouch(on) {
  if (P.crouch === on) return;
  var d = (STAND_H - CROUCH_H) / 2;
  P.crouch = on;
  P.h = on ? CROUCH_H : STAND_H;
  P.y += on ? -d : d;
}

function playerHurt(dmg, fromX) {
  if (P.inv > 0 || P.dead || G.state !== 'play') return;
  P.hp -= dmg;
  P.inv = 1.5;
  A.hurt();
  G.shake = 0.35;
  G.hurtFx = 1;
  G.hitstop(0.05);
  G.combo = 0;
  spawnParticles(P.x, P.y, 0.8, 0xc0392b, 12, 5, 0.5, 0.14);
  var d = (fromX === undefined || fromX < P.x) ? 1 : -1;
  P.vx = d * 4.6; P.vy = 6.0;
  if (P.hp <= 0) { P.hp = 0; killPlayer(); }
}

function killPlayer() {
  if (P.dead) return;
  P.dead = true; P.deadT = 0;
  A.die();
  spawnParticles(P.x, P.y, 0.8, 0xc0392b, 26, 7, 0.9, 0.17);
  G.shake = 0.5;
}

function updatePlayer(dt) {
  var m = P.g.userData.m;

  if (P.dead) {
    P.deadT += dt;
    P.g.position.y += dt * 2.2;
    P.g.rotation.z += dt * 3;
    P.g.visible = P.deadT < 1.4;
    P.whip.visible = false;
    if (P.deadT > 1.8) G.respawn();
    return;
  }

  if (P.inv > 0) P.inv -= dt;
  if (P.atkCool > 0) P.atkCool -= dt;
  if (P.dropping > 0) P.dropping -= dt;
  if (P.spin > 0) P.spin -= dt;
  if (P.buffer > 0) P.buffer -= dt;

  var ax = 0;
  if (input.left) ax -= 1;
  if (input.right) ax += 1;

  setCrouch(!!input.down && P.onGround && P.atk <= 0);
  if (P.atk > 0.12 && P.onGround) ax = 0;      // rooted while the swing is out
  if (ax !== 0) P.face = ax;

  var speed = MOVE * (P.crouch ? 0.5 : 1);
  var target = ax * speed;
  var accel = P.onGround ? 36 : 20;
  P.vx += clamp(target - P.vx, -accel * dt, accel * dt);
  if (ax === 0 && P.onGround) P.vx *= Math.pow(0.0016, dt);

  /* ---- jumping: coyote time, input buffering, double jump ---- */
  if (tap('jump')) P.buffer = JUMP_BUFFER;
  if (P.onGround) { P.jumps = 0; P.coyote = COYOTE; }
  else {
    if (P.coyote > 0) { P.coyote -= dt; if (P.coyote <= 0 && P.jumps === 0) P.jumps = 1; }
  }
  if (P.buffer > 0) {
    if (input.down && P.onGround && P.onOneway) {
      P.dropping = 0.24; P.vy = -1; P.buffer = 0; setCrouch(false);
    } else if (P.onGround || P.coyote > 0) {
      P.vy = JUMP; P.jumps = 1; P.coyote = 0; P.buffer = 0; setCrouch(false);
      A.jump();
      spawnParticles(P.x, P.y - P.h / 2, 0.6, 0x6a6250, 5, 2.4, 0.35, 0.1);
    } else if (P.jumps < P.maxJumps) {
      P.vy = JUMP2; P.jumps++; P.buffer = 0; P.spin = 0.4;
      A.jump2();
      spawnRing(P.x, P.y - 0.4, 0xa8d8ff);
    }
  }
  if (!input.jump && P.vy > 3) P.vy -= 34 * dt;   // variable jump height

  P.vy += GRAV * dt;
  P.vy = Math.max(P.vy, -30);

  var wasAir = !P.onGround;
  collide(P, dt);
  if (P.onGround && wasAir && P.vy === 0) {
    A.land(); spawnParticles(P.x, P.y - P.h / 2, 0.6, 0x6a6250, 4, 2, 0.3, 0.1);
  }

  P.x = clamp(P.x, LEVEL_MIN + 1, LEVEL_MAX);
  if (P.y < DEATH_Y) { P.hp = 0; killPlayer(); }

  /* ---- attacks ---- */
  if (tap('attack') && P.atkCool <= 0) { P.atk = 0.36; P.atkCool = 0.4; A.whip(); }
  if (tap('sub') && P.sub && P.hearts >= SUB_COST[P.sub] && P.atkCool <= 0) {
    P.hearts -= SUB_COST[P.sub];
    throwSub(P.sub);
    P.atk = 0.26; P.atkCool = 0.36;
  }

  var W = WHIPS[P.whipLvl];
  if (P.atk > 0) {
    P.atk -= dt;
    var t = 1 - P.atk / 0.36;
    var ext;
    if (t < 0.3) ext = -0.35 * (t / 0.3);
    else if (t < 0.62) ext = (t - 0.3) / 0.32;
    else ext = Math.max(0, 1 - (t - 0.62) / 0.38);
    drawWhip(ext, W);
    if (t >= 0.32 && t <= 0.7) whipHitTest(W);
  } else {
    P.whip.visible = false;
  }

  /* ---- animation ---- */
  P.walkT += Math.abs(P.vx) * dt * 3.4;
  var sw = Math.sin(P.walkT) * 0.55;
  var crouchY = P.crouch ? 0.3 : 0;
  if (P.crouch) {
    m.legL.position.set(-0.17, -0.2, 0); m.legR.position.set(0.17, -0.2, 0);
    m.legL.scale.set(0.24, 0.3, 0.3); m.legR.scale.set(0.24, 0.3, 0.3);
    m.bootL.position.set(-0.17, -0.4, 0.03); m.bootR.position.set(0.17, -0.4, 0.03);
    m.torso.position.y = 0.02; m.head.position.y = 0.34; m.hair.position.y = 0.54;
    m.band.position.y = 0.44; m.hairB.position.y = 0.38; m.eye.position.y = 0.34;
    m.shoulder.position.y = 0.22; m.chest.position.y = 0.1;
  } else {
    m.legL.scale.set(0.24, 0.52, 0.3); m.legR.scale.set(0.24, 0.52, 0.3);
    m.torso.position.y = 0.05; m.head.position.y = 0.46; m.hair.position.y = 0.66;
    m.band.position.y = 0.56; m.hairB.position.y = 0.5; m.eye.position.y = 0.46;
    m.shoulder.position.y = 0.3; m.chest.position.y = 0.16;
    if (!P.onGround) {
      m.legL.rotation.z = 0.4; m.legR.rotation.z = -0.25;
      m.legL.position.set(-0.15, -0.4, 0); m.legR.position.set(0.15, -0.46, 0);
      m.bootL.position.set(-0.15, -0.68, 0.03); m.bootR.position.set(0.15, -0.75, 0.03);
    } else if (Math.abs(P.vx) > 0.6) {
      m.legL.rotation.z = 0; m.legR.rotation.z = 0;
      m.legL.position.set(-0.15 + sw * 0.2, -0.44 + Math.abs(sw) * 0.11, 0);
      m.legR.position.set(0.15 - sw * 0.2, -0.44 + Math.abs(Math.sin(P.walkT + Math.PI)) * 0.11, 0);
      m.bootL.position.set(m.legL.position.x, m.legL.position.y - 0.31, 0.03);
      m.bootR.position.set(m.legR.position.x, m.legR.position.y - 0.31, 0.03);
      m.armB.rotation.z = -sw * 0.7; m.armF.rotation.z = sw * 0.7;
    } else {
      m.legL.rotation.z = m.legR.rotation.z = 0;
      m.legL.position.set(-0.15, -0.44, 0); m.legR.position.set(0.15, -0.44, 0);
      m.bootL.position.set(-0.15, -0.75, 0.03); m.bootR.position.set(0.15, -0.75, 0.03);
      m.armB.rotation.z = 0; m.armF.rotation.z = 0;
    }
  }
  if (P.atk > 0) { m.armF.rotation.z = -1.25; m.handF.position.set(0.44, 0.02 - crouchY, 0.1); }
  else m.handF.position.set(0.3, -0.24 - crouchY * 0.5, 0.1);
  m.torso.rotation.z = P.atk > 0 ? -0.12 : 0;
  m.cape.rotation.z = -P.vx * 0.045;
  m.cape.position.y = 0.06 - crouchY * 0.5;

  P.g.position.set(P.x, P.y + (P.crouch ? 0.32 : 0), 0);
  P.g.rotation.y = P.face > 0 ? 0 : Math.PI;
  P.g.rotation.z = P.spin > 0 ? -P.face * (1 - P.spin / 0.4) * Math.PI * 2 : 0;
  P.g.visible = !(P.inv > 0 && Math.floor(P.inv * 22) % 2 === 0);

  P.torch.position.set(P.x, P.y + 0.5, 2.6);
  P.torch.intensity = 0.75 + Math.sin(G.t * 9) * 0.08;
}

function drawWhip(ext, W) {
  var segs = P.whip.userData.segs;
  P.whip.visible = ext > 0.02;
  if (!P.whip.visible) return;
  var oy = P.y + (P.crouch ? -0.1 : 0.24);
  var ox = P.x + P.face * 0.42;
  for (var i = 0; i < segs.length; i++) {
    var f = (i + 1) / segs.length;
    var len = W.len * ext;
    var x = ox + P.face * len * f;
    var sag = (1 - ext) * 1.1 * f * f + Math.sin(f * 2.2) * 0.13 * (1 - ext);
    var y = oy - sag * 1.4 + (ext > 0.7 ? Math.sin(f * Math.PI) * 0.1 : 0);
    segs[i].position.set(x - P.x, y - P.y, 0.25);
    segs[i].rotation.z = -sag * 0.6 * P.face;
    var isTip = i >= segs.length - 2;
    segs[i].material.color.setHex(isTip ? W.col : (P.whipLvl > 0 ? W.col : 0x5a3418));
    segs[i].scale.set(isTip ? 0.34 : 0.3, isTip ? 0.2 : 0.13, isTip ? 0.2 : 0.13);
  }
  var sp = P.whip.userData.spark;
  sp.position.copy(segs[segs.length - 1].position);
  sp.material.opacity = P.whipLvl > 0 ? Math.max(0, ext - 0.55) * 1.2 : 0;
  sp.scale.setScalar(1.2 + P.whipLvl * 0.4);
  P.whip.position.set(P.x, P.y, 0);
}

function whipHitTest(W) {
  var hb = {
    x: P.x + P.face * (0.45 + W.len / 2),
    y: P.y + (P.crouch ? -0.1 : 0.2),
    w: W.len, h: 0.78
  };
  var i;
  for (i = 0; i < enemies.length; i++) {
    var e = enemies[i];
    if (e.dead || e.hitCd > 0) continue;
    if (hits(hb, e)) damageEnemy(e, W.dmg);
  }
  for (i = 0; i < candles.length; i++) {
    var c = candles[i];
    if (!c.alive) continue;
    if (hits(hb, c)) breakCandle(c);
  }
  for (i = 0; i < projectiles.length; i++) {
    var pr = projectiles[i];
    if (pr.dead || pr.friendly || !pr.breakable) continue;
    if (hits(hb, pr)) {
      pr.dead = true; A.hit();
      spawnParticles(pr.x, pr.y, 0.6, 0xffd070, 8, 4, 0.4, 0.12);
      G.addScore(100);
    }
  }
  if (boss && !boss.dead && boss.vuln && boss.hitCd <= 0 && hits(hb, boss)) damageBoss(W.dmg);
}

/* =========================================================================
   CANDLES + ITEMS
   ========================================================================= */
function breakCandle(c) {
  c.alive = false;
  scene.remove(c.g);
  A.hit();
  spawnParticles(c.x, c.y + 0.5, 1.2, 0xffd070, 14, 4.5, 0.55, 0.13);
  G.addScore(100);
  var r = Math.random(), type;
  if (r < 0.32) type = 'heart';
  else if (r < 0.47) type = 'bigheart';
  else if (r < 0.56) type = 'money';
  else if (r < 0.66) type = 'meat';
  else if (r < 0.73) type = 'dagger';
  else if (r < 0.79) type = 'axe';
  else if (r < 0.84) type = 'cross';
  else if (r < 0.88) type = 'holy';
  else if (r < 0.91) type = 'watch';
  else if (r < 0.96) type = 'double';
  else type = 'whip';
  if (type === 'whip' && P.whipLvl >= 2) type = 'bigheart';
  if (type === 'double' && P.subMul >= 3) type = 'bigheart';
  dropItem(c.x, c.y + 0.5, type);
}

var ITEM_COL = {
  heart: 0xe23b4a, bigheart: 0xff5a6a, money: 0xf0c040, meat: 0xc06a3a,
  dagger: 0xc8d0dc, axe: 0x9aa4b4, cross: 0xe8d48a, holy: 0x6ad0ff,
  watch: 0xd8c8a0, whip: 0xd8c27a, double: 0xffd76a, crystal: 0x9ae8ff
};

function dropItem(x, y, type) {
  var g = new THREE.Group();
  var col = ITEM_COL[type];
  if (type === 'heart' || type === 'bigheart') {
    var s = type === 'bigheart' ? 1.25 : 0.85;
    g.add(colorBox(0.3 * s, 0.3 * s, 0.24, col, -0.11 * s, 0.1 * s, 0));
    g.add(colorBox(0.3 * s, 0.3 * s, 0.24, col, 0.11 * s, 0.1 * s, 0));
    g.add(colorBox(0.42 * s, 0.36 * s, 0.24, col, 0, -0.06 * s, 0));
  } else if (type === 'money') {
    g.add(colorBox(0.42, 0.42, 0.28, col, 0, 0, 0));
    g.add(colorBox(0.2, 0.12, 0.3, 0x8a5a20, 0, 0.24, 0));
  } else if (type === 'meat') {
    g.add(colorBox(0.46, 0.34, 0.3, col, 0, 0, 0));
    g.add(colorBox(0.14, 0.34, 0.16, 0xe8e0c8, 0.26, 0, 0));
  } else if (type === 'dagger') {
    g.add(colorBox(0.62, 0.1, 0.1, col, 0.1, 0, 0));
    g.add(colorBox(0.1, 0.3, 0.12, 0x6a4a28, -0.2, 0, 0));
  } else if (type === 'axe') {
    g.add(colorBox(0.1, 0.6, 0.1, 0x6a4a28, 0, 0, 0));
    g.add(colorBox(0.36, 0.3, 0.12, col, 0.2, 0.2, 0));
  } else if (type === 'cross') {
    g.add(colorBox(0.16, 0.6, 0.12, col, 0, 0, 0));
    g.add(colorBox(0.5, 0.16, 0.12, col, 0, 0.08, 0));
  } else if (type === 'holy') {
    g.add(colorBox(0.3, 0.4, 0.3, col, 0, -0.05, 0));
    g.add(colorBox(0.14, 0.2, 0.14, 0xe8f4ff, 0, 0.22, 0));
  } else if (type === 'watch') {
    g.add(colorBox(0.4, 0.4, 0.16, col, 0, 0, 0));
    g.add(colorBox(0.12, 0.12, 0.2, 0x6a5a3a, 0, 0.24, 0));
    g.add(colorBox(0.2, 0.05, 0.2, 0x3a3020, 0.04, 0.02, 0.1));
  } else if (type === 'double') {
    g.add(colorBox(0.16, 0.5, 0.16, col, -0.14, 0, 0));
    g.add(colorBox(0.16, 0.5, 0.16, col, 0.14, 0, 0));
  } else if (type === 'crystal') {
    var oct = new THREE.Mesh(new THREE.OctahedronGeometry(0.42),
      new THREE.MeshLambertMaterial({ color: col, emissive: 0x1a4a6a, transparent: true, opacity: 0.9 }));
    g.add(oct);
  } else {
    g.add(colorBox(0.6, 0.14, 0.14, col, 0, 0, 0));
    g.add(colorBox(0.2, 0.2, 0.2, 0xffe8a0, 0.34, 0, 0));
  }
  var gl = sprite(TEX.glow, type === 'crystal' ? 3 : 1.5, col, type === 'crystal' ? 0.8 : 0.55);
  gl.position.z = -0.2; g.add(gl);
  g.position.set(x, y, 1.1);
  scene.add(g);
  items.push({ x: x, y: y, vy: 2.4, w: 1.1, h: 1.1, type: type, g: g, life: 13, t: 0 });
}

function updateItems(dt) {
  for (var i = items.length - 1; i >= 0; i--) {
    var it = items[i];
    it.t += dt; it.life -= dt;
    it.vy += GRAV * 0.55 * dt;
    var e = { x: it.x, y: it.y, w: 0.5, h: 0.5, vx: 0, vy: it.vy, dropping: 0 };
    collide(e, dt);
    it.x = e.x; it.y = e.y; it.vy = e.onGround ? 0 : e.vy;
    it.g.position.set(it.x, it.y + Math.sin(it.t * 4) * 0.06, 1.1);
    it.g.rotation.y += dt * 1.6;
    if (it.life < 3.5) it.g.visible = Math.floor(it.life * 8) % 2 === 0;

    if (hits(it, P) && !P.dead) { pickItem(it); it.life = 0; }
    if (it.life <= 0) { scene.remove(it.g); items.splice(i, 1); }
  }
}

function pickItem(it) {
  switch (it.type) {
    case 'heart': P.hearts = Math.min(99, P.hearts + 2); A.item(); G.addScore(100); break;
    case 'bigheart': P.hearts = Math.min(99, P.hearts + 6); A.item(); G.addScore(300); break;
    case 'money': A.item(); G.addScore(1000); G.toast('1000'); break;
    case 'meat': P.hp = Math.min(P.maxHp, P.hp + 8); A.power(); G.toast('HEALED'); break;
    case 'whip':
      if (P.whipLvl < 2) { P.whipLvl++; A.power(); G.toast(WHIPS[P.whipLvl].name + '!'); G.flash(); }
      else { P.hearts += 6; A.item(); }
      break;
    case 'double':
      if (P.subMul < 3) { P.subMul++; A.power(); G.toast(P.subMul === 2 ? 'DOUBLE SHOT' : 'TRIPLE SHOT'); G.flash(); }
      else { P.hearts += 6; A.item(); }
      break;
    case 'crystal':
      A.crystal(); G.flash(); G.shake = 0.6;
      G.addScore(3000); G.toast('CRYSTAL  +3000');
      for (var q = enemies.length - 1; q >= 0; q--) {
        spawnParticles(enemies[q].x, enemies[q].y, 0.8, 0x9ae8ff, 12, 6, 0.6, 0.15);
        killEnemy(enemies[q]);
      }
      for (var w = 0; w < 40; w++) {
        spawnParticles(P.x, P.y + 0.4, 1.4, 0x9ae8ff, 1, 13, 0.8, 0.14, -3);
      }
      spawnRing(P.x, P.y, 0x9ae8ff);
      break;
    default:
      P.sub = it.type; A.power(); G.toast(it.type.toUpperCase());
      P.hearts = Math.min(99, P.hearts + 2);
      break;
  }
  spawnParticles(it.x, it.y, 1.2, ITEM_COL[it.type], 10, 3.5, 0.4, 0.11);
}

/* =========================================================================
   PROJECTILES
   ========================================================================= */
function makeProj(kind, x, y, vx, vy, friendly) {
  var g = new THREE.Group(), col, w = 0.5, h = 0.4, grav = 0, dmg = 2, breakable = false, life = 3.2;
  if (kind === 'dagger') {
    g.add(colorBox(0.7, 0.12, 0.12, 0xd6dce8, 0, 0, 0));
    g.add(colorBox(0.12, 0.26, 0.14, 0x6a4a28, -0.3, 0, 0));
    col = 0xd6dce8; w = 0.7; h = 0.3; dmg = 2;
  } else if (kind === 'axe') {
    g.add(colorBox(0.12, 0.7, 0.12, 0x6a4a28, 0, 0, 0));
    g.add(colorBox(0.44, 0.36, 0.14, 0xaab4c4, 0.24, 0.24, 0));
    col = 0xaab4c4; w = 0.7; h = 0.7; grav = -20; dmg = 3;
  } else if (kind === 'cross') {
    g.add(colorBox(0.18, 0.7, 0.14, 0xe8d48a, 0, 0, 0));
    g.add(colorBox(0.6, 0.18, 0.14, 0xe8d48a, 0, 0.1, 0));
    col = 0xe8d48a; w = 0.7; h = 0.7; dmg = 2; life = 4;
  } else if (kind === 'holy') {
    g.add(colorBox(0.3, 0.4, 0.3, 0x6ad0ff, 0, 0, 0));
    col = 0x6ad0ff; w = 0.4; h = 0.5; grav = -24; dmg = 2;
  } else if (kind === 'flame') {
    for (var f = 0; f < 3; f++) {
      var fs = sprite(TEX.glow, 1.6, 0x8fd8ff, 0.85);
      fs.position.set((f - 1) * 0.42, 0.2, 0); g.add(fs);
    }
    col = 0x8fd8ff; w = 1.5; h = 1.1; dmg = 1; life = 2.8;
  } else if (kind === 'bone') {
    g.add(colorBox(0.34, 0.14, 0.14, 0xe6e0cc, 0, 0, 0));
    g.add(colorBox(0.14, 0.26, 0.16, 0xe6e0cc, -0.17, 0, 0));
    g.add(colorBox(0.14, 0.26, 0.16, 0xe6e0cc, 0.17, 0, 0));
    col = 0xe6e0cc; grav = -18; dmg = 1; breakable = true;
  } else if (kind === 'eaxe') {
    g.add(colorBox(0.12, 0.6, 0.12, 0x4a3a28, 0, 0, 0));
    g.add(colorBox(0.4, 0.32, 0.14, 0x8a94a4, 0.2, 0.2, 0));
    col = 0x8a94a4; grav = -19; dmg = 2; breakable = true;
  } else { /* fireball */
    g.add(colorBox(0.38, 0.38, 0.38, 0xffe0a0, 0, 0, 0));
    g.add(sprite(TEX.glowRed, 2.2, 0xff5522, 0.9));
    col = 0xff5522; w = 0.5; h = 0.5; dmg = 2; life = 5;
    breakable = true;                      // the whip can swat fireballs away
  }
  if (kind !== 'fireball' && kind !== 'flame') {
    var gl2 = sprite(TEX.glow, 1.1, col, 0.35); gl2.position.z = -0.15; g.add(gl2);
  }
  g.position.set(x, y, 0.8);
  scene.add(g);
  var pr = {
    kind: kind, x: x, y: y, vx: vx, vy: vy, w: w, h: h, g: g, grav: grav,
    dmg: friendly ? dmg : edmg(dmg), friendly: !!friendly, breakable: breakable,
    life: life, t: 0, dead: false, col: col, tickT: 0, trailT: 0
  };
  projectiles.push(pr);
  return pr;
}

function throwSub(kind) {
  var ox = P.x + P.face * 0.6, oy = P.y + 0.25;
  if (kind === 'watch') {
    G.stopwatch = 4.5 + P.subMul; A.tick(); G.toast('TIME STOP'); G.flash();
    for (var i = 0; i < 26; i++) spawnParticles(P.x, P.y, 0.9, 0xd8e8ff, 1, 7, 0.7, 0.13, -2);
    return;
  }
  A.throwit();
  for (var k = 0; k < P.subMul; k++) {
    var sp = (k - (P.subMul - 1) / 2);            // fan the extra shots out
    if (kind === 'dagger') makeProj('dagger', ox, oy + sp * 0.5, P.face * 15, sp * 1.2, true);
    else if (kind === 'axe') makeProj('axe', ox, oy, P.face * (6.2 + sp * 1.8), 13.5 - Math.abs(sp) * 1.2, true);
    else if (kind === 'holy') makeProj('holy', ox, oy, P.face * (5.5 + sp * 2.4), 4.5, true);
    else {
      var c = makeProj('cross', ox, oy + sp * 0.6, P.face * 11, 0, true);
      c.boomerang = true; c.pierce = true; c.dir = P.face;
    }
  }
}

function updateProjectiles(dt) {
  for (var i = projectiles.length - 1; i >= 0; i--) {
    var pr = projectiles[i];
    if (!pr.friendly && G.stopwatch > 0) { pr.g.position.set(pr.x, pr.y, 0.8); continue; }
    pr.t += dt; pr.life -= dt;

    if (pr.kind === 'flame') {
      pr.g.children.forEach(function (c, k) {
        c.material.opacity = 0.55 + Math.sin(G.t * 17 + k * 2) * 0.3;
        c.scale.setScalar(1.4 + Math.sin(G.t * 13 + k) * 0.35);
      });
      pr.tickT -= dt;
      if (pr.tickT <= 0) {
        pr.tickT = 0.32;
        for (var q = 0; q < enemies.length; q++) {
          if (!enemies[q].dead && hits(pr, enemies[q])) damageEnemy(enemies[q], pr.dmg);
        }
        if (boss && !boss.dead && boss.vuln && hits(pr, boss)) damageBoss(1);
      }
      if (Math.random() < 0.5) spawnParticles(pr.x + rnd(-0.6, 0.6), pr.y, 0.9, 0x8fd8ff, 1, 1.6, 0.4, 0.1, 4);
      if (pr.life <= 0) { scene.remove(pr.g); projectiles.splice(i, 1); }
      continue;
    }

    if (pr.boomerang) pr.vx -= pr.dir * 17 * dt;
    pr.vy += pr.grav * dt;
    pr.x += pr.vx * dt; pr.y += pr.vy * dt;
    pr.g.position.set(pr.x, pr.y, 0.8);
    if (pr.kind === 'axe' || pr.kind === 'eaxe') pr.g.rotation.z -= dt * 15;
    else if (pr.kind === 'cross') pr.g.rotation.z += dt * 13;
    else if (pr.kind === 'bone') pr.g.rotation.z -= dt * 9;
    else if (pr.kind === 'holy') pr.g.rotation.z += dt * 6;
    else if (pr.kind === 'fireball') {
      pr.g.rotation.z += dt * 8;
      pr.g.scale.setScalar(1 + Math.sin(pr.t * 22) * 0.12);
      pr.trailT -= dt;
      if (pr.trailT <= 0) {                       // comet tail
        pr.trailT = 0.022;
        spawnParticles(pr.x - pr.vx * 0.02, pr.y - pr.vy * 0.02, 0.75,
          Math.random() < 0.4 ? 0xffd070 : 0xff5a22, 1, 0.7, 0.42, 0.19, 1.5);
      }
    }

    // holy water shatters into a flame pool on impact
    if (pr.kind === 'holy') {
      var probe = { x: pr.x, y: pr.y, w: pr.w, h: pr.h, vx: 0, vy: pr.vy, dropping: 0 };
      collide(probe, dt);
      if (probe.onGround) {
        makeProj('flame', pr.x, probe.y + 0.3, 0, 0, true);
        A.splash();
        spawnParticles(pr.x, probe.y, 0.9, 0x8fd8ff, 14, 4, 0.5, 0.12);
        pr.dead = true;
      }
    }

    var gone = pr.life <= 0 || Math.abs(pr.x - camera.position.x) > HALF_W + 14 || pr.y < DEATH_Y;
    if (pr.friendly) {
      for (var e = 0; e < enemies.length && !pr.dead; e++) {
        var en = enemies[e];
        if (en.dead || en.hitCd > 0) continue;
        if (hits(pr, en)) { damageEnemy(en, pr.dmg); if (!pr.pierce) pr.dead = true; }
      }
      if (boss && !boss.dead && boss.vuln && boss.hitCd <= 0 && !pr.dead && hits(pr, boss)) {
        damageBoss(pr.dmg);
        if (!pr.pierce) pr.dead = true;
      }
      for (var c = 0; c < candles.length; c++) {
        if (candles[c].alive && hits(pr, candles[c])) breakCandle(candles[c]);
      }
    } else if (!P.dead && P.inv <= 0 && hits(pr, P)) { playerHurt(pr.dmg, pr.x); pr.dead = true; }

    if (pr.dead || gone) {
      if (pr.dead) spawnParticles(pr.x, pr.y, 0.8, pr.col, 8, 3.5, 0.35, 0.12);
      scene.remove(pr.g); projectiles.splice(i, 1);
    }
  }
}

/* =========================================================================
   ENEMIES
   ========================================================================= */
function buildEnemyMesh(type) {
  var g = new THREE.Group();
  if (type === 'bat') {
    g.add(colorBox(0.34, 0.3, 0.3, 0x3a2436, 0, 0, 0));
    g.add(colorBox(0.16, 0.14, 0.14, 0x2a1826, 0, 0.2, 0.06));
    var wl = colorBox(0.5, 0.24, 0.1, 0x241626, -0.4, 0.05, 0);
    var wr = colorBox(0.5, 0.24, 0.1, 0x241626, 0.4, 0.05, 0);
    g.add(wl); g.add(wr);
    g.add(colorBox(0.06, 0.06, 0.04, 0xff4444, -0.08, 0.02, 0.17));
    g.add(colorBox(0.06, 0.06, 0.04, 0xff4444, 0.08, 0.02, 0.17));
    g.userData.wl = wl; g.userData.wr = wr;
  } else if (type === 'zombie') {
    g.add(colorBox(0.24, 0.5, 0.26, 0x3a4a32, -0.14, -0.45, 0));
    g.add(colorBox(0.24, 0.5, 0.26, 0x3a4a32, 0.14, -0.45, 0));
    g.add(colorBox(0.48, 0.6, 0.3, 0x54604a, 0, 0.02, 0));
    g.add(colorBox(0.34, 0.34, 0.3, 0x8fa07a, 0, 0.46, 0));
    g.add(colorBox(0.06, 0.06, 0.04, 0xd8f0a0, -0.09, 0.48, 0.16));
    g.add(colorBox(0.06, 0.06, 0.04, 0xd8f0a0, 0.09, 0.48, 0.16));
    var al = colorBox(0.16, 0.44, 0.18, 0x54604a, -0.3, 0.16, 0.24);
    var ar = colorBox(0.16, 0.44, 0.18, 0x54604a, 0.3, 0.16, 0.24);
    al.rotation.x = -1.3; ar.rotation.x = -1.3;
    g.add(al); g.add(ar);
  } else if (type === 'skeleton') {
    g.add(colorBox(0.18, 0.5, 0.18, 0xd8d2bc, -0.14, -0.5, 0));
    g.add(colorBox(0.18, 0.5, 0.18, 0xd8d2bc, 0.14, -0.5, 0));
    for (var r = 0; r < 4; r++) g.add(colorBox(0.42, 0.09, 0.24, 0xe6e0cc, 0, -0.1 + r * 0.16, 0));
    g.add(colorBox(0.12, 0.5, 0.12, 0xd8d2bc, 0, 0.05, 0));
    g.add(colorBox(0.36, 0.34, 0.32, 0xefe9d4, 0, 0.52, 0));
    g.add(colorBox(0.08, 0.09, 0.04, 0x170f12, -0.09, 0.54, 0.17));
    g.add(colorBox(0.08, 0.09, 0.04, 0x170f12, 0.09, 0.54, 0.17));
    g.add(colorBox(0.2, 0.06, 0.04, 0x170f12, 0, 0.38, 0.17));
    var sl = colorBox(0.13, 0.42, 0.13, 0xd8d2bc, -0.3, 0.12, 0.1);
    var sr = colorBox(0.13, 0.42, 0.13, 0xd8d2bc, 0.3, 0.12, 0.1);
    g.add(sl); g.add(sr);
    g.userData.arm = sr;
  } else if (type === 'medusa') {
    g.add(colorBox(0.42, 0.44, 0.4, 0xb0a878, 0, 0, 0));
    g.add(colorBox(0.08, 0.09, 0.05, 0xff3030, -0.11, 0.04, 0.22));
    g.add(colorBox(0.08, 0.09, 0.05, 0xff3030, 0.11, 0.04, 0.22));
    for (var s = 0; s < 7; s++) {
      var a = (s / 7) * Math.PI * 2;
      var sn = colorBox(0.12, 0.34, 0.12, 0x4a7a44, Math.cos(a) * 0.3, 0.28 + Math.sin(a) * 0.16, Math.sin(a) * 0.2);
      sn.rotation.z = a; g.add(sn);
    }
  } else if (type === 'axearmor') {
    g.add(colorBox(0.28, 0.56, 0.3, 0x2e3644, -0.18, -0.6, 0));
    g.add(colorBox(0.28, 0.56, 0.3, 0x2e3644, 0.18, -0.6, 0));
    g.add(colorBox(0.66, 0.76, 0.4, 0x3d4658, 0, 0.05, 0));
    g.add(colorBox(0.86, 0.2, 0.44, 0x505c72, 0, 0.4, 0));
    g.add(colorBox(0.44, 0.42, 0.38, 0x46506a, 0, 0.68, 0));
    g.add(colorBox(0.34, 0.1, 0.06, 0xff5a20, 0, 0.68, 0.19));
    g.add(colorBox(0.16, 0.36, 0.16, 0xb04a20, 0, 0.94, 0));
    g.add(colorBox(0.18, 0.5, 0.2, 0x3d4658, 0.42, 0.16, 0.16));
    var axh = colorBox(0.14, 0.7, 0.14, 0x5a4028, 0.5, 0.5, 0.3);
    var axb = colorBox(0.44, 0.36, 0.14, 0x98a2b2, 0.72, 0.76, 0.3);
    g.add(axh); g.add(axb);
    g.userData.axe = [axh, axb];
  } else if (type === 'fleaman') {
    g.add(colorBox(0.4, 0.34, 0.34, 0x6a3a58, 0, 0, 0));
    g.add(colorBox(0.3, 0.26, 0.28, 0x9a5a48, 0, 0.28, 0));
    g.add(colorBox(0.07, 0.07, 0.04, 0xffe040, -0.08, 0.3, 0.15));
    g.add(colorBox(0.07, 0.07, 0.04, 0xffe040, 0.08, 0.3, 0.15));
    g.add(colorBox(0.12, 0.3, 0.12, 0x5a3048, -0.16, -0.26, 0));
    g.add(colorBox(0.12, 0.3, 0.12, 0x5a3048, 0.16, -0.26, 0));
  } else if (type === 'ghost') {
    var bd = colorBox(0.6, 0.9, 0.5, 0xc8d4e8, 0, 0, 0);
    bd.material.transparent = true; bd.material.opacity = 0.55;
    g.add(bd);
    var hd = colorBox(0.44, 0.4, 0.4, 0xdfe8f6, 0, 0.5, 0);
    hd.material.transparent = true; hd.material.opacity = 0.6;
    g.add(hd);
    g.add(colorBox(0.09, 0.11, 0.04, 0x2a1030, -0.11, 0.52, 0.2));
    g.add(colorBox(0.09, 0.11, 0.04, 0x2a1030, 0.11, 0.52, 0.2));
    g.add(sprite(TEX.glowBlue, 2.4, 0x88aaff, 0.3));
  }
  return g;
}

var ESTATS = {
  bat:      { w: 0.7, h: 0.55, hp: 1, score: 200, dmg: 1, fly: 1 },
  zombie:   { w: 0.66, h: 1.55, hp: 2, score: 300, dmg: 1, fly: 0 },
  skeleton: { w: 0.7, h: 1.6, hp: 3, score: 500, dmg: 2, fly: 0 },
  medusa:   { w: 0.6, h: 0.6, hp: 1, score: 250, dmg: 1, fly: 1 },
  axearmor: { w: 0.95, h: 1.9, hp: 6, score: 900, dmg: 2, fly: 0 },
  fleaman:  { w: 0.55, h: 0.7, hp: 2, score: 400, dmg: 1, fly: 0 },
  ghost:    { w: 0.7, h: 1.3, hp: 2, score: 350, dmg: 1, fly: 1 }
};

function spawnEnemy(type, x, y, def) {
  var st = ESTATS[type];
  var g = buildEnemyMesh(type);
  g.position.set(x, y, 0);
  scene.add(g);
  var e = {
    type: type, x: x, y: y, vx: 0, vy: 0, w: st.w, h: st.h,
    hp: st.hp, maxHp: st.hp, score: st.score, dmg: edmg(st.dmg), fly: st.fly,
    g: g, face: -1, t: rnd(0, 5), cd: rnd(0.8, 2.4), dead: false, hitCd: 0,
    y0: y, awake: type !== 'bat', def: def, dropping: 0, onGround: false
  };
  enemies.push(e);
  return e;
}

function damageEnemy(e, dmg) {
  e.hp -= dmg; e.hitCd = 0.12;
  A.hit();
  G.hitstop(0.035);
  spawnParticles(e.x, e.y, 0.7, 0xffffff, 6, 3.5, 0.3, 0.11);
  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
  e.dead = true;
  A.kill();
  G.registerKill(e.score);
  G.hitstop(0.06);
  spawnParticles(e.x, e.y, 0.7, 0xff9a3c, 18, 5.5, 0.6, 0.15);
  spawnParticles(e.x, e.y, 0.7, 0x6a2030, 10, 4, 0.5, 0.13);
  spawnRing(e.x, e.y, 0xffc060);
  if (Math.random() < 0.4) dropItem(e.x, e.y, Math.random() < 0.65 ? 'heart' : 'bigheart');
  scene.remove(e.g);
  if (e.def) e.def.killed = true;
}

function updateEnemies(dt) {
  var frozen = G.stopwatch > 0;
  for (var i = enemies.length - 1; i >= 0; i--) {
    var e = enemies[i];
    if (e.dead) { enemies.splice(i, 1); continue; }
    if (e.hitCd > 0) e.hitCd -= dt;

    if (!frozen) {
      e.t += dt;
      var dx = P.x - e.x, dy = P.y - e.y, adx = Math.abs(dx);
      switch (e.type) {
        case 'bat':
          if (!e.awake) {
            e.g.position.set(e.x, e.y, 0);
            if (adx < 8.5 && Math.abs(dy) < 7) { e.awake = true; e.t = 0; }
            break;
          }
          e.vx = (dx > 0 ? 1 : -1) * 3.4;
          e.vy = Math.sin(e.t * 5.5) * 4.2 + clamp(dy, -1.4, 1.4) * 1.1;
          e.x += e.vx * dt; e.y += e.vy * dt;
          e.face = e.vx > 0 ? 1 : -1;
          if (e.g.userData.wl) {
            var f = Math.sin(e.t * 22) * 0.9;
            e.g.userData.wl.rotation.z = -f; e.g.userData.wr.rotation.z = f;
          }
          break;
        case 'medusa':
          e.x += e.vx * dt;
          e.y = e.y0 + Math.sin(e.t * 3.2) * 1.9;
          e.face = e.vx > 0 ? 1 : -1;
          break;
        case 'ghost':
          e.vx += clamp(dx, -1, 1) * 2.2 * dt;
          e.vy += clamp(dy + 0.4, -1, 1) * 1.9 * dt;
          e.vx = clamp(e.vx, -2.0, 2.0); e.vy = clamp(e.vy, -1.7, 1.7);
          e.x += e.vx * dt; e.y += e.vy * dt;
          e.g.children[0].material.opacity = 0.42 + Math.sin(e.t * 3) * 0.16;
          e.face = e.vx > 0 ? 1 : -1;
          break;
        case 'zombie':
          e.face = dx > 0 ? 1 : -1;
          e.vx = e.face * 1.4;
          e.vy += GRAV * dt;
          collide(e, dt);
          e.g.rotation.z = Math.sin(e.t * 3) * 0.07;
          break;
        case 'fleaman':
          e.vy += GRAV * dt;
          if (e.onGround) {
            e.cd -= dt; e.vx *= 0.75;
            if (e.cd <= 0) {
              e.cd = rnd(0.5, 1.05);
              e.face = dx > 0 ? 1 : -1;
              e.vx = e.face * rnd(4.2, 6.5); e.vy = rnd(8, 12);
            }
          }
          collide(e, dt);
          e.g.rotation.z = e.onGround ? 0 : e.g.rotation.z - dt * 4 * e.face;
          break;
        case 'skeleton':
          e.vy += GRAV * dt;
          e.face = dx > 0 ? 1 : -1;
          if (adx < 11) {
            e.vx = e.face * (adx > 3.2 ? 1.8 : -1.2);
            e.cd -= dt;
            if (e.cd <= 0 && adx < 10 && Math.abs(dy) < 3.5) {
              e.cd = rnd(2.0, 3.2);
              makeProj('bone', e.x + e.face * 0.5, e.y + 0.4, e.face * 6.2, 7.0, false);
              A.throwit();
              if (e.g.userData.arm) e.g.userData.arm.rotation.z = 2.2;
            }
          } else e.vx = 0;
          if (e.g.userData.arm) e.g.userData.arm.rotation.z *= Math.pow(0.02, dt);
          collide(e, dt);
          break;
        case 'axearmor':
          e.vy += GRAV * dt;
          e.face = dx > 0 ? 1 : -1;
          if (adx < 14) {
            e.vx = e.face * (adx > 4 ? 1.45 : 0);
            e.cd -= dt;
            if (e.cd <= 0 && adx < 12) {
              e.cd = rnd(2.2, 3.4);
              makeProj('eaxe', e.x + e.face * 0.7, e.y + 0.7, e.face * 5.0, 12.2, false);
              A.throwit();
            }
          } else e.vx = 0;
          collide(e, dt);
          if (e.g.userData.axe) {
            var sw2 = Math.sin(e.t * 3) * 0.25;
            e.g.userData.axe[0].rotation.z = sw2;
            e.g.userData.axe[1].rotation.z = sw2;
          }
          break;
      }
    }

    if (e.type !== 'bat' || e.awake) e.g.position.set(e.x, e.y, 0);
    e.g.rotation.y = e.face > 0 ? 0 : Math.PI;
    e.g.visible = e.hitCd > 0 ? (Math.floor(e.hitCd * 40) % 2 === 0) : true;

    if (!P.dead && P.inv <= 0 && hits(e, P)) playerHurt(e.dmg, e.x);

    if (Math.abs(e.x - camera.position.x) > HALF_W + 26 || e.y < DEATH_Y) {
      scene.remove(e.g); enemies.splice(i, 1);
      if (e.def) e.def.active = false;
    }
  }
}

/* =========================================================================
   BOSSES
   ========================================================================= */
var BOSS_SPOTS = [[234, 1.2], [241, 1.2], [252, 1.2], [259, 1.2], [240, 5.2], [254, 5.2]];

function buildDracula() {
  var g = new THREE.Group();
  var cape = colorBox(2.2, 2.5, 0.3, 0x1a0d14, 0, 0.2, -0.28);
  g.add(cape);
  g.add(colorBox(1.9, 2.3, 0.2, 0x6b0f18, 0, 0.2, -0.2));
  g.add(colorBox(0.9, 1.5, 0.5, 0x241628, 0, 0.15, 0));
  g.add(colorBox(1.0, 0.3, 0.55, 0x8a0f18, 0, 0.85, 0));
  g.add(colorBox(0.32, 0.9, 0.14, 0x6b0f18, -0.5, 1.1, -0.1));
  g.add(colorBox(0.32, 0.9, 0.14, 0x6b0f18, 0.5, 1.1, -0.1));
  g.add(colorBox(0.5, 0.55, 0.45, 0xd8c8bc, 0, 1.28, 0));
  g.add(colorBox(0.56, 0.2, 0.5, 0x14100f, 0, 1.55, 0));
  var eyeL = colorBox(0.1, 0.1, 0.05, 0xff2020, -0.13, 1.3, 0.24);
  var eyeR = colorBox(0.1, 0.1, 0.05, 0xff2020, 0.13, 1.3, 0.24);
  eyeL.material.emissive = new THREE.Color(0xff2020);
  eyeR.material.emissive = new THREE.Color(0xff2020);
  g.add(eyeL); g.add(eyeR);
  g.add(colorBox(0.22, 0.4, 0.2, 0xd8c8bc, -0.62, 0.3, 0.16));
  g.add(colorBox(0.22, 0.4, 0.2, 0xd8c8bc, 0.62, 0.3, 0.16));
  var aura = sprite(TEX.glowRed, 6, 0xff2020, 0.28);
  aura.position.set(0, 0.4, -0.5); g.add(aura);
  g.userData.cape = cape;
  g.userData.aura = aura;
  return g;
}

function buildGiantBat() {
  var g = new THREE.Group();
  g.add(colorBox(1.0, 0.85, 0.8, 0x3a2436, 0, 0, 0));
  g.add(colorBox(0.55, 0.45, 0.45, 0x4a3046, 0, 0.42, 0.18));
  g.add(colorBox(0.18, 0.42, 0.14, 0x2a1826, -0.2, 0.75, 0.05));
  g.add(colorBox(0.18, 0.42, 0.14, 0x2a1826, 0.2, 0.75, 0.05));
  var wl = new THREE.Group(), wr = new THREE.Group();
  [0, 1, 2].forEach(function (k) {
    wl.add(colorBox(0.75, 0.5 - k * 0.1, 0.1, 0x241626, -0.4 - k * 0.72, 0.05 - k * 0.14, 0));
    wr.add(colorBox(0.75, 0.5 - k * 0.1, 0.1, 0x241626, 0.4 + k * 0.72, 0.05 - k * 0.14, 0));
  });
  g.add(wl); g.add(wr);
  var eL = colorBox(0.13, 0.13, 0.06, 0xff3020, -0.16, 0.44, 0.42);
  var eR = colorBox(0.13, 0.13, 0.06, 0xff3020, 0.16, 0.44, 0.42);
  eL.material.emissive = new THREE.Color(0xff3020);
  eR.material.emissive = new THREE.Color(0xff3020);
  g.add(eL); g.add(eR);
  var aura = sprite(TEX.glowRed, 5, 0xaa2020, 0.22);
  g.add(aura);
  g.userData.wl = wl; g.userData.wr = wr; g.userData.aura = aura;
  return g;
}

function spawnMidBoss() {
  var g = buildGiantBat();
  g.position.set(MIDBOSS_CAM, 8, 0);
  scene.add(g);
  var hp = Math.round(20 * D().bossHp);
  boss = {
    kind: 'bat', name: 'GIANT BAT', x: MIDBOSS_CAM, y: 8, w: 1.7, h: 1.3,
    hp: hp, maxHp: hp, g: g, state: 'hover', t: 0, vuln: true, hitCd: 0,
    dead: false, deadT: 0, alpha: 1, tx: MIDBOSS_CAM, camX: MIDBOSS_CAM,
    touch: Math.max(1, Math.round(2 * D().bossDmg)), charge: 0
  };
  A.setTheme('midboss', true);
  G.toast('GIANT BAT');
  return boss;
}

function spawnBoss() {
  var g = buildDracula();
  g.position.set(BOSS_SPOTS[2][0], BOSS_SPOTS[2][1], 0);
  scene.add(g);
  var hp = Math.round(26 * D().bossHp);
  boss = {
    kind: 'dracula', name: 'COUNT DRACULA', x: BOSS_SPOTS[2][0], y: BOSS_SPOTS[2][1],
    w: 1.5, h: 2.6, hp: hp, maxHp: hp, g: g, state: 'appear', t: 0, vuln: false,
    hitCd: 0, dead: false, deadT: 0, shots: 0, spot: 2, phase2: false, alpha: 0,
    camX: BOSS_CAM, touch: Math.max(1, Math.round(2 * D().bossDmg)), charge: 0
  };
  A.setTheme('boss', true);
  G.toast('WHAT IS A MAN?');
  return boss;
}

function setBossAlpha(a) {
  boss.alpha = a;
  boss.g.traverse(function (o) {
    if (o.material && o.material.opacity !== undefined) {
      o.material.transparent = true;
      var base = (o === boss.g.userData.aura) ? 0.28 : 1;
      o.material.opacity = base * a;
    }
  });
}

function damageBoss(dmg) {
  if (!boss.vuln || boss.dead) return;
  boss.hp -= dmg;
  boss.hitCd = 0.1;
  A.hit();
  G.hitstop(0.05);
  spawnParticles(boss.x, boss.y + 0.8, 0.8, 0xff4030, 10, 4.5, 0.4, 0.14);
  G.shake = 0.12;
  if (boss.kind === 'dracula' && !boss.phase2 && boss.hp <= boss.maxHp * 0.5) {
    boss.phase2 = true;
    G.toast('THE NIGHT DEEPENS');
    dropItem(P.x + 1.5, 4, 'meat');            // a breather at the halfway mark
    dropItem(P.x - 1.5, 4, 'bigheart');
  }
  if (boss.hp <= 0) {
    boss.hp = 0; boss.dead = true; boss.deadT = 0; boss.vuln = false;
    G.shake = 1.2;
    if (boss.kind === 'dracula') {
      G.addScore(20000); G.toast('+20000');
      A.setTheme('courtyard'); A.stop();
    }
  }
}

function updateBoss(dt) {
  if (!boss) return;
  if (boss.hitCd > 0) boss.hitCd -= dt;
  if (boss.kind === 'bat') updateGiantBat(dt);
  else updateDracula(dt);
}

function updateGiantBat(dt) {
  var g = boss.g;
  if (boss.state !== 'telegraph') g.userData.aura.material.opacity = boss.dead ? 0 : 0.16 + Math.sin(G.t * 6) * 0.06;

  if (boss.dead) {
    boss.deadT += dt;
    boss.y -= dt * 2.4;
    g.position.set(boss.x, boss.y, 0);
    g.rotation.z += dt * 7;
    if (Math.random() < 0.6) spawnParticles(boss.x + rnd(-1, 1), boss.y + rnd(-0.5, 1), 0.8, 0x8a2a3a, 3, 5, 0.6, 0.16);
    if (boss.deadT > 1.5) {
      A.boom(); G.shake = 0.5;
      spawnParticles(boss.x, boss.y, 0.8, 0xff9a3c, 30, 8, 0.9, 0.2);
      scene.remove(g);
      openMidArena();
      G.midbossDone = true;
      dropItem(MIDBOSS_CAM, 3, 'meat');
      dropItem(MIDBOSS_CAM + 1.6, 3, 'whip');
      dropItem(MIDBOSS_CAM - 1.6, 3, 'double');
      dropItem(MIDBOSS_CAM + 3.2, 3, 'crystal');
      G.addScore(5000);
      G.toast('+5000');
      A.setTheme('chasm', true);
      boss = null;
    }
    return;
  }

  boss.t += dt;
  var flap = Math.sin(G.t * (boss.state === 'swoop' ? 22 : 9)) * 0.7;
  g.userData.wl.rotation.z = -flap; g.userData.wr.rotation.z = flap;

  switch (boss.state) {
    case 'hover':
      boss.x = lerp(boss.x, boss.tx, Math.min(1, dt * 2.2));
      boss.y = lerp(boss.y, 7.6 + Math.sin(boss.t * 2.4) * 0.7, Math.min(1, dt * 3));
      if (boss.t > 1.7 && G.cine <= 0) {
        boss.state = 'telegraph'; boss.t = 0;
        boss.sx = P.x; boss.sy = Math.max(1.3, P.y - 0.1);
        A.screech();
      }
      break;
    case 'telegraph':                             // pauses and glows before diving
      boss.g.userData.aura.material.opacity = 0.2 + boss.t * 1.2;
      if (Math.random() < 0.4) spawnParticles(boss.x, boss.y, 0.9, 0xaa2020, 1, 2.5, 0.4, 0.12, 3);
      if (boss.t > 0.55) { boss.state = 'swoop'; boss.t = 0; }
      break;
    case 'swoop': {
      var dx = boss.sx - boss.x, dy = boss.sy - boss.y;
      var d = Math.max(0.001, Math.hypot(dx, dy));
      var sp = 10.5;
      boss.x += (dx / d) * sp * dt;
      boss.y += (dy / d) * sp * dt;
      if (d < 0.8 || boss.t > 1.4) {
        boss.state = 'rise'; boss.t = 0;
        boss.tx = clamp(P.x + rnd(-4, 4), MIDBOSS_CAM - 4, MIDBOSS_CAM + 4);
        if (Math.random() < 0.32) {
          for (var i = 0; i < 2; i++) {
            var b = spawnEnemy('bat', boss.x + rnd(-1, 1), boss.y);
            b.awake = true;
          }
        }
      }
      break;
    }
    case 'rise':
      boss.y = lerp(boss.y, 7.8, Math.min(1, dt * 3.4));
      boss.x = lerp(boss.x, boss.tx, Math.min(1, dt * 2.4));
      if (boss.t > 0.7) { boss.state = 'hover'; boss.t = 0; }
      break;
  }

  boss.x = clamp(boss.x, MIDBOSS_CAM - 4.4, MIDBOSS_CAM + 4.4);
  g.position.set(boss.x, boss.y, 0);
  g.rotation.y = P.x < boss.x ? Math.PI : 0;
  g.rotation.z = boss.state === 'swoop' ? -0.25 : 0;
  g.visible = boss.hitCd > 0 ? (Math.floor(boss.hitCd * 40) % 2 === 0) : true;

  if (!P.dead && P.inv <= 0 && hits(boss, P)) playerHurt(boss.touch, boss.x);
}

function updateDracula(dt) {
  var g = boss.g;
  g.userData.aura.material.opacity = (0.2 + Math.sin(G.t * 5) * 0.09) * (boss.dead ? 0 : boss.alpha);

  if (boss.dead) {
    boss.deadT += dt;
    g.position.y = boss.y + Math.sin(boss.deadT * 9) * 0.12;
    g.rotation.z = Math.sin(boss.deadT * 14) * 0.1;
    setBossAlpha(Math.max(0, 1 - boss.deadT / 2.6));
    if (Math.random() < 0.55) {
      spawnParticles(boss.x + rnd(-1, 1), boss.y + rnd(0, 2.4), 0.8,
        Math.random() < 0.5 ? 0xff5522 : 0xffd070, 3, 5, 0.7, 0.18);
    }
    if (boss.deadT > 0.1 && boss.deadT < 2.6 && Math.random() < 0.06) { A.boom(); G.shake = 0.5; }
    if (boss.deadT > 2.8) { scene.remove(g); G.win(); boss = null; }
    return;
  }

  boss.t += dt;
  var dir = P.x < boss.x ? -1 : 1;
  g.rotation.y = dir > 0 ? 0 : Math.PI;
  g.userData.cape.rotation.z = Math.sin(G.t * 2) * 0.05;
  g.position.y = boss.y + Math.sin(G.t * 2.2) * 0.14;
  g.visible = boss.hitCd > 0 ? (Math.floor(boss.hitCd * 40) % 2 === 0) : true;

  // the charge glow telegraphs every volley so it can be read and dodged
  if (boss.charge > 0) {
    boss.charge -= dt;
    var ck = 1 - boss.charge / 0.62;
    g.userData.aura.material.opacity = (0.25 + ck * 0.75) * boss.alpha;
    g.userData.aura.scale.setScalar(6 * (1 + ck * 0.5));
    if (Math.random() < 0.55) {
      spawnParticles(boss.x + dir * 0.8, boss.y + 1.3, 0.9, 0xff5522, 1, 3.2, 0.35, 0.12, 6);
    }
  } else g.userData.aura.scale.setScalar(6);

  switch (boss.state) {
    case 'appear':
      setBossAlpha(clamp(boss.t / 0.7, 0, 1));
      if (boss.t > 0.7 && G.cine <= 0) { boss.state = 'idle'; boss.t = 0; boss.vuln = true; boss.shots = 0; }
      break;

    case 'idle':                                   // generous window to land hits
      if (boss.t > (boss.phase2 ? 1.0 : 1.35)) {
        boss.state = 'charge'; boss.t = 0; boss.charge = 0.62; A.hiss(0.6, 0.12, 200, 1400, 0, 0.9);
      }
      break;

    case 'charge':
      if (boss.t > 0.62) { boss.state = 'cast'; boss.t = 0.99; }
      break;

    case 'cast': {
      var interval = boss.phase2 ? 0.34 : 0.44;
      var max = boss.phase2 ? 3 : 2;
      if (boss.t > interval) {
        boss.t = 0; boss.shots++;
        var px = P.x - boss.x, py = (P.y + 0.3) - (boss.y + 1.3);
        var len = Math.max(1, Math.hypot(px, py));
        var spread = (boss.shots - (max + 1) / 2) * 0.22;
        var ca = Math.cos(spread), sa = Math.sin(spread);
        var ux = (px / len) * ca - (py / len) * sa;
        var uy = (px / len) * sa + (py / len) * ca;
        var sp = boss.phase2 ? 7.2 : 6.2;
        makeProj('fireball', boss.x + dir * 0.8, boss.y + 1.3, ux * sp, uy * sp, false);
        A.fire();
        if (boss.shots >= max) { boss.shots = 0; boss.state = 'recover'; boss.t = 0; }
      }
      break;
    }

    case 'recover':                                // stays put and hittable after a volley
      if (boss.t > 0.9) {
        boss.state = boss.phase2 && Math.random() < 0.35 ? 'summon' : 'vanish';
        boss.t = 0;
      }
      break;

    case 'summon':
      if (boss.t > 0.1) {
        for (var i = 0; i < 2; i++) {
          var e = spawnEnemy('bat', boss.x + rnd(-1.5, 1.5), boss.y + rnd(1, 2.6));
          e.awake = true;
        }
        A.power();
        boss.state = 'vanish'; boss.t = 0;
      }
      break;

    case 'vanish':
      boss.vuln = false;
      setBossAlpha(clamp(1 - boss.t / 0.45, 0, 1));
      if (boss.t < dt * 1.5) teleportSmoke(boss.x, boss.y);
      if (boss.t > 0.45) {
        var s, tries = 0;
        do { s = irnd(0, BOSS_SPOTS.length - 1); tries++; }
        while (tries < 12 && (s === boss.spot || Math.abs(BOSS_SPOTS[s][0] - P.x) < 3.5));
        boss.spot = s;
        boss.x = BOSS_SPOTS[s][0]; boss.y = BOSS_SPOTS[s][1];
        g.position.set(boss.x, boss.y, 0);
        teleportSmoke(boss.x, boss.y);
        A.fire();
        boss.state = 'appear'; boss.t = 0;
      }
      break;
  }

  if (!P.dead && P.inv <= 0 && boss.alpha > 0.5 && hits(boss, P)) playerHurt(boss.touch, boss.x);
}

/* swirling column of smoke where the count materialises */
function teleportSmoke(x, y) {
  for (var i = 0; i < 26; i++) {
    var a = (i / 26) * Math.PI * 2;
    spawnParticles(x + Math.cos(a) * 0.7, y + 0.3 + (i / 26) * 2.6, 0.9,
      i % 3 === 0 ? 0xc02030 : 0x3a0a12, 1, 3.5, 0.75, 0.2, 2.5);
  }
  spawnRing(x, y + 0.4, 0xc02030);
}
