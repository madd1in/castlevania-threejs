/* =========================================================================
   CASTLEVANIA — world: renderer, textures, level geometry, sky, particles
   ========================================================================= */
'use strict';

var renderer, scene, camera, skyGroup, farLayer, midLayer, fgLayer;
var platforms = [], torches = [], candles = [], decoLights = [], flames = [];
var movers = [], rings = [], rain = null, dust = null, lightning = 0, lightningCd = 6;
var ambLight = null, moonLight = null;
var bolt = null, BOLT_SEGS = 26, shootingStar = null, starT = 5, starLife = 0;
var swayers = [], breakWalls = [], rubble = null;
var HALF_W = 10;

/* ------------------------- procedural textures ------------------------- */
function cvs(w, h, draw) {
  var c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  var t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function brickTex(base, mortar, noiseAmt) {
  return cvs(128, 128, function (g, w, h) {
    g.fillStyle = mortar; g.fillRect(0, 0, w, h);
    var rows = 4, cols = 2, bh = h / rows, bw = w / cols;
    for (var r = 0; r < rows; r++) {
      var off = (r % 2) ? bw / 2 : 0;
      for (var c = -1; c < cols + 1; c++) {
        var x = c * bw + off + 2, y = r * bh + 2, ww = bw - 4, hh = bh - 4;
        var v = 1 + (Math.random() - 0.5) * noiseAmt;
        g.fillStyle = shade(base, v);
        g.fillRect(x, y, ww, hh);
        g.fillStyle = 'rgba(255,255,255,0.055)'; g.fillRect(x, y, ww, 2);
        g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x, y + hh - 3, ww, 3);
        for (var s = 0; s < 12; s++) {
          g.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.13).toFixed(3) + ')';
          g.fillRect(x + Math.random() * ww, y + Math.random() * hh, 3, 3);
        }
      }
    }
  });
}
function shade(hex, f) {
  var n = parseInt(hex.slice(1), 16);
  var r = clamp(((n >> 16) & 255) * f, 0, 255) | 0;
  var g = clamp(((n >> 8) & 255) * f, 0, 255) | 0;
  var b = clamp((n & 255) * f, 0, 255) | 0;
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
function woodTex() {
  return cvs(64, 64, function (g, w, h) {
    g.fillStyle = '#4a3220'; g.fillRect(0, 0, w, h);
    for (var i = 0; i < 26; i++) {
      g.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.25).toFixed(3) + ')';
      g.fillRect(0, Math.random() * h, w, 1 + Math.random() * 2);
    }
    for (var j = 0; j < 4; j++) { g.fillStyle = 'rgba(255,220,160,0.05)'; g.fillRect(0, j * 16, w, 1); }
  });
}
function glowTex(inner, outer) {
  return cvs(128, 128, function (g, w, h) {
    var gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, inner); gr.addColorStop(0.35, outer); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}

var TEX = {}, MAT = {};

function initAssets() {
  TEX.brick = brickTex('#6f6a60', '#221f1c', 0.34);
  TEX.brickDark = brickTex('#3a3a48', '#14141c', 0.30);
  TEX.brickWarm = brickTex('#6b5a48', '#211a16', 0.32);
  TEX.wood = woodTex();
  TEX.glow = glowTex('rgba(255,240,190,1)', 'rgba(255,150,40,0.55)');
  TEX.glowBlue = glowTex('rgba(220,240,255,1)', 'rgba(90,140,255,0.5)');
  TEX.glowRed = glowTex('rgba(255,220,200,1)', 'rgba(220,40,30,0.55)');
  TEX.beam = cvs(64, 128, function (g, w, h) {
    var gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(170,205,255,0.55)');
    gr.addColorStop(1, 'rgba(170,205,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    var side = g.createLinearGradient(0, 0, w, 0);
    side.addColorStop(0, 'rgba(0,0,0,1)');
    side.addColorStop(0.5, 'rgba(0,0,0,0)');
    side.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = side; g.fillRect(0, 0, w, h);
  });
  TEX.web = cvs(64, 64, function (g, w, h) {
    g.strokeStyle = 'rgba(210,220,235,0.55)'; g.lineWidth = 1.4;
    for (var a = 0; a < 5; a++) {
      g.beginPath(); g.moveTo(0, 0);
      g.lineTo(Math.cos(a / 4 * 1.57) * w, Math.sin(a / 4 * 1.57) * h); g.stroke();
    }
    for (var r = 1; r <= 4; r++) {
      g.beginPath();
      g.arc(0, 0, r * w / 4.6, 0, 1.57); g.stroke();
    }
  });

  MAT.stone = new THREE.MeshLambertMaterial({ map: TEX.brick, color: 0x8f8a7e });
  MAT.stoneDark = new THREE.MeshLambertMaterial({ map: TEX.brickDark, color: 0x606a86 });
  MAT.stoneWarm = new THREE.MeshLambertMaterial({ map: TEX.brickWarm, color: 0x8a7c68 });
  MAT.wood = new THREE.MeshLambertMaterial({ map: TEX.wood, color: 0x9a8464 });
  MAT.cap = new THREE.MeshLambertMaterial({ color: 0x6b6558 });
  MAT.iron = new THREE.MeshLambertMaterial({ color: 0x2e323c });
  MAT.gold = new THREE.MeshLambertMaterial({ color: 0xc8a24a, emissive: 0x3a2a06 });
  MAT.black = new THREE.MeshBasicMaterial({ color: 0x02020a });
  MAT.silhouette = new THREE.MeshBasicMaterial({ color: 0x070912, fog: false });
  MAT.silhouette2 = new THREE.MeshBasicMaterial({ color: 0x0d1020, fog: false });
  MAT.litWindow = new THREE.MeshBasicMaterial({ color: 0xffb35c, fog: false });
  MAT.wallDark = new THREE.MeshLambertMaterial({ map: TEX.brickDark, color: 0x5a5f78 });
  MAT.wallWarm = new THREE.MeshLambertMaterial({ map: TEX.brickWarm, color: 0x5a5f78 });
  MAT.carpet = new THREE.MeshLambertMaterial({ color: 0x4a0e16 });
  MAT.banner = new THREE.MeshLambertMaterial({ color: 0x7a1420 });
  MAT.spike = new THREE.MeshLambertMaterial({ color: 0x8b8f9c });
  MAT.wax = new THREE.MeshLambertMaterial({ color: 0xe8e0c8 });
  MAT.moonGlass = new THREE.MeshBasicMaterial({ color: 0x9fc4ff, transparent: true, opacity: 0.55 });
}

/* ------------------------- primitives ------------------------- */
var BOX = new THREE.BoxGeometry(1, 1, 1);
function box(w, h, d, mat, x, y, z) {
  var m = new THREE.Mesh(BOX, mat);
  m.scale.set(w, h, d); m.position.set(x, y, z || 0);
  return m;
}

/* =========================================================================
   STATIC BATCHING
   Hundreds of little boxes cost far more in scene-graph walking and draw
   calls than they do in triangles, so everything that never moves gets
   baked into one mesh per material once the level is built.
   ========================================================================= */
var staticMeshes = [], merged = false;
function keepStatic(m) { if (!merged) staticMeshes.push(m); return m; }

function concatGeos(geos) {
  var names = ['position', 'normal', 'uv'], total = 0, i;
  for (i = 0; i < geos.length; i++) total += geos[i].attributes.position.count;
  var out = new THREE.BufferGeometry();
  names.forEach(function (name) {
    if (!geos[0].attributes[name]) return;
    var itemSize = geos[0].attributes[name].itemSize;
    var arr = new Float32Array(total * itemSize), off = 0;
    for (var k = 0; k < geos.length; k++) {
      var a = geos[k].attributes[name].array;
      arr.set(a, off); off += a.length;
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, itemSize));
  });
  out.computeBoundingSphere();
  return out;
}

function mergeMeshes(parent, meshes) {
  var byMat = {}, k;
  for (var i = 0; i < meshes.length; i++) {
    var m = meshes[i];
    if (!m.parent || m.parent !== parent) continue;
    k = m.material.uuid;
    if (!byMat[k]) byMat[k] = { mat: m.material, list: [] };
    byMat[k].list.push(m);
  }
  var count = 0;
  for (k in byMat) {
    var entry = byMat[k];
    if (entry.list.length < 2) continue;
    var geos = [];
    for (var j = 0; j < entry.list.length; j++) {
      var mm = entry.list[j];
      mm.updateMatrix();
      var g = mm.geometry.index ? mm.geometry.toNonIndexed() : mm.geometry.clone();
      g.applyMatrix4(mm.matrix);
      geos.push(g);
      parent.remove(mm);
    }
    var mesh = new THREE.Mesh(concatGeos(geos), entry.mat);
    mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    parent.add(mesh);
    count++;
  }
  return count;
}

/* flatten a whole parallax layer (nested groups included) into one mesh per material */
function mergeLayer(layer) {
  layer.updateMatrixWorld(true);
  var inv = new THREE.Matrix4().copy(layer.matrixWorld).invert();
  var byMat = {}, keep = [];
  layer.traverse(function (o) {
    if (o === layer) return;
    if (o.isMesh) {
      var k = o.material.uuid;
      if (!byMat[k]) byMat[k] = { mat: o.material, geos: [] };
      var g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      byMat[k].geos.push(g);
    } else if (o.isSprite || o.isPoints) keep.push(o);
  });
  while (layer.children.length) layer.remove(layer.children[0]);
  for (var i = 0; i < keep.length; i++) layer.add(keep[i]);
  for (var k2 in byMat) {
    var mesh = new THREE.Mesh(concatGeos(byMat[k2].geos), byMat[k2].mat);
    mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    layer.add(mesh);
  }
}

/* drop per-frame matrix maths for anything that will never move again */
function freezeBoxes(group) {
  group.matrixAutoUpdate = false; group.updateMatrix();
  for (var i = 0; i < group.children.length; i++) {
    var c = group.children[i];
    if (c.isMesh) { c.matrixAutoUpdate = false; c.updateMatrix(); }
  }
}

function bakeUV(w, h, scale) {
  var g = BOX.clone();
  var uv = g.attributes.uv;
  var rx = Math.max(1, Math.round(w / scale)), ry = Math.max(1, Math.round(h / scale));
  for (var i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * rx, uv.getY(i) * ry);
  uv.needsUpdate = true;
  return g;
}
function colorBox(w, h, d, color, x, y, z) {
  return box(w, h, d, new THREE.MeshLambertMaterial({ color: color }), x, y, z);
}
function sprite(tex, size, color, opacity, blend) {
  var s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, color: color === undefined ? 0xffffff : color,
    transparent: true, opacity: opacity === undefined ? 1 : opacity,
    blending: blend === false ? THREE.NormalBlending : THREE.AdditiveBlending,
    depthWrite: false, fog: false
  }));
  s.scale.set(size, size, 1);
  return s;
}

