"use strict";

/* ==========================================
   COMBAT 3D — SCRIPT PRINCIPAL
========================================== */

const $ = id => document.getElementById(id);

let scene, camera, renderer, clock;
let player, playerParts;

let initialized = false;
let playing = false;
let paused = false;
let gameOver = false;

let yaw = 0;
let pitch = 0;

let health = 100;
let ammo = 150;
let kills = 0;

let walkTime = 0;
let jumpVelocity = 0;
let onGround = true;
let jumpRequested = false;
let shootCooldown = 0;

const keys = {};
const enemies = [];
const pickups = [];
const bullets = [];

const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);

const PLAYER_SPEED = 7;
const CAMERA_DISTANCE = 7;

/* ==========================================
   OUTILS
========================================== */

function random(min, max) {
    return Math.random() * (max - min) + min;
}

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
    if ($("errorMessage")) {
        $("errorMessage").classList.add("hidden");
    }
}

function updateHUD() {
    if ($("health")) $("health").textContent = health;
    if ($("ammo")) $("ammo").textContent = ammo;
    if ($("kills")) $("kills").textContent = kills;
}

function makeMaterial(color, roughness = 0.85) {
    return new THREE.MeshStandardMaterial({
        color: color,
        roughness: roughness
    });
}

function addMesh(parent, geometry, material, x, y, z) {
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    parent.add(mesh);
    return mesh;
}

/* ==========================================
   INITIALISATION
========================================== */

function init() {
    if (initialized) return true;

    try {
        if (typeof THREE === "undefined") {
            throw new Error(
                "Three.js ne s'est pas chargé. Vérifie ta connexion Internet."
            );
        }

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x8bc9ef);
        scene.fog = new THREE.Fog(0x8bc9ef, 65, 190);

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
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;

        document.body.appendChild(renderer.domElement);

        renderer.domElement.id = "gameCanvas";

        clock = new THREE.Clock();

        createLights();
        createWorld();

        player = createPuppet(0x2875db, false);
        player.position.set(0, 0, 10);
        scene.add(player);

        playerParts = player.userData.parts;

        setupControls();

        window.addEventListener("resize", resizeGame);

        initialized = true;

        animate();

        return true;

    } catch (error) {
        console.error(error);
        showError("Erreur : " + error.message);
        return false;
    }
}

/* ==========================================
   LUMIÈRES
========================================== */

function createLights() {
    const skyLight = new THREE.HemisphereLight(
        0xd9f1ff,
        0x52623b,
        2
    );

    scene.add(skyLight);

    const sun = new THREE.DirectionalLight(0xffffff, 2.2);

    sun.position.set(-35, 65, 30);
    sun.castShadow = true;

    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;

    sun.shadow.camera.left = -80;
    sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -80;

    scene.add(sun);
}

/* ==========================================
   MONDE
========================================== */

function createWorld() {
    // Herbe
    const grass = addMesh(
        scene,
        new THREE.PlaneGeometry(250, 250),
        makeMaterial(0x58a83d),
        0, 0, 0
    );

    grass.rotation.x = -Math.PI / 2;

    // Route
    const road = addMesh(
        scene,
        new THREE.PlaneGeometry(14, 240),
        makeMaterial(0x454545),
        0, 0.025, 0
    );

    road.rotation.x = -Math.PI / 2;

    // Lignes de route
    for (let z = -110; z < 120; z += 12) {
        addMesh(
            scene,
            new THREE.BoxGeometry(0.25, 0.04, 6),
            makeMaterial(0xffffff),
            0, 0.06, z
        );
    }

    // Arbres
    for (let i = 0; i < 65; i++) {
        const x = random(-95, 95);
        const z = random(-110, 110);

        if (Math.abs(x) < 12) continue;

        createTree(x, z);
    }

    // Maisons
    createHouse(-23, -25);
    createHouse(24, -35);
    createHouse(-27, 40);
    createHouse(27, 35);

    // Caisses
    for (let i = 0; i < 22; i++) {
        addMesh(
            scene,
            new THREE.BoxGeometry(2, 2, 2),
            makeMaterial(0x9c6736),
            random(-40, 40),
            1,
            random(-50, 50)
        );
    }
}

