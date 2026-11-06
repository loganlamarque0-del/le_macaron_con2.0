
import * as THREE from "three";

// =====================================
// COMBAT 3D - SCRIPT PRINCIPAL
// =====================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 65, 190);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  300
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// =====================================
// LUMIÈRES
// =====================================

scene.add(new THREE.HemisphereLight(0xffffff, 0x668044, 2));

const sunlight = new THREE.DirectionalLight(0xffffff, 2.2);
sunlight.position.set(35, 65, 25);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(2048, 2048);
scene.add(sunlight);

// =====================================
// VARIABLES
// =====================================

let playing = false;
let paused = false;
let gameOver = false;

let health = 100;
let score = 0;
let yaw = 0;
let pitch = -0.12;
let verticalSpeed = 0;
let grounded = true;

const keys = {};
const move = {
  forward: false,
  back: false,
  left: false,
  right: false,
  run: false
};

const player = new THREE.Group();
scene.add(player);

const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);

let enemies = [];
let obstacles = [];
let enemyElements = [];
let weapon = 1;
let ammo = { 1: 30, 2: 8 };
let reloading = false;
let lastShot = 0;

const weaponSettings = {
  1: { name: "FUSIL D'ASSAUT", damage: 25, delay: 130, max: 30 },
  2: { name: "SPAS-12", damage: 18, delay: 800, max: 8 }
};

// =====================================
// MATÉRIAUX
// =====================================

const materials = {
  grass: new THREE.MeshStandardMaterial({ color: 0x55a844 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x95602f }),
  darkWood: new THREE.MeshStandardMaterial({ color: 0x54351d }),
  roof: new THREE.MeshStandardMaterial({ color: 0xb74b32 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x777777 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x555b65 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xe8bd36 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xf1bd91 }),
  shirt: new THREE.MeshStandardMaterial({ color: 0x2789ce }),
  pants: new THREE.MeshStandardMaterial({ color: 0x333d59 }),
  black: new THREE.MeshStandardMaterial({ color: 0x171b20 }),
  red: new THREE.MeshStandardMaterial({ color: 0xd93830 })
};

// =====================================
// SOL ET CARTE
// =====================================

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  materials.grass
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(200, 40, 0x478e36, 0x478e36);
grid.position.y = 0.02;
scene.add(grid);

// =====================================
// OUTILS DE CONSTRUCTION
// =====================================

function box(x, y, z, sx, sy, sz, material, parent = scene) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    material
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(x, y, z, radius, height, material, parent = scene) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 10),
    material
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// =====================================
// COLLISIONS
// =====================================

function addObstacle(x, z, width, depth) {
  obstacles.push({ x, z, width, depth });
}

function collides(x, z, radius = 0.5) {
  return obstacles.some(o =>
    Math.abs(x - o.x) < o.width / 2 + radius &&
    Math.abs(z - o.z) < o.depth / 2 + radius
  );
}

// =====================================
// MAISONS ET STRUCTURES
// =====================================

function createHouse(x, z, size = 1) {
  const w = 8 * size;
  const h = 4 * size;
  const d = 7 * size;

  box(x, h / 2, z, w, h, d, materials.wood);

  // Porte
  box(x, 1.2 * size, z + d / 2 + 0.02,
      1.5 * size, 2.4 * size, 0.15, materials.darkWood);

  // Toit
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(w * 0.78, 3.5 * size, 4),
    materials.roof
  );
  roof.position.set(x, h + 1.5 * size, z);
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 1.1;
  roof.castShadow = true;
  scene.add(roof);

  // Fenêtres
  for (const side of [-1, 1]) {
    box(
      x + side * w * 0.28,
      2.5 * size,
      z + d / 2 + 0.1,
      1.1 * size,
      0.9 * size,
      0.12,
      materials.yellow
    );
  }

  addObstacle(x, z, w, d);
}

function createWoodFort(x, z) {
  // Murs
  box(x, 1.5, z, 7, 3, 0.5, materials.wood);
  box(x - 3.25, 1.5, z + 3, 0.5, 3, 6, materials.wood);
  box(x + 3.25, 1.5, z + 3, 0.5, 3, 6, materials.wood);

  // Tour
  box(x, 3.3, z + 3, 1.5, 0.5, 1.5, materials.darkWood);

  // Rampes
  const ramp = box(x, 1.1, z - 2, 3, 0.3, 4, materials.darkWood);
  ramp.rotation.x = -0.45;

  addObstacle(x, z + 1, 7, 6);
}

