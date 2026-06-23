// ============================================================================
//  Office builder & director.
//  Lays the five pipeline departments out as left-to-right LANES, so the
//  production chain (Trends → Creation → Editing → Publishing → Marketing)
//  literally flows across the floor. Spawns desks + workers + decorations from
//  save state, mounts the big screen, and drives worker errands + ambience.
// ============================================================================

import * as THREE from '../vendor/three.module.js';
import { DEPARTMENTS, DECORATIONS, OFFICE_LEVELS, STATIONS, PALETTE, ROSTER_BY_ID, RARITIES } from '../core/config.js';
import { state } from '../core/state.js';
import { bus } from '../core/events.js';
import { buildDesk, buildDecoration, buildStation, buildTrash } from './furniture.js';
import { Worker } from './worker.js';
import { BigScreen } from './screen.js';
import { setCameraTarget, fitView, getCamera, getRenderer } from './scene.js';
import { throwProjectile, confettiBurst, screenShake, floatingText } from './effects.js';
import { companyLevel, click as workClick, runStation, isStationActive, grantCash } from '../sim/economy.js';
import { randomMeme, memeFromChar } from '../sim/brainrot.js';
import { buildBrainrot } from './brainrot3d.js';
import { money } from '../core/format.js';

const JANITOR_DEF = DECORATIONS.find((d) => d.id === 'janitor');

const TILE = 2.2;
const SIDE_MARGIN = 1.6;   // gap from side walls
const FRONT_MARGIN = 1.8;  // gap from the open front edge
const BACK_MARGIN = 3.2;   // gap from back wall (walkway under the screen)
const ROW_SPACING = 2.6;
const COL_SPACING = 2.2;

let scene;
let bigScreen;
const root = new THREE.Group();          // everything sits under here
let structure = new THREE.Group();        // floor + walls (rebuilt on expand)
let deskGroup = new THREE.Group();
let workerGroup = new THREE.Group();
let decoGroup = new THREE.Group();
const petGroup = new THREE.Group();       // roaming brainrot pets
const stationGroup = new THREE.Group();   // tappable cookie-clicker machines
const trashGroup = new THREE.Group();     // floor messes the janitor cleans

let layout;
const desks = {};       // deptId -> [{mesh, pos}]
const workers = {};     // deptId -> [Worker]
let decos = [];         // [{mesh, id}]
let chaosProps = [];    // [{mesh, id}] tappable/troll decorations
let pets = [];          // [{sprite, char, ...}] roaming brainrots
let stationMeshes = []; // [{mesh, id, glow, lights, pulse}]
let trash = [];         // [{mesh}] floor messes
let janitorTimer = 0, trashTimer = 16;
const animated = [];    // decoration meshes with userData animation flags
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

let screenTimer = 0;
let tickerIndex = 0;
const TICKERS = [
  '📈 engagement up · 🤖 slop levels nominal · 💸 revenue flowing',
  '🔥 a creator just shipped 1,000 videos in a second',
  '🧠 prompt engineers demanding more GPUs',
  '☕ the coffee machine is the real MVP',
  '🌐 the algorithm loves us today',
  '🎬 editors politely screaming into the void',
];

export function initOffice(sceneRef) {
  scene = sceneRef;
  scene.add(root);
  root.add(structure, deskGroup, workerGroup, decoGroup, petGroup, stationGroup, trashGroup);
  rebuildAll();
  rebuildStations();
  refreshPets();
  state.mess = 0; // floor starts clean on load
  setupTap();

  bus.on('hired', ({ deptId }) => addWorkerAndDesk(deptId, state.depts[deptId].workers - 1));
  bus.on('deskUpgraded', ({ deptId }) => rebuildDepartmentDesks(deptId));
  bus.on('decoAdded', ({ id }) => addDecoration(id, state.decorations[id] - 1));
  bus.on('stationBuilt', () => rebuildStations());
  bus.on('officeExpanded', () => { rebuildAll(); rebuildStations(); clearTrash(); refreshPets(); });
  bus.on('pull', () => refreshPets());

  return { update, getScreenPos: () => bigScreen.group.position, randomCelebrationPos, ragdollSome, makeMess };
}

