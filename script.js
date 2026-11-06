
"use strict";

// ==========================================
// COMBAT 3D - VERSION CORRIGÉE
// ==========================================

// Vérification de Three.js
if (typeof THREE === "undefined") {
  document.getElementById("error").style.display = "block";
  document.getElementById("error").textContent =
    "ERREUR : Three.js ne s'est pas chargé. Vérifie ta connexion Internet.";
  throw new Error("Three.js manquant");
}

// ==========================================
// VARIABLES DU JEU
// ==========================================

let playing = false;
let paused = false;
let dead = false;

let health = 100;
let score = 0;
let yaw = 0;
let pitch = 0;
let verticalSpeed = 0;
let grounded = true;

let weapon = 1;
let ammo = { 1: 30, 2: 8 };
let reloading = false;
let lastShot = 0;
let noticeTimer = null;

const keys = {};
const movement = {
  forward: false,
  back: false,
  left: false,
  right: false,
  run: false
};

const obstacles = [];
const enemies = [];
const enemyBars = [];

const settings = {
  1: { name: "FUSIL D'ASSAUT", damage: 25, delay: 150, max: 30 },
  2: { name: "SPAS-12", damage: 20, delay: 750, max: 8 }
};

// ==========================================
// SCÈNE 3D
// ==========================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 75, 190);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  300
);

const renderer = new THREE.WebGLRenderer({
  antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);

// ==========================================
// LUMIÈRE
// ==========================================

scene.add(
  new THREE.HemisphereLight(0xffffff, 0x557044, 1.8)
);

const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(35, 60, 25);
sun.castShadow = true;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
scene.add(sun);

// ==========================================
// MATÉRIAUX
// ==========================================

function material(color) {
  return new THREE.MeshStandardMaterial({ color });
}

const grass = material(0x59a744);
const wood = material(0x96602e);
const darkWood = material(0x49301b);
const roofMaterial = material(0xb74b32);
const stone = material(0x777777);
const green = material(0x247b35);
const skin = material(0xf1bd91);
const shirt = material(0x2789ce);
const pants = material(0x333d59);
const black = material(0x15191e);
const metal = material(0x656d78);
const enemyShirt = material(0xc32f2f);

// ==========================================
// CONSTRUCTION
// ==========================================

function createBox(parent, x, y, z, w, h, d, mat) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    mat
  );

  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);

  return mesh;
}

function addObstacle(x, z, w, d) {
  obstacles.push({ x, z, w, d });
}

function collides(x, z, radius = 0.5) {
  return obstacles.some(o =>
    Math.abs(x - o.x) < o.w / 2 + radius &&
    Math.abs(z - o.z) < o.d / 2 + radius
  );
}

// ==========================================
// SOL
// ==========================================

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  grass
);

ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ==========================================
// MAISONS
// ==========================================

function createHouse(x, z, size = 1) {
  const w = 8 * size;
  const h = 4 * size;
  const d = 7 * size;

  const house = new THREE.Group();
  house.position.set(x, 0, z);

  createBox(
    house, 0, h / 2, 0,
    w, h, d, wood
  );

  // Porte
  createBox(
    house, 0, 1.2 * size, d / 2 + 0.08,
    1.5 * size, 2.4 * size, 0.15, darkWood
  );

  // Fenêtres
  for (const side of [-1, 1]) {
    createBox(
      house, side * 2.4 * size, 2.5 * size, d / 2 + 0.09,
      1.1 * size, 0.9 * size, 0.12, metal
    );
  }

  // Toit
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(w * 0.75, 3.5 * size, 4),
    roofMaterial
  );

  roof.position.y = h + 1.5 * size;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  house.add(roof);

  scene.add(house);
  addObstacle(x, z, w, d);
}

// ==========================================
// FORTS ET CONSTRUCTIONS
// ==========================================

function createFort(x, z) {
  const fort = new THREE.Group();

  createBox(fort, 0, 1.5, -3, 7, 3, 0.5, wood);
  createBox(fort, -3.25, 1.5, 0, 0.5, 3, 6, wood);
  createBox(fort, 3.25, 1.5, 0, 0.5, 3, 6, wood);

  createBox(fort, 0, 3.2, 0, 7.5, 0.4, 7.5, darkWood);

  fort.position.set(x, 0, z);
  scene.add(fort);

  addObstacle(x, z, 7, 6);
}

