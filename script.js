
"use strict";

const healthText = document.getElementById("health");
const ammoText = document.getElementById("ammo");
const killsText = document.getElementById("kills");
const messageText = document.getElementById("message");

let scene, camera, renderer, clock;
let player, playerGun;
let enemies = [];
let enemyBullets = [];
let playerBullets = [];
let lootItems = [];
let obstacles = [];

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
let reloadTimer = 0;

const keys = {};
const mobileKeys = {};
const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);

function makeMaterial(color) {
  return new THREE.MeshStandardMaterial({ color });
}

function addBox(x, y, z, sx, sy, sz, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    makeMaterial(color)
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function createWorld() {
  scene.background = new THREE.Color(0x87c9ed);
  scene.fog = new THREE.Fog(0x87c9ed, 45, 150);

  const light = new THREE.HemisphereLight(0xffffff, 0x506040, 1.5);
  scene.add(light);

  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(25, 50, 20);
  sun.castShadow = true;
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 180),
    makeMaterial(0x54864a)
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Routes
  addBox(0, 0.02, 0, 16, 0.04, 180, 0x777777);
  addBox(0, 0.03, 0, 180, 0.04, 16, 0x777777);

  // Maisons et obstacles
  for (let i = 0; i < 12; i++) {
    const x = (Math.random() - 0.5) * 125;
    const z = (Math.random() - 0.5) * 125;

    if (Math.abs(x) < 16 && Math.abs(z) < 16) continue;

    const width = 7 + Math.random() * 5;
    const height = 4 + Math.random() * 3;
    const depth = 7 + Math.random() * 5;

    addBox(x, height / 2, z, width, height, depth, 0xb68a60);
    addBox(x, height + 1, z, width + 1, 2, depth + 1, 0x703d2a);

    obstacles.push({
      x, z,
      radius: Math.max(width, depth) * 0.55
    });
  }

  // Caisses et rochers
  for (let i = 0; i < 35; i++) {
    const x = (Math.random() - 0.5) * 130;
    const z = (Math.random() - 0.5) * 130;

    if (Math.abs(x) < 12 && Math.abs(z) < 12) continue;

    const size = 1 + Math.random() * 2;
    const color = Math.random() > 0.5 ? 0x76502e : 0x777777;
    addBox(x, size / 2, z, size, size, size, color);
    obstacles.push({ x, z, radius: size });
  }

  // Arbres
  for (let i = 0; i < 45; i++) {
    const x = (Math.random() - 0.5) * 145;
    const z = (Math.random() - 0.5) * 145;

    if (Math.abs(x) < 13 && Math.abs(z) < 13) continue;

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.5, 3, 8),
      makeMaterial(0x684225)
    );
    trunk.position.set(x, 1.5, z);
    scene.add(trunk);

    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(2, 8, 8),
      makeMaterial(0x236b35)
    );
    leaves.position.set(x, 4, z);
    scene.add(leaves);

    obstacles.push({ x, z, radius: 1.2 });
  }
}

function createPlayer() {
  player = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.3, 0.5),
    makeMaterial(0x2468c9)
  );
  body.position.y = 1.35;
  player.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 16, 12),
    makeMaterial(0xffc99b)
  );
  head.position.y = 2.25;
  player.add(head);

  const legs = makeMaterial(0x303c55);
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.9, 0.35), legs);
  leftLeg.position.set(-0.23, 0.45, 0);
  player.add(leftLeg);

  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.23;
  player.add(rightLeg);

  // Fusil visible dans les mains du personnage
  playerGun = new THREE.Group();

  const gunBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.18, 1.15),
    makeMaterial(0x222222)
  );
  gunBody.position.z = -0.45;
  playerGun.add(gunBody);

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.55, 8),
    makeMaterial(0x111111)
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = -1.15;
  playerGun.add(barrel);

  playerGun.position.set(0.55, 1.55, -0.15);
  player.add(playerGun);

  player.position.set(0, 0, 8);
  scene.add(player);
}