/* ------------------------- renderer ------------------------- */
function initRenderer() {
  var canvas = $('c');
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x02030a, 1);

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x04050e, 18, 68);

  camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 400);
  camera.position.set(6, 4, VIEW_Z);

  ambLight = new THREE.AmbientLight(0x2a3352, 0.6); scene.add(ambLight);
  moonLight = new THREE.DirectionalLight(0x7f97e0, 0.52);
  moonLight.position.set(-8, 14, 12); scene.add(moonLight);
  var rim = new THREE.DirectionalLight(0x1b1630, 0.4);
  rim.position.set(9, -3, 6); scene.add(rim);

  for (var i = 0; i < 5; i++) {
    var pl = new THREE.PointLight(0xff9130, 0, 19, 2);
    scene.add(pl); decoLights.push(pl);
  }
  onResize();
  addEventListener('resize', onResize);
}
function onResize() {
  // a hidden or collapsed window reports 0x0; letting that through makes the
  // camera aspect NaN, which silently disables frustum culling
  var w = Math.max(1, innerWidth), h = Math.max(1, innerHeight);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  HALF_W = Math.tan(camera.fov * Math.PI / 360) * VIEW_Z * camera.aspect;
}

/* ------------------------- sky + parallax ------------------------- */
function buildSky() {
  skyGroup = new THREE.Group(); scene.add(skyGroup);

  var skyTex = cvs(64, 256, function (g, w, h) {
    var gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0.00, '#010206');
    gr.addColorStop(0.34, '#070c1e');
    gr.addColorStop(0.62, '#141032');
    gr.addColorStop(0.84, '#1d0a1e');
    gr.addColorStop(1.00, '#0a0510');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  var sky = new THREE.Mesh(new THREE.PlaneGeometry(260, 130),
    new THREE.MeshBasicMaterial({ map: skyTex, fog: false, depthWrite: false }));
  sky.position.set(0, 18, -70);
  skyGroup.add(sky);

  // stars
  var pg = new THREE.BufferGeometry(), pos = [];
  for (var i = 0; i < 320; i++) pos.push(rnd(-90, 90), rnd(4, 62), -62);
  pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  skyGroup.add(new THREE.Points(pg, new THREE.PointsMaterial({
    color: 0xcfe0ff, size: 0.42, sizeAttenuation: true, fog: false,
    transparent: true, opacity: 0.85
  })));

  // blood moon
  var moon = new THREE.Mesh(new THREE.CircleGeometry(5.0, 48),
    new THREE.MeshBasicMaterial({ color: 0xf0c9a4, fog: false }));
  moon.position.set(-19, 30, -60); skyGroup.add(moon);
  var mg = sprite(TEX.glow, 17, 0xff9a70, 0.45); mg.position.copy(moon.position); mg.position.z += 0.5;
  skyGroup.add(mg);
  var mg2 = sprite(TEX.glowRed, 30, 0xff3322, 0.26); mg2.position.copy(moon.position);
  skyGroup.add(mg2);
  // craters
  [[-1.6, 1.3, 1.0], [1.4, -0.8, 0.7], [0.3, 2.1, 0.5], [-2.2, -1.9, 0.55]].forEach(function (c) {
    var cr = new THREE.Mesh(new THREE.CircleGeometry(c[2], 20),
      new THREE.MeshBasicMaterial({ color: 0xd6ab86, fog: false }));
    cr.position.set(moon.position.x + c[0], moon.position.y + c[1], -59.9);
    skyGroup.add(cr);
  });

  // clouds
  for (var k = 0; k < 8; k++) {
    var cl = sprite(TEX.glow, rnd(14, 30), 0x2a2438, rnd(0.10, 0.24));
    cl.material.blending = THREE.NormalBlending;
    cl.position.set(rnd(-80, 80), rnd(16, 44), -55);
    cl.userData.drift = rnd(0.15, 0.5);
    skyGroup.add(cl);
  }

  // forked lightning, redrawn on every strike (one draw call, only while lit).
  // Hairlines are invisible at high DPI, so each segment is a thin quad.
  var bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BOLT_SEGS * 18), 3));
  bolt = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({
    color: 0xdfeaff, transparent: true, opacity: 0, fog: false,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  }));
  bolt.frustumCulled = false;
  bolt.visible = false;
  skyGroup.add(bolt);

  // occasional shooting star
  var sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  shootingStar = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0, fog: false,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  shootingStar.frustumCulled = false;
  skyGroup.add(shootingStar);

  farLayer = new THREE.Group(); scene.add(farLayer);
  midLayer = new THREE.Group(); scene.add(midLayer);
  fgLayer = new THREE.Group(); scene.add(fgLayer);

  buildFarCastle();
  buildMidLayer();
  buildForeground();
}