/* ==========================================
   ARBRES
========================================== */

function createTree(x, z) {
    const tree = new THREE.Group();

    tree.position.set(x, 0, z);

    addMesh(
        tree,
        new THREE.CylinderGeometry(0.45, 0.65, 3.8, 10),
        makeMaterial(0x754324),
        0, 1.9, 0
    );

    const greens = [
        0x247c2b,
        0x318e32,
        0x1d7027
    ];

    for (let i = 0; i < 3; i++) {
        const leaves = addMesh(
            tree,
            new THREE.ConeGeometry(2.5 - i * 0.35, 3.2, 9),
            makeMaterial(greens[i]),
            0,
            4 + i * 1.6,
            0
        );

        leaves.rotation.y = i * 0.5;
    }

    scene.add(tree);
}

/* ==========================================
   MAISONS
========================================== */

function createHouse(x, z) {
    const house = new THREE.Group();

    house.position.set(x, 0, z);

    // Murs
    addMesh(
        house,
        new THREE.BoxGeometry(10, 6, 9),
        makeMaterial(0xe3c99d),
        0, 3, 0
    );

    // Toit
    const roof = addMesh(
        house,
        new THREE.ConeGeometry(8, 4, 4),
        makeMaterial(0x9b3e32),
        0, 8, 0
    );

    roof.rotation.y = Math.PI / 4;

    // Porte
    addMesh(
        house,
        new THREE.BoxGeometry(1.7, 3.2, 0.15),
        makeMaterial(0x653b24),
        0, 1.6, 4.58
    );

    // Fenêtres
    for (const wx of [-3, 3]) {
        addMesh(
            house,
            new THREE.BoxGeometry(1.8, 1.6, 0.12),
            makeMaterial(0x70c9e8, 0.2),
            wx, 3.6, 4.62
        );

        addMesh(
            house,
            new THREE.BoxGeometry(2, 0.15, 0.18),
            makeMaterial(0xffffff),
            wx, 3.6, 4.72
        );
    }

    scene.add(house);
}

/* ==========================================
   CRÉATION DES PANTINS
========================================== */