// ---------------------------------------------------------------------------
//  Layout maths
// ---------------------------------------------------------------------------
function computeLayout() {
  const lvl = OFFICE_LEVELS[state.officeLevel];
  const W = lvl.gridW * TILE;
  const D = lvl.gridH * TILE;
  const laneW = (W - 2 * SIDE_MARGIN) / DEPARTMENTS.length;
  const colsPerLane = Math.max(1, Math.min(3, Math.floor(laneW / COL_SPACING)));
  return {
    W, D, laneW, colsPerLane,
    startX: -W / 2 + SIDE_MARGIN,
    frontZ: D / 2 - FRONT_MARGIN,
    backLimit: -D / 2 + BACK_MARGIN,
    name: lvl.name,
  };
}

// Desk slot (centre of the desk) for the i-th worker of a department.
function deskSlot(deptIndex, i) {
  const L = layout;
  const laneCenterX = L.startX + (deptIndex + 0.5) * L.laneW;
  const col = i % L.colsPerLane;
  const row = Math.floor(i / L.colsPerLane);
  const x = laneCenterX + (col - (L.colsPerLane - 1) / 2) * COL_SPACING;
  let z = L.frontZ - row * ROW_SPACING;
  if (z < L.backLimit) z = L.backLimit + ((L.frontZ - z) % Math.max(0.1, (L.frontZ - L.backLimit)));
  return { x, z };
}

// Decoration slots ring the inside perimeter (front edge + side walls).
function decoSlot(i) {
  const L = layout;
  const insetX = L.W / 2 - 0.9;
  const frontZ = L.D / 2 - 0.9;
  const ring = [];
  // Front edge.
  for (let x = -insetX; x <= insetX; x += 2.4) ring.push({ x, z: frontZ });
  // Left + right walls (front portion only, avoid desk lanes overlap minimal).
  for (let z = frontZ - 2.4; z > -L.D / 2 + 1.2; z -= 2.4) {
    ring.push({ x: -insetX, z });
    ring.push({ x: insetX, z });
  }
  const slot = ring[i % ring.length];
  // Stack extra rings slightly inward when we wrap.
  const wrap = Math.floor(i / ring.length);
  return { x: slot.x - Math.sign(slot.x) * wrap * 1.0, z: slot.z - wrap * 0.0 };
}

