
"use strict";

// ==========================================
// COMBAT 3D
// Caméra horizontale style Roblox
// ==========================================

const $ = id => document.getElementById(id);

let scene;
let camera;
let renderer;
let clock;
let player;

let enemies = [];
let enemyBullets = [];
let pickups = [];

let initialized = false;
let animationStarted = false;
let playing = false;
let gameOver = false;
let mouseLocked = false;

let health = 100;
let ammo = 150;
let kills = 0;

let yaw = 0;
let verticalSpeed = 0;
let onGround = true;

const keys = Object.create(null);
const raycaster = new THREE.Raycaster();

const WORLD_SIZE = 180;
const PLAYER_SPEED = 8;

// ==========================================
// INITIALISATION
// ==========================================

function init() {
    if (initialized) return;

    try {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);
        scene.fog = new THREE.Fog(0x87ceeb, 70, 180);

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

        if (!animationStarted) {
            animationStarted = true;
            animate();
        }
    } catch (error) {
        console.error("Erreur pendant l'initialisation :", error);
        showError("Le jeu n'a pas pu démarrer. Recharge la page.");
    }
}

// ==========================================
// LUMIÈRES
// ==========================================

function createLights() {
    scene.add(new THREE.HemisphereLight(
        0xffffff,
        0x557744,
        1.2
    ));

    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(30, 60, 20);
    scene.add(sun);
}

// ==========================================
// MONDE
// ==========================================

function createWorld() {
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE),
        new THREE.MeshStandardMaterial({ color: 0x388c36 })
    );

    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    scene.add(ground);

    const road = new THREE.Mesh(
        new THREE.BoxGeometry(12, 0.08, WORLD_SIZE),
        new THREE.MeshStandardMaterial({ color: 0x444444 })
    );

    road.position.y = 0;
    scene.add(road);

    for (let z = -80; z <= 80; z += 12) {
        const line = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.1, 5),
            new THREE.MeshStandardMaterial({ color: 0xffffff })
        );

        line.position.set(0, 0.06, z);
        scene.add(line);
    }

    for (let i = 0; i < 45; i++) {
        const x = (Math.random() - 0.5) * 150;
        const z = (Math.random() - 0.5) * 150;

        if (Math.abs(x) < 12) continue;
        createTree(x, z);
    }

    createHouse(-30, -25);
    createHouse(35, -35);
    createHouse(-35, 35);
    createHouse(35, 30);

    for (let i = 0; i < 20; i++) {
        const crate = new THREE.Mesh(
            new THREE.BoxGeometry(2, 2, 2),
            new THREE.MeshStandardMaterial({ color: 0x98652f })
        );

        crate.position.set(
            (Math.random() - 0.5) * 100,
            1,
            (Math.random() - 0.5) * 100
        );

        scene.add(crate);
    }
}

function createTree(x, z) {
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.5, 3),
        new THREE.MeshStandardMaterial({ color: 0x704020 })
    );

    trunk.position.set(x, 1.5, z);
    scene.add(trunk);

    const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(2.2, 5, 8),
        new THREE.MeshStandardMaterial({ color: 0x176b25 })
    );

    leaves.position.set(x, 5, z);
    scene.add(leaves);
}

function createHouse(x, z) {
    const house = new THREE.Mesh(
        new THREE.BoxGeometry(10, 7, 10),
        new THREE.MeshStandardMaterial({ color: 0xc5a477 })
    );

    house.position.set(x, 3.5, z);
    scene.add(house);

    const roof = new THREE.Mesh(
        new THREE.ConeGeometry(8, 4, 4),
        new THREE.MeshStandardMaterial({ color: 0x8b2929 })
    );

    roof.position.set(x, 9, z);
    roof.rotation.y = Math.PI / 4;
    scene.add(roof);
}

// ==========================================
// JOUEUR
// ==========================================

function createPlayer() {
    player = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 1.8, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x1769aa })
    );

    body.position.y = 1.2;
    player.add(body);

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xffc99c })
    );

    head.position.y = 2.35;
    player.add(head);

    const rifle = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.18, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x222222 })
    );

    rifle.position.set(0.65, 1.6, -0.5);
    player.add(rifle);

    player.position.set(0, 0, 0);
    scene.add(player);
}