function createPuppet(color, isEnemy) {
    const puppet = new THREE.Group();

    const bodyMaterial = makeMaterial(
        isEnemy ? 0x9e2020 : color
    );

    const skinMaterial = makeMaterial(
        isEnemy ? 0xd98e78 : 0xffc79e
    );

    const darkMaterial = makeMaterial(0x252b35);

    const parts = {};

    // Corps
    parts.body = addMesh(
        puppet,
        new THREE.BoxGeometry(1.05, 1.3, 0.55),
        bodyMaterial,
        0, 1.65, 0
    );

    // Tête
    parts.head = addMesh(
        puppet,
        new THREE.SphereGeometry(0.43, 18, 14),
        skinMaterial,
        0, 2.65, 0
    );

    // Yeux
    for (const x of [-0.15, 0.15]) {
        addMesh(
            puppet,
            new THREE.SphereGeometry(0.045, 8, 8),
            darkMaterial,
            x, 2.7, -0.38
        );
    }

    // Bras gauche
    parts.leftArm = new THREE.Group();
    parts.leftArm.position.set(-0.7, 2.05, 0);

    addMesh(
        parts.leftArm,
        new THREE.BoxGeometry(0.32, 0.95, 0.35),
        bodyMaterial,
        0, -0.43, 0
    );

    addMesh(
        parts.leftArm,
        new THREE.BoxGeometry(0.32, 0.25, 0.35),
        skinMaterial,
        0, -0.9, 0
    );

    puppet.add(parts.leftArm);

    // Bras droit
    parts.rightArm = new THREE.Group();
    parts.rightArm.position.set(0.7, 2.05, 0);

    addMesh(
        parts.rightArm,
        new THREE.BoxGeometry(0.32, 0.95, 0.35),
        bodyMaterial,
        0, -0.43, 0
    );

    addMesh(
        parts.rightArm,
        new THREE.BoxGeometry(0.32, 0.25, 0.35),
        skinMaterial,
        0, -0.9, 0
    );

    puppet.add(parts.rightArm);

    // Jambe gauche
    parts.leftLeg = new THREE.Group();
    parts.leftLeg.position.set(-0.28, 1.05, 0);

    addMesh(
        parts.leftLeg,
        new THREE.BoxGeometry(0.4, 1.05, 0.45),
        darkMaterial,
        0, -0.5, 0
    );

    addMesh(
        parts.leftLeg,
        new THREE.BoxGeometry(0.48, 0.25, 0.75),
        darkMaterial,
        0, -1.02, -0.12
    );

    puppet.add(parts.leftLeg);

    // Jambe droite
    parts.rightLeg = new THREE.Group();
    parts.rightLeg.position.set(0.28, 1.05, 0);

    addMesh(
        parts.rightLeg,
        new THREE.BoxGeometry(0.4, 1.05, 0.45),
        darkMaterial,
        0, -0.5, 0
    );

    addMesh(
        parts.rightLeg,
        new THREE.BoxGeometry(0.48, 0.25, 0.75),
        darkMaterial,
        0, -1.02, -0.12
    );

    puppet.add(parts.rightLeg);

    // Fusil
    parts.gun = addMesh(
        puppet,
        new THREE.BoxGeometry(0.22, 0.25, 1.1),
        darkMaterial,
        0.65, 1.55, -0.65
    );

    puppet.userData.parts = parts;

    return puppet;
}

/* ==========================================
   ENNEMIS
========================================== */

function spawnEnemy() {
    const enemy = createPuppet(0xc93636, true);

    enemy.position.set(
        random(-30, 30),
        0,
        random(-40, 40)
    );

    // Barre de vie
    const barGroup = new THREE.Group();

    addMesh(
        barGroup,
        new THREE.PlaneGeometry(1.5, 0.18),
        new THREE.MeshBasicMaterial({ color: 0x333333 }),
        0, 0, 0
    );

    const bar = addMesh(
        barGroup,
        new THREE.PlaneGeometry(1.4, 0.13),
        new THREE.MeshBasicMaterial({ color: 0x21e64b }),
        0, 0, 0.02
    );

    barGroup.position.set(0, 3.4, 0);
    enemy.add(barGroup);

    enemy.userData.health = 100;
    enemy.userData.bar = bar;
    enemy.userData.barGroup = barGroup;
    enemy.userData.shootTimer = random(1, 3);

    scene.add(enemy);
    enemies.push(enemy);
}

function clearObjects(list) {
    for (const item of list) {
        scene.remove(item);
    }

    list.length = 0;
}

function resetGame() {
    clearObjects(enemies);
    clearObjects(pickups);
    clearObjects(bullets);

    health = 100;
    ammo = 150;
    kills = 0;

    yaw = 0;
    pitch = 0;

    walkTime = 0;
    jumpVelocity = 0;
    onGround = true;
    jumpRequested = false;

    player.position.set(0, 0, 10);
    player.rotation.set(0, 0, 0);

    spawnEnemy();
    spawnEnemy();
    spawnEnemy();
    spawnEnemy();
    spawnEnemy();

    updateHUD();
}

/* ==========================================
   COMMANDES CLAVIER ET SOURIS
========================================== */