function createCrate(x, z) {
  const crate = new THREE.Group();

  createBox(crate, 0, 0.8, 0, 1.6, 1.6, 1.6, wood);
  createBox(crate, 0, 0.8, 0.81, 1.7, 0.12, 0.1, darkWood);

  crate.position.set(x, 0, z);
  scene.add(crate);

  addObstacle(x, z, 1.6, 1.6);
}

// ==========================================
// ARBRES
// ==========================================

function createTree(x, z) {
  const tree = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.5, 3.5, 8),
    darkWood
  );

  trunk.position.y = 1.75;
  trunk.castShadow = true;
  tree.add(trunk);

  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(2.2, 5, 8),
    green
  );

  leaves.position.y = 5;
  leaves.castShadow = true;
  tree.add(leaves);

  tree.position.set(x, 0, z);
  scene.add(tree);

  addObstacle(x, z, 1.2, 1.2);
}

// ==========================================
// ROCHERS
// ==========================================

function createRock(x, z) {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.1, 0),
    stone
  );

  rock.position.set(x, 0.7, z);
  rock.scale.y = 0.7;
  rock.castShadow = true;
  scene.add(rock);

  addObstacle(x, z, 2, 2);
}

// ==========================================
// CRÉATION DE LA CARTE
// ==========================================

createHouse(-20, -20, 1);
createHouse(25, -25, 0.9);
createHouse(-35, 25, 0.9);
createHouse(35, 30, 1.1);
createHouse(5, 42, 0.8);

createFort(20, 8);
createFort(-25, -5);
createFort(2, -37);

for (let i = 0; i < 25; i++) {
  const x = Math.random() * 100 - 50;
  const z = Math.random() * 100 - 50;

  if (Math.hypot(x, z) > 10 && !collides(x, z, 1)) {
    createCrate(x, z);
  }
}

for (let i = 0; i < 65; i++) {
  const x = Math.random() * 130 - 65;
  const z = Math.random() * 130 - 65;

  if (Math.hypot(x, z) > 10 && !collides(x, z, 1)) {
    createTree(x, z);
  }
}

for (let i = 0; i < 25; i++) {
  const x = Math.random() * 120 - 60;
  const z = Math.random() * 120 - 60;

  if (!collides(x, z, 1)) {
    createRock(x, z);
  }
}

// ==========================================
// PERSONNAGE DU JOUEUR
// ==========================================

const player = new THREE.Group();
scene.add(player);

const character = new THREE.Group();
player.add(character);

createBox(character, 0, 1.8, 0, 0.85, 1.1, 0.45, shirt);

const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.38, 16, 16),
  skin
);

head.position.y = 2.65;
head.castShadow = true;
character.add(head);

// Yeux
for (const side of [-1, 1]) {
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 8, 8),
    black
  );

  eye.position.set(side * 0.13, 2.7, 0.33);
  character.add(eye);
}

function makeLimb(x, y, length, mat) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);

  const limb = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, length, 10),
    mat
  );

  limb.position.y = -length / 2;
  limb.castShadow = true;
  pivot.add(limb);
  character.add(pivot);

  return pivot;
}

const leftArm = makeLimb(-0.58, 2.2, 0.95, shirt);
const rightArm = makeLimb(0.58, 2.2, 0.95, shirt);
const leftLeg = makeLimb(-0.23, 1.2, 1.05, pants);
const rightLeg = makeLimb(0.23, 1.2, 1.05, pants);

// ==========================================
// ARMES
// ==========================================

const gunHolder = new THREE.Group();
character.add(gunHolder);

function makeWeapon(type) {
  const gun = new THREE.Group();

  const shotgun = type === 2;

  createBox(
    gun, 0, 0, -0.2,
    shotgun ? 0.22 : 0.16,
    0.18,
    shotgun ? 1.1 : 1,
    black
  );

  createBox(
    gun, 0, 0.12, -0.65,
    shotgun ? 0.13 : 0.09,
    0.12,
    0.85,
    metal
  );

  createBox(
    gun, 0, -0.18, 0.1,
    0.16, 0.35, 0.2,
    black
  );

  createBox(
    gun, 0, 0.02, -1.1,
    shotgun ? 0.14 : 0.1,
    0.12, 0.7,
    metal
  );

  if (shotgun) {
    createBox(
      gun, 0.12, 0.1, -0.6,
      0.12, 0.12, 0.7,
      black
    );
  }

  gun.position.set(0.65, 2, 0.1);
  gun.scale.setScalar(1.1);

  return gun;
}