// ==========================================
// ENNEMIS
// ==========================================

function createEnemies() {
    for (let i = 0; i < 8; i++) {
        let x = (Math.random() - 0.5) * 100;
        let z = (Math.random() - 0.5) * 100;

        // Évite de faire apparaître un ennemi sur le joueur.
        if (Math.hypot(x, z) < 15) {
            x += 25;
        }

        createEnemy(x, z);
    }
}

function createEnemy(x, z) {
    const enemy = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1.8, 0.7),
        new THREE.MeshStandardMaterial({ color: 0xc62828 })
    );

    body.position.y = 1.2;
    body.userData.enemyGroup = enemy;
    enemy.add(body);

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xffc99c })
    );

    head.position.y = 2.35;
    head.userData.enemyGroup = enemy;
    enemy.add(head);

    const rifle = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.15, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x222222 })
    );

    rifle.position.set(0.55, 1.6, -0.4);
    rifle.userData.enemyGroup = enemy;
    enemy.add(rifle);

    enemy.position.set(x, 0, z);
    enemy.userData.health = 100;
    enemy.userData.shootTimer = 1 + Math.random() * 2;

    const healthBar = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.12, 0.1),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );

    healthBar.position.y = 3;
    enemy.add(healthBar);
    enemy.userData.healthBar = healthBar;

    scene.add(enemy);
    enemies.push(enemy);
}

// ==========================================
// COMMANDES CLAVIER ET SOURIS
// ==========================================

function setupControls() {
    document.addEventListener("keydown", event => {
        const key = event.key.toLowerCase();

        keys[key] = true;

        if (["w", "a", "s", "d", "z", " "].includes(key)) {
            event.preventDefault();
        }

        if (key === "escape" && playing) {
            showPause();
        }

        if (key === "e" && !playing) {
            resumeGame();
        }
    });

    document.addEventListener("keyup", event => {
        keys[event.key.toLowerCase()] = false;
    });

    window.addEventListener("blur", clearKeys);

    renderer.domElement.addEventListener("click", () => {
        if (playing && !mouseLocked) {
            lockMouse();
        }
    });

    // IMPORTANT :
    // On utilise uniquement movementX.
    // movementY est totalement ignoré.
    document.addEventListener("mousemove", event => {
        if (!mouseLocked || !playing) return;

        yaw -= event.movementX * 0.0025;
    });

    document.addEventListener("pointerlockchange", () => {
        mouseLocked =
            document.pointerLockElement === renderer.domElement;

        if (!mouseLocked && playing) {
            showPause();
        }
    });

    document.addEventListener("pointerlockerror", () => {
        showError("La souris n'a pas pu se verrouiller. Clique dans le jeu pour réessayer.");
    });

    document.addEventListener("mousedown", event => {
        if (
            event.button === 0 &&
            playing &&
            mouseLocked
        ) {
            shoot();
        }
    });

    $("playButton").addEventListener("click", startGame);
    $("resumeButton").addEventListener("click", resumeGame);
}

function clearKeys() {
    for (const key in keys) {
        keys[key] = false;
    }
}

function lockMouse() {
    if (!renderer || !renderer.domElement.requestPointerLock) {
        showError("Ton navigateur ne permet pas de verrouiller la souris.");
        return;
    }

    renderer.domElement.requestPointerLock();
}

// ==========================================
// CAMÉRA HORIZONTALE STYLE ROBLOX
// ==========================================

function updateCamera() {
    const distance = 7;
    const height = 3.2;

    const offsetX = Math.sin(yaw) * distance;
    const offsetZ = Math.cos(yaw) * distance;

    // La hauteur de la caméra ne dépend jamais de la souris.
    camera.position.set(
        player.position.x + offsetX,
        player.position.y + height,
        player.position.z + offsetZ
    );

    // La caméra regarde toujours au même niveau.
    camera.lookAt(
        player.position.x,
        player.position.y + 1.8,
        player.position.z
    );

    player.rotation.y = yaw;
}

// ==========================================
// DÉPLACEMENT DU JOUEUR
// ==========================================