function setupControls() {
    window.addEventListener("keydown", event => {
        keys[event.code] = true;

        if (event.code === "Escape" && playing && !paused) {
            pauseGame();
        }

        if (event.code === "KeyE" && paused) {
            resumeGame();
        }

        if (event.code === "Space") {
            event.preventDefault();

            if (playing && !paused && !event.repeat) {
                jumpRequested = true;
            }
        }
    });

    window.addEventListener("keyup", event => {
        keys[event.code] = false;
    });

    // Caméra
    document.addEventListener("mousemove", event => {
        if (!playing || paused) return;

        if (document.pointerLockElement !== renderer.domElement) {
            return;
        }

        yaw -= event.movementX * 0.0025;

        pitch -= event.movementY * 0.0018;

        // Petite liberté verticale, avec limites
        pitch = THREE.MathUtils.clamp(
            pitch,
            -0.28,
            0.16
        );
    });

    // Tir
    document.addEventListener("mousedown", event => {
        if (event.button !== 0) return;
        if (!playing || paused) return;

        if (document.pointerLockElement !== renderer.domElement) {
            return;
        }

        shoot();
    });

    // Cliquer dans le jeu récupère la souris
    renderer.domElement.addEventListener("click", () => {
        if (playing && !paused &&
            document.pointerLockElement !== renderer.domElement) {
            renderer.domElement.requestPointerLock();
        }
    });
}

/* ==========================================
   DÉMARRER
========================================== */

function startGame() {
    hideError();

    if (!init()) return;

    resetGame();

    playing = true;
    paused = false;
    gameOver = false;

    if ($("menu")) $("menu").classList.add("hidden");
    if ($("pause")) $("pause").classList.add("hidden");
    if ($("hud")) $("hud").classList.remove("hidden");
    if ($("crosshair")) $("crosshair").classList.remove("hidden");

    if ($("pauseTitle")) {
        $("pauseTitle").textContent = "JEU EN PAUSE";
    }

    renderer.domElement.requestPointerLock();
}

/* ==========================================
   PAUSE ET REPRISE
========================================== */

function pauseGame() {
    if (!playing || paused) return;

    paused = true;

    if ($("pauseTitle")) {
        $("pauseTitle").textContent = "JEU EN PAUSE";
    }

    if ($("pause")) {
        $("pause").classList.remove("hidden");
    }

    if (document.pointerLockElement) {
        document.exitPointerLock();
    }
}

function resumeGame() {
    if (gameOver) {
        startGame();
        return;
    }

    if (!playing || !paused) return;

    paused = false;

    if ($("pause")) {
        $("pause").classList.add("hidden");
    }

    renderer.domElement.requestPointerLock();
}

/* ==========================================
   DÉPLACEMENT ET SAUT
========================================== */

function movePlayer(delta) {
    // Saut
    if (jumpRequested && onGround) {
        jumpVelocity = 8;
        onGround = false;
    }

    jumpRequested = false;

    // W et Z avancent vers l'avant du personnage
    const forward = new THREE.Vector3(
        -Math.sin(yaw),
        0,
        -Math.cos(yaw)
    );

    const right = new THREE.Vector3(
        Math.cos(yaw),
        0,
        -Math.sin(yaw)
    );

    const movement = new THREE.Vector3();

    if (keys["KeyW"] || keys["KeyZ"]) {
        movement.add(forward);
    }

    if (keys["KeyS"]) {
        movement.sub(forward);
    }

    if (keys["KeyD"]) {
        movement.add(right);
    }

    if (keys["KeyA"]) {
        movement.sub(right);
    }

    const moving = movement.lengthSq() > 0;

    if (moving) {
        movement.normalize();

        player.position.addScaledVector(
            movement,
            PLAYER_SPEED * delta
        );

        walkTime += delta * 10;

        playerParts.leftLeg.rotation.x =
            Math.sin(walkTime) * 0.65;

        playerParts.rightLeg.rotation.x =
            -Math.sin(walkTime) * 0.65;

        playerParts.leftArm.rotation.x =
            -Math.sin(walkTime) * 0.45;

        playerParts.rightArm.rotation.x =
            Math.sin(walkTime) * 0.45;

    } else {
        playerParts.leftLeg.rotation.x *= 0.8;
        playerParts.rightLeg.rotation.x *= 0.8;

        playerParts.leftArm.rotation.x *= 0.8;
        playerParts.rightArm.rotation.x *= 0.8;
    }

    // Gravité et saut
    if (!onGround) {
        player.position.y += jumpVelocity * delta;
        jumpVelocity -= 20 * delta;

        if (player.position.y <= 0) {
            player.position.y = 0;
            jumpVelocity = 0;
            onGround = true;
        }
    }

    player.position.x = THREE.MathUtils.clamp(
        player.position.x, -110, 110
    );

    player.position.z = THREE.MathUtils.clamp(
        player.position.z, -110, 110
    );

    player.rotation.y = yaw;
}