// ---------------------------------------------------------------------------
//  Structure: floor, walls, rug, big screen.
// ---------------------------------------------------------------------------
function buildStructure() {
  structure.clear();
  const L = layout;

  // Checkerboard-ish floor for a tidy office-tile feel.
  const tilesX = OFFICE_LEVELS[state.officeLevel].gridW;
  const tilesZ = OFFICE_LEVELS[state.officeLevel].gridH;
  const floorGeo = new THREE.PlaneGeometry(L.W, L.D);
  const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: PALETTE.floor, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  structure.add(floor);

  // Subtle tile grid lines via a second alternating set of thin quads.
  const alt = new THREE.Group();
  for (let ix = 0; ix < tilesX; ix++) for (let iz = 0; iz < tilesZ; iz++) {
    if ((ix + iz) % 2 !== 0) continue;
    const t = new THREE.Mesh(new THREE.PlaneGeometry(TILE, TILE),
      new THREE.MeshStandardMaterial({ color: PALETTE.floorAlt, roughness: 0.95 }));
    t.rotation.x = -Math.PI / 2;
    t.position.set(-L.W / 2 + (ix + 0.5) * TILE, 0.01, -L.D / 2 + (iz + 0.5) * TILE);
    t.receiveShadow = true;
    alt.add(t);
  }
  structure.add(alt);

  // Two walls (back -Z and left -X) for the cutaway iso room look.
  const wallH = 4.2, thick = 0.3;
  const wallMat = new THREE.MeshStandardMaterial({ color: PALETTE.wall, roughness: 0.9 });
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(L.W + thick, wallH, thick), wallMat);
  backWall.position.set(0, wallH / 2, -L.D / 2 - thick / 2);
  backWall.castShadow = true; backWall.receiveShadow = true;
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(thick, wallH, L.D), wallMat);
  leftWall.position.set(-L.W / 2 - thick / 2, wallH / 2, 0);
  leftWall.castShadow = true; leftWall.receiveShadow = true;
  structure.add(backWall, leftWall);

  // Baseboards / trim.
  const trimMat = new THREE.MeshStandardMaterial({ color: PALETTE.wallTrim, roughness: 0.8 });
  const tb = new THREE.Mesh(new THREE.BoxGeometry(L.W + thick, 0.3, 0.12), trimMat);
  tb.position.set(0, 0.15, -L.D / 2 - 0.02); structure.add(tb);

  // Department lane labels on the floor (coloured strips at the front of each lane).
  for (let d = 0; d < DEPARTMENTS.length; d++) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(L.laneW - 0.4, 0.5),
      new THREE.MeshStandardMaterial({ color: DEPARTMENTS[d].color, roughness: 0.7, emissive: DEPARTMENTS[d].color, emissiveIntensity: 0.15 }));
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(L.startX + (d + 0.5) * L.laneW, 0.02, L.D / 2 - 0.7);
    strip.receiveShadow = true;
    structure.add(strip);
  }

  // Big screen on the back wall.
  bigScreen = new BigScreen(Math.min(L.W * 0.55, 9), 3.4);
  bigScreen.group.position.set(0, 2.7, -L.D / 2 + 0.05);
  structure.add(bigScreen.group);

  setCameraTarget(0, 0);
  fitView(L.W, L.D);
}

// ---------------------------------------------------------------------------
//  Spawning
// ---------------------------------------------------------------------------
function addWorkerAndDesk(deptId, i) {
  const deptIndex = DEPARTMENTS.findIndex((d) => d.id === deptId);
  const def = DEPARTMENTS[deptIndex];
  const slot = deskSlot(deptIndex, i);

  const desk = buildDesk(state.depts[deptId].tier);
  desk.position.set(slot.x, 0, slot.z);
  deskGroup.add(desk);
  (desks[deptId] || (desks[deptId] = [])).push({ mesh: desk, pos: slot });

  const worker = new Worker({
    deptId,
    color: def.color,
    x: slot.x, z: slot.z + 0.62, // stand at the chair side
    facing: Math.PI,             // face the monitors / back screen
    requestErrand: makeErrand(deptIndex),
  });
  worker.group.userData.worker = worker;
  workerGroup.add(worker.group);
  (workers[deptId] || (workers[deptId] = [])).push(worker);
}

function rebuildDepartmentDesks(deptId) {
  const list = desks[deptId] || [];
  for (const d of list) {
    deskGroup.remove(d.mesh);
    const fresh = buildDesk(state.depts[deptId].tier);
    fresh.position.set(d.pos.x, 0, d.pos.z);
    deskGroup.add(fresh);
    d.mesh = fresh;
  }
}

function addDecoration(id, i) {
  const slot = decoSlot(i + decoIndexOffset(id));
  const mesh = buildDecoration(id);
  mesh.position.set(slot.x, 0, slot.z);
  // Face roughly toward room centre.
  mesh.rotation.y = Math.atan2(-slot.x, -slot.z);
  decoGroup.add(mesh);
  const def = DECORATIONS.find((d) => d.id === id);
  if (def && def.chaos) { mesh.userData.chaosId = id; chaosProps.push({ mesh, id }); }
  decos.push({ mesh, id });
  const u = mesh.userData;
  if (u.spin || u.spin2 || u.pulse || u.blinkers || u.swing || u.bob || u.spark) animated.push(mesh);
}