const rifle = makeWeapon(1);
const spas = makeWeapon(2);

gunHolder.add(rifle);
gunHolder.add(spas);
spas.visible = false;

// ==========================================
// POSITION INITIALE
// ==========================================

player.position.set(0, 0, 10);

// ==========================================
// CAMÉRA
// ==========================================

function updateCamera() {
  const distance = 7;
  const target = player.position.clone();
  target.y += 2.2;

  const cameraX = target.x - Math.sin(yaw) * distance;
  const cameraZ = target.z - Math.cos(yaw) * distance;

  camera.position.set(
    cameraX,
    target.y + 2.5 - pitch * 2,
    cameraZ
  );

  camera.lookAt(
    target.x + Math.sin(yaw) * 8,
    target.y + pitch * 5,
    target.z + Math.cos(yaw) * 8
  );
}

// ==========================================
// ENNEMIS
// ==========================================

function createEnemy(x, z) {
  const enemy = new THREE.Group();
  const model = new THREE.Group();

  enemy.add(model);

  createBox(model, 0, 1.8, 0, 0.8, 1.1, 0.45, enemyShirt);

  const enemyHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.37, 12, 12),
    skin
  );

  enemyHead.position.y = 2.65;
  model.add(enemyHead);

  const legs = [
    makeEnemyLimb(model, -0.23),
    makeEnemyLimb(model, 0.23)
  ];

  enemy.position.set(x, 0, z);

  enemy.userData = {
    hp: 100,
    maxHp: 100,
    timer: 0,
    phase: Math.random() * 10,
    model,
    legs,
    dead: false
  };

  scene.add(enemy);
  enemies.push(enemy);

  const bar = document.createElement("div");
  bar.className = "enemy-health";
  bar.innerHTML =
    '<div class="enemy-number">100 / 100</div>' +
    '<div class="health-background">' +
    '<div class="health-fill"></div></div>';

  document.getElementById("enemyBars").appendChild(bar);
  enemyBars.push({ enemy, bar });
}

function makeEnemyLimb(parent, x) {
  const pivot = new THREE.Group();
  pivot.position.set(x, 1.2, 0);

  const limb = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 1, 8),
    pants
  );

  limb.position.y = -0.5;
  pivot.add(limb);
  parent.add(pivot);

  return pivot;
}

createEnemy(-12, -12);
createEnemy(15, -17);
createEnemy(28, 12);
createEnemy(-30, 5);
createEnemy(5, 30);
createEnemy(-15, 35);
createEnemy(40, -5);

// ==========================================
// VIE DES ENNEMIS
// ==========================================

function updateEnemyBars() {
  for (const item of enemyBars) {
    const enemy = item.enemy;

    if (enemy.userData.dead) {
      item.bar.style.display = "none";
      continue;
    }

    const position = enemy.position.clone();
    position.y += 3.5;
    position.project(camera);

    const x = (position.x * 0.5 + 0.5) * innerWidth;
    const y = (-position.y * 0.5 + 0.5) * innerHeight;
    const distance = camera.position.distanceTo(enemy.position);

    if (
      distance > 70 ||
      position.z > 1 ||
      x < 0 || x > innerWidth ||
      y < 0 || y > innerHeight
    ) {
      item.bar.style.display = "none";
      continue;
    }

    item.bar.style.display = "block";
    item.bar.style.left = x + "px";
    item.bar.style.top = y + "px";

    const hp = enemy.userData.hp;

    item.bar.querySelector(".enemy-number").textContent =
      hp + " / 100";

    item.bar.querySelector(".health-fill").style.width =
      hp + "%";
  }
}

// ==========================================
// ARMES
// ==========================================

function selectWeapon(number) {
  if (number !== 1 && number !== 2) return;

  weapon = number;

  rifle.visible = number === 1;
  spas.visible = number === 2;

  document.getElementById("weaponName").textContent =
    settings[number].name;

  updateAmmo();
  showNotice(settings[number].name);
}

function updateAmmo() {
  document.getElementById("ammo").textContent =
    ammo[weapon] + " / " + settings[weapon].max;
}

// ==========================================
// TIR
// ==========================================

const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);