function createCrate(x, z) {
  box(x, 0.8, z, 1.6, 1.6, 1.6, materials.wood);
  box(x, 0.8, z, 1.7, 0.15, 1.7, materials.darkWood);
  addObstacle(x, z, 1.6, 1.6);
}

function createTree(x, z) {
  cylinder(x, 2, z, 0.45, 4, materials.darkWood);

  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(2.4, 5, 7),
    new THREE.MeshStandardMaterial({ color: 0x237b32 })
  );
  leaves.position.set(x, 5.5, z);
  leaves.castShadow = true;
  scene.add(leaves);

  addObstacle(x, z, 1.2, 1.2);
}

function createRock(x, z, size = 1) {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(size, 0),
    materials.stone
  );
  rock.position.set(x, size * 0.6, z);
  rock.scale.y = 0.7;
  rock.castShadow = true;
  scene.add(rock);

  addObstacle(x, z, size * 1.8, size * 1.8);
}

// =====================================
// DÉCOR DE LA CARTE
// =====================================

// Maisons
createHouse(-18, -20, 1.1);
createHouse(24, -26, 0.9);
createHouse(-33, 23, 0.9);
createHouse(32, 30, 1.2);
createHouse(5, 40, 0.8);

// Forts
createWoodFort(18, 8);
createWoodFort(-25, -5);
createWoodFort(2, -35);

// Caisses
for (let i = 0; i < 30; i++) {
  const x = Math.random() * 100 - 50;
  const z = Math.random() * 100 - 50;
  if (!collides(x, z, 1)) createCrate(x, z);
}

// Arbres
for (let i = 0; i < 65; i++) {
  const x = Math.random() * 130 - 65;
  const z = Math.random() * 130 - 65;

  if (Math.hypot(x, z) > 9 && !collides(x, z, 1)) {
    createTree(x, z);
  }
}

// Rochers
for (let i = 0; i < 25; i++) {
  const x = Math.random() * 120 - 60;
  const z = Math.random() * 120 - 60;

  if (!collides(x, z, 1)) {
    createRock(x, z, 0.8 + Math.random());
  }
}

// =====================================
// PERSONNAGE PANTIN
// =====================================

const body = new THREE.Group();
player.add(body);

const torso = box(0, 1.8, 0, 0.85, 1.15, 0.45, materials.shirt, body);
const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.38, 16, 16),
  materials.skin
);
head.position.y = 2.7;
head.castShadow = true;
body.add(head);

// Yeux
for (const side of [-1, 1]) {
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 8, 8),
    materials.black
  );
  eye.position.set(side * 0.13, 2.75, 0.32);
  body.add(eye);
}

// Bras
function createLimb(x, y, length, material) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);
  body.add(pivot);

  const limb = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, length, 10),
    material
  );
  limb.position.y = -length / 2;
  limb.castShadow = true;
  pivot.add(limb);
  return pivot;
}

const leftArm = createLimb(-0.58, 2.2, 0.95, materials.shirt);
const rightArm = createLimb(0.58, 2.2, 0.95, materials.shirt);

const leftLeg = createLimb(-0.23, 1.2, 1.05, materials.pants);
const rightLeg = createLimb(0.23, 1.2, 1.05, materials.pants);

// =====================================
// ARMES VISIBLES
// =====================================

const weaponGroup = new THREE.Group();
body.add(weaponGroup);

function createGun(type) {
  const gun = new THREE.Group();

  const isShotgun = type === 2;

  const stock = box(
    0, 0, 0,
    isShotgun ? 0.22 : 0.18,
    0.2,
    isShotgun ? 1.15 : 1.05,
    materials.black,
    gun
  );

  stock.position.z = -0.2;

  box(
    0, 0.13, -0.3,
    isShotgun ? 0.13 : 0.09,
    0.12,
    isShotgun ? 0.95 : 0.9,
    materials.metal,
    gun
  );

  box(
    0, -0.16, 0.08,
    0.16, 0.36, 0.2,
    materials.black,
    gun
  );

  box(
    0, 0.02, -0.85,
    isShotgun ? 0.13 : 0.09,
    0.12,
    0.85,
    materials.metal,
    gun
  );

  if (isShotgun) {
    box(0.12, 0.1, -0.65, 0.12, 0.12, 0.85, materials.black, gun);
  } else {
    box(0, -0.23, -0.25, 0.1, 0.25, 0.12, materials.metal, gun);
  }

  gun.scale.setScalar(1.1);
  gun.position.set(0.7, 2, 0.2);
  gun.rotation.x = -0.08;

  return gun;
}