function buildFarCastle() {
  // distant castle silhouette + mountains, parallax factor 0.22
  var z = -42;
  for (var x = -26; x < 96; x += rnd(9, 15)) {
    var w = rnd(10, 20), h = rnd(6, 16);
    var m = box(w, h, 1, MAT.silhouette2, x, h / 2 + 1, z - 4);
    farLayer.add(m);
  }
  function tower(x, w, h, spire) {
    var g = new THREE.Group();
    g.add(box(w, h, 1, MAT.silhouette, 0, h / 2, 0));
    g.add(box(w + 1.2, 1.1, 1.2, MAT.silhouette, 0, h, 0));
    if (spire) {
      var c = new THREE.Mesh(new THREE.ConeGeometry(w * 0.72, w * 1.7, 4), MAT.silhouette);
      c.position.y = h + w * 0.9; c.rotation.y = Math.PI / 4; g.add(c);
    }
    // lit windows
    for (var i = 0; i < 3; i++) {
      if (Math.random() < 0.55) {
        g.add(box(0.55, 0.9, 0.2, MAT.litWindow, rnd(-w / 3, w / 3), rnd(h * 0.3, h * 0.85), 0.6));
      }
    }
    g.position.set(x, 0, z);
    farLayer.add(g);
  }
  tower(18, 5, 22, true); tower(26, 8, 16, false); tower(34, 4.5, 26, true);
  tower(41, 10, 13, false); tower(50, 5.5, 19, true); tower(9, 4, 15, true);
  tower(62, 6, 24, true); tower(70, 9, 15, false); tower(78, 4.5, 20, true);

  // bats in the distance
  for (var b = 0; b < 10; b++) {
    var s = sprite(TEX.glow, 1.6, 0x0b0c16, 0.9);
    s.material.blending = THREE.NormalBlending;
    s.position.set(rnd(-20, 90), rnd(14, 34), z + 6);
    s.userData.ph = rnd(0, 6.28); s.userData.sp = rnd(0.4, 1.1);
    farLayer.add(s);
  }
}

function buildMidLayer() {
  // mid distance: dead trees, wall, arches — parallax 0.55
  var z = -22;
  for (var x = -20; x < 170; x += rnd(6, 13)) {
    if (Math.random() < 0.5) {
      // dead tree
      var g = new THREE.Group();
      var hh = rnd(5, 9);
      g.add(box(0.5, hh, 0.5, MAT.silhouette2, 0, hh / 2, 0));
      for (var b = 0; b < 5; b++) {
        var br = box(rnd(1.6, 3.2), 0.24, 0.24, MAT.silhouette2, 0, rnd(hh * 0.4, hh), 0);
        br.rotation.z = rnd(-1.1, 1.1);
        br.position.x = Math.cos(br.rotation.z) * 0.9 * (Math.random() < 0.5 ? -1 : 1);
        g.add(br);
      }
      g.position.set(x, 0, z);
      midLayer.add(g);
    } else {
      var wh = rnd(4, 9);
      midLayer.add(box(rnd(4, 9), wh, 1, MAT.silhouette2, x, wh / 2 - 1, z - 2));
    }
  }
  // mid-ground fence of iron spikes
  for (var i = -20; i < 170; i += 1.4) {
    midLayer.add(box(0.16, 3.2, 0.16, MAT.silhouette, i, 0.4, z + 5));
  }
}

function buildForeground() {
  // dark pillars drifting in front of the action (parallax > 1)
  for (var x = 14; x < 240; x += rnd(46, 72)) {
    var g = new THREE.Group();
    g.add(box(1.1, 34, 1.1, MAT.silhouette, 0, 8, 0));
    g.add(box(1.5, 0.5, 1.5, MAT.silhouette, 0, -4.4, 0));
    g.position.set(x, 0, 4.6);
    fgLayer.add(g);
  }
}

/* ------------------------- level construction ------------------------- */
function addPlat(left, bottom, w, h, opt) {
  opt = opt || {};
  var p = {
    x: left + w / 2, y: bottom + h / 2, w: w, h: h,
    oneway: !!opt.oneway, top: bottom + h
  };
  platforms.push(p);
  if (opt.novis) return p;

  var mat = opt.mat || MAT.stone;
  var depth = opt.depth || 3.2;
  // tiling is baked into the UVs so every platform can share one material
  var m = new THREE.Mesh(mat.map ? bakeUV(w, h, 2.2) : BOX, mat);
  m.scale.set(w, h, depth);
  m.position.set(p.x, p.y, opt.z === undefined ? -0.6 : opt.z);
  scene.add(m);

  // top ledge highlight
  var cap = box(w + 0.12, 0.22, depth + 0.14, MAT.cap, p.x, bottom + h + 0.02, m.position.z);
  scene.add(cap);
  p.mesh = m; p.cap = cap;
  if (!opt.dynamic) { keepStatic(m); keepStatic(cap); }
  return p;
}

/* platforms that drift back and forth */
function addMovingPlat(left, bottom, w, h, ax, ay, sp, ph) {
  var p = addPlat(left, bottom, w, h, { oneway: true, mat: MAT.wood, depth: 2, dynamic: true });
  movers.push({ p: p, x0: p.x, y0: p.y, ax: ax, ay: ay, sp: sp, ph: ph || 0 });
  // chain hanging from above
  var chain = box(0.1, 26, 0.1, MAT.iron, p.x, p.y + 13.2, -0.6);
  scene.add(chain);
  movers[movers.length - 1].chain = chain;
  return p;
}
function updateMovers(dt) {
  for (var i = 0; i < movers.length; i++) {
    var mv = movers[i], p = mv.p;
    var nx = mv.x0 + Math.sin(wt * mv.sp + mv.ph) * mv.ax;
    var ny = mv.y0 + Math.sin(wt * mv.sp * 0.85 + mv.ph + 1.1) * mv.ay;
    var dx = nx - p.x, dy = ny - p.y;
    p.x = nx; p.y = ny;
    p.mesh.position.x = nx; p.mesh.position.y = ny;
    p.cap.position.x = nx; p.cap.position.y = ny + p.h / 2 + 0.02;
    if (mv.chain) { mv.chain.position.x = nx; mv.chain.position.y = ny + 13.2; }
    if (P && P.ride === p && !P.dead) { P.x += dx; P.y += dy; }
  }
}

/* expanding shockwave ring, used for double jumps and kills */
function spawnRing(x, y, color) {
  var m = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.42, 22),
    new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, fog: false }));
  m.position.set(x, y, 1.6);
  scene.add(m);
  rings.push({ m: m, t: 0 });
}
function updateRings(dt) {
  for (var i = rings.length - 1; i >= 0; i--) {
    var r = rings[i];
    r.t += dt;
    var k = r.t / 0.42;
    r.m.scale.setScalar(1 + k * 5);
    r.m.material.opacity = Math.max(0, 0.9 - k);
    if (k >= 1) { scene.remove(r.m); rings.splice(i, 1); }
  }
}

function stairs(x0, baseBottom, n, sw, sh, dir, mat) {
  for (var i = 0; i < n; i++) {
    var hgt = (i + 1) * sh - baseBottom;
    var xx = dir > 0 ? x0 + i * sw : x0 - (i + 1) * sw;
    addPlat(xx, baseBottom, sw, hgt, { mat: mat });
  }
}

function backWall(left, right, bottom, top, mat) {
  var w = right - left, h = top - bottom;
  var base = mat || MAT.stoneDark;
  var wallMat = base === MAT.stoneDark ? MAT.wallDark : MAT.wallWarm;
  var m = new THREE.Mesh(bakeUV(w, h, 3), wallMat);
  m.scale.set(w, h, 1);
  m.position.set(left + w / 2, bottom + h / 2, -9);
  scene.add(m);
  keepStatic(m);
}

