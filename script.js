const $ = id => document.getElementById(id);

let scene, camera, renderer;
let player, gun;
let enemies = [];
let bullets = [];
let keys = {};
let health = 100;
let ammo = 150;
let playing = false;
let yaw = 0;
let pitch = 0.15;
let mouseLocked = false;
let lastShot = 0;

const raycaster = new THREE.Raycaster();
const clock = new THREE.Clock();

function init() {
  if (renderer) return;

  if (!window.THREE) {
    $("status").textContent = "Impossible de charger Three.js. Vérifie Internet.";
    return;
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 40, 180);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    300
  );

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x52613c, 2));

  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(20, 40, 20);
  scene.add(sun);

  createWorld();
  createPlayer();
  createEnemies();

  window.addEventListener("resize", resize);
  document.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;

    if (e.key === "Escape" && playing) {
      document.exitPointerLock();
    }
  });

  document.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
  });

  document.addEventListener("mousemove", e => {
    if (!mouseLocked || !playing) return;

    yaw -= e.movementX * 0.0025;
    pitch -= e.movementY * 0.0025;
    pitch = Math.max(-0.65, Math.min(0.75, pitch));
  });

  document.addEventListener("pointerlockchange", () => {
    mouseLocked = document.pointerLockElement === renderer.domElement;
  });

  renderer.domElement.addEventListener("click", () => {
    if (playing && !mouseLocked) {
      renderer.domElement.requestPointerLock();
    }
  });

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

  // Route
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 180),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.02;
  scene.add(road);

  // Décor : arbres
  for (let i = 0; i < 35; i++) {
    const x = (Math.random() - 0.5) * 140;
    const z = (Math.random() - 0.5) * 140;

    if (Math.abs(x) < 10) continue;

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

  // Maisons
  for (let i = 0; i < 8; i++) {
    const house = new THREE.Mesh(
      new THREE.BoxGeometry(7, 5, 7),
      new THREE.MeshStandardMaterial({ color: 0xc18b54 })
    );
    house.position.set(
      (Math.random() - 0.5) * 100,
      2.5,
      (Math.random() - 0.5) * 100
    );
    scene.add(house);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(5.5, 3, 4),
      new THREE.MeshStandardMaterial({ color: 0x873d30 })
    );
    roof.position.set(house.position.x, 6.5, house.position.z);
    roof.rotation.y = Math.PI / 4;
    scene.add(roof);
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

    bot.position.set(
      (Math.random() - 0.5) * 60,
      0,
      -10 - Math.random() * 60
    );

    bot.userData.hp = 100;
    bot.userData.lastShot = 0;

    scene.add(bot);
    enemies.push(bot);
  }
}

function updateCamera() {
  const distance = 6;
  const height = 2.5;

  const target = player.position.clone();
  target.y += 1.7;

  const offset = new THREE.Vector3(
    Math.sin(yaw) * distance,
    height + pitch * 3,
    Math.cos(yaw) * distance
  );

  camera.position.copy(target).add(offset);
  camera.lookAt(
    target.x - Math.sin(yaw) * 10,
    target.y + pitch * 10,
    target.z - Math.cos(yaw) * 10
  );
}

function updatePlayer(delta) {
  const forward = new THREE.Vector3(
    -Math.sin(yaw), 0, -Math.cos(yaw)
  );

  const right = new THREE.Vector3(
    Math.cos(yaw), 0, -Math.sin(yaw)
  );

  const move = new THREE.Vector3();

  if (keys["w"] || keys["z"]) move.add(forward);
  if (keys["s"]) move.sub(forward);

  // D = gauche, A = droite
  if (keys["d"]) move.sub(right);
  if (keys["a"]) move.add(right);

  if (move.length() > 0) {
    move.normalize();
    player.position.addScaledVector(move, 9 * delta);
  }

  player.rotation.y = yaw;
}

function shoot() {
  if (ammo <= 0 || performance.now() - lastShot < 200) return;

  lastShot = performance.now();
  ammo--;
  $("ammo").textContent = "Munitions : " + ammo;

  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

  const targets = [];
  enemies.forEach(bot => {
    if (bot.userData.hp > 0) {
      bot.traverse(obj => {
        if (obj.isMesh) targets.push(obj);
      });
    }
  });

  const hits = raycaster.intersectObjects(targets);

  if (hits.length > 0) {
    let bot = hits[0].object;
    while (bot.parent && !enemies.includes(bot)) {
      bot = bot.parent;
    }

    if (enemies.includes(bot)) {
      bot.userData.hp -= 25;

      if (bot.userData.hp <= 0) {
        scene.remove(bot);
        enemies = enemies.filter(e => e !== bot);
      }
    }
  }
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

    if (distance < 30 && performance.now() - bot.userData.lastShot > 1500) {
      bot.userData.lastShot = performance.now();
      health -= 5;
      health = Math.max(0, health);
      $("health").textContent = "Vie : " + health;

      if (health <= 0) {
        playing = false;
        $("pause").classList.remove("hidden");
        $("pause").querySelector("h1").textContent = "TU AS PERDU";
        $("resumeButton").textContent = "RECOMMENCER";
      }
    }
  });
}

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  if (playing && player) {
    updatePlayer(delta);
    updateEnemies(delta);
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
    $("status").textContent = "Erreur : " + error.message;
    console.error(error);
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

document.addEventListener("pointerlockchange", () => {
  if (!mouseLocked && playing) {
    playing = false;
    $("pause").classList.remove("hidden");
    $("pause").querySelector("h1").textContent = "PAUSE";
    $("resumeButton").textContent = "REPRENDRE";
  }
});