const assaultRifle = createGun(1);
const spas12 = createGun(2);

weaponGroup.add(assaultRifle);
weaponGroup.add(spas12);
spas12.visible = false;

// =====================================
// POSITION DU JOUEUR
// =====================================

player.position.set(0, 0, 10);

// =====================================
// CAMÉRA TROISIÈME PERSONNE
// =====================================

function updateCamera() {
  const distance = 7;
  const height = 3.2;

  const direction = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch)
  );

  const target = player.position.clone();
  target.y += height;

  camera.position.set(
    target.x - Math.sin(yaw) * distance,
    target.y + 1.5 - pitch * 2,
    target.z - Math.cos(yaw) * distance
  );

  camera.lookAt(
    target.x + direction.x * 8,
    target.y + direction.y * 8,
    target.z + direction.z * 8
  );
}

// =====================================
// ENNEMIS
// =====================================

function createEnemy(x, z) {
  const enemy = new THREE.Group();
  enemy.position.set(x, 0, z);

  const enemyBody = new THREE.Group();
  enemy.add(enemyBody);

  const redShirt = new THREE.MeshStandardMaterial({ color: 0xb52e29 });
  const bluePants = new THREE.MeshStandardMaterial({ color: 0x303c6b });

  box(0, 1.8, 0, 0.8, 1.1, 0.45, redShirt, enemyBody);

  const enemyHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.37, 12, 12),
    materials.skin
  );
  enemyHead.position.y = 2.7;
  enemyBody.add(enemyHead);

  const eLeft = createEnemyLimb(-0.24, 1.2, bluePants, enemyBody);
  const eRight = createEnemyLimb(0.24, 1.2, bluePants, enemyBody);

  enemy.userData = {
    hp: 100,
    maxHp: 100,
    attackTimer: 0,
    phase: Math.random() * 10,
    legs: [eLeft, eRight],
    body: enemyBody,
    dead: false
  };

  scene.add(enemy);
  enemies.push(enemy);

  const element = document.createElement("div");
  element.className = "enemy-health";
  element.innerHTML = `
    <div class="enemy-number">100 / 100</div>
    <div class="health-background">
      <div class="health-fill"></div>
    </div>
  `;

  document.getElementById("enemyBars").appendChild(element);
  enemyElements.push({ enemy, element });

  return enemy;
}

function createEnemyLimb(x, y, material, parent) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);
  parent.add(pivot);

  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 1, 8),
    material
  );
  mesh.position.y = -0.5;
  pivot.add(mesh);

  return pivot;
}

// Création des ennemis
createEnemy(-12, -12);
createEnemy(15, -17);
createEnemy(28, 12);
createEnemy(-30, 5);
createEnemy(5, 30);
createEnemy(-15, 35);
createEnemy(40, -5);

// =====================================
// BARRES DE VIE AU-DESSUS DES ENNEMIS
// =====================================

function updateEnemyBars() {
  for (const item of enemyElements) {
    const enemy = item.enemy;
    const element = item.element;

    if (enemy.userData.dead) {
      element.style.display = "none";
      continue;
    }

    const position = enemy.position.clone();
    position.y += 3.5;
    position.project(camera);

    const x = (position.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-position.y * 0.5 + 0.5) * window.innerHeight;

    const distance = camera.position.distanceTo(enemy.position);

    if (
      distance > 65 ||
      position.z > 1 ||
      x < 0 || x > window.innerWidth ||
      y < 0 || y > window.innerHeight
    ) {
      element.style.display = "none";
      continue;
    }

    element.style.display = "block";
    element.style.left = x + "px";
    element.style.top = y + "px";

    const hp = enemy.userData.hp;
    const percent = Math.max(0, hp / enemy.userData.maxHp * 100);

    element.querySelector(".enemy-number").textContent =
      hp + " / " + enemy.userData.maxHp;

    element.querySelector(".health-fill").style.width = percent + "%";
  }
}

// =====================================
// CHANGEMENT D'ARME
// =====================================

function selectWeapon(number) {
  if (number !== 1 && number !== 2) return;

  weapon = number;

  assaultRifle.visible = weapon === 1;
  spas12.visible = weapon === 2;

  document.getElementById("weaponName").textContent =
    weaponSettings[weapon].name;

  updateAmmo();
  showNotice(weapon === 1 ? "FUSIL D'ASSAUT" : "SPAS-12");
}