function shoot() {
  if (!playing || paused || dead || reloading) return;

  const now = performance.now();
  const config = settings[weapon];

  if (now - lastShot < config.delay) return;
  lastShot = now;

  if (ammo[weapon] <= 0) {
    showNotice("PLUS DE MUNITIONS ! APPUIE SUR R");
    return;
  }

  ammo[weapon]--;
  updateAmmo();

  raycaster.setFromCamera(screenCenter, camera);

  const targets = [];

  for (const enemy of enemies) {
    if (enemy.userData.dead) continue;

    const objects = [];
    enemy.traverse(object => {
      if (object.isMesh) objects.push(object);
    });

    const hits = raycaster.intersectObjects(objects, false);

    if (hits.length > 0) {
      targets.push({
        enemy,
        distance: hits[0].distance
      });
    }
  }

  targets.sort((a, b) => a.distance - b.distance);

  if (weapon === 1) {
    if (targets.length) {
      damageEnemy(targets[0].enemy, config.damage);
    }
  } else {
    for (const target of targets) {
      if (target.distance < 22) {
        const damage = Math.max(
          5,
          config.damage - target.distance * 0.45
        );

        damageEnemy(target.enemy, damage);
      }
    }
  }

  gunHolder.position.z = 0.15;

  setTimeout(() => {
    gunHolder.position.z = 0;
  }, 100);
}

// ==========================================
// DÉGÂTS AUX ENNEMIS
// ==========================================

function damageEnemy(enemy, damage) {
  if (enemy.userData.dead) return;

  enemy.userData.hp = Math.max(
    0,
    enemy.userData.hp - damage
  );

  if (enemy.userData.hp <= 0) {
    enemy.userData.dead = true;
    score++;

    document.getElementById("score").textContent = score;

    showNotice("ENNEMI ÉLIMINÉ !");

    enemyBars.find(item => item.enemy === enemy).bar.style.display = "none";
    scene.remove(enemy);

    setTimeout(() => {
      const index = enemies.indexOf(enemy);
      if (index !== -1) enemies.splice(index, 1);

      if (playing && !dead) {
        createEnemy(
          Math.random() * 80 - 40,
          Math.random() * 80 - 40
        );
      }
    }, 5000);
  }
}

// ==========================================
// RECHARGEMENT
// ==========================================

function reload() {
  if (!playing || paused || reloading) return;

  if (ammo[weapon] === settings[weapon].max) return;

  reloading = true;
  showNotice("RECHARGEMENT...");

  setTimeout(() => {
    if (dead) {
      reloading = false;
      return;
    }

    ammo[weapon] = settings[weapon].max;
    reloading = false;
    updateAmmo();

    showNotice("RECHARGÉ !");
  }, 1500);
}

// ==========================================
// DÉPLACEMENT
// ==========================================

function updatePlayer(delta, time) {
  let forward = 0;
  let side = 0;

  if (keys.w || keys.z || movement.forward) forward++;
  if (keys.s || movement.back) forward--;
  if (keys.d || movement.right) side++;
  if (keys.a || keys.q || movement.left) side--;

  const length = Math.hypot(forward, side);

  if (length > 1) {
    forward /= length;
    side /= length;
  }

  const speed = (movement.run || keys.shift) ? 12 : 7;

  const dx = (
    Math.sin(yaw) * forward +
    Math.cos(yaw) * side
  ) * speed * delta;

  const dz = (
    Math.cos(yaw) * forward -
    Math.sin(yaw) * side
  ) * speed * delta;

  const nextX = player.position.x + dx;
  const nextZ = player.position.z + dz;

  if (!collides(nextX, player.position.z)) {
    player.position.x = nextX;
  }

  if (!collides(player.position.x, nextZ)) {
    player.position.z = nextZ;
  }

  player.position.x = THREE.MathUtils.clamp(
    player.position.x, -95, 95
  );

  player.position.z = THREE.MathUtils.clamp(
    player.position.z, -95, 95
  );

  player.rotation.y = yaw;

  if (length > 0.1) {
    const walk = Math.sin(time * speed) * 0.6;

    leftLeg.rotation.x = walk;
    rightLeg.rotation.x = -walk;
    leftArm.rotation.x = -walk * 0.5;
    rightArm.rotation.x = walk * 0.5;
  } else {
    leftLeg.rotation.x *= 0.8;
    rightLeg.rotation.x *= 0.8;
  }

  if (!grounded) {
    verticalSpeed -= 20 * delta;
    player.position.y += verticalSpeed * delta;

    if (player.position.y <= 0) {
      player.position.y = 0;
      verticalSpeed = 0;
      grounded = true;
    }
  }

  updateCamera();
}

// ==========================================
// SAUT
// ==========================================

