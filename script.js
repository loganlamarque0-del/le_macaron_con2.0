
const $ = id => document.getElementById(id);

let scene, camera, renderer;
let player, gun;
let enemies = [];
let bullets = [];
let enemyBullets = [];
let pickups = [];

let keys = {};
let playing = false;
let mouseLocked = false;

let health = 100;
let ammo = 150;
let yaw = 0;
let pitch = 0.12;
let verticalSpeed = 0;
let onGround = true;
let lastShot = 0;

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();

function init() {
  if (renderer) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 50, 180);

  camera = new THREE.PerspectiveCamera(
    75, window.innerWidth / window.innerHeight, 0.1, 300
  );

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x52613c, 2));

  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(30, 50, 20);
  scene.add(sun);

  createWorld();
  createPlayer();
  createEnemies();

  window.addEventListener("resize", resize);

  document.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;

    if (e.code === "Space" && onGround && playing) {
      verticalSpeed = 8;
      onGround = false;
    }

    if (e.key === "Escape" && playing) {
      document.exitPointerLock();
    }
  });

  document.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
  });

  // CAMÉRA : LA SOURIS TOURNE AUTOUR DU PERSONNAGE
  document.addEventListener("mousemove", e => {
    if (!playing || !mouseLocked) return;

    yaw -= e.movementX * 0.003;
    pitch -= e.movementY * 0.0025;

    pitch = Math.max(-0.55, Math.min(0.65, pitch));
  });

  // ACTIVER LA SOURIS EN CLIQUANT DANS LE JEU
  renderer.domElement.addEventListener("click", () => {
    if (playing && !mouseLocked) {
      renderer.domElement.requestPointerLock();
    }
  });

  document.addEventListener("pointerlockchange", () => {
    mouseLocked =
      document.pointerLockElement === renderer.domElement;

    if (!mouseLocked && playing) {
      playing = false;
      $("pause").classList.remove("hidden");
      $("pause").querySelector("h1").textContent = "PAUSE";
      $("resumeButton").textContent = "REPRENDRE";
    }
  });

  // TIR AVEC LE CLIC GAUCHE
  document.addEventListener("mousedown", e => {
    if (playing && e.button === 0 && mouseLocked) {
      shoot();
    }
  });

  animate();
}

function createWorld() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 180),
    new THREE.MeshStandardMaterial({ color: 0x4b963c })
  );

  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 180),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
  );

  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.02;
  scene.add(road);

  // ARBRES
  for (let i = 0; i < 45; i++) {
    const x = (Math.random() - 0.5) * 140;
    const z = (Math.random() - 0.5) * 140;

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.4, 2),
      new THREE.MeshStandardMaterial({ color: 0x704321 })
    );

    trunk.position.set(x, 1, z);
    scene.add(trunk);

    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(1.5, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x176b27 })
    );

    leaves.position.set(x, 3.5, z);
    scene.add(leaves);
  }

  // MAISONS
  for (let i = 0; i < 8; i++) {
    const x = (Math.random() - 0.5) * 100;
    const z = (Math.random() - 0.5) * 100;

    const house = new THREE.Mesh(
      new THREE.BoxGeometry(7, 5, 7),
      new THREE.MeshStandardMaterial({ color: 0xc18b54 })
    );

    house.position.set(x, 2.5, z);
    scene.add(house);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(5.5, 3, 4),
      new THREE.MeshStandardMaterial({ color: 0x873d30 })
    );

    roof.position.set(x, 6.5, z);
    roof.rotation.y = Math.PI / 4;
    scene.add(roof);
  }

  // CAISSES
  for (let i = 0; i < 25; i++) {
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 2),
      new THREE.MeshStandardMaterial({ color: 0x91602f })
    );

    crate.position.set(
      (Math.random() - 0.5) * 130,
      1,
      (Math.random() - 0.5) * 130
    );

    scene.add(crate);
  }
}