function updateAmmo() {
  document.getElementById("ammo").textContent =
    ammo[weapon] + " / " + weaponSettings[weapon].max;
}

// =====================================
// TIR
// =====================================

function shoot() {
  if (!playing || paused || gameOver || reloading) return;

  const now = performance.now();
  const settings = weaponSettings[weapon];

  if (now - lastShot < settings.delay) return;
  lastShot = now;

  if (ammo[weapon] <= 0) {
    showNotice("PLUS DE MUNITIONS ! APPUIE SUR R");
    return;
  }

  ammo[weapon]--;
  updateAmmo();

  raycaster.setFromCamera(center, camera);

  let hits = [];

  for (const enemy of enemies) {
    if (enemy.userData.dead) continue;

    const hitObjects = [];
    enemy.traverse(child => {
      if (child.isMesh) hitObjects.push(child);
    });

    const intersections = raycaster.intersectObjects(hitObjects, false);

    if (intersections.length > 0) {
      hits.push({
        enemy,
        distance: intersections[0].distance
      });
    }
  }

  hits.sort((a, b) => a.distance - b.distance);

  if (weapon === 1) {
    if (hits.length > 0) {
      damageEnemy(hits[0].enemy, settings.damage);
    }
  } else {
    // Le fusil à pompe peut toucher plusieurs ennemis proches
    for (const hit of hits) {
      if (hit.distance < 22) {
        const damage = Math.max(
          5,
          settings.damage - hit.distance * 0.45
        );
        damageEnemy(hit.enemy, damage);
      }
    }
  }

  // Petit effet de recul
  weaponGroup.position.z = 0.15;
  setTimeout(() => {
    weaponGroup.position.z = 0;
  }, 90);
}

// =====================================
// DÉGÂTS AUX ENNEMIS
// =====================================

function damageEnemy(enemy, damage) {
  if (enemy.userData.dead) return;

  enemy.userData.hp = Math.max(0, enemy.userData.hp - damage);

  enemy.userData.body.position.y = 0.12;
  setTimeout(() => {
    enemy.userData.body.position.y = 0;
  }, 100);

  if (enemy.userData.hp <= 0) {
    enemy.userData.dead = true;
    score++;

    document.getElementById("score").textContent = score;
    showNotice("ENNEMI ÉLIMINÉ !");

    const item = enemyElements.find(e => e.enemy === enemy);
    if (item) item.element.style.display = "none";

    scene.remove(enemy);

    setTimeout(() => {
      enemies = enemies.filter(e => e !== enemy);
      if (playing && !gameOver) {
        const x = Math.random() * 70 - 35;
        const z = Math.random() * 70 - 35;
        createEnemy(x, z);
      }
    }, 5000);
  }
}

// =====================================
// RECHARGEMENT
// =====================================

function reload() {
  if (!playing || paused || reloading) return;

  const max = weaponSettings[weapon].max;

  if (ammo[weapon] === max) return;

  reloading = true;
  showNotice("RECHARGEMENT...");

  setTimeout(() => {
    if (gameOver) {
      reloading = false;
      return;
    }

    ammo[weapon] = max;
    reloading = false;
    updateAmmo();
    showNotice("RECHARGÉ !");
  }, weapon === 1 ? 1500 : 1900);
}

// =====================================
// ENNEMIS QUI ATTAQUENT
// =====================================

function updateEnemies(delta, time) {
  for (const enemy of enemies) {
    if (enemy.userData.dead) continue;

    const distance = enemy.position.distanceTo(player.position);

    if (distance > 5 && distance < 45) {
      const direction = new THREE.Vector3()
        .subVectors(player.position, enemy.position)
        .setY(0)
        .normalize();

      const nextX = enemy.position.x + direction.x * delta * 1.8;
      const nextZ = enemy.position.z + direction.z * delta * 1.8;

      if (!collides(nextX, nextZ, 0.5)) {
        enemy.position.x = nextX;
        enemy.position.z = nextZ;
      }

      enemy.rotation.y = Math.atan2(direction.x, direction.z);
    }

    const walking = Math.sin(time * 7 + enemy.userData.phase) * 0.45;

    enemy.userData.legs[0].rotation.x = walking;
    enemy.userData.legs[1].rotation.x = -walking;

    enemy.userData.attackTimer -= delta;

    if (distance < 3 && enemy.userData.attackTimer <= 0) {
      enemy.userData.attackTimer = 1.2;
      takeDamage(10);
    }
  }
}

