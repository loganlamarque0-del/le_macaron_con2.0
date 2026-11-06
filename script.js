
"use strict";

// Éléments de la page
const $ = id => document.getElementById(id);

let scene, camera, renderer, clock;
let player, playerGun;
let enemies = [];
let enemyBullets = [];
let lootItems = [];

let health = 100;
let ammo = 150;
let kills = 0;

let playing = false;
let paused = false;
let dead = false;
let yaw = 0;
let pitch = 0;
let verticalSpeed = 0;
let onGround = true;
let shootCooldown = 0;
let messageTimer = 0;
let gamepadShootCooldown = 0;

const keys = {};
const mobileKeys = {};
const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);

// ---------- OUTILS ----------

function material(color) {
  return new THREE.MeshStandardMaterial({ color });
}

function box(x, y, z, sx, sy, sz, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    material(color)
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function showMessage(text) {
  $("message").textContent = text;
  messageTimer = 2.5;
}

function updateHUD() {
  $("health").textContent = Math.max(0, Math.ceil(health));
  $("ammo").textContent = ammo;
  $("kills").textContent = kills;
}

// ---------- CARTE ----------

function createWorld() {
  scene.background = new THREE.Color(0x87c9ed);
  scene.fog = new THREE.Fog(0x87c9ed, 45, 150);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x506040, 1.5));

  const sun = new THREE.DirectionalLight(0xffffff, 1.3);
  sun.position.set(25, 50, 20);
  sun.castShadow = true;
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 180),
    material(0x54864a)
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Routes
  box(0, 0.03, 0, 16, 0.04, 180, 0x777777);
  box(0, 0.04, 0, 180, 0.04, 16, 0x777777);

  // Maisons
  for (let i = 0; i < 12; i++) {
    const x = (Math.random() - 0.5) * 125;
    const z = (Math.random() - 0.5) * 125;

    if (Math.abs(x) < 17 && Math.abs(z) < 17) continue;

    const w = 7 + Math.random() * 5;
    const d = 7 + Math.random() * 5;
    const h = 4 + Math.random() * 3;

    box(x, h / 2, z, w, h, d, 0xb68a60);
    box(x, h + 1, z, w + 1, 2, d + 1, 0x703d2a);
  }

  // Caisses et rochers
  for (let i = 0; i < 35; i++) {
    const x = (Math.random() - 0.5) * 130;
    const z = (Math.random() - 0.5) * 130;

    if (Math.abs(x) < 12 && Math.abs(z) < 12) continue;

    const size = 1 + Math.random() * 2;
    box(
      x, size / 2, z,
      size, size, size,
      Math.random() > 0.5 ? 0x76502e : 0x777777
    );
  }

  // Arbres
  for (let i = 0; i < 45; i++) {
    const x = (Math.random() - 0.5) * 145;
    const z = (Math.random() - 0.5) * 145;

    if (Math.abs(x) < 13 && Math.abs(z) < 13) continue;

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.5, 3, 8),
      material(0x684225)
    );
    trunk.position.set(x, 1.5, z);
    scene.add(trunk);

    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(2, 8, 8),
      material(0x236b35)
    );
    leaves.position.set(x, 4, z);
    scene.add(leaves);
  }
}

// ---------- ARMES ----------

function createGun() {
  const gun = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 1.2),
    material(0x171717)
  );
  body.position.z = -0.35;
  gun.add(body);

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.6, 8),
    material(0x080808)
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = -1.15;
  gun.add(barrel);

  return gun;
}

// ---------- JOUEUR ----------

function createPlayer() {
  player = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.3, 0.5),
    material(0x2468c9)
  );
  body.position.y = 1.35;
  player.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 16, 12),
    material(0xffc99b)
  );
  head.position.y = 2.25;
  player.add(head);

  const legsMaterial = material(0x303c55);

  const leg1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.9, 0.35),
    legsMaterial
  );
  leg1.position.set(-0.23, 0.45, 0);
  player.add(leg1);

  const leg2 = leg1.clone();
  leg2.position.x = 0.23;
  player.add(leg2);

  playerGun = createGun();
  playerGun.position.set(0.55, 1.55, -0.15);
  player.add(playerGun);

  player.position.set(0, 0, 8);
  scene.add(player);
}

// ---------- BOTS ----------