function updatePlayer(delta) {
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

    const direction = new THREE.Vector3();

    if (keys["w"] || keys["z"]) {
        direction.add(forward);
    }

    if (keys["s"]) {
        direction.sub(forward);
    }

    // A = GAUCHE
    if (keys["a"]) {
        direction.sub(right);
    }

    // D = DROITE
    if (keys["d"]) {
        direction.add(right);
    }

    if (direction.lengthSq() > 0) {
        direction.normalize();
        player.position.addScaledVector(
            direction,
            PLAYER_SPEED * delta
        );
    }

    if (keys[" "] && onGround) {
        verticalSpeed = 8;
        onGround = false;
    }

    verticalSpeed -= 20 * delta;
    player.position.y += verticalSpeed * delta;

    if (player.position.y < 0) {
        player.position.y = 0;
        verticalSpeed = 0;
        onGround = true;
    }

    player.position.x = THREE.MathUtils.clamp(
        player.position.x,
        -WORLD_SIZE / 2,
        WORLD_SIZE / 2
    );

    player.position.z = THREE.MathUtils.clamp(
        player.position.z,
        -WORLD_SIZE / 2,
        WORLD_SIZE / 2
    );
}

// ==========================================
// TIR DU JOUEUR
// ==========================================

function shoot() {
    if (ammo <= 0) return;

    ammo--;
    updateHUD();

    raycaster.setFromCamera(
        new THREE.Vector2(0, 0),
        camera
    );

    const targets = [];

    enemies.forEach(enemy => {
        enemy.traverse(object => {
            if (object.isMesh) {
                targets.push(object);
            }
        });
    });

    const hits = raycaster.intersectObjects(targets, false);

    if (hits.length > 0) {
        const enemy = hits[0].object.userData.enemyGroup;

        if (enemy && enemies.includes(enemy)) {
            damageEnemy(enemy, 25);
        }
    }

    createShotEffect();
}

function createShotEffect() {
    const flash = new THREE.PointLight(0xffcc55, 2, 5);
    flash.position.copy(camera.position);
    scene.add(flash);

    setTimeout(() => {
        scene.remove(flash);
    }, 70);
}

// ==========================================
// DÉGÂTS ET ÉLIMINATIONS
// ==========================================

function damageEnemy(enemy, damage) {
    enemy.userData.health -= damage;

    const percent = Math.max(0, enemy.userData.health / 100);
    enemy.userData.healthBar.scale.x = percent;

    if (enemy.userData.health <= 0) {
        killEnemy(enemy);
    }
}

function killEnemy(enemy) {
    const position = enemy.position.clone();

    scene.remove(enemy);
    enemies = enemies.filter(item => item !== enemy);

    kills++;

    createPickup(
        position,
        Math.random() > 0.5 ? "health" : "ammo"
    );

    updateHUD();

    if (enemies.length === 0) {
        createEnemies();
    }
}

// ==========================================
// IA DES ENNEMIS
// ==========================================

function updateEnemies(delta) {
    enemies.forEach(enemy => {
        const distance = enemy.position.distanceTo(player.position);

        if (distance > 8) {
            const direction = new THREE.Vector3()
                .subVectors(player.position, enemy.position);

            direction.y = 0;
            direction.normalize();

            enemy.position.addScaledVector(
                direction,
                2.2 * delta
            );
        }

        enemy.lookAt(
            player.position.x,
            enemy.position.y,
            player.position.z
        );

        enemy.userData.shootTimer -= delta;

        if (enemy.userData.shootTimer <= 0 && distance < 35) {
            enemy.userData.shootTimer = 2.2;
            enemyShoot(enemy);
        }
    });
}

function enemyShoot(enemy) {
    const direction = new THREE.Vector3()
        .subVectors(player.position, enemy.position);

    direction.y += 1;
    direction.normalize();

    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff3333 })
    );

    mesh.position.copy(enemy.position);
    mesh.position.y += 1.5;
    scene.add(mesh);

    enemyBullets.push({
        mesh,
        direction,
        life: 3
    });
}

// ==========================================
// BALLES ENNEMIES
// ==========================================