function jump() {
  if (!playing || paused || !grounded) return;

  grounded = false;
  verticalSpeed = 8;
}

// ==========================================
// ENNEMIS
// ==========================================

function updateEnemies(delta, time) {
  for (const enemy of enemies) {
    if (enemy.userData.dead) continue;

    const distance = enemy.position.distanceTo(player.position);

    if (distance > 4 && distance < 45) {
      const direction = new THREE.Vector3()
        .subVectors(player.position, enemy.position)
        .setY(0)
        .normalize();

      const x = enemy.position.x + direction.x * delta * 1.8;
      const z = enemy.position.z + direction.z * delta * 1.8;

      if (!collides(x, z, 0.5)) {
        enemy.position.x = x;
        enemy.position.z = z;
      }

      enemy.rotation.y = Math.atan2(direction.x, direction.z);
    }

    const walk = Math.sin(time * 7 + enemy.userData.phase) * 0.45;

    enemy.userData.legs[0].rotation.x = walk;
    enemy.userData.legs[1].rotation.x = -walk;

    enemy.userData.timer -= delta;

    if (distance < 3 && enemy.userData.timer <= 0) {
      enemy.userData.timer = 1.2;
      takeDamage(10);
    }
  }
}

// ==========================================
// DÉGÂTS DU JOUEUR
// ==========================================

function takeDamage(amount) {
  if (dead) return;

  health = Math.max(0, health - amount);
  document.getElementById("health").textContent = health;

  if (health <= 0) {
    dead = true;
    playing = false;

    document.getElementById("finalScore").textContent = score;
    document.getElementById("gameOver").style.display = "flex";

    document.exitPointerLock?.();
  }
}

// ==========================================
// MESSAGES
// ==========================================

function showNotice(message) {
  const element = document.getElementById("notice");

  element.textContent = message;
  clearTimeout(noticeTimer);

  noticeTimer = setTimeout(() => {
    element.textContent = "";
  }, 1400);
}

// ==========================================
// PAUSE
// ==========================================

function togglePause() {
  if (!playing || dead) return;

  paused = !paused;

  document.getElementById("pause").style.display =
    paused ? "flex" : "none";

  if (paused) {
    document.exitPointerLock?.();
  }
}

document.getElementById("resumeButton").onclick = () => {
  paused = false;
  document.getElementById("pause").style.display = "none";
};

document.getElementById("restartButton").onclick = () => {
  location.reload();
};

document.getElementById("againButton").onclick = () => {
  location.reload();
};

// ==========================================
// CLAVIER
// ==========================================

window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();
  keys[key] = true;

  if (event.code === "Space") {
    event.preventDefault();
    jump();
  }

  if (key === "1") selectWeapon(1);
  if (key === "2") selectWeapon(2);
  if (key === "r") reload();
  if (key === "f") showNotice("RIEN À UTILISER");
  if (key === "escape") togglePause();
});

window.addEventListener("keyup", event => {
  keys[event.key.toLowerCase()] = false;
});

// ==========================================
// SOURIS
// ==========================================

renderer.domElement.addEventListener("mousedown", event => {
  if (event.button === 0) shoot();
});

document.addEventListener("mousemove", event => {
  if (!playing || paused) return;

  if (document.pointerLockElement === renderer.domElement) {
    yaw -= event.movementX * 0.0025;
    pitch -= event.movementY * 0.002;

    pitch = THREE.MathUtils.clamp(pitch, -0.8, 0.45);

    updateCamera();
  }
});

renderer.domElement.addEventListener("contextmenu", event => {
  event.preventDefault();
});

// ==========================================
// COMMANDES XBOX
// ==========================================

let previousPad = {};