// Give different decoration types different perimeter offsets so they don't all stack.
function decoIndexOffset(id) {
  return DECORATIONS.findIndex((d) => d.id === id) * 2;
}

function clearGroup(g) { while (g.children.length) g.remove(g.children[0]); }

function rebuildAll() {
  layout = computeLayout();
  clearGroup(deskGroup); clearGroup(workerGroup); clearGroup(decoGroup);
  for (const k in desks) delete desks[k];
  for (const k in workers) delete workers[k];
  decos = []; chaosProps = []; animated.length = 0;

  buildStructure();

  for (let d = 0; d < DEPARTMENTS.length; d++) {
    const id = DEPARTMENTS[d].id;
    const n = state.depts[id].workers;
    for (let i = 0; i < n; i++) addWorkerAndDesk(id, i);
  }
  for (const deco of DECORATIONS) {
    const n = state.decorations[deco.id];
    for (let i = 0; i < n; i++) addDecoration(deco.id, i);
  }
}

// ---------------------------------------------------------------------------
//  Worker errands — sends a worker to deliver a token to the next department,
//  or off to a random decoration for a "break". Pure visual flavour.
// ---------------------------------------------------------------------------
function makeErrand(deptIndex) {
  return () => {
    const roll = Math.random();
    if (roll < 0.55) {
      // Deliver to the next department in the chain.
      const next = DEPARTMENTS[deptIndex + 1];
      if (next) {
        const list = desks[next.id];
        if (list && list.length) {
          const target = list[Math.floor(Math.random() * list.length)].pos;
          return { x: target.x, z: target.z + 1.2, pause: 0.6, carry: true };
        }
      }
    }
    // Otherwise wander to a decoration if any exist.
    if (decos.length) {
      const target = decos[Math.floor(Math.random() * decos.length)].mesh.position;
      return { x: target.x, z: target.z + 0.9, pause: 1.2 + Math.random(), carry: false };
    }
    return null;
  };
}

// A nice spot to launch confetti from on celebrations: a random staffed desk,
// or the centre of the room.
function randomCelebrationPos() {
  const all = [];
  for (const id in workers) for (const w of workers[id]) all.push(w.group.position);
  if (all.length === 0) return new THREE.Vector3(0, 1.5, 0);
  const p = all[Math.floor(Math.random() * all.length)];
  return new THREE.Vector3(p.x, 1.6, p.z);
}

// ---------------------------------------------------------------------------
//  Stations — one machine per owned station type, in a row near the back wall.
// ---------------------------------------------------------------------------
function stationSlot(i, total) {
  const z = -layout.D / 2 + 1.75;          // back walkway, in front of the screen
  const x = (i - (total - 1) / 2) * 1.85;
  return { x, z };
}
function rebuildStations() {
  clearGroup(stationGroup);
  stationMeshes = [];
  const owned = STATIONS.filter((s) => (state.stations[s.id] || 0) > 0);
  owned.forEach((s, i) => {
    const mesh = buildStation(s.id);
    const slot = stationSlot(i, owned.length);
    mesh.position.set(slot.x, 0, slot.z);
    // Independent materials so we can pulse this machine's glow alone.
    if (mesh.userData.glow) mesh.userData.glow.material = mesh.userData.glow.material.clone();
    if (mesh.userData.lights) mesh.userData.lights = mesh.userData.lights.map((l) => { l.material = l.material.clone(); return l; });
    stationGroup.add(mesh);
    stationMeshes.push({ mesh, id: s.id, glow: mesh.userData.glow, lights: mesh.userData.lights, pulse: Math.random() * 9 });
  });
}