function createPlayer() {
  player = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.4, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x2466d1 })
  );

  body.position.y = 1.4;
  player.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffc99c })
  );

  head.position.y = 2.35;
  player.add(head);

  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.8, 0.45),
    new THREE.MeshStandardMaterial({ color: 0x222b42 })
  );

  legs.position.y = 0.4;
  player.add(legs);

  gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.15, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
  );

  gun.position.set(0.55, 1.55, -0.55);
  player.add(gun);

  player.position.set(0, 0, 0);
  scene.add(player);
}

function createEnemies() {
  for (let i = 0; i < 8; i++) {
    const bot = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xb52b2b })
    );

    body.position.y = 1.4;
    bot.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffc99c })
    );

    head.position.y = 2.35;
    bot.add(head);

    const rifle = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.15, 1),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );

    rifle.position.set(0.55, 1.5, -0.5);
    bot.add(rifle);

    // BARRE DE VIE AU-DESSUS DU BOT
    const barBackground = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.12, 0.05),
      new THREE.MeshBasicMaterial({ color: 0x440000 })
    );

    barBackground.position.y = 3;
    bot.add(barBackground);

    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.09, 0.06),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );

    bar.position.set(0, 3, 0.04);
    bot.add(bar);

    bot.userData.hp = 100;
    bot.userData.healthBar = bar;
    bot.userData.lastShot = 0;

    bot.position.set(
      (Math.random() - 0.5) * 60,
      0,
      -10 - Math.random() * 60
    );

    scene.add(bot);
    enemies.push(bot);
  }
}

// CAMÉRA À LA FORTNITE
function updateCamera() {
  const target = player.position.clone();
  target.y += 1.7;

  const distance = 6;

  camera.position.set(
    target.x + Math.sin(yaw) * distance,
    target.y + 2.2 - pitch * 3,
    target.z + Math.cos(yaw) * distance
  );

  camera.lookAt(
    target.x - Math.sin(yaw) * 10,
    target.y + pitch * 8,
    target.z - Math.cos(yaw) * 10
  );
}

// DÉPLACEMENT DU PERSONNAGE
function updatePlayer(delta) {
  const forward = new THREE.Vector3(
    -Math.sin(yaw), 0, -Math.cos(yaw)
  );

  const right = new THREE.Vector3(
    Math.cos(yaw), 0, -Math.sin(yaw)
  );

  const move = new THREE.Vector3();

  // W OU Z = AVANCER
  if (keys["w"] || keys["z"]) {
    move.add(forward);
  }

  // S = RECULER
  if (keys["s"]) {
    move.sub(forward);
  }

  // D = GAUCHE
  if (keys["d"]) {
    move.sub(right);
  }

  // A = DROITE
  if (keys["a"]) {
    move.add(right);
  }

  if (move.length() > 0) {
    move.normalize();
    player.position.addScaledVector(move, 9 * delta);
  }

  // SAUT
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

  // LIMITES DE LA CARTE
  player.position.x = THREE.MathUtils.clamp(
    player.position.x, -85, 85
  );

  player.position.z = THREE.MathUtils.clamp(
    player.position.z, -85, 85
  );
}

function shoot() {
  if (ammo <= 0 || performance.now() - lastShot < 200) {
    return;
  }

  lastShot = performance.now();
  ammo--;
  $("ammo").textContent = "Munitions : " + ammo;

  // TIRE AU CENTRE DE L'ÉCRAN
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

  const targets = [];

  enemies.forEach(bot => {
    bot.traverse(obj => {
      if (obj.isMesh) targets.push(obj);
    });
  });

  const hits = raycaster.intersectObjects(targets);

  if (hits.length > 0) {
    let bot = hits[0].object;

    while (bot.parent && !enemies.includes(bot)) {
      bot = bot.parent;
    }

    if (enemies.includes(bot)) {
      bot.userData.hp -= 25;

      const life = Math.max(0, bot.userData.hp) / 100;
      bot.userData.healthBar.scale.x = life;
      bot.userData.healthBar.position.x = -(1 - life) * 0.55;

      if (bot.userData.hp <= 0) {
        killEnemy(bot);
      }
    }
  }
}