// =====================================
// DÉGÂTS AU JOUEUR
// =====================================

function takeDamage(amount) {
  if (gameOver) return;

  health = Math.max(0, health - amount);
  document.getElementById("health").textContent = health;

  showNotice("TU AS REÇU DES DÉGÂTS !");

  if (health <= 0) {
    endGame();
  }
}

// =====================================
// MOUVEMENT DU JOUEUR
// =====================================

function updatePlayer(delta, time) {
  if (!playing || paused || gameOver) return;

  let forward = 0;
  let side = 0;

  if (keys["w"] || keys["z"] || move.forward) forward++;
  if (keys["s"] || move.back) forward--;
  if (keys["d"] || move.right) side++;
  if (keys["a"] || keys["q"] || move.left) side--;

  const gamepad = getGamepad();

  if (gamepad) {
    forward += -gamepad.axes[1];
    side += gamepad.axes[0];

    if (gamepad.buttons[0]?.pressed) jump();
    if (gamepad.buttons[7]?.pressed) move.run = true;
    else move.run = false;
  }

  const length = Math.hypot(forward, side);

  if (length > 1) {
    forward /= length;
    side /= length;
  }

  const speed = (move.run || keys["shift"]) ? 12 : 7;

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
    player.position.x, -94, 94
  );

  player.position.z = THREE.MathUtils.clamp(
    player.position.z, -94, 94
  );

  // Orientation du pantin
  player.rotation.y = yaw;

  // Animation des jambes
  if (length > 0.1) {
    const walk = Math.sin(time * (move.run ? 13 : 9)) * 0.65;
    leftLeg.rotation.x = walk;
    rightLeg.rotation.x = -walk;
    leftArm.rotation.x = -walk * 0.7;
    rightArm.rotation.x = walk * 0.7;
  } else {
    leftLeg.rotation.x *= 0.8;
    rightLeg.rotation.x *= 0.8;
    leftArm.rotation.x *= 0.8;
    rightArm.rotation.x *= 0.8;
  }

  // Gravité et saut
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

// =====================================
// SAUT
// =====================================

function jump() {
  if (!playing || paused || !grounded) return;

  verticalSpeed = 8;
  grounded = false;
}

// =====================================
// GAMEPAD XBOX
// =====================================

function getGamepad() {
  const pads = navigator.getGamepads?.() || [];
  return pads.find(p => p && p.connected);
}

function updateGamepadActions() {
  const pad = getGamepad();
  if (!pad || !playing || paused) return;

  // Bouton X : recharger
  if (pad.buttons[2]?.pressed && !keys.gamepadReload) {
    reload();
  }
  keys.gamepadReload = !!pad.buttons[2]?.pressed;

  // Gâchette droite : tirer
  if (pad.buttons[7]?.pressed && !keys.gamepadShoot) {
    shoot();
  }
  keys.gamepadShoot = !!pad.buttons[7]?.pressed;

  // Bouton Y : arme 1
  if (pad.buttons[3]?.pressed && !keys.gamepad1) {
    selectWeapon(1);
  }
  keys.gamepad1 = !!pad.buttons[3]?.pressed;

  // Bouton B : arme 2
  if (pad.buttons[1]?.pressed && !keys.gamepad2) {
    selectWeapon(2);
  }
  keys.gamepad2 = !!pad.buttons[1]?.pressed;

  // Bouton Start : pause
  if (pad.buttons[9]?.pressed && !keys.gamepadPause) {
    togglePause();
  }
  keys.gamepadPause = !!pad.buttons[9]?.pressed;
}

// =====================================
// COMMANDES CLAVIER
// =====================================

window.addEventListener("keydown", event => {
  keys[event.key.toLowerCase()] = true;

  if (event.code === "Space") {
    event.preventDefault();
    jump();
  }

  if (event.key === "1") selectWeapon(1);
  if (event.key === "2") selectWeapon(2);
  if (event.key.toLowerCase() === "r") reload();
  if (event.key.toLowerCase() === "f") interact();
  if (event.key === "Escape") togglePause();
});

window.addEventListener("keyup", event => {
  keys[event.key.toLowerCase()] = false;
});

// =====================================
// SOURIS : VISÉE ET TIR
// =====================================