function createEnemy(x, z) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.3, 0.5),
    material(0xb52b2b)
  );
  body.position.y = 1.35;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 12, 10),
    material(0xe6b58f)
  );
  head.position.y = 2.25;
  group.add(head);

  const legsMaterial = material(0x343434);

  const leg1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.9, 0.3),
    legsMaterial
  );
  leg1.position.set(-0.22, 0.45, 0);
  group.add(leg1);

  const leg2 = leg1.clone();
  leg2.position.x = 0.22;
  group.add(leg2);

  // Fusil d'assaut visible
  const gun = createGun();
  gun.position.set(0.55, 1.55, -0.2);
  group.add(gun);

  // Barre de vie
  const bar = new THREE.Group();

  const background = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.13),
    new THREE.MeshBasicMaterial({ color: 0x222222 })
  );

  const foreground = new THREE.Mesh(
    new THREE.PlaneGeometry(1.16, 0.09),
    new THREE.MeshBasicMaterial({ color: 0x22dd55 })
  );

  foreground.position.z = 0.01;
  bar.add(background, foreground);
  bar.position.y = 3;
  group.add(bar);

  group.position.set(x, 0, z);
  scene.add(group);

  enemies.push({
    group,
    barFront: foreground,
    hp: 100,
    shootTimer: 1 + Math.random() * 1.5,
    speed: 1.5 + Math.random(),
    alive: true
  });
}

function createEnemies() {
  for (let i = 0; i < 9; i++) {
    let x, z;

    do {
      x = (Math.random() - 0.5) * 90;
      z = (Math.random() - 0.5) * 90;
    } while (Math.hypot(x, z - 8) < 22);

    createEnemy(x, z);
  }
}

// ---------- RÉCOMPENSES ----------

function createLoot(position, type) {
  const color = type === "health" ? 0x22dd55 : 0xffd21f;

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.8, 0.8),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.25
    })
  );

  mesh.position.copy(position);
  mesh.position.y = 0.6;
  scene.add(mesh);

  lootItems.push({ mesh, type });
}

function killEnemy(enemy) {
  enemy.alive = false;
  const position = enemy.group.position.clone();
  scene.remove(enemy.group);

  kills++;

  const type = Math.random() < 0.5 ? "health" : "ammo";
  createLoot(position, type);

  showMessage(
    type === "health"
      ? "Bot éliminé : soins disponibles !"
      : "Bot éliminé : munitions disponibles !"
  );

  updateHUD();
}

// ---------- TIR DU JOUEUR ----------

function shoot() {
  if (!playing || paused || dead || shootCooldown > 0) return;

  if (ammo <= 0) {
    showMessage("Tu n'as plus de balles !");
    return;
  }

  ammo--;
  shootCooldown = 0.18;
  updateHUD();

  raycaster.setFromCamera(center, camera);

  const targets = enemies
    .filter(enemy => enemy.alive)
    .map(enemy => enemy.group);

  const hits = raycaster.intersectObjects(targets, true);

  if (hits.length > 0 && hits[0].distance < 65) {
    let object = hits[0].object;

    while (
      object.parent &&
      !enemies.some(enemy => enemy.group === object)
    ) {
      object = object.parent;
    }

    const enemy = enemies.find(e => e.group === object);

    if (enemy && enemy.alive) {
      enemy.hp -= 25;

      const ratio = Math.max(0, enemy.hp / 100);
      enemy.barFront.scale.x = ratio;
      enemy.barFront.position.x = -0.58 * (1 - ratio);

      if (enemy.hp <= 0) {
        killEnemy(enemy);
      }
    }
  }
}

// ---------- TIR DES BOTS ----------

function enemyShoot(enemy) {
  const start = enemy.group.position.clone();
  start.y += 1.55;

  const target = player.position.clone();
  target.y += 1.2;

  const direction = target.sub(start).normalize();

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff3333 })
  );

  mesh.position.copy(start);
  scene.add(mesh);

  enemyBullets.push({
    mesh,
    velocity: direction.multiplyScalar(24),
    life: 3
  });
}

function updateEnemies(delta) {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;

    const dx = player.position.x - enemy.group.position.x;
    const dz = player.position.z - enemy.group.position.z;
    const distance = Math.hypot(dx, dz);

    enemy.group.rotation.y = Math.atan2(-dx, -dz);

    if (distance > 10 && distance < 65) {
      enemy.group.position.x += dx / distance * enemy.speed * delta;
      enemy.group.position.z += dz / distance * enemy.speed * delta;
    }

    enemy.shootTimer -= delta;

    if (distance < 55 && enemy.shootTimer <= 0) {
      enemyShoot(enemy);
      enemy.shootTimer = 1.1 + Math.random() * 1.2;
    }
  }
}

function updateEnemyBullets(delta) {
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const bullet = enemyBullets[i];

    bullet.mesh.position.addScaledVector(bullet.velocity, delta);
    bullet.life -= delta;

    const target = player.position.clone();
    target.y += 1.2;

    if (bullet.mesh.position.distanceTo(target) < 1.1) {
      health -= 10;

      scene.remove(bullet.mesh);
      enemyBullets.splice(i, 1);

      showMessage("Tu as été touché ! -10 vie");
      updateHUD();

      if (health <= 0) endGame();
      continue;
    }

    if (bullet.life <= 0) {
      scene.remove(bullet.mesh);
      enemyBullets.splice(i, 1);
    }
  }
}

