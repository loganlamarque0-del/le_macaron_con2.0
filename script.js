"use strict";

/* =====================================================
   COMBAT 3D — SCRIPT COMPLET
   Three.js r128
===================================================== */

const $ = (id) => document.getElementById(id);

let scene;
let camera;
let renderer;
let player;
let clock;

let initialized = false;
let playing = false;
let paused = false;

let yaw = 0;
let health = 100;
let ammo = 150;
let kills = 0;

const keys = {};
const enemies = [];
const pickups = [];
const enemyBullets = [];

const raycaster = new THREE.Raycaster();
const mouseCenter = new THREE.Vector2(0, 0);

const PLAYER_SPEED = 7;
const CAMERA_DISTANCE = 7;
const CAMERA_HEIGHT = 3.2;

let shootCooldown = 0;
let enemySpawnTimer = 0;

/* =====================================================
   OUTILS
===================================================== */

function showError(message) {
    const box = $("errorMessage");

    if (box) {
        box.textContent = message;
        box.classList.remove("hidden");
    } else {
        alert(message);
    }
}

function hideError() {
    const box = $("errorMessage");
    if (box) box.classList.add("hidden");
}

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function updateHUD() {
    if ($("health")) $("health").textContent = health;
    if ($("ammo")) $("ammo").textContent = ammo;
    if ($("kills")) $("kills").textContent = kills;
}

/* =====================================================
   INITIALISATION
===================================================== */

function init() {
    if (initialized) return true;

    try {
        if (typeof THREE === "undefined") {
            throw new Error("Three.js n'est pas chargé. Vérifie ta connexion Internet et ton index.html.");
        }

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);
        scene.fog = new THREE.Fog(0x87ceeb, 35, 120);

        camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            500
        );

        renderer = new THREE.WebGLRenderer({
            antialias: true
        });

        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;

        renderer.domElement.id = "gameCanvas";
        document.body.appendChild(renderer.domElement);

        clock = new THREE.Clock();

        createLights();
        createWorld();
        createPlayer();
        createEnemies();
        setupControls();

        window.addEventListener("resize", resizeGame);

        initialized = true;
        animate();

        return true;

    } catch (error) {
        console.error("Erreur d'initialisation :", error);
        showError("Erreur : " + error.message);
        return false;
    }
}

/* =====================================================
   LUMIÈRES
===================================================== */

function createLights() {
    const ambient = new THREE.HemisphereLight(
        0xffffff,
        0x52633f,
        1.8
    );

    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(30, 50, 20);
    sun.castShadow = true;

    scene.add(sun);
}

/* =====================================================
   MONDE
===================================================== */

function createWorld() {
    // Sol en herbe
    const grass = new THREE.Mesh(
        new THREE.PlaneGeometry(200, 200),
        new THREE.MeshStandardMaterial({ color: 0x398b35 })
    );

    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    scene.add(grass);

    // Route
    const road = new THREE.Mesh(
        new THREE.PlaneGeometry(12, 200),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
    );

    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.02;
    scene.add(road);

    // Lignes de la route
    for (let z = -90; z < 100; z += 12) {
        const line = new THREE.Mesh(
            new THREE.BoxGeometry(0.25, 0.04, 6),
            new THREE.MeshStandardMaterial({ color: 0xffffff })
        );

        line.position.set(0, 0.05, z);
        scene.add(line);
    }

    // Arbres
    for (let i = 0; i < 45; i++) {
        const x = random(-75, 75);
        const z = random(-90, 90);

        if (Math.abs(x) < 10) continue;

        createTree(x, z);
    }

    // Maisons
    createHouse(-20, -20);
    createHouse(22, -35);
    createHouse(-25, 35);
    createHouse(25, 25);

    // Caisses
    for (let i = 0; i < 18; i++) {
        const crate = new THREE.Mesh(
            new THREE.BoxGeometry(2, 2, 2),
            new THREE.MeshStandardMaterial({ color: 0x996633 })
        );

        crate.position.set(random(-35, 35), 1, random(-45, 45));
        crate.castShadow = true;
        crate.receiveShadow = true;
        scene.add(crate);
    }
}