function window_(x, y, w, h) {
  var g = new THREE.Group();
  g.add(box(w + 0.5, h + 0.5, 0.5, MAT.iron, 0, 0, -8.2));
  var glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color: 0x8fb4ff, transparent: true, opacity: 0.65 }));
  glass.position.set(0, 0, -7.9); g.add(glass);
  var arch = new THREE.Mesh(new THREE.CircleGeometry(w / 2, 20, 0, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0x8fb4ff, transparent: true, opacity: 0.65 }));
  arch.position.set(0, h / 2, -7.9); g.add(arch);
  for (var i = 1; i < 3; i++) g.add(box(0.12, h + w / 2, 0.2, MAT.iron, -w / 2 + i * w / 3, w / 8, -7.7));
  g.add(box(w + 0.1, 0.14, 0.3, MAT.iron, 0, 0, -7.7));
  var gl = sprite(TEX.glowBlue, w * 2.1, 0x88aaff, 0.34); gl.position.set(0, 0, -7);
  g.add(gl);

  // shaft of moonlight spilling into the room
  var beam = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.5, h * 2.6),
    new THREE.MeshBasicMaterial({
      map: TEX.beam, transparent: true, opacity: 0.3, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide
    }));
  beam.position.set(w * 0.7, -h * 1.1, -5.6);
  beam.rotation.z = -0.36;
  g.add(beam);
  g.userData.beam = beam;

  g.position.set(x, y, 0);
  scene.add(g);
  beams.push(beam);
}
var beams = [];

/* rose window of stained glass — the centrepiece of the throne room */
function stainedGlass(x, y, r) {
  var tex = cvs(256, 256, function (g, w, h) {
    g.fillStyle = '#0b0d18'; g.fillRect(0, 0, w, h);
    var cols = ['#c0304a', '#2f5fc0', '#c8a03a', '#2f8a5a', '#7a3ac0', '#c05a2a'];
    var cx = w / 2, cy = h / 2;
    for (var ring = 3; ring >= 1; ring--) {
      var rad = (ring / 3) * (w / 2 - 6);
      var seg = ring * 6;
      for (var s = 0; s < seg; s++) {
        g.beginPath();
        g.moveTo(cx, cy);
        g.arc(cx, cy, rad, (s / seg) * 6.283, ((s + 1) / seg) * 6.283);
        g.closePath();
        g.fillStyle = cols[(s + ring) % cols.length];
        g.fill();
        g.strokeStyle = '#0b0d18'; g.lineWidth = 5; g.stroke();
      }
    }
    g.beginPath(); g.arc(cx, cy, w / 9, 0, 6.283);
    g.fillStyle = '#f0e0a0'; g.fill();
    g.strokeStyle = '#0b0d18'; g.lineWidth = 5; g.stroke();
  });
  var g2 = new THREE.Group();
  var disc = new THREE.Mesh(new THREE.CircleGeometry(r, 40),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92, fog: false }));
  disc.position.z = -7.9; g2.add(disc);
  var ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.35, 40), MAT.iron);
  ring.position.z = -7.8; g2.add(ring);
  for (var s2 = 0; s2 < 8; s2++) {
    var spoke = box(0.12, r * 2, 0.16, MAT.iron, 0, 0, -7.6);
    spoke.rotation.z = (s2 / 8) * Math.PI; g2.add(spoke);
  }
  var gl = sprite(TEX.glowRed, r * 2.9, 0xff6a5a, 0.26); gl.position.z = -7; g2.add(gl);
  var gl2 = sprite(TEX.glowBlue, r * 2.3, 0x88aaff, 0.22); gl2.position.z = -7; g2.add(gl2);

  var beam = new THREE.Mesh(new THREE.PlaneGeometry(r * 2.4, 18),
    new THREE.MeshBasicMaterial({
      map: TEX.beam, transparent: true, opacity: 0.24, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide
    }));
  beam.position.set(0, -9.5, -5.6);
  g2.add(beam); beams.push(beam);

  g2.position.set(x, y, 0);
  scene.add(g2);
}

/* runner of red carpet down the throne room */
function carpet(left, right, y) {
  var w = right - left;
  // sits above the ledge cap so it never z-fights with the platform top
  var c = box(w, 0.07, 3.4, new THREE.MeshLambertMaterial({ color: 0x4a0e16 }), left + w / 2, y + 0.19, -1.2);
  scene.add(c);
  scene.add(box(w, 0.09, 0.3, MAT.gold, left + w / 2, y + 0.2, -2.85));
  scene.add(box(w, 0.09, 0.3, MAT.gold, left + w / 2, y + 0.2, 0.45));
}