function updateEnemyBullets(delta) {
    enemyBullets.forEach(bullet => {
        bullet.mesh.position.addScaledVector(
            bullet.direction,
            25 * delta
        );

        bullet.life -= delta;

        if (
            bullet.mesh.position.distanceTo(player.position) < 1.3
        ) {
            health -= 10;
            bullet.life = 0;
            updateHUD();

            if (health <= 0) {
                finishGame();
            }
        }

        if (bullet.life <= 0) {
            scene.remove(bullet.mesh);
        }
    });

    enemyBullets = enemyBullets.filter(
        bullet => bullet.life > 0
    );
}

// ==========================================
// OBJETS À RAMASSER
// ==========================================

function createPickup(position, type) {
    const color = type === "health" ? 0x00ff55 : 0xffcc00;

    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.8, 0.8),
        new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.3
        })
    );

    mesh.position.copy(position);
    mesh.position.y = 0.8;
    scene.add(mesh);

    pickups.push({
        mesh,
        type,
        collected: false
    });
}

function updatePickups(delta) {
    pickups.forEach(pickup => {
        pickup.mesh.rotation.y += delta * 2;

        if (
            pickup.mesh.position.distanceTo(player.position) < 2
        ) {
            if (pickup.type === "health") {
                health = Math.min(100, health + 35);
            } else {
                ammo += 30;
            }

            scene.remove(pickup.mesh);
            pickup.collected = true;
            updateHUD();
        }
    });

    pickups = pickups.filter(pickup => !pickup.collected);
}

// ==========================================
// AFFICHAGE DES INFORMATIONS
// ==========================================

function updateHUD() {
    $("health").textContent = health;
    $("ammo").textContent = ammo;
    $("kills").textContent = kills;
}

function showError(message) {
    const box = $("errorMessage");
    if (!box) return;

    box.textContent = message;
    box.classList.remove("hidden");
}

// ==========================================
// PAUSE
// ==========================================

function showPause() {
    playing = false;
    clearKeys();

    $("pause").classList.remove("hidden");

    $("pauseTitle").textContent =
        gameOver ? "TU AS PERDU" : "PAUSE";

    $("resumeButton").textContent =
        gameOver ? "RECOMMENCER" : "REPRENDRE";
}

// ==========================================
// REPRENDRE
// ==========================================

function resumeGame() {
    if (!initialized) return;

    if (gameOver) {
        resetGame();
    }

    $("pause").classList.add("hidden");
    $("menu").classList.add("hidden");

    playing = true;
    lockMouse();
}

// ==========================================
// DÉMARRER
// ==========================================

function startGame() {
    init();

    if (!initialized) return;

    resetGame();

    $("menu").classList.add("hidden");
    $("pause").classList.add("hidden");
    $("hud").classList.remove("hidden");
    $("crosshair").classList.remove("hidden");

    playing = true;
    lockMouse();
}

// ==========================================
// FIN DE PARTIE
// ==========================================

function finishGame() {
    if (gameOver) return;

    gameOver = true;
    playing = false;
    clearKeys();

    if (document.pointerLockElement) {
        document.exitPointerLock();
    }

    showPause();
}

// ==========================================
// RECOMMENCER UNE PARTIE
// ==========================================

function resetGame() {
    enemies.forEach(enemy => scene.remove(enemy));
    enemyBullets.forEach(bullet => scene.remove(bullet.mesh));
    pickups.forEach(pickup => scene.remove(pickup.mesh));

    enemies = [];
    enemyBullets = [];
    pickups = [];

    health = 100;
    ammo = 150;
    kills = 0;

    yaw = 0;
    verticalSpeed = 0;
    onGround = true;

    player.position.set(0, 0, 0);

    gameOver = false;

    createEnemies();
    updateHUD();
}

// ==========================================
// REDIMENSIONNEMENT DE LA FENÊTRE
// ==========================================

function resizeGame() {
    if (!camera || !renderer) return;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );
}

// ==========================================
// BOUCLE PRINCIPALE
// ==========================================

function animate() {
    requestAnimationFrame(animate);

    if (!renderer || !clock) return;

    const delta = Math.min(clock.getDelta(), 0.05);

    if (playing) {
        updatePlayer(delta);
        updateEnemies(delta);
        updateEnemyBullets(delta);
        updatePickups(delta);
        updateCamera();
    }

    renderer.render(scene, camera);
}