function killEnemy(bot) {
  const position = bot.position.clone();

  scene.remove(bot);
  enemies = enemies.filter(e => e !== bot);

  // OBJET À RAMASSER
  const isHealth = Math.random() < 0.5;

  const pickup = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 16),
    new THREE.MeshStandardMaterial({
      color: isHealth ? 0x00ff55 : 0xffcc00,
      emissive: isHealth ? 0x004411 : 0x443300
    })
  );

  pickup.position.copy(position);
  pickup.position.y = 0.7;
  pickup.userData.type = isHealth ? "health" : "ammo";

  scene.add(pickup);
  pickups.push(pickup);
}

function updateEnemies(delta) {
  enemies.forEach(bot => {
    const direction = player.position.clone().sub(bot.position);
    const distance = direction.length();

    if (distance > 7) {
      direction.normalize();
      bot.position.addScaledVector(direction, 2 * delta);
    }

    bot.lookAt(player.position.x, 0, player.position.z);

    // LES BOTS TIRENT SUR LE JOUEUR
    if (
      distance < 30 &&
      performance.now() - bot.userData.lastShot > 1600
    ) {
      bot.userData.lastShot = performance.now();

      const projectile = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff2222 })
      );

      projectile.position.copy(bot.position);
      projectile.position.y += 1.5;

      const target = player.position.clone();
      target.y += 1.4;

      const directionToPlayer = target.sub(projectile.position).normalize();

      projectile.userData.velocity = directionToPlayer.multiplyScalar(18);

      scene.add(projectile);
      enemyBullets.push(projectile);
    }
  });
}

function updateEnemyBullets(delta) {
  enemyBullets.forEach((bullet, index) => {
    bullet.position.addScaledVector(
      bullet.userData.velocity, delta
    );

    const target = player.position.clone();
    target.y += 1.4;

    if (bullet.position.distanceTo(target) < 1) {
      health = Math.max(0, health - 10);
      $("health").textContent = "Vie : " + health;

      scene.remove(bullet);
      enemyBullets.splice(index, 1);

      if (health <= 0) {
        playing = false;
        document.exitPointerLock();
        $("pause").classList.remove("hidden");
        $("pause").querySelector("h1").textContent = "TU AS PERDU";
        $("resumeButton").textContent = "RECOMMENCER";
      }

      return;
    }

    if (bullet.position.distanceTo(player.position) > 60) {
      scene.remove(bullet);
      enemyBullets.splice(index, 1);
    }
  });
}

function updatePickups() {
  pickups.forEach((pickup, index) => {
    pickup.rotation.y += 0.03;

    if (pickup.position.distanceTo(player.position) < 2) {
      if (pickup.userData.type === "health") {
        health = Math.min(100, health + 35);
        $("health").textContent = "Vie : " + health;
      } else {
        ammo += 30;
        $("ammo").textContent = "Munitions : " + ammo;
      }

      scene.remove(pickup);
      pickups.splice(index, 1);
    }
  });
}

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  if (playing && player) {
    updatePlayer(delta);
    updateEnemies(delta);
    updateEnemyBullets(delta);
    updatePickups();
    updateCamera();
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function resize() {
  if (!camera || !renderer) return;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function startGame() {
  try {
    init();

    if (!renderer) return;

    health = 100;
    ammo = 150;

    $("health").textContent = "Vie : 100";
    $("ammo").textContent = "Munitions : 150";

    $("menu").classList.add("hidden");
    $("pause").classList.add("hidden");
    $("hud").classList.remove("hidden");

    playing = true;

    renderer.domElement.requestPointerLock();

    if (enemies.length === 0) {
      createEnemies();
    }

  } catch (error) {
    console.error(error);
    $("status").textContent = "Erreur : " + error.message;
  }
}

$("playButton").addEventListener("click", startGame);

$("resumeButton").addEventListener("click", () => {
  if (health <= 0) {
    location.reload();
    return;
  }

  $("pause").classList.add("hidden");
  playing = true;
  renderer.domElement.requestPointerLock();
});