// ---------- RAMASSER LES OBJETS ----------

function updateLoot(delta) {
  for (let i = lootItems.length - 1; i >= 0; i--) {
    const loot = lootItems[i];

    loot.mesh.rotation.y += delta * 1.8;
    loot.mesh.position.y =
      0.6 + Math.sin(performance.now() * 0.003) * 0.15;

    if (loot.mesh.position.distanceTo(player.position) < 2.2) {
      if (loot.type === "health") {
        if (health >= 100) {
          showMessage("Ta vie est déjà au maximum !");
          continue;
        }

        health = Math.min(100, health + 35);
        showMessage("+35 points de vie !");
      } else {
        ammo += 30;
        showMessage("+30 balles !");
      }

      scene.remove(loot.mesh);
      lootItems.splice(i, 1);
      updateHUD();
    }
  }
}

// ---------- DÉPLACEMENT ----------

function updatePlayer(delta) {
  const forward =
    keys["w"] || keys["z"] || mobileKeys.forward;

  const backward =
    keys["s"] || mobileKeys.back;

  // Touches inversées comme demandé :
  // D = gauche et A = droite
  const left =
    keys["d"] || mobileKeys.left;

  const right =
    keys["a"] || mobileKeys.right;

  const direction = new THREE.Vector3();

  if (forward) direction.z -= 1;
  if (backward) direction.z += 1;
  if (left) direction.x -= 1;
  if (right) direction.x += 1;

  const speed = keys["shift"] ? 13 : 8;

  if (direction.lengthSq() > 0) {
    direction.normalize();
    direction.applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      yaw
    );

    player.position.x += direction.x * speed * delta;
    player.position.z += direction.z * speed * delta;
  }

  player.position.x = THREE.MathUtils.clamp(
    player.position.x, -85, 85
  );

  player.position.z = THREE.MathUtils.clamp(
    player.position.z, -85, 85
  );

  // Saut
  if (keys[" "] && onGround) {
    verticalSpeed = 8;
    onGround = false;
  }

  if (!onGround) {
    player.position.y += verticalSpeed * delta;
    verticalSpeed -= 20 * delta;

    if (player.position.y <= 0) {
      player.position.y = 0;
      verticalSpeed = 0;
      onGround = true;
    }
  }

  player.rotation.y = yaw;

  // Caméra derrière le personnage
  const offset = new THREE.Vector3(0, 4.2, 8);
  offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

  camera.position.copy(player.position).add(offset);

  camera.lookAt(
    player.position.x,
    player.position.y + 1.5 + pitch * 5,
    player.position.z
  );
}

// ---------- MANETTE XBOX ----------

function updateGamepad(delta) {
  const pads = navigator.getGamepads
    ? navigator.getGamepads()
    : [];

  const pad = pads[0];
  if (!pad) return;

  const deadZone = 0.2;
  const x = Math.abs(pad.axes[0]) > deadZone ? pad.axes[0] : 0;
  const y = Math.abs(pad.axes[1]) > deadZone ? pad.axes[1] : 0;

  // Stick gauche
  if (x !== 0 || y !== 0) {
    const direction = new THREE.Vector3(x, 0, y);
    direction.applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      yaw
    );

    player.position.x += direction.x * 8 * delta;
    player.position.z += direction.z * 8 * delta;
  }

  // Gâchette droite : tirer
  gamepadShootCooldown -= delta;

  if (
    pad.buttons[7] &&
    pad.buttons[7].value > 0.5 &&
    gamepadShootCooldown <= 0
  ) {
    shoot();
    gamepadShootCooldown = 0.18;
  }

  // Bouton A : sauter
  if (pad.buttons[0] && pad.buttons[0].pressed && onGround) {
    verticalSpeed = 8;
    onGround = false;
  }
}

// ---------- FIN DE PARTIE ET PAUSE ----------

function endGame() {
  dead = true;
  playing = false;

  document.exitPointerLock?.();

  $("finalKills").textContent = kills;
  $("gameOver").style.display = "flex";
  $("crosshair").style.display = "none";
  $("mobileControls").style.display = "none";
}

function togglePause() {
  if (!playing || dead) return;

  paused = !paused;

  $("pauseScreen").style.display = paused ? "flex" : "none";

  if (paused) {
    document.exitPointerLock?.();
  } else {
    renderer.domElement.requestPointerLock?.();
  }
}

// ---------- CAMÉRA ET INITIALISATION ----------