/* polished flagstones that catch the torchlight */
function glossyFloor(left, right, y) {
  // a flat Phong plane cost ~2ms a frame for a sliver of sheen; an unlit
  // gradient strip reads the same at a fraction of the price
  var w = right - left;
  var m = new THREE.Mesh(new THREE.PlaneGeometry(w, 3.4),
    new THREE.MeshBasicMaterial({ color: 0x3a3f52, transparent: true, opacity: 0.55, fog: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(left + w / 2, y + 0.15, -1.2);
  m.matrixAutoUpdate = false; m.updateMatrix();
  scene.add(m);
}

/* tall standing candelabra */
function candelabra(x, y) {
  var g = new THREE.Group();
  g.add(box(0.8, 0.16, 0.8, MAT.gold, 0, 0.08, 0));
  g.add(box(0.18, 2.4, 0.18, MAT.gold, 0, 1.25, 0));
  g.add(box(1.5, 0.14, 0.2, MAT.gold, 0, 2.4, 0));
  for (var k = -1; k <= 1; k++) {
    g.add(box(0.16, 0.34, 0.16, 0xe8e0c8 !== undefined ? MAT.gold : MAT.gold, k * 0.65, 2.62, 0));
    var fl = sprite(TEX.glow, 1.1, 0xffc45a, 0.9);
    fl.position.set(k * 0.65, 2.95, 0.1); g.add(fl);
    flames.push({ x: x + k * 0.65, y: y + 2.95, fl: fl, ph: rnd(0, 9) });
  }
  g.position.set(x, y, 0.6);
  scene.add(g);
  torches.push({ x: x, y: y + 2.7, g: g });
}

function cobweb(x, y, flip) {
  var m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5),
    new THREE.MeshBasicMaterial({ map: TEX.web, transparent: true, opacity: 0.2, depthWrite: false, fog: false }));
  m.position.set(x, y, -4.4);
  m.rotation.z = flip ? Math.PI / 2 : 0;
  m.scale.x = flip ? 1 : -1;
  scene.add(m);
}

function torch(x, y) {
  // brackets go straight into the static batch; only the flame stays an object
  keepStatic(box(0.22, 0.7, 0.22, MAT.iron, x, y - 0.3, 1.4));
  keepStatic(box(0.5, 0.16, 0.5, MAT.iron, x, y + 0.05, 1.4));
  scene.add(staticMeshes[staticMeshes.length - 2]);
  scene.add(staticMeshes[staticMeshes.length - 1]);
  var fl = sprite(TEX.glow, 1.7, 0xffb44a, 0.95);
  fl.position.set(x, y + 0.5, 1.7); scene.add(fl);
  var core = sprite(TEX.glow, 0.7, 0xfff0c0, 1);
  core.position.set(x, y + 0.42, 1.75); scene.add(core);
  var t = { x: x, y: y, fl: fl, core: core, ph: rnd(0, 9), base: 1.7 };
  torches.push(t); flames.push(t);
  return t;
}

function candle(x, y) {
  var g = new THREE.Group();
  g.add(box(0.28, 0.62, 0.28, MAT.wax, 0, 0, 0));
  var fl = sprite(TEX.glow, 1.15, 0xffc45a, 0.95);
  fl.position.set(0, 0.55, 0.25); g.add(fl);
  g.position.set(x, y, 1.2);
  scene.add(g);
  // generous hitbox: candles hang above head height but must be whippable
  var c = { x: x, y: y - 0.5, w: 1.1, h: 2.7, g: g, fl: fl, alive: true, ph: rnd(0, 9) };
  candles.push(c); flames.push(c);
  return c;
}

function chandelier(x, y) {
  var g = new THREE.Group();
  for (var i = 0; i < 6; i++) g.add(box(0.08, 0.5, 0.08, MAT.iron, 0, 5 - i * 0.5, 0));
  g.add(box(2.6, 0.16, 0.5, MAT.gold, 0, 2.2, 0));
  g.add(box(0.16, 0.9, 0.16, MAT.gold, 0, 2.6, 0));
  for (var k = -1; k <= 1; k++) {
    g.add(box(0.18, 0.4, 0.18, MAT.gold, k * 1.05, 2.5, 0));
    var fl = sprite(TEX.glow, 1.2, 0xffc45a, 0.9);
    fl.position.set(k * 1.05, 2.85, 0.2); g.add(fl);
    flames.push({ x: x + k * 1.05, y: y + 2.85, fl: fl, ph: rnd(0, 9) });
  }
  g.position.set(x, y, 0.4);
  scene.add(g);
  torches.push({ x: x, y: y + 2.6, g: g });
  swayers.push({ g: g, amp: rnd(0.02, 0.045), sp: rnd(0.7, 1.2), ph: rnd(0, 6.28) });
}

function banner(x, y) {
  var g = new THREE.Group();
  g.add(box(1.8, 4.4, 0.16, MAT.banner, 0, 0, 0));
  g.add(box(2.2, 0.22, 0.3, MAT.gold, 0, 2.2, 0));
  var crest = new THREE.Mesh(new THREE.CircleGeometry(0.5, 6),
    new THREE.MeshLambertMaterial({ color: 0xc8a24a }));
  crest.position.set(0, 0.7, 0.12); g.add(crest);
  g.position.set(x, y, -6.5);
  scene.add(g);
  swayers.push({ g: g, amp: rnd(0.015, 0.03), sp: rnd(0.5, 0.9), ph: rnd(0, 6.28) });
}

function pillar(x, bottom, h) {
  var g = new THREE.Group();
  var shaft = box(1.5, h, 1.5, MAT.stone, 0, h / 2, 0);
  shaft.material = MAT.stone.clone();
  shaft.material.map = MAT.stone.map.clone();
  shaft.material.map.needsUpdate = true;
  shaft.material.map.repeat.set(1, Math.max(2, Math.round(h / 1.8)));
  g.add(shaft);
  g.add(box(2.0, 0.5, 2.0, MAT.cap, 0, h, 0));
  g.add(box(2.0, 0.5, 2.0, MAT.cap, 0, 0.25, 0));
  g.position.set(x, bottom, -5.5);
  scene.add(g);
}

function spikes(left, right, y) {
  var geo = new THREE.ConeGeometry(0.22, 0.9, 4);
  for (var x = left; x < right; x += 0.55) {
    var m = new THREE.Mesh(geo, MAT.spike);
    m.position.set(x, y + 0.45, -0.4);
    scene.add(m);
    keepStatic(m);
  }
}

function voidPlane(left, right, top) {
  var w = right - left;
  var m = box(w, 26, 4, MAT.black, left + w / 2, top - 13, -2);
  scene.add(m);
}

/* ------------------------- the level ------------------------- */
function buildLevel() {
  /* ============ ZONE A — COURTYARD (0 .. 97) ============ */
  addPlat(-10, -5, 52, 5);                    // ground -10 .. 42
  voidPlane(42, 46.2, -0.2);
  spikes(42.3, 46.0, -4.4);
  addPlat(46.2, -5, 25.4, 5);                 // 46.2 .. 71.6
  addPlat(20, 0, 2.4, 2.0, { mat: MAT.wood });   // crates you hop across
  addPlat(24.5, 0, 2.4, 2.0, { mat: MAT.wood });
  addPlat(28.6, 0, 2.4, 2.0, { mat: MAT.wood });
  addPlat(52, 0, 3, 1.6);
  addPlat(57, 0, 3, 3.2);
  addBreakWall(48.5, 0, 1.6, 2.2, 'meat');     // cracked block hiding a meal
  stairs(62.2, -5, 5, 1.85, 0.82, 1);         // up to y ~ 4.1
  addPlat(71.6, -5, 26, 9.1);                 // rampart top 4.1, .. 97.6
  addPlat(80, 4.1, 2.4, 2.4, { mat: MAT.wood });

  for (var i = 4; i < 96; i += 11) torch(i, 3.4 + (i > 71 ? 4.1 : 0));
  [12, 30, 38, 52, 58, 66, 76, 86, 92].forEach(function (x) {
    candle(x, (x > 71.6 ? 4.1 : 0) + 2.6);
  });

  /* ============ ZONE B — GREAT HALL (97.6 .. 179) ============ */
  backWall(97, 179, -6, 16, MAT.stoneDark);
  addPlat(97.6, -5, 4, 9.1);                  // step down block
  addPlat(101.6, -5, 3, 7.4);
  addPlat(104.6, -5, 3, 5.7);
  addPlat(107.6, -5, 3, 4.0);
  addPlat(110.6, -5, 32, 5);                  // hall floor 110.6 .. 142.6
  voidPlane(142.6, 147.4, -0.2);
  spikes(142.9, 147.2, -4.4);
  addPlat(147.4, -5, 32, 5);                  // 147.4 .. 179.4

  pillar(114, 0, 9); pillar(124, 0, 9); pillar(134, 0, 9);
  pillar(152, 0, 9); pillar(163, 0, 9); pillar(174, 0, 9);
  window_(119, 7.5, 3.2, 5); window_(131, 7.5, 3.2, 5);
  window_(158, 7.5, 3.2, 5); window_(170, 7.5, 3.2, 5);
  banner(128, 5); banner(148, 5);
  chandelier(117, 9); chandelier(137, 9); chandelier(160, 9);

  addPlat(116, 3.6, 4.5, 0.42, { oneway: true, mat: MAT.wood, depth: 2 });
  addPlat(123, 5.9, 4.5, 0.42, { oneway: true, mat: MAT.wood, depth: 2 });
  addPlat(130, 3.6, 4.5, 0.42, { oneway: true, mat: MAT.wood, depth: 2 });
  addPlat(138, 5.9, 4.5, 0.42, { oneway: true, mat: MAT.wood, depth: 2 });
  addPlat(143.4, 4.2, 3.4, 0.42, { oneway: true, mat: MAT.wood, depth: 2 });
  addPlat(155, 3.6, 5, 0.42, { oneway: true, mat: MAT.wood, depth: 2 });
  addPlat(166, 5.9, 5, 0.42, { oneway: true, mat: MAT.wood, depth: 2 });

  cobweb(112.4, 8.4, false); cobweb(143.6, 8.4, true);
  cobweb(160.4, 8.6, false); cobweb(178.2, 8.4, true);

  for (var j = 100; j < 179; j += 9) torch(j, 4.2);
  [112, 118, 126, 132, 139, 150, 157, 164, 171, 177].forEach(function (x) { candle(x, 2.6); });
  candle(124.5, 8.4); candle(139.5, 8.4);

  /* ============ ZONE C — THE CHASM (179.4 .. 228) ============ */
  backWall(179, 228, -6, 16, MAT.stoneWarm);
  addPlat(179.4, -5, 13, 5);                  // 179.4 .. 192.4
  voidPlane(192.4, 210, 0);
  addPlat(194.3, 1.9, 3.6, 0.5, { oneway: true, mat: MAT.wood, depth: 2 });
  addMovingPlat(199.4, 3.6, 3.2, 0.5, 1.7, 0, 0.85, 0);
  addMovingPlat(204.2, 2.4, 3.2, 0.5, 0, 1.5, 1.05, 1.6);
  addPlat(207.8, 4.6, 3.4, 0.5, { oneway: true, mat: MAT.wood, depth: 2 });
  addPlat(210, -5, 18.2, 5);                  // 210 .. 228.2
  addBreakWall(186.6, 0, 1.6, 2.2, 'money');   // cracked block hiding a purse
  pillar(184, 0, 8); pillar(215, 0, 8); pillar(224, 0, 8);
  addPlat(218, 0, 3, 2.2);
  for (var t2 = 182; t2 < 228; t2 += 8) torch(t2, 4.2);
  [182, 188, 213, 221, 226].forEach(function (x) { candle(x, 2.6); });
  candle(197, 6.4); candle(206, 7.2);

  /* ============ ZONE D — THRONE ROOM (228.2 .. 268) ============ */
  backWall(228, 268, -6, 18, MAT.stoneDark);
  addPlat(228.2, -5, 40, 5);                  // 228.2 .. 268.2
  addPlat(266, 0, 3, 14);                     // far wall
  pillar(236, 0, 11); pillar(258, 0, 11);
  stainedGlass(247, 10.5, 3.6);
  glossyFloor(228.2, 268, 0);
  carpet(240, 268, 0);
  candelabra(238.5, 0); candelabra(255.5, 0);
  banner(232, 6); banner(262, 6);
  addPlat(238, 3.6, 4.5, 0.45, { oneway: true, mat: MAT.wood, depth: 2 });
  addPlat(253, 3.6, 4.5, 0.45, { oneway: true, mat: MAT.wood, depth: 2 });
  torch(233, 4.4); torch(243, 4.4); torch(251, 4.4); torch(262, 4.4);
  candle(231, 2.6); candle(263, 2.6);
  cobweb(229.4, 10.4, false); cobweb(265.2, 10.4, true);

  // throne
  var th = new THREE.Group();
  th.add(box(3, 0.5, 2, MAT.stoneWarm, 0, 0.25, 0));
  th.add(box(2.4, 3.4, 0.5, MAT.stoneWarm, 0, 2, -0.7));
  th.add(box(0.4, 1.6, 1.8, MAT.stoneWarm, -1.2, 1.1, 0.2));
  th.add(box(0.4, 1.6, 1.8, MAT.stoneWarm, 1.2, 1.1, 0.2));
  th.add(box(1.4, 0.4, 0.6, MAT.gold, 0, 3.9, -0.7));
  th.position.set(247, 0, -3.5);
  scene.add(th);
}

/* ------------------------- portcullis gates ------------------------- */
function makeGate(left, bottom, w, h) {
  var p = addPlat(left, bottom, w, h, { mat: MAT.iron, depth: 2.6 });
  var bars = [];
  for (var b = 0; b < 4; b++) {
    var bar = box(0.14, h, 0.14, MAT.iron, left + w / 2, bottom + h / 2, 0.9 + b * 0.0);
    bar.position.z = 0.9;
    bar.position.x = left + w / 2 + (b - 1.5) * 0.34;
    scene.add(bar); bars.push(bar);
  }
  for (var i = 0; i < 22; i++) spawnParticles(left + w / 2, rnd(bottom, bottom + h), 1.5, 0x99a0b5, 1, 4, 0.7, 0.14);
  return { p: p, meshes: [p.mesh, p.cap].concat(bars) };
}
function killGate(g) {
  if (!g) return null;
  var idx = platforms.indexOf(g.p);
  if (idx >= 0) platforms.splice(idx, 1);
  for (var i = 0; i < g.meshes.length; i++) scene.remove(g.meshes[i]);
  return null;
}

var gateThrone = null, gateMidA = null, gateMidB = null;
function sealArena() { if (!gateThrone) { gateThrone = makeGate(226.5, 0, 1.6, 14); A.boom(); } }
function openArena() { gateThrone = killGate(gateThrone); }
function sealMidArena() {
  if (gateMidA) return;
  gateMidA = makeGate(167.4, 0, 1.4, 12);
  gateMidB = makeGate(178.6, 0, 1.4, 12);
  A.boom();
}
function openMidArena() {
  gateMidA = killGate(gateMidA);
  gateMidB = killGate(gateMidB);
}

/* ------------------------- lightning + shooting stars ------------------------- */
function strikeBolt() {
  var arr = bolt.geometry.attributes.position.array;
  var seg = 0, hw = 0.13;

  function quad(x0, y0, x1, y1, w) {
    if (seg >= BOLT_SEGS) return;
    var dx = x1 - x0, dy = y1 - y0, len = Math.max(0.001, Math.hypot(dx, dy));
    var nx = (dy / len) * w, ny = (-dx / len) * w, o = seg * 18, z = -50;
    // two triangles: (a,b,c) and (a,c,d)
    var ax = x0 - nx, ay = y0 - ny, bx = x0 + nx, by = y0 + ny;
    var cx = x1 + nx, cy = y1 + ny, dx2 = x1 - nx, dy2 = y1 - ny;
    arr[o] = ax; arr[o + 1] = ay; arr[o + 2] = z;
    arr[o + 3] = bx; arr[o + 4] = by; arr[o + 5] = z;
    arr[o + 6] = cx; arr[o + 7] = cy; arr[o + 8] = z;
    arr[o + 9] = ax; arr[o + 10] = ay; arr[o + 11] = z;
    arr[o + 12] = cx; arr[o + 13] = cy; arr[o + 14] = z;
    arr[o + 15] = dx2; arr[o + 16] = dy2; arr[o + 17] = z;
    seg++;
  }

  // main channel walks down through the part of the sky the camera can see
  var x = rnd(-11, 11), y = 21;      // stay near the visible slice of sky
  while (seg < BOLT_SEGS && y > 4) {
    var nx2 = x + rnd(-1.9, 1.9), ny2 = y - rnd(1.4, 2.8);
    quad(x, y, nx2, ny2, hw);
    if (seg < BOLT_SEGS - 2 && Math.random() < 0.25) {      // fork
      quad(nx2, ny2, nx2 + rnd(-3, 3), ny2 - rnd(1, 2.6), hw * 0.6);
    }
    x = nx2; y = ny2;
  }
  for (; seg < BOLT_SEGS; seg++) {                          // collapse the rest
    var o2 = seg * 18;
    for (var k = 0; k < 18; k++) arr[o2 + k] = 0;
  }
  bolt.geometry.attributes.position.needsUpdate = true;
  bolt.geometry.computeBoundingSphere();
}

function updateStars(dt) {
  starT -= dt;
  if (starT <= 0 && starLife <= 0) { starT = rnd(6, 16); starLife = 0.75; }
  if (starLife > 0) {
    starLife -= dt;
    var k = 1 - starLife / 0.75;
    var sx = -60 + k * 110, sy = 52 - k * 26;
    var a = shootingStar.geometry.attributes.position.array;
    a[0] = sx; a[1] = sy; a[2] = -48;
    a[3] = sx - 5; a[4] = sy + 1.3; a[5] = -48;
    shootingStar.geometry.attributes.position.needsUpdate = true;
    shootingStar.material.opacity = Math.sin(k * Math.PI) * 0.85;
    shootingStar.visible = true;
  } else shootingStar.visible = false;
}

/* ------------------------- ground detail ------------------------- */
function buildRubble() {
  var n = 150;
  var mat = new THREE.MeshLambertMaterial({ color: 0x5f5a4e });
  rubble = new THREE.InstancedMesh(BOX, mat, n);
  var m = new THREE.Matrix4(), q = new THREE.Quaternion(),
      v = new THREE.Vector3(), sc = new THREE.Vector3(), z = new THREE.Vector3(0, 0, 1);
  var spots = [[-4, 40, 0], [47, 71, 0], [72, 96, 4.1], [111, 142, 0],
               [148, 179, 0], [180, 192, 0], [211, 228, 0], [229, 266, 0]];
  for (var i = 0; i < n; i++) {
    var sp = spots[i % spots.length];
    var s = rnd(0.1, 0.3);
    v.set(rnd(sp[0], sp[1]), sp[2] + s * 0.4, rnd(-1.6, 0.9));
    q.setFromAxisAngle(z, rnd(0, 3.14));
    sc.set(s * rnd(1, 2.4), s, s * rnd(1, 1.8));
    m.compose(v, q, sc);
    rubble.setMatrixAt(i, m);
  }
  rubble.instanceMatrix.needsUpdate = true;
  rubble.matrixAutoUpdate = false;
  scene.add(rubble);
}

/* ------------------------- destructible walls ------------------------- */
function addBreakWall(left, bottom, w, h, reward) {
  var p = { x: left + w / 2, y: bottom + h / 2, w: w, h: h, oneway: false, top: bottom + h };
  platforms.push(p);
  var m = new THREE.Mesh(bakeUV(w, h, 2.2), MAT.stone);
  m.scale.set(w, h, 3.2);
  m.position.set(p.x, p.y, -0.6);
  scene.add(m);
  // hairline cracks so it reads as breakable to an attentive eye
  var crack = box(w * 0.06, h * 0.8, 3.3, MAT.black, p.x + w * 0.1, p.y, -0.6);
  crack.material = new THREE.MeshBasicMaterial({ color: 0x11100f });
  scene.add(crack);
  breakWalls.push({ p: p, mesh: m, crack: crack, x: p.x, y: p.y, w: w, h: h, reward: reward, alive: true });
}

function smashWall(bw) {
  bw.alive = false;
  var idx = platforms.indexOf(bw.p);
  if (idx >= 0) platforms.splice(idx, 1);
  scene.remove(bw.mesh); scene.remove(bw.crack);
  A.boom(); G.shake = 0.4;
  for (var i = 0; i < 22; i++) {
    spawnParticles(bw.x + rnd(-bw.w / 2, bw.w / 2), bw.y + rnd(-bw.h / 2, bw.h / 2),
      0.8, 0x8f8a7e, 1, 5, 0.7, 0.22);
  }
  G.toast('SECRET!');
  G.addScore(1000);
  if (bw.reward) dropItem(bw.x, bw.y + 0.5, bw.reward);
}

function resetBreakWalls() {
  for (var i = 0; i < breakWalls.length; i++) {
    var bw = breakWalls[i];
    if (bw.alive) continue;
    bw.alive = true;
    platforms.push(bw.p);
    scene.add(bw.mesh); scene.add(bw.crack);
  }
}

/* collapse the finished level into as few objects as the renderer can manage */
function optimizeScene() {
  mergeLayer(farLayer);
  mergeLayer(midLayer);
  mergeLayer(fgLayer);
  mergeMeshes(scene, staticMeshes);
  merged = true;
  staticMeshes.length = 0;
  for (var i = 0; i < scene.children.length; i++) {
    var c = scene.children[i];
    if (c.type === 'Group' && c !== skyGroup && c !== farLayer && c !== midLayer && c !== fgLayer) {
      freezeBoxes(c);
    }
  }
  // things that gently swing need their matrices back
  for (var s = 0; s < swayers.length; s++) swayers[s].g.matrixAutoUpdate = true;
}

/* =========================================================================
   WEATHER — rain in the courtyard, dust motes indoors, lightning
   ========================================================================= */
var rainData = [], dustData = [], leafData = [], leaves = null;
function buildWeather() {
  var i, n = 260;
  for (i = 0; i < n; i++) rainData.push({ x: rnd(-18, 18), y: rnd(-6, 16), z: rnd(-9, 5), sp: rnd(17, 26) });
  var rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3));
  rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({
    color: 0xa8c8ff, transparent: true, opacity: 0.3, fog: false
  }));
  rain.frustumCulled = false;
  scene.add(rain);

  var ln = 46;
  for (i = 0; i < ln; i++) leafData.push({ x: rnd(-16, 16), y: rnd(-4, 16), z: rnd(-9, 3), s: rnd(0.9, 2.2), p: rnd(0, 9), r: rnd(0.4, 1.4) });
  var lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ln * 3), 3));
  leaves = new THREE.Points(lg, new THREE.PointsMaterial({
    color: 0x8a5a30, size: 0.22, transparent: true, opacity: 0.75, fog: false
  }));
  leaves.frustumCulled = false;
  scene.add(leaves);

  var dn = 110;
  for (i = 0; i < dn; i++) dustData.push({ x: rnd(-14, 14), y: rnd(-4, 12), z: rnd(-7, 4), s: rnd(0.2, 0.7), p: rnd(0, 9) });
  var dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(dn * 3), 3));
  dust = new THREE.Points(dg, new THREE.PointsMaterial({
    color: 0xffe0b0, size: 0.09, transparent: true, opacity: 0.5, fog: false
  }));
  dust.frustumCulled = false;
  scene.add(dust);
}