function updateGamepad(delta) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const pad = pads && Array.from(pads).find(p => p && p.connected);

  if (!pad) return;

  const deadZone = 0.15;
  let x = Math.abs(pad.axes[0]) > deadZone ? pad.axes[0] : 0;
  let y = Math.abs(pad.axes[1]) > deadZone ? pad.axes[1] : 0;

  const speed = pad.buttons[7]?.pressed ? 12 : 7;

  const dx = (
    Math.sin(yaw) * -y + Math.cos(yaw) * x
  ) * speed * delta;

  const dz = (
    Math.cos(yaw) * -y - Math.sin(yaw) * x
  ) * speed * delta;

  if (!collides(player.position.x + dx, player.position.z)) {
    player.position.x += dx;
  }

  if (!collides(player.position.x, player.position.z + dz)) {
    player.position.z += dz;
  }

  // Stick droit : visée
  const lookX = pad.axes[2] || 0;
  const lookY = pad.axes[3] || 0;

  yaw -= lookX * delta * 2.5;
  pitch -= lookY * delta * 2;
  pitch = THREE.MathUtils.clamp(pitch, -0.8, 0.45);

  const pressed = (index) =>
    !!pad.buttons[index]?.pressed;

  if (pressed(0) && !previousPad.jump) jump();
  if (pressed(1) && !previousPad.weapon2) selectWeapon(2);
  if (pressed(2) && !previousPad.reload) reload();
  if (pressed(3) && !previousPad.weapon1) selectWeapon(1);
  if (pressed(9) && !previousPad.pause) togglePause();

  if (pressed(7) && !previousPad.shoot) shoot();

  previousPad = {
    jump: pressed(0),
    weapon2: pressed(1),
    reload: pressed(2),
    weapon1: pressed(3),
    pause: pressed(9),
    shoot: pressed(7)
  };

  updateCamera();
}

// ==========================================
// COMMANDES MOBILES
// ==========================================

document.querySelectorAll("[data-move]").forEach(button => {
  const direction = button.dataset.move;

  button.addEventListener("pointerdown", event => {
    event.preventDefault();
    movement[direction] = true;
  });

  ["pointerup", "pointerleave", "pointercancel"].forEach(type => {
    button.addEventListener(type, () => {
      movement[direction] = false;
    });
  });
});

function mobileAction(id, callback) {
  document.getElementById(id).addEventListener("pointerdown", event => {
    event.preventDefault();
    callback();
  });
}

mobileAction("mobileShoot", shoot);
mobileAction("mobileJump", jump);
mobileAction("mobileReload", reload);
mobileAction("mobileWeapon1", () => selectWeapon(1));
mobileAction("mobileWeapon2", () => selectWeapon(2));

const runButton = document.getElementById("mobileRun");

runButton.addEventListener("pointerdown", () => {
  movement.run = true;
});

["pointerup", "pointerleave", "pointercancel"].forEach(type => {
  runButton.addEventListener(type, () => {
    movement.run = false;
  });
});

// ==========================================
// VISÉE MOBILE
// ==========================================

let touchPosition = null;

renderer.domElement.addEventListener("touchstart", event => {
  if (!playing || paused) return;

  const touch = event.changedTouches[0];

  if (touch.clientX > window.innerWidth * 0.35) {
    touchPosition = {
      x: touch.clientX,
      y: touch.clientY
    };
  }
}, { passive: true });

renderer.domElement.addEventListener("touchmove", event => {
  if (!touchPosition || !playing || paused) return;

  const touch = event.changedTouches[0];

  yaw -= (touch.clientX - touchPosition.x) * 0.006;
  pitch -= (touch.clientY - touchPosition.y) * 0.004;

  pitch = THREE.MathUtils.clamp(pitch, -0.8, 0.45);

  touchPosition = {
    x: touch.clientX,
    y: touch.clientY
  };

  updateCamera();
}, { passive: true });

renderer.domElement.addEventListener("touchend", () => {
  touchPosition = null;
});

// ==========================================
// BOUTON JOUER
// ==========================================

function startGame() {
  if (playing || dead) return;

  playing = true;
  paused = false;

  document.getElementById("menu").style.display = "none";
  document.getElementById("pause").style.display = "none";
  document.getElementById("crosshair").style.display = "block";
  document.getElementById("mobileControls").style.display =
    "flex";

  updateCamera();

  if (matchMedia("(pointer: fine)").matches) {
    renderer.domElement.requestPointerLock?.();
  }

  showNotice("BONNE CHANCE !");
}

document.getElementById("playButton").addEventListener(
  "click",
  startGame
);

// ==========================================
// REDIMENSIONNEMENT
// ==========================================

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ==========================================
// BOUCLE PRINCIPALE
// ==========================================

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  if (playing && !paused && !dead) {
    updatePlayer(delta, time);
    updateEnemies(delta, time);
    updateGamepad(delta);
    updateEnemyBars();
  }

  renderer.render(scene, camera);
}

// ==========================================
// INITIALISATION
// ==========================================

selectWeapon(1);
updateAmmo();
updateCamera();

console.log("SCRIPT JAVASCRIPT CHARGÉ !");
console.log("COMBAT 3D EST PRÊT !");

animate();