/* ==========================================
   CAMÉRA TROISIÈME PERSONNE
========================================== */

function updateCamera() {
    const horizontalDistance =
        CAMERA_DISTANCE * Math.cos(pitch);

    // La caméra monte ou descend légèrement selon pitch
    const cameraHeight =
        3.2 - Math.sin(pitch) * CAMERA_DISTANCE;

    camera.position.set(
        player.position.x + Math.sin(yaw) * horizontalDistance,
        player.position.y + cameraHeight,
        player.position.z + Math.cos(yaw) * horizontalDistance
    );

    camera.lookAt(
        player.position.x,
        player.position.y + 1.6,
        player.position.z
    );
}

/* ==========================================
   TIR DU JOUEUR
========================================== */

function shoot() {
    if (ammo <= 0 || shootCooldown > 0) return;

    ammo--;
    shootCooldown = 0.22;

    updateHUD();

    raycaster.setFromCamera(screenCenter, camera);

    const targets = [];

    enemies.forEach(enemy => {
        enemy.traverse(part => {
            if (part.isMesh) {
                targets.push(part);
            }
        });
    });

    const hits = raycaster.intersectObjects(targets, false);

    let targetPoint = raycaster.ray.origin.clone().add(
        raycaster.ray.direction.clone().multiplyScalar(80)
    );

    if (hits.length > 0) {
        targetPoint.copy(hits[0].point);

        let enemy = hits[0].object;

        while (enemy && !enemies.includes(enemy)) {
            enemy = enemy.parent;
        }

        if (enemy) {
            damageEnemy(enemy, 25);
        }
    }

    // Projectile visible depuis le fusil
    const muzzle = new THREE.Vector3(0.55, 1.55, -1);

    player.localToWorld(muzzle);

    createPlayerBullet(muzzle, targetPoint);
}

function createPlayerBullet(start, target) {
    const bullet = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 10, 10),
        new THREE.MeshBasicMaterial({
            color: 0xffe36a
        })
    );

    bullet.position.copy(start);

    const direction = target.clone().sub(start).normalize();

    bullet.userData.velocity = direction.multiplyScalar(65);
    bullet.userData.life = 1.5;
    bullet.userData.enemyBullet = false;

    scene.add(bullet);
    bullets.push(bullet);
}

function damageEnemy(enemy, damage) {
    enemy.userData.health -= damage;

    const percent = Math.max(
        0,
        enemy.userData.health / 100
    );

    enemy.userData.bar.scale.x = percent;
    enemy.userData.bar.position.x =
        -(1 - percent) * 0.7;

    if (enemy.userData.health <= 0) {
        defeatEnemy(enemy);
    }
}

