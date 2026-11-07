
// ==========================================
// COMBAT 3D - SCRIPT COMPLET
// ==========================================

const $ = id => document.getElementById(id);

let scene, camera, renderer, clock;
let player, playerBody;
let enemies = [];
let bullets = [];
let enemyBullets = [];
let pickups = [];

let initialized = false;
let playing = false;
let gameOver = false;
let mouseLocked = false;

let health = 100;
let ammo = 150;
let kills = 0;

let yaw = 0;
let pitch = 0.12;

let verticalSpeed = 0;
let onGround = true;

const keys = {};
const raycaster = new THREE.Raycaster();

const WORLD_SIZE = 180;
const PLAYER_SPEED = 8;

// ==========================================
// INITIALISATION
// ==========================================

function init() {
    if (initialized) return;

    if (!window.THREE) {
        alert("Three.js n'est pas chargé.");
        return;
    }

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
    animate();
}

// ==========================================
// LUMIÈRES
// ==========================================

function createLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(30, 60, 20);
    scene.add(sun);
}

// ==========================================
// MONDE
// ==========================================

function createWorld() {
    const groundGeometry = new THREE.PlaneGeometry(
        WORLD_SIZE,
        WORLD_SIZE
    );

    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x388c36
    });

    const ground = new THREE.Mesh(
        groundGeometry,
        groundMaterial
    );

    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    scene.add(ground);

    // Route
    const road = new THREE.Mesh(
        new THREE.BoxGeometry(12, 0.08, WORLD_SIZE),
        new THREE.MeshStandardMaterial({
            color: 0x444444
        })
    );

    road.position.y = 0;
    scene.add(road);

    // Lignes de route
    for (let z = -80; z <= 80; z += 12) {
        const line = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.1, 5),
            new THREE.MeshStandardMaterial({
                color: 0xffffff
            })
        );

        line.position.set(0, 0.06, z);
        scene.add(line);
    }

    // Arbres
    for (let i = 0; i < 45; i++) {
        const x = (Math.random() - 0.5) * 150;
        const z = (Math.random() - 0.5) * 150;

        if (Math.abs(x) < 12) continue;

        createTree(x, z);
    }

    // Maisons
    createHouse(-30, -25);
    createHouse(35, -35);
    createHouse(-35, 35);
    createHouse(35, 30);

    // Caisses
    for (let i = 0; i < 20; i++) {
        const box = new THREE.Mesh(
            new THREE.BoxGeometry(2, 2, 2),
            new THREE.MeshStandardMaterial({
                color: 0x98652f
            })
        );

        box.position.set(
            (Math.random() - 0.5) * 100,
            1,
            (Math.random() - 0.5) * 100
        );

        scene.add(box);
    }
}

function createTree(x, z) {
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.5, 3),
        new THREE.MeshStandardMaterial({
            color: 0x704020
        })
    );

    trunk.position.set(x, 1.5, z);
    scene.add(trunk);

    const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(2.2, 5, 8),
        new THREE.MeshStandardMaterial({
            color: 0x176b25
        })
    );

    leaves.position.set(x, 5, z);
    scene.add(leaves);
}

function createHouse(x, z) {
    const house = new THREE.Mesh(
        new THREE.BoxGeometry(10, 7, 10),
        new THREE.MeshStandardMaterial({
            color: 0xc5a477
        })
    );

    house.position.set(x, 3.5, z);
    scene.add(house);

    const roof = new THREE.Mesh(
        new THREE.ConeGeometry(8, 4, 4),
        new THREE.MeshStandardMaterial({
            color: 0x8b2929
        })
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
        new THREE.MeshStandardMaterial({
            color: 0x1769aa
        })
    );

    body.position.y = 1.2;
    player.add(body);

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 16, 16),
        new THREE.MeshStandardMaterial({
            color: 0xffc99c
        })
    );

    head.position.y = 2.35;
    player.add(head);

    // Fusil
    const rifle = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.18, 1.5),
        new THREE.MeshStandardMaterial({
            color: 0x222222
        })
    );

    rifle.position.set(0.65, 1.6, -0.5);
    player.add(rifle);

    player.position.set(0, 0, 0);

    playerBody = body;
    scene.add(player);
}