function onResize() {
  if (!camera || !renderer) return;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function init() {
  if (renderer) return;

  if (typeof THREE === "undefined") {
    throw new Error("Three.js n'a pas été chargé. Vérifie ta connexion Internet.");
  }

  scene = new THREE.Scene();
  clock = new THREE.Clock();

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    300
  );

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  document.body.appendChild(renderer.domElement);

  createWorld();
  createPlayer();

  camera.position.set(0, 5, 13);
  camera.lookAt(0, 1, 0);

  window.addEventListener("resize", onResize);

  renderer.domElement.addEventListener("mousedown", event => {
    if (event.button === 0 && playing && !paused) {
      shoot();
    }
  });

  document.addEventListener("mousemove", event => {
    if (
      !playing ||
      paused ||
      document.pointerLockElement !== renderer.domElement
    ) return;

    yaw -= event.movementX * 0.0025;
    pitch -= event.movementY * 0.002;
    pitch = THREE.MathUtils.clamp(pitch, -0.45, 0.55);
  });

  animate();
}

// ---------- DÉMARRER ----------

function startGame() {
  try {
    if (!renderer) init();

    health = 100;
    ammo = 150;
    kills = 0;

    dead = false;
    paused = false;
    playing = true;

    yaw = 0;
    pitch = 0;
    verticalSpeed = 0;
    onGround = true;
    shootCooldown = 0;

    enemies.forEach(e => scene.remove(e.group));
    enemyBullets.forEach(b => scene.remove(b.mesh));
    lootItems.forEach(l => scene.remove(l.mesh));

    enemies = [];
    enemyBullets = [];
    lootItems = [];

    player.position.set(0, 0, 8);
    player.rotation.y = 0;

    createEnemies();
    updateHUD();

    $("menu").style.display = "none";
    $("pauseScreen").style.display = "none";
    $("gameOver").style.display = "none";
    $("hud").style.display = "flex";
    $("crosshair").style.display = "block";

    $("mobileControls").style.display =
      matchMedia("(pointer: coarse)").matches ? "flex" : "none";

    $("loadMessage").textContent = "Le jeu est prêt !";

    clock.start();

    renderer.domElement.requestPointerLock?.();
  } catch (error) {
    console.error("Erreur au démarrage du jeu :", error);
    $("loadMessage").textContent =
      "Erreur : " + error.message;
    $("menu").style.display = "flex";
  }
}

// ---------- BOUCLE DU JEU ----------

function animate() {
  requestAnimationFrame(animate);

  if (!renderer) return;

  const delta = Math.min(clock.getDelta(), 0.05);

  if (playing && !paused && !dead) {
    shootCooldown = Math.max(0, shootCooldown - delta);

    messageTimer -= delta;
    if (messageTimer <= 0) {
      $("message").textContent = "";
    }

    updatePlayer(delta);
    updateGamepad(delta);
    updateEnemies(delta);
    updateEnemyBullets(delta);
    updateLoot(delta);
  }

  renderer.render(scene, camera);
}

// ---------- CLAVIER ----------

document.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();
  keys[key] = true;

  if (key === " " && playing) {
    event.preventDefault();
  }

  if (key === "escape" && !event.repeat) {
    togglePause();
  }
});

document.addEventListener("keyup", event => {
  keys[event.key.toLowerCase()] = false;
});

// ---------- COMMANDES MOBILES ----------

document.querySelectorAll("[data-move]").forEach(button => {
  const direction = button.dataset.move;

  button.addEventListener("pointerdown", event => {
    event.preventDefault();
    mobileKeys[direction] = true;
  });

  ["pointerup", "pointerleave", "pointercancel"].forEach(name => {
    button.addEventListener(name, () => {
      mobileKeys[direction] = false;
    });
  });
});

$("mobileShoot").addEventListener("pointerdown", event => {
  event.preventDefault();
  shoot();
});

$("mobileJump").addEventListener("pointerdown", event => {
  event.preventDefault();

  if (playing && onGround) {
    verticalSpeed = 8;
    onGround = false;
  }
});

// ---------- BOUTONS ----------

$("playButton").addEventListener("click", startGame);
$("restartButton").addEventListener("click", startGame);

$("resumeButton").addEventListener("click", () => {
  if (paused) togglePause();
});

$("pauseMenuButton").addEventListener("click", () => {
  playing = false;
  paused = false;

  document.exitPointerLock?.();

  $("pauseScreen").style.display = "none";
  $("hud").style.display = "none";
  $("crosshair").style.display = "none";
  $("mobileControls").style.display = "none";
  $("menu").style.display = "flex";
});

// Vérification du chargement de Three.js
window.addEventListener("load", () => {
  if (typeof THREE === "undefined") {
    $("loadMessage").textContent =
      "Three.js ne charge pas. Vérifie ta connexion Internet.";
  } else {
    $("loadMessage").textContent = "Jeu chargé ! Clique sur JOUER.";
  }
});