function createEnemy(x, z) {
  const enemy = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.3, 0.5),
    makeMaterial(0xb52b2b)
  );
  body.position.y = 1.35;
  enemy.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 12, 10),
    makeMaterial(0xe6b58f)
  );
  head.position.y = 2.25;
  enemy.add(head);

  const legs = makeMaterial(0x343434);
  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), legs);
  leg1.position.set(-0.22, 0.45, 0);
  enemy.add(leg1);

  const leg2 = leg1.clone();
  leg2.position.x = 0.22;
  enemy.add(leg2);

  // Fusil d'assaut du bot
  const gun = new THREE.Group();

  const gunBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 1.2),
    makeMaterial(0x171717)
  );
  gunBody.position.z = -0.35;
  gun.add(gunBody);

  const gunBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.6, 8),
    makeMaterial(0x080808)
  );
  gunBarrel.rotation.x = Math.PI / 2;
  gunBarrel.position.z = -1.15;
  gun.add(gunBarrel);

  gun.position.set(0.55, 1.55, -0.2);
  enemy.add(gun);

  // Barre de vie au-dessus du bot
  const barGroup = new THREE.Group();
  const barBack = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.13),
    new THREE.MeshBasicMaterial({ color: 0x222222 })
  );
  const barFront = new THREE.Mesh(
    new THREE.PlaneGeometry(1.16, 0.09),
    new THREE.MeshBasicMaterial({ color: 0x22dd55 })
  );
  barFront.position.z = 0.01;
  barGroup.add(barBack, barFront);
  barGroup.position.y = 3;
  enemy.add(barGroup);

  enemy.position.set(x, 0, z);
  scene.add(enemy);

  enemies.push({
    group: enemy,
    barFront,
    hp: 100,
    maxHp: 100,
    shootTimer: 0.8 + Math.random() * 1.5,
    speed: 1.5 + Math.random() * 0.8,
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

function createLoot(position, type) {
  const color = type === "health" ? 0x22dd55 : 0xffd21f;

  const loot = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.8, 0.8),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.25
    })
  );

  loot.position.copy(position);
  loot.position.y = 0.6;
  scene.add(loot);

  lootItems.push({ mesh: loot, type });
}

function killEnemy(enemy) {
  enemy.alive = false;
  scene.remove(enemy.group);

  kills++;
  killsText.textContent = kills;

  // Chaque bot laisse tomber des soins OU des munitions
  const type = Math.random() < 0.5 ? "health" : "ammo";
  createLoot(enemy.group.position, type);

  showMessage(type === "health"
    ? "Bot éliminé : trousse de soins !"
    : "Bot éliminé : munitions !");
}

function showMessage(text) {
  messageText.textContent = text;
  messageTimer = 2.5;
}

function updateHUD() {
  healthText.textContent = Math.max(0, Math.ceil(health));
  ammoText.textContent = ammo;
  killsText.textContent = kills;
}

function setupCamera() {
  camera.position.set(0, 5, 13);
}

function startGame() {
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
  reloadTimer = 0;

  enemies.forEach(e => scene.remove(e.group));
  enemyBullets.forEach(b => scene.remove(b.mesh));
  playerBullets.forEach(b => scene.remove(b.mesh));
  lootItems.forEach(l => scene.remove(l.mesh));

  enemies = [];
  enemyBullets = [];
  playerBullets = [];
  lootItems = [];

  player.position.set(0, 0, 8);
  player.rotation.y = 0;

  createEnemies();
  updateHUD();

  document.getElementById("menu").style.display = "none";
  document.getElementById("pauseScreen").style.display = "none";
  document.getElementById("gameOver").style.display = "none";
  document.getElementById("hud").style.display = "flex";
  document.getElementById("crosshair").style.display = "block";

  if (matchMedia("(pointer: coarse)").matches) {
    document.getElementById("mobileControls").style.display = "flex";
  }

  clock.start();
  renderer.domElement.requestPointerLock?.();
}

function init() {
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
  setupCamera();

  window.addEventListener("resize", onResize);
  renderer.domElement.addEventListener("mousedown", event => {
    if (event.button === 0 && playing && !paused) shoot();
  });

  document.addEventListener("mousemove", event => {
    if (!playing || paused || document.pointerLockElement !== renderer.domElement) return;
    yaw -= event.movementX * 0.0025;
    pitch -= event.movementY * 0.002;
    pitch = Math.max(-0.45, Math.min(0.55, pitch));
  });

  animate();
}

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function shoot() {
  if (!playing || paused || dead || reloadTimer > 0 || shootCooldown > 0) return;

  if (ammo <= 0) {
    showMessage("Plus de balles ! Appuie sur R pour recharger.");
    return;
  }

  ammo--;
  shootCooldown = 0.18;
  updateHUD();

  raycaster.setFromCamera(center, camera);
  const targets = enemies.filter(e => e.alive).map(e => e.group);
  const hits = raycaster.intersectObjects(targets, true);

  if (hits.length > 0 && hits[0].distance < 65) {
    let target = hits[0].object;
    while (target.parent && !enemies.some(e => e.group === target)) {
      target = target.parent;
    }

    const enemy = enemies.find(e => e.group === target);
    if (enemy && enemy.alive) {
      enemy.hp -= 25;
      enemy.barFront.scale.x = Math.max(0, enemy.hp / enemy.maxHp);
      enemy.barFront.position.x = -0.58 * (1 - enemy.hp / enemy.maxHp);

      if (enemy.hp <= 0) killEnemy(enemy);
    }
  }
}