// ==========================================
// ENNEMIS
// ==========================================

function createEnemies() {
    for (let i = 0; i < 8; i++) {
        createEnemy(
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 100
        );
    }
}

function createEnemy(x, z) {
    const enemy = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1.8, 0.7),
        new THREE.MeshStandardMaterial({
            color: 0xc62828
        })
    );

    body.position.y = 1.2;
    enemy.add(body);

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 16, 16),
        new THREE.MeshStandardMaterial({
            color: 0xffc99c
        })
    );

    head.position.y = 2.35;
    enemy.add(head);

    const rifle = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.15, 1.2),
        new THREE.MeshStandardMaterial({
            color: 0x222222
        })
    );

    rifle.position.set(0.55, 1.6, -0.4);
    enemy.add(rifle);

    enemy.position.set(x, 0, z);

    enemy.userData.health = 100;
    enemy.userData.shootTimer = Math.random() * 2;

    const bar = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.12, 0.1),
        new THREE.MeshBasicMaterial({
            color: 0x00ff00
        })
    );

    bar.position.y = 3;
    enemy.add(bar);

    enemy.userData.healthBar = bar;

    scene.add(enemy);
    enemies.push(enemy);
}

// ==========================================
// COMMANDES
// ==========================================

function setupControls() {
    document.addEventListener("keydown", event => {
        const key = event.key.toLowerCase();

        keys[key] = true;

        if (
            ["w", "a", "s", "d", "z", " "].includes(key)
        ) {
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

    renderer.domElement.addEventListener("click", () => {
        if (playing && !mouseLocked) {
            lockMouse();
        }
    });

    document.addEventListener("mousemove", event => {
        if (!mouseLocked || !playing) return;

        yaw -= event.movementX * 0.0025;
        pitch -= event.movementY * 0.0025;

        pitch = Math.max(
            -0.65,
            Math.min(0.65, pitch)
        );
    });

    document.addEventListener("pointerlockchange", () => {
        mouseLocked =
            document.pointerLockElement === renderer.domElement;

        if (!mouseLocked && playing) {
            playing = false;
            clearKeys();
            showPause();
        }
    });

    document.addEventListener("pointerlockerror", () => {
        console.warn("Le verrouillage de la souris a échoué.");
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
    if (!renderer) return;

    renderer.domElement.requestPointerLock();
}

// ==========================================
// CAMÉRA À LA FORTNITE
// ==========================================

function updateCamera() {
    const distance = 7;
    const height = 3;

    const offsetX = Math.sin(yaw) * distance;
    const offsetZ = Math.cos(yaw) * distance;

    camera.position.set(
        player.position.x + offsetX,
        player.position.y + height + pitch * 3,
        player.position.z + offsetZ
    );

    const lookX = player.position.x - Math.sin(yaw) * 10;
    const lookY = player.position.y + 2 + pitch * 5;
    const lookZ = player.position.z - Math.cos(yaw) * 10;

    camera.lookAt(lookX, lookY, lookZ);

    player.rotation.y = yaw + Math.PI;
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

    // CORRECTION : A = GAUCHE, D = DROITE
    if (keys["a"]) {
        direction.sub(right);
    }

    if (keys["d"]) {
        direction.add(right);
    }

    if (direction.length() > 0) {
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

    const hits = raycaster.intersectObjects(
        targets,
        false
    );

    if (hits.length > 0) {
        let target = hits[0].object;

        while (
            target.parent &&
            !enemies.includes(target.parent)
        ) {
            target = target.parent;
        }

        const enemy = target.parent;

        if (enemies.includes(enemy)) {
            damageEnemy(enemy, 25);
        }
    }

    createShotEffect();
}

function createShotEffect() {
    const flash = new THREE.PointLight(
        0xffcc55,
        2,
        5
    );

    flash.position.copy(camera.position);
    scene.add(flash);

    setTimeout(() => {
        scene.remove(flash);
    }, 70);
}

// ==========================================
// DÉGÂTS AUX ENNEMIS
// ==========================================

function damageEnemy(enemy, damage) {
    enemy.userData.health -= damage;

    const percent = Math.max(
        0,
        enemy.userData.health / 100
    );

    enemy.userData.healthBar.scale.x = percent;

    if (enemy.userData.health <= 0) {
        killEnemy(enemy);
    }
}

function killEnemy(enemy) {
    scene.remove(enemy);

    enemies = enemies.filter(item => item !== enemy);

    kills++;

    if (Math.random() > 0.5) {
        createPickup(
            enemy.position.clone(),
            "health"
        );
    } else {
        createPickup(
            enemy.position.clone(),
            "ammo"
        );
    }

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
        const distance = enemy.position.distanceTo(
            player.position
        );

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

        if (
            enemy.userData.shootTimer <= 0 &&
            distance < 35
        ) {
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

    const bullet = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        new THREE.MeshBasicMaterial({
            color: 0xff3333
        })
    );

    bullet.position.copy(enemy.position);
    bullet.position.y += 1.5;

    scene.add(bullet);

    enemyBullets.push({
        mesh: bullet,
        direction: direction,
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
    const color = type === "health"
        ? 0x00ff55
        : 0xffcc00;

    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.8, 0.8),
        new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3
        })
    );

    mesh.position.copy(position);
    mesh.position.y = 0.8;

    scene.add(mesh);

    pickups.push({
        mesh: mesh,
        type: type
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

    pickups = pickups.filter(
        pickup => !pickup.collected
    );
}

// ==========================================
// INTERFACE
// ==========================================

function updateHUD() {
    if ($("health")) {
        $("health").textContent = health;
    }

    if ($("ammo")) {
        $("ammo").textContent = ammo;
    }

    if ($("kills")) {
        $("kills").textContent = kills;
    }
}

// ==========================================
// PAUSE
// ==========================================

function showPause() {
    playing = false;
    clearKeys();

    if ($("pause")) {
        $("pause").classList.remove("hidden");
    }

    if ($("resumeButton")) {
        $("resumeButton").textContent = "REPRENDRE";
    }
}

function resumeGame() {
    if (!initialized) return;

    if (gameOver) {
        resetGame();
    }

    if ($("pause")) {
        $("pause").classList.add("hidden");
    }

    if ($("menu")) {
        $("menu").classList.add("hidden");
    }

    playing = true;
    lockMouse();
}

// ==========================================
// DÉMARRER LA PARTIE
// ==========================================

function startGame() {
    init();

    if (!initialized) return;

    health = 100;
    ammo = 150;
    kills = 0;
    gameOver = false;

    updateHUD();

    if ($("menu")) {
        $("menu").classList.add("hidden");
    }

    if ($("hud")) {
        $("hud").classList.remove("hidden");
    }

    if ($("crosshair")) {
        $("crosshair").classList.remove("hidden");
    }

    if ($("pause")) {
        $("pause").classList.add("hidden");
    }

    playing = true;
    lockMouse();
}

// ==========================================
// FIN DE PARTIE
// ==========================================

function finishGame() {
    gameOver = true;
    playing = false;

    clearKeys();

    if (document.pointerLockElement) {
        document.exitPointerLock();
    }

    if ($("pause")) {
        $("pause").classList.remove("hidden");
    }

    if ($("resumeButton")) {
        $("resumeButton").textContent = "RECOMMENCER";
    }

    if ($("status")) {
        $("status").textContent = "TU AS PERDU";
    }
}

// ==========================================
// RECOMMENCER
// ==========================================

function resetGame() {
    bullets.forEach(bullet => scene.remove(bullet.mesh));
    enemyBullets.forEach(bullet => scene.remove(bullet.mesh));
    pickups.forEach(pickup => scene.remove(pickup.mesh));
    enemies.forEach(enemy => scene.remove(enemy));

    bullets = [];
    enemyBullets = [];
    pickups = [];
    enemies = [];

    health = 100;
    ammo = 150;
    kills = 0;

    yaw = 0;
    pitch = 0.12;

    verticalSpeed = 0;
    onGround = true;

    player.position.set(0, 0, 0);

    createEnemies();
    updateHUD();

    gameOver = false;
}

// ==========================================
// REDIMENSIONNEMENT
// ==========================================

function resizeGame() {
    if (!camera || !renderer) return;

    camera.aspect =
        window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );
}

// ==========================================
// BOUCLE DU JEU
// ==========================================

function animate() {
    requestAnimationFrame(animate);

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