function defeatEnemy(enemy) {
    scene.remove(enemy);

    const index = enemies.indexOf(enemy);

    if (index !== -1) {
        enemies.splice(index, 1);
    }

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

/* ==========================================
   ENNEMIS ET TIRS ROUGES
========================================== */

function updateEnemies(delta) {
    enemies.forEach(enemy => {
        const direction = new THREE.Vector3(
            player.position.x - enemy.position.x,
            0,
            player.position.z - enemy.position.z
        );

        const distance = direction.length();

        if (distance > 0.01) {
            direction.normalize();

            if (distance > 5) {
                enemy.position.addScaledVector(
                    direction,
                    delta * 2.2
                );
            }

            enemy.rotation.y = Math.atan2(
                -direction.x,
                -direction.z
            );
        }

        enemy.userData.barGroup.lookAt(camera.position);

        enemy.userData.shootTimer -= delta;

        if (enemy.userData.shootTimer <= 0 && distance < 40) {
            enemy.userData.shootTimer = random(1.5, 3);

            const start = enemy.position.clone();
            start.y += 1.7;

            createEnemyBullet(start);
        }
    });
}

function createEnemyBullet(start) {
    const bullet = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 10, 10),
        new THREE.MeshBasicMaterial({
            color: 0xff2525
        })
    );

    bullet.position.copy(start);

    const target = player.position.clone();
    target.y += 1.5;

    const direction = target.sub(start).normalize();

    bullet.userData.velocity = direction.multiplyScalar(20);
    bullet.userData.life = 3;
    bullet.userData.enemyBullet = true;

    scene.add(bullet);
    bullets.push(bullet);
}

/* ==========================================
   MISE À JOUR DES PROJECTILES
========================================== */

function updateBullets(delta) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];

        bullet.position.addScaledVector(
            bullet.userData.velocity,
            delta
        );

        bullet.userData.life -= delta;

        if (bullet.userData.enemyBullet) {
            const playerTarget = player.position.clone();
            playerTarget.y += 1.5;

            if (bullet.position.distanceTo(playerTarget) < 0.9) {
                health = Math.max(0, health - 10);

                updateHUD();

                scene.remove(bullet);
                bullets.splice(i, 1);

                if (health <= 0) {
                    endGame();
                }

                continue;
            }
        }

        if (bullet.userData.life <= 0) {
            scene.remove(bullet);
            bullets.splice(i, 1);
        }
    }
}

/* ==========================================
   OBJETS À RAMASSER
========================================== */

function createPickup(x, z, type) {
    const color = type === "health"
        ? 0x25ee55
        : 0xffd12e;

    const item = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.8, 0.8),
        new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.2
        })
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

/* ==========================================
   FIN DE PARTIE
========================================== */

function endGame() {
    playing = false;
    paused = true;
    gameOver = true;

    if (document.pointerLockElement) {
        document.exitPointerLock();
    }

    if ($("pauseTitle")) {
        $("pauseTitle").textContent = "PARTIE TERMINÉE";
    }

    if ($("resumeButton")) {
        $("resumeButton").textContent = "RECOMMENCER";
    }

    if ($("pause")) {
        $("pause").classList.remove("hidden");
    }
}

/* ==========================================
   BOUCLE DU JEU
========================================== */

function animate() {
    requestAnimationFrame(animate);

    if (!renderer || !scene || !camera) return;

    const delta = Math.min(clock.getDelta(), 0.05);

    if (playing && !paused) {
        movePlayer(delta);
        updateEnemies(delta);
        updateBullets(delta);
        updatePickups();

        shootCooldown = Math.max(
            0,
            shootCooldown - delta
        );

        updateCamera();
    }

    renderer.render(scene, camera);
}

/* ==========================================
   REDIMENSIONNEMENT
========================================== */

function resizeGame() {
    if (!camera || !renderer) return;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );
}

/* ==========================================
   BOUTONS
   IMPORTANT : en dehors de init()
========================================== */

if ($("playButton")) {
    $("playButton").addEventListener("click", startGame);
} else {
    console.error("Bouton JOUER introuvable.");
}

if ($("resumeButton")) {
    $("resumeButton").addEventListener("click", resumeGame);
}