renderer.domElement.addEventListener("click", () => {
  if (!playing || paused) return;
  if (document.pointerLockElement !== renderer.domElement) {
    renderer.domElement.requestPointerLock?.();
  }
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

renderer.domElement.addEventListener("mousedown", event => {
  if (event.button === 0) shoot();
});

renderer.domElement.addEventListener("contextmenu", event => {
  event.preventDefault();
});

// =====================================
// VISÉE SUR MOBILE
// =====================================

let touchLook = null;

renderer.domElement.addEventListener("touchstart", event => {
  if (!playing || paused) return;
  const touch = event.changedTouches[0];

  if (touch.clientX > window.innerWidth * 0.35) {
    touchLook = { x: touch.clientX, y: touch.clientY };
  }
}, { passive: true });

renderer.domElement.addEventListener("touchmove", event => {
  if (!touchLook || !playing || paused) return;

  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchLook.x;
  const dy = touch.clientY - touchLook.y;

  yaw -= dx * 0.006;
  pitch -= dy * 0.004;
  pitch = THREE.MathUtils.clamp(pitch, -0.8, 0.45);

  touchLook = { x: touch.clientX, y: touch.clientY };
  updateCamera();
}, { passive: true });

renderer.domElement.addEventListener("touchend", () => {
  touchLook = null;
});

// =====================================
// COMMANDES TACTILES
// =====================================

document.querySelectorAll("[data-move]").forEach(button => {
  const direction = button.dataset.move;

  const start = event => {
    event.preventDefault();
    move[direction] = true;
  };

  const stop = event => {
    event.preventDefault();
    move[direction] = false;
  };

  button.addEventListener("pointerdown", start);
  button.addEventListener("pointerup", stop);
  button.addEventListener("pointerleave", stop);
  button.addEventListener("pointercancel", stop);
});

function holdButton(id, callback) {
  const button = document.getElementById(id);
  button.addEventListener("pointerdown", event => {
    event.preventDefault();
    callback();
  });
}

holdButton("mobileJump", jump);
holdButton("mobileShoot", shoot);
holdButton("mobileReload", reload);
holdButton("mobileWeapon1", () => selectWeapon(1));
holdButton("mobileWeapon2", () => selectWeapon(2));

const runButton = document.getElementById("mobileRun");
runButton.addEventListener("pointerdown", () => move.run = true);
runButton.addEventListener("pointerup", () => move.run = false);
runButton.addEventListener("pointerleave", () => move.run = false);
runButton.addEventListener("pointercancel", () => move.run = false);

// =====================================
// INTERACTION
// =====================================

function interact() {
  if (!playing || paused) return;
  showNotice("AUCUN OBJET À UTILISER");
}

// =====================================
// MESSAGES
// =====================================

let noticeTimer;

function showNotice(message) {
  const notice = document.getElementById("notice");
  notice.textContent = message;

  clearTimeout(noticeTimer);

  noticeTimer = setTimeout(() => {
    notice.textContent = "";
  }, 1500);
}

// =====================================
// PAUSE
// =====================================

function togglePause() {
  if (!playing || gameOver) return;

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

// =====================================
// FIN DE PARTIE
// =====================================

function endGame() {
  gameOver = true;
  playing = false;

  document.getElementById("finalScore").textContent =
    "Éliminations : " + score;

  document.getElementById("gameOver").style.display = "flex";
  document.exitPointerLock?.();
}

// =====================================
// DÉMARRER LE JEU
// =====================================

function startGame() {
  if (playing) return;

  playing = true;
  paused = false;

  document.getElementById("menu").style.display = "none";
  document.getElementById("pause").style.display = "none";
  document.getElementById("gameOver").style.display = "none";
  document.getElementById("loading").style.display = "none";

  updateCamera();

  if (window.matchMedia("(pointer: fine)").matches) {
    renderer.domElement.requestPointerLock?.();
  }
}

document.getElementById("playButton").addEventListener("click", startGame);

// =====================================
// BOUCLE DU JEU
// =====================================

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  if (playing && !paused && !gameOver) {
    updatePlayer(delta, time);
    updateEnemies(delta, time);
    updateEnemyBars();
    updateGamepadActions();
  }

  renderer.render(scene, camera);
}

// =====================================
// REDIMENSIONNEMENT
// =====================================

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// =====================================
// INITIALISATION
// =====================================

selectWeapon(1);
updateAmmo();
updateCamera();

document.getElementById("loading").style.display = "none";

console.log("COMBAT 3D : SCRIPT JAVASCRIPT CHARGÉ");

animate();