// ---------------------------------------------------------------------------
//  Trash / janitor — messes pile up, drag income down, get tapped (or swept).
// ---------------------------------------------------------------------------
function syncMess() { state.mess = trash.length; }
function spawnTrash() {
  if (trash.length >= 12 || !layout) return;
  const mesh = buildTrash();
  const fp = randomFloorPoint();
  mesh.position.set(fp.x, 0, fp.z);
  trashGroup.add(mesh);
  trash.push({ mesh });
  syncMess();
}
function makeMess(n = 1) { for (let i = 0; i < n; i++) spawnTrash(); }
function removeTrash(entry) {
  const i = trash.indexOf(entry); if (i < 0) return false;
  trash.splice(i, 1); trashGroup.remove(entry.mesh); syncMess();
  return true;
}
function clearTrash() { for (const e of trash) trashGroup.remove(e.mesh); trash = []; syncMess(); }
function tapClean(entry) {
  const p = entry.mesh.position.clone();
  if (!removeTrash(entry)) return;
  state.cleaned = (state.cleaned || 0) + 1;
  confettiBurst(new THREE.Vector3(p.x, 0.7, p.z), 16, 0.5);
  const reward = 5 * (1 + companyLevel());
  grantCash(reward);
  floatingText(new THREE.Vector3(p.x, 1.1, p.z), '🧽 +' + money(reward), '#19b6e6');
}
function updateTrash(dt) {
  // Janitor bots sweep automatically; more bots = faster.
  const jan = state.decorations.janitor || 0;
  if (jan > 0 && trash.length) {
    janitorTimer -= dt;
    if (janitorTimer <= 0) {
      janitorTimer = Math.max(1.2, (JANITOR_DEF ? JANITOR_DEF.cleanEvery : 7) / jan);
      const e = trash[0]; const p = e.mesh.position.clone();
      if (removeTrash(e)) { state.cleaned = (state.cleaned || 0) + 1; confettiBurst(new THREE.Vector3(p.x, 0.7, p.z), 8, 0.4); }
    }
  }
  // New messes appear over time — busier offices get messier.
  trashTimer -= dt;
  if (trashTimer <= 0) {
    const workerCount = flatWorkers().length;
    trashTimer = 11 + Math.random() * 13 - Math.min(6, workerCount * 0.3);
    if (workerCount > 0) spawnTrash();
  }
}

// Knock a few random workers over (used by employee-problem events).
function ragdollSome(n = 1) {
  const all = flatWorkers();
  for (let i = 0; i < n && all.length; i++) all[(Math.random() * all.length) | 0].ragdoll();
}

// ---------------------------------------------------------------------------
//  Per-frame update
// ---------------------------------------------------------------------------
function update(dt, t) {
  for (const id in workers) for (const w of workers[id]) w.update(dt, t);
  updatePets(dt, t);
  updateStations(dt, t);
  updateTrash(dt);

  // Ambient decoration animation.
  for (const m of animated) {
    const u = m.userData;
    if (u.spin) u.spin.rotation.z += dt * 0.8;
    if (u.spin2) u.spin2.rotation.y += dt * 0.6;
    if (u.pulse) { const s = 1 + Math.sin(t * 2.2) * 0.06; u.pulse.scale.setScalar(s); }
    if (u.blinkers) for (const b of u.blinkers) b.material.emissiveIntensity = Math.random() < 0.05 ? 0.1 : 0.8;
    if (u.swing) u.swing.rotation.z = 0.7 + Math.sin(t * 6) * 0.55;
    if (u.bob) u.bob.position.y = 0.8 + Math.abs(Math.sin(t * 2)) * 0.12;
    if (u.spark) { u.spark.material.emissiveIntensity = 0.6 + Math.random() * 0.9; u.spark.visible = Math.random() > 0.12; }
  }

  // CHAOS — sloppy employees randomly get knocked flat, or square up and start
  // flinging office supplies at each other.
  chaosTimer -= dt;
  if (chaosTimer <= 0) { chaosTimer = 5 + Math.random() * 7; triggerChaos(); }

  // The big screen alternates between a live stats dashboard and full-screen
  // brainrot memes, so the office always has something animated playing.
  animT = t;
  screenModeTimer -= dt;
  if (screenModeTimer <= 0) {
    if (screenMode === 'stats') { screenMode = 'meme'; screenModeTimer = 6; currentMeme = pickScreenMeme(); }
    else { screenMode = 'stats'; screenModeTimer = 9; }
  }
  screenTimer -= dt;
  if (screenTimer <= 0) {
    screenTimer = screenMode === 'meme' ? 0.1 : 0.33;
    drawScreen();
  }
}