function createTree(x, z) {
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.5, 3, 8),
        new THREE.MeshStandardMaterial({ color: 0x684020 })
    );

    trunk.position.set(x, 1.5, z);
    trunk.castShadow = true;
    scene.add(trunk);

    const leaves = new THREE.Mesh(
        new THREE.SphereGeometry(2.2, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x176b25 })
    );

    leaves.position.set(x, 4, z);
    leaves.castShadow = true;
    scene.add(leaves);
}

function createHouse(x, z) {
    const house = new THREE.Mesh(
        new THREE.BoxGeometry(9, 6, 8),
        new THREE.MeshStandardMaterial({ color: 0xd7b78b })
    );

    house.position.set(x, 3, z);
    house.castShadow = true;
    house.receiveShadow = true;
    scene.add(house);

    const roof = new THREE.Mesh(
        new THREE.ConeGeometry(7, 4, 4),
        new THREE.MeshStandardMaterial({ color: 0x8b2929 })
    );

    roof.position.set(x, 8, z);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    scene.add(roof);
}

/* =====================================================
   JOUEUR
===================================================== */

function createPlayer() {
    player = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1.5, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x2455bb })
    );

    body.position.y = 1.3;
    body.castShadow = true;
    player.add(body);

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xffc99c })
    );

    head.position.y = 2.35;
    player.add(head);

    const gun = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.25, 1.1),
        new THREE.MeshStandardMaterial({ color: 0x222222 })
    );

    gun.position.set(0.55, 1.55, -0.45);
    player.add(gun);

    player.position.set(0, 0, 10);
    scene.add(player);
}

/* =====================================================
   ENNEMIS
===================================================== */

function createEnemies() {
    for (let i = 0; i < 5; i++) {
        spawnEnemy();
    }
}

function spawnEnemy() {
    const enemy = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1.5, 0.6),
        new THREE.MeshStandardMaterial({ color: 0xb52b2b })
    );

    body.position.y = 1.3;
    body.castShadow = true;
    enemy.add(body);

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xe5b18c })
    );

    head.position.y = 2.35;
    enemy.add(head);

    const gun = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.25, 1),
        new THREE.MeshStandardMaterial({ color: 0x222222 })
    );

    gun.position.set(0.5, 1.5, -0.5);
    enemy.add(gun);

    const barBackground = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 0.18),
        new THREE.MeshBasicMaterial({ color: 0x333333 })
    );

    barBackground.position.y = 3.1;
    enemy.add(barBackground);

    const bar = new THREE.Mesh(
        new THREE.PlaneGeometry(1.45, 0.13),
        new THREE.MeshBasicMaterial({ color: 0x22dd22 })
    );

    bar.position.set(0, 3.1, 0.02);
    enemy.add(bar);

    enemy.position.set(random(-25, 25), 0, random(-35, 35));

    enemy.userData.health = 100;
    enemy.userData.bar = bar;
    enemy.userData.shootTimer = random(1, 3);

    scene.add(enemy);
    enemies.push(enemy);
}

/* =====================================================
   COMMANDES
===================================================== */

function setupControls() {
    // Clavier
    window.addEventListener("keydown", (event) => {
        keys[event.code] = true;

        if (event.code === "Escape" && playing) {
            pauseGame();
        }

        if (event.code === "KeyE" && paused) {
            resumeGame();
        }

        if (event.code === "Space") {
            event.preventDefault();
        }
    });

    window.addEventListener("keyup", (event) => {
        keys[event.code] = false;
    });

    // Souris : rotation horizontale uniquement
    document.addEventListener("mousemove", (event) => {
        if (!playing || paused) return;
        if (document.pointerLockElement !== renderer.domElement) return;

        yaw -= event.movementX * 0.0025;

        // movementY est volontairement ignoré.
        player.rotation.y = yaw;
    });

    // Tir
    document.addEventListener("mousedown", (event) => {
        if (event.button !== 0) return;
        if (!playing || paused) return;
        if (document.pointerLockElement !== renderer.domElement) return;

        shoot();
    });

    // Double-clic ou clic sur le jeu pour reprendre le contrôle de la souris
    renderer.domElement.addEventListener("click", () => {
        if (playing && !paused &&
            document.pointerLockElement !== renderer.domElement) {
            renderer.domElement.requestPointerLock();
        }
    });
}