function updateWeather(dt, camX, camY) {
  var wet = clamp((104 - camX) / 14, 0, 1);          // rain only outdoors
  rain.visible = wet > 0.02;
  if (rain.visible) {
    rain.material.opacity = 0.32 * wet;
    var arr = rain.geometry.attributes.position.array;
    for (var i = 0; i < rainData.length; i++) {
      var d = rainData[i];
      d.y -= d.sp * dt; d.x -= d.sp * 0.2 * dt;
      if (d.y < camY - 10) { d.y = camY + 12; d.x = camX + rnd(-18, 18); }
      if (d.x < camX - 19) d.x = camX + 19;
      var j = i * 6;
      arr[j] = d.x; arr[j + 1] = d.y; arr[j + 2] = d.z;
      arr[j + 3] = d.x - 0.15; arr[j + 4] = d.y - 0.8; arr[j + 5] = d.z;
    }
    rain.geometry.attributes.position.needsUpdate = true;
    // droplets bursting on the stone underfoot
    if (Math.random() < 0.75) {
      var gy = camX > 71.6 ? 4.1 : 0;
      spawnParticles(camX + rnd(-HALF_W, HALF_W), gy + 0.05, 0.6, 0x9fc0ff, 1, 1.5, 0.22, 0.07, -14);
    }
  }

  // leaves tumbling through the courtyard
  leaves.visible = wet > 0.02;
  if (leaves.visible) {
    leaves.material.opacity = 0.7 * wet;
    var la = leaves.geometry.attributes.position.array;
    for (var q = 0; q < leafData.length; q++) {
      var lf = leafData[q];
      lf.y -= lf.s * dt;
      lf.x += Math.sin(wt * lf.r + lf.p) * dt * 2.2 - dt * 1.2;
      if (lf.y < camY - 9) { lf.y = camY + 12; lf.x = camX + rnd(-16, 16); }
      if (lf.x < camX - 17) lf.x = camX + 17;
      la[q * 3] = lf.x; la[q * 3 + 1] = lf.y; la[q * 3 + 2] = lf.z;
    }
    leaves.geometry.attributes.position.needsUpdate = true;
  }

  var indoor = 1 - wet;
  dust.visible = indoor > 0.05;
  if (dust.visible) {
    dust.material.opacity = 0.45 * indoor;
    var da = dust.geometry.attributes.position.array;
    for (var k = 0; k < dustData.length; k++) {
      var m = dustData[k];
      m.y += m.s * dt * 0.35;
      m.x += Math.sin(wt * 0.6 + m.p) * dt * 0.3;
      if (m.y > camY + 9) { m.y = camY - 7; m.x = camX + rnd(-14, 14); }
      if (Math.abs(m.x - camX) > 15) m.x = camX + rnd(-14, 14);
      da[k * 3] = m.x; da[k * 3 + 1] = m.y; da[k * 3 + 2] = m.z;
    }
    dust.geometry.attributes.position.needsUpdate = true;
  }

  // lightning storm outside
  var k2 = 0;
  if (wet > 0.4) {
    lightningCd -= dt;
    if (lightningCd <= 0 && lightning <= 0) {
      lightningCd = rnd(8, 17); lightning = 0.5; A.thunder(); strikeBolt();
    }
  }
  if (lightning > 0) {
    lightning -= dt;
    var L = lightning;
    k2 = (L > 0.44) ? 1 : (L > 0.37 ? 0.05 : (L > 0.28 ? 0.75 : (L > 0.22 ? 0 : Math.max(0, L / 0.22) * 0.3)));
    k2 *= wet;
  }
  bolt.visible = k2 > 0.02;
  if (bolt.visible) bolt.material.opacity = Math.min(1, k2 * 1.1);
  updateStars(dt);
  ambLight.intensity = 0.6 + k2 * 1.5;
  moonLight.intensity = 0.52 + k2 * 1.2;
  for (var b = 0; b < beams.length; b++) {
    beams[b].material.opacity = 0.22 + Math.sin(wt * 1.3 + b) * 0.06;
  }
}