const screenData = { rates: { money: 0 }, viral: false };
let screenMode = 'stats', screenModeTimer = 8, currentMeme = null, animT = 0, chaosTimer = 5;

// Pushed in from the main loop each frame.
export function setScreenData(rates, viral) {
  screenData.rates = rates;
  screenData.viral = viral;
}

function flatWorkers() { const a = []; for (const id in workers) for (const w of workers[id]) a.push(w); return a; }

// Light up a station's panel + LEDs while it's running; idle ones sit dim.
function updateStations(dt, t) {
  for (const st of stationMeshes) {
    const active = isStationActive(st.id);
    if (st.glow) {
      const target = active ? 1.15 : 0.12;
      const mat = st.glow.material;
      mat.emissiveIntensity += (target - mat.emissiveIntensity) * Math.min(1, dt * 6);
    }
    if (st.lights) {
      const on = active && Math.sin(t * 9 + st.pulse) > 0;
      for (const led of st.lights) led.material.emissiveIntensity = on ? 1.0 : 0.18;
    }
    st.mesh.position.y = active ? Math.abs(Math.sin(t * 13 + st.pulse)) * 0.045 : 0;
  }
}

function triggerChaos() {
  // Chaos props (dino / TNT / bully-bot) occasionally go off on their own.
  if (chaosProps.length && Math.random() < 0.5) { triggerProp(chaosProps[(Math.random() * chaosProps.length) | 0]); return; }
  const all = flatWorkers();
  if (!all.length) return;
  if (all.length >= 2 && Math.random() < 0.6) {
    const a = all[(Math.random() * all.length) | 0];
    let b = all[(Math.random() * all.length) | 0], guard = 0;
    while (b === a && guard++ < 6) b = all[(Math.random() * all.length) | 0];
    if (a === b) return;
    a.fight(b.group.position, 2.4); b.fight(a.group.position, 2.4);
    const pa = { x: a.group.position.x, y: 1.1, z: a.group.position.z };
    const pb = { x: b.group.position.x, y: 1.1, z: b.group.position.z };
    setTimeout(() => throwProjectile(pa, b.group.position), 300);
    setTimeout(() => throwProjectile(pb, a.group.position), 850);
    setTimeout(() => { if (Math.random() < 0.5) a.ragdoll(1); else b.ragdoll(1); }, 2200);
  } else {
    all[(Math.random() * all.length) | 0].ragdoll();
  }
}

// Detonate / stomp / whip a chaos prop: knock nearby employees flat + juice.
function triggerProp(prop) {
  if (!prop || !prop.mesh) return;
  const pos = prop.mesh.position;
  const radius = prop.id === 'tnt' ? 6.5 : prop.id === 'dino' ? 4.5 : 3;
  for (const w of flatWorkers()) {
    if (Math.hypot(w.group.position.x - pos.x, w.group.position.z - pos.z) < radius) w.ragdoll();
  }
  confettiBurst(new THREE.Vector3(pos.x, 1.3, pos.z), prop.id === 'tnt' ? 220 : 90, prop.id === 'tnt' ? 1.6 : 1);
  screenShake(prop.id === 'tnt' ? 2 : prop.id === 'dino' ? 1.1 : 0.7);
  if (prop.id !== 'whip') {
    const n = prop.id === 'tnt' ? 6 : 3;
    for (let i = 0; i < n; i++) throwProjectile({ x: pos.x, y: 1.3, z: pos.z }, { x: pos.x + (Math.random() - 0.5) * 9, z: pos.z + (Math.random() - 0.5) * 9 });
  }
}