/* =====================================================
   BOUTON JOUER
===================================================== */

function startGame() {
    hideError();

    if (!init()) return;

    health = 100;
    ammo = 150;
    kills = 0;
    yaw = 0;

    player.position.set(0, 0, 10);
    player.rotation.y = 0;

    updateHUD();

    playing = true;
    paused = false;

    if ($("menu")) $("menu").classList.add("hidden");
    if ($("pause")) $("pause").classList.add("hidden");
    if ($("hud")) $("hud").classList.remove("hidden");
    if ($("crosshair")) $("crosshair").classList.remove("hidden");

    renderer.domElement.requestPointerLock();

    clock.getDelta();
}

/* =====================================================
   PAUSE ET REPRISE
===================================================== */

function pauseGame() {
    if (!playing || paused) return;

    paused = true;

    if ($("pause")) $("pause").classList.remove("hidden");

    if (document.pointerLockElement) {
        document.exitPointerLock();
    }
}

function resumeGame() {
    if (!playing) return;

    paused = false;

    if ($("pause")) $("pause").classList.add("hidden");

    renderer.domElement.requestPointerLock();
}

/* =====================================================
   DÉPLACEMENT DU JOUEUR
===================================================== */

function movePlayer(delta) {
    const forward = new THREE.Vector3(
        Math.sin(yaw),
        0,
        -Math.cos(yaw)
    );

    const right = new THREE.Vector3(
        Math.cos(yaw),
        0,
        Math.sin(yaw)
    );

    const movement = new THREE.Vector3();

    if (keys["KeyW"] || keys["KeyZ"]) movement.add(forward);
    if (keys["KeyS"]) movement.sub(forward);
    if (keys["KeyD"]) movement.add(right);
    if (keys["KeyA"]) movement.sub(right);

    if (movement.lengthSq() > 0) {
        movement.normalize();
        player.position.addScaledVector(movement, PLAYER_SPEED * delta);
    }

    player.position.x = THREE.MathUtils.clamp(player.position.x, -90, 90);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -90, 90);
}

/* =====================================================
   CAMÉRA À LA TROISIÈME PERSONNE
===================================================== */

function updateCamera() {
    if (!player) return;

    const target = new THREE.Vector3(
        player.position.x + Math.sin(yaw) * CAMERA_DISTANCE,
        CAMERA_HEIGHT,
        player.position.z + Math.cos(yaw) * CAMERA_DISTANCE
    );

    camera.position.copy(target);

    // La hauteur de la caméra ne dépend jamais du mouvement vertical de la souris.
    camera.lookAt(
        player.position.x,
        player.position.y + 1.8,
        player.position.z
    );
}

/* =====================================================
   TIR DU JOUEUR
===================================================== */

function shoot() {
    if (ammo <= 0 || shootCooldown > 0) return;

    ammo--;
    shootCooldown = 0.25;
    updateHUD();

    raycaster.setFromCamera(mouseCenter, camera);

    const targets = [];

    enemies.forEach((enemy) => {
        enemy.traverse((part) => {
            if (part.isMesh) targets.push(part);
        });
    });

    const hits = raycaster.intersectObjects(targets, false);

    if (hits.length > 0) {
        let enemy = hits[0].object;

        while (enemy && !enemies.includes(enemy)) {
            enemy = enemy.parent;
        }

        if (enemy) damageEnemy(enemy, 25);
    }
}

function damageEnemy(enemy, damage) {
    enemy.userData.health -= damage;

    const percent = Math.max(0, enemy.userData.health / 100);

    enemy.userData.bar.scale.x = percent;
    enemy.userData.bar.position.x = -(1 - percent) * 0.72;

    if (enemy.userData.health <= 0) {
        defeatEnemy(enemy);
    }
}

function defeatEnemy(enemy) {
    scene.remove(enemy);

    const index = enemies.indexOf(enemy);
    if (index !== -1) enemies.splice(index, 1);

    kills++;
    updateHUD();

    if (Math.random() < 0.5) {
        createPickup(
            enemy.position.x,
            enemy.position.z,
            Math.random() < 0.5 ? "health" : "ammo"
        );
    }

    spawnEnemy();
}

/* =====================================================
   ENNEMIS : DÉPLACEMENT ET TIRS
===================================================== */