/* =========================================================================
   PARTICLES
   ========================================================================= */
/* One InstancedMesh for every spark in the game: 260 particles cost a single
   draw call instead of 260, and the scene graph never grows. */
var PARTS = [], PIDX = 0, PMESH = null, PCOUNT = 260;
var _pm = new THREE.Matrix4(), _pq = new THREE.Quaternion(),
    _pv = new THREE.Vector3(), _ps = new THREE.Vector3(), _pc = new THREE.Color(),
    _pz = new THREE.Vector3(0, 0, 1);

function initParticles() {
  var mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 1, fog: false });
  PMESH = new THREE.InstancedMesh(BOX, mat, PCOUNT);
  PMESH.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  PMESH.frustumCulled = false;
  if (PMESH.setColorAt) PMESH.setColorAt(0, _pc.setHex(0xffffff));
  scene.add(PMESH);
  for (var i = 0; i < PCOUNT; i++) {
    PARTS.push({ x: 0, y: 0, z: 0, life: 0, max: 1, vx: 0, vy: 0, g: -22, size: 0.15, rot: 0 });
    _pm.makeScale(0, 0, 0);
    PMESH.setMatrixAt(i, _pm);
  }
}

function spawnParticles(x, y, z, color, count, speed, life, size, grav) {
  for (var i = 0; i < count; i++) {
    var p = PARTS[PIDX];
    var a = rnd(0, Math.PI * 2), s = rnd(speed * 0.3, speed);
    p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s + speed * 0.35;
    p.life = p.max = life * rnd(0.7, 1.2);
    p.g = grav === undefined ? -22 : grav;
    p.size = size || 0.16;
    p.x = x; p.y = y; p.z = z === undefined ? 0.5 : z;
    p.rot = rnd(0, 6.28);
    if (PMESH.setColorAt) PMESH.setColorAt(PIDX, _pc.setHex(color));
    PIDX = (PIDX + 1) % PCOUNT;
  }
  if (PMESH.instanceColor) PMESH.instanceColor.needsUpdate = true;
}