// ---- roaming brainrot pets (now real 3D models) ---------------------------
function randomFloorPoint() { return { x: (Math.random() - 0.5) * layout.W * 0.7, z: (Math.random() - 0.5) * layout.D * 0.55 }; }
function refreshPets() {
  const ids = Object.keys(state.collection).slice(0, 12); // cap visible pets
  for (const p of pets) petGroup.remove(p.group);
  pets = [];
  for (const id of ids) {
    const c = ROSTER_BY_ID[id]; if (!c) continue;
    const group = buildBrainrot(c);
    const fp = randomFloorPoint(); group.position.set(fp.x, 0, fp.z);
    group.rotation.y = Math.random() * Math.PI * 2;
    petGroup.add(group);
    pets.push({
      group, char: c, body: group.userData.body, bodyBaseY: group.userData.body ? group.userData.body.scale.y : 1,
      pupils: group.userData.pupils || [], halo: group.userData.halo,
      target: randomFloorPoint(), speed: 1.0 + Math.random() * 0.9, attackCd: 5 + Math.random() * 8, phase: Math.random() * 9, rot: group.rotation.y,
    });
  }
}
function updatePets(dt, t) {
  for (const p of pets) {
    const g = p.group;
    const dx = p.target.x - g.position.x, dz = p.target.z - g.position.z;
    const dist = Math.hypot(dx, dz);
    let moving = false;
    if (dist < 0.3) p.target = randomFloorPoint();
    else {
      const step = Math.min(dist, p.speed * dt);
      g.position.x += dx / dist * step; g.position.z += dz / dist * step; moving = true;
      const targetRot = Math.atan2(dx, dz);
      let diff = ((targetRot - p.rot + Math.PI) % (Math.PI * 2)) - Math.PI;
      p.rot += diff * Math.min(1, dt * 6); g.rotation.y = p.rot;
    }
    // hop + jelly squash-stretch
    const hop = Math.abs(Math.sin(t * (moving ? 8 : 3) + p.phase));
    g.position.y = hop * (moving ? 0.2 : 0.06);
    if (p.body) p.body.scale.y = p.bodyBaseY * (1 + Math.sin(t * 7 + p.phase) * 0.08);
    for (const pu of p.pupils) { pu.p.position.x = pu.bx + Math.cos(t * 5 + pu.bx * 9) * 0.03; pu.p.position.y = pu.by + Math.sin(t * 6 + pu.bx * 9) * 0.03; }
    if (p.halo) p.halo.rotation.z += dt * 1.5;
    p.attackCd -= dt;
    if (p.attackCd <= 0) {
      p.attackCd = 6 + Math.random() * 10;
      const all = flatWorkers();
      if (all.length) { const w = all[(Math.random() * all.length) | 0]; p.target = { x: w.group.position.x, z: w.group.position.z }; w.ragdoll(); screenShake(0.4); }
    }
  }
}