function updateEnemies(delta) {
    for (const enemy of enemies) {
        const direction = new THREE.Vector3(
            player.position.x - enemy.position.x,
            0,
            player.position.z - enemy.position.z
        );

        const distance = direction.length();

        if (distance > 0.01) {
            direction.normalize();

            if (distance > 5) {
                enemy.position.addScaledVector(direction, delta * 2.2);
            }

            enemy.rotation.y = Math.atan2(direction.x, direction.z);
        }

        enemy.userData.shootTimer -= delta;

        if (enemy.userData.shootTimer <= 0 && distance < 35) {
            enemy.userData.shootTimer = random(1.5, 3);

            createEnemyBullet(
                enemy.position.clone().add(new THREE.Vector3(0, 1.5, 0))
            );
        }
    }
}

function createEnemyBullet(position) {
    const bullet = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff3333 })
    );

    bullet.position.copy(position);

    const direction = new THREE.Vector3(
        player.position.x - position.x,
        1.5 - position.y,
        player.position.z - position.z
    ).normalize();

    bullet.userData.velocity = direction.multiplyScalar(18);
    bullet.userData.life = 3;

    scene.add(bullet);
    enemyBullets.push(bullet);
}

function updateEnemyBullets(delta) {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];

        bullet.position.addScaledVector(bullet.userData.velocity, delta);
        bullet.userData.life -= delta;

        if (bullet.position.distanceTo(
            player.position.clone().add(new THREE.Vector3(0, 1.5, 0))
        ) < 0.9) {
            health -= 10;
            updateHUD();
            scene.remove(bullet);
            enemyBullets.splice(i, 1);

            if (health <= 0) {
                endGame();
            }

            continue;
        }

        if (bullet.userData.life <= 0) {
            scene.remove(bullet);
            enemyBullets.splice(i, 1);
        }
    }
}

/* =====================================================
   OBJETS À RAMASSER
===================================================== */

function createPickup(x, z, type) {
    const color = type === "health" ? 0x22dd44 : 0xffcc22;

    const item = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.8, 0.8),
        new THREE.MeshStandardMaterial({ color })
    );

    item.position.set(x, 0.8, z);
    item.userData.type = type;

    scene.add(item);
    pickups.push(item);
}

function updatePickups() {
    for (let i = pickups.length - 1; i >= 0; i--) {
        const item = pickups[i];

        item.rotation.y += 0.025;

        if (item.position.distanceTo(player.position) < 2) {
            if (item.userData.type === "health") {
                health = Math.min(100, health + 35);
            } else {
                ammo += 30;
            }

            updateHUD();
            scene.remove(item);
            pickups.splice(i, 1);
        }
    }
}

/* =====================================================
   FIN DE PARTIE
===================================================== */

function endGame() {
    playing = false;
    paused = true;

    if (document.pointerLockElement) {
        document.exitPointerLock();
    }

    if ($("pauseTitle")) {
        $("pauseTitle").textContent = "PARTIE TERMINÉE";
    }

    if ($("pause")) $("pause").classList.remove("hidden");
}

/* =====================================================
   BOUCLE DU JEU
===================================================== */

function animate() {
    requestAnimationFrame(animate);

    if (!renderer || !scene || !camera) return;

    const delta = Math.min(clock.getDelta(), 0.05);

    if (playing && !paused) {
        movePlayer(delta);
        updateEnemies(delta);
        updateEnemyBullets(delta);
        updatePickups();

        shootCooldown = Math.max(0, shootCooldown - delta);

        updateCamera();
    }

    renderer.render(scene, camera);
}

/* =====================================================
   TAILLE DE L'ÉCRAN
===================================================== */

function resizeGame() {
    if (!camera || !renderer) return;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

/* =====================================================
   BRANCHEMENT DES BOUTONS
   IMPORTANT : ces lignes sont à l'extérieur de init().
   C'est la correction du bouton JOUER.
===================================================== */

const playButton = $("playButton");
const resumeButton = $("resumeButton");

if (playButton) {
    playButton.addEventListener("click", startGame);
} else {
    console.error("Le bouton playButton est introuvable dans index.html.");
}

if (resumeButton) {
    resumeButton.addEventListener("click", resumeGame);
}