function updateParticles(dt) {
  var dirty = false;
  for (var i = 0; i < PCOUNT; i++) {
    var p = PARTS[i];
    if (p.life <= 0) continue;
    p.life -= dt;
    dirty = true;
    if (p.life <= 0) { _pm.makeScale(0, 0, 0); PMESH.setMatrixAt(i, _pm); continue; }
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += dt * 6;
    var k = p.life / p.max;
    var sc = p.size * (0.35 + k * 0.65) * (0.4 + k * 0.6);
    _pv.set(p.x, p.y, p.z);
    _pq.setFromAxisAngle(_pz, p.rot);
    _ps.set(sc, sc, sc);
    _pm.compose(_pv, _pq, _ps);
    PMESH.setMatrixAt(i, _pm);
  }
  if (dirty) PMESH.instanceMatrix.needsUpdate = true;
}

/* =========================================================================
   WORLD UPDATE (parallax, flames, torch lights)
   ========================================================================= */
var wt = 0, near = [], lightTick = 0;
function updateWorld(dt, camX, camY) {
  wt += dt;
  updateWeather(dt, camX, camY);
  updateRings(dt);
  skyGroup.position.x = camX;
  skyGroup.position.y = camY * 0.25;
  farLayer.position.x = camX * 0.78;
  farLayer.position.y = camY * 0.6;
  midLayer.position.x = camX * 0.45;
  midLayer.position.y = camY * 0.25;
  fgLayer.position.x = -camX * 0.25;

  // drifting clouds
  for (var i = 0; i < skyGroup.children.length; i++) {
    var c = skyGroup.children[i];
    if (c.userData.drift) {
      c.position.x += c.userData.drift * dt;
      if (c.position.x > 85) c.position.x = -85;
    }
  }
  // distant bats
  for (var b = 0; b < farLayer.children.length; b++) {
    var s = farLayer.children[b];
    if (s.userData.sp) {
      s.position.x -= s.userData.sp * dt * 2;
      s.position.y += Math.sin(wt * 4 + s.userData.ph) * dt * 1.6;
      if (s.position.x < -25) s.position.x = 92;
    }
  }
  // chandeliers and banners breathing in the draught (on-screen only)
  for (var sw = 0; sw < swayers.length; sw++) {
    var sy = swayers[sw];
    if (Math.abs(sy.g.position.x - camX) > HALF_W + 4) continue;
    sy.g.rotation.z = Math.sin(wt * sy.sp + sy.ph) * sy.amp;
  }

  // flame flicker — only for the ones actually on screen
  var flameRange = HALF_W + 5;
  for (var f = 0; f < flames.length; f++) {
    var fl = flames[f];
    if (!fl.fl || fl.alive === false) continue;
    if (Math.abs(fl.x - camX) > flameRange) { continue; }
    var k = 1 + Math.sin(wt * 11 + fl.ph) * 0.13 + Math.sin(wt * 27 + fl.ph * 2) * 0.07;
    var base = fl.base || 1.15;
    fl.fl.scale.set(base * k, base * k * 1.15, 1);
    fl.fl.material.opacity = 0.8 + Math.sin(wt * 19 + fl.ph) * 0.15;
    if (fl.core) fl.core.scale.setScalar(0.7 * (2 - k));
  }
  // assign the dynamic torch lights to the nearest torches (re-picked occasionally)
  lightTick--;
  if (lightTick <= 0) {
    lightTick = 8;
    near.length = 0;
    for (var t = 0; t < torches.length; t++) {
      var d = Math.abs(torches[t].x - camX);
      if (d < HALF_W + 4) near.push({ d: d, t: torches[t] });
    }
    near.sort(function (a, b) { return a.d - b.d; });
  }
  for (var L = 0; L < decoLights.length; L++) {
    if (L < near.length) {
      var tt = near[L].t;
      decoLights[L].position.set(tt.x, tt.y + 0.6, 2.4);
      decoLights[L].intensity = 2.5 + Math.sin(wt * 13 + L) * 0.45;
      decoLights[L].color.setHex(0xff9130);
      if (Math.random() < 0.045) {                 // embers drifting off the flame
        spawnParticles(tt.x + rnd(-0.15, 0.15), tt.y + 0.6, 1.4,
          Math.random() < 0.5 ? 0xffb040 : 0xff6a20, 1, 0.5, 1.1, 0.075, 1.6);
      }
    } else decoLights[L].intensity = 0;
  }
}