// ---- tap-to-bully ---------------------------------------------------------
function setupTap() {
  const rdr = getRenderer();
  if (!rdr) return;
  const dom = rdr.domElement;
  let dx0 = 0, dy0 = 0, t0 = 0;
  dom.addEventListener('pointerdown', (e) => { dx0 = e.clientX; dy0 = e.clientY; t0 = performance.now(); });
  dom.addEventListener('pointerup', (e) => {
    if (Math.hypot(e.clientX - dx0, e.clientY - dy0) > 8 || performance.now() - t0 > 450) return; // it was a drag
    handleTap(e);
  });
}
const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _pt = new THREE.Vector3();
function handleTap(e) {
  const dom = getRenderer().domElement, r = dom.getBoundingClientRect();
  ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(ndc, getCamera());

  // Stations: tap to make them WORK (run for a burst). Auto-Pilot keeps them on.
  if (stationMeshes.length) {
    const sHits = raycaster.intersectObjects(stationMeshes.map((s) => s.mesh), true);
    if (sHits.length) {
      let o = sHits[0].object; while (o && !(o.userData && o.userData.stationId)) o = o.parent;
      if (o && o.userData.stationId) {
        const burst = runStation(o.userData.stationId);
        const p = o.position;
        floatingText(new THREE.Vector3(p.x, 2.0, p.z), '+' + money(burst), '#ffd166');
        confettiBurst(new THREE.Vector3(p.x, 1.6, p.z), 14, 0.6);
        screenShake(0.3);
        return;
      }
    }
  }

  // Trash: tap to sweep it up (small reward, removes the income drag).
  if (trash.length) {
    const tHits = raycaster.intersectObjects(trash.map((e) => e.mesh), true);
    if (tHits.length) {
      let o = tHits[0].object; while (o && o.parent !== trashGroup) o = o.parent;
      const entry = trash.find((e) => e.mesh === o);
      if (entry) { tapClean(entry); return; }
    }
  }

  // Chaos props detonate when tapped.
  const propHits = raycaster.intersectObjects(chaosProps.map((p) => p.mesh), true);
  if (propHits.length) {
    let o = propHits[0].object;
    while (o) { if (o.userData && o.userData.chaosId) { triggerProp({ mesh: o, id: o.userData.chaosId }); return; } o = o.parent; }
  }

  // Otherwise: a "click to work" — pay out a click, pop the tapped employee.
  const coins = workClick();
  const wHits = raycaster.intersectObjects((() => { const a = []; for (const id in workers) for (const w of workers[id]) a.push(w.body); return a; })(), true);
  let fx = 0, fz = 0;
  if (wHits.length) {
    let o = wHits[0].object; while (o && !(o.userData && o.userData.worker)) o = o.parent;
    if (o && o.userData.worker) { o.userData.worker.workPop(); fx = o.parent.position.x; fz = o.parent.position.z; }
  } else if (raycaster.ray.intersectPlane(_plane, _pt)) { fx = _pt.x; fz = _pt.z; }
  floatingText(new THREE.Vector3(fx, 1.4, fz), '+' + money(coins), '#16a34a');
  if (Math.random() < 0.3) confettiBurst(new THREE.Vector3(fx, 1.3, fz), 14, 0.6);
}

function pickScreenMeme() {
  const owned = Object.keys(state.collection);
  if (owned.length && Math.random() < 0.7) {
    const c = ROSTER_BY_ID[owned[(Math.random() * owned.length) | 0]];
    if (c) return memeFromChar(c);
  }
  return randomMeme();
}

function drawScreen() {
  if (screenData.viral) {
    bigScreen.draw({ viral: true, followers: state.followers, perSec: screenData.rates.money, money: state.money, products: [] });
    return;
  }
  if (screenMode === 'meme' && currentMeme) { bigScreen.drawMeme(currentMeme, animT); return; }
  // "Trending": your top-earning brainrots.
  const items = Object.keys(state.collection).map((id) => {
    const c = ROSTER_BY_ID[id], lvl = state.collection[id];
    return { name: c.name, icon: c.emoji[0], color: RARITIES[c.rarity].color, v: RARITIES[c.rarity].income * lvl };
  }).sort((a, b) => b.v - a.v).slice(0, 6);
  tickerIndex = (tickerIndex + 1) % (TICKERS.length * 30);
  bigScreen.draw({
    followers: state.followers, perSec: screenData.rates.money, money: state.money, level: companyLevel(),
    products: items, viral: false, ticker: TICKERS[Math.floor(tickerIndex / 30) % TICKERS.length],
  });
}