function reload() {
  if (!playing || paused || ammo <= 0 || reloadTimer > 0) return;
  // Les 150 balles représentent tout le stock : pas de réserve infinie.
  showMessage("Tu as " + ammo + " balle(s) restante(s).");
}

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

    // Les bots avancent vers le joueur sans lui rentrer dedans
    if (distance > 10 && distance < 65) {
      const moveX = (dx / distance) * enemy.speed * delta;
      const moveZ = (dz / distance) * enemy.speed * delta;

      enemy.group.position.x += moveX;
      enemy.group.position.z += moveZ;
    }

    // Les bots tirent à distance
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

    if (bullet.mesh.position.distanceTo(player.position.clone().add(
      new THREE.Vector3(0, 1.2, 0)
    )) < 1.1) {
      health -= 10;
      scene.remove(bullet.mesh);
      enemyBullets.splice(i, 1);
      showMessage("Tu as été touché !");
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

function updateLoot(delta) {
  for (let i = lootItems.length - 1; i >= 0; i--) {
    const loot = lootItems[i];
    loot.mesh.rotation.y += delta * 1.8;
    loot.mesh.position.y = 0.6 + Math.sin(performance.now() * 0.003) * 0.15;

    const distance = loot.mesh.position.distanceTo(player.position);

    if (distance < 2.2) {
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

function updatePlayer(delta) {
  const forward = keys["w"] || keys["z"] || mobileKeys.forward;
  const backward = keys["s"] || mobileKeys.back;
  const left = keys["a"] || keys["q"] || mobileKeys.left;
  const right = keys["d"] || mobileKeys.right;

  const speed = keys["shift"] ? 13 : 8;
  const direction = new THREE.Vector3();

  if (forward) direction.z -= 1;
  if (backward) direction.z += 1;
  if (left) direction.x -= 1;
  if (right) direction.x += 1;

  if (direction.lengthSq() > 0) {
    direction.normalize();
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

    player.position.x += direction.x * speed * delta;
    player.position.z += direction.z * speed * delta;
  }

  player.position.x = THREE.MathUtils.clamp(player.position.x, -85, 85);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -85, 85);

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

  // Caméra derrière le joueur
  const cameraOffset = new THREE.Vector3(0, 4.2, 8);
  cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  camera.position.copy(player.position).add(cameraOffset);
  camera.lookAt(
    player.position.x,
    player.position.y + 1.5 + pitch * 5,
    player.position.z
  );
}

function endGame() {
  dead = true;
  playing = false;
  document.exitPointerLock?.();
  document.getElementById("finalKills").textContent = kills;
  document.getElementById("gameOver").style.display = "flex";
  document.getElementById("crosshair").style.display = "none";
  document.getElementById("mobileControls").style.display = "none";
}

function togglePause() {
  if (!playing || dead) return;

  paused = !paused;
  document.getElementById("pauseScreen").style.display = paused ? "flex" : "none";

  if (paused) {
    document.exitPointerLock?.();
  } else {
    renderer.domElement.requestPointerLock?.();
    clock.getDelta();
  }
}

function animate() {
  requestAnimationFrame(animate);

  if (!renderer) return;

  const delta = Math.min(clock.getDelta(), 0.05);

  if (playing && !paused && !dead) {
    shootCooldown = Math.max(0, shootCooldown - delta);
    messageTimer -= delta;

    if (messageTimer <= 0) messageText.textContent = "";

    updatePlayer(delta);
    updateEnemies(delta);
    updateEnemyBullets(delta);
    updateLoot(delta);
  }

  renderer.render(scene, camera);
}

// Clavier
document.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();
  keys[key] = true;

  if (key === "escape") togglePause();
  if (key === "r") reload();
});

document.addEventListener("keyup", event => {
  keys[event.key.toLowerCase()] = false;
});

// Contrôles tactiles
document.querySelectorAll("[data-move]").forEach(button => {
  const direction = button.dataset.move;

  button.addEventListener("pointerdown", event => {
    event.preventDefault();
    mobileKeys[direction] = true;
  });

  ["pointerup", "pointerleave", "pointercancel"].forEach(name => {
    button.addEventListener(name, () => mobileKeys[direction] = false);
  });
});

document.getElementById("mobileShoot").addEventListener("pointerdown", event => {
  event.preventDefault();
  shoot();
});

document.getElementById("mobileJump").addEventListener("pointerdown", event => {
  event.preventDefault();
  if (onGround) {
    verticalSpeed = 8;
    onGround = false;
  }
});

// Boutons du menu
document.getElementById("playButton").addEventListener("click", startGame);
document.getElementById("restartButton").addEventListener("click", startGame);
document.getElementById("resumeButton").addEventListener("click", () => {
  if (paused) togglePause();
});
