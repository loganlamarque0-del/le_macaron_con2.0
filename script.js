// =================================
// CONFIGURATION DU JEU
// =================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

document.getElementById("jeu").appendChild(renderer.domElement);

// Lumières
const lumiere = new THREE.DirectionalLight(0xffffff, 1);
lumiere.position.set(10, 20, 10);
scene.add(lumiere);

scene.add(new THREE.AmbientLight(0xffffff, 0.5));

// =================================
// TERRAIN
// =================================

const sol = new THREE.Mesh(
    new THREE.BoxGeometry(60, 1, 60),
    new THREE.MeshStandardMaterial({ color: 0x338833 })
);

sol.position.y = -0.5;
scene.add(sol);

// Limites de l'arène
const bordure = new THREE.Mesh(
    new THREE.BoxGeometry(60, 2, 1),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
);

bordure.position.set(0, 0.5, -30);
scene.add(bordure);

const bordure2 = bordure.clone();
bordure2.position.z = 30;
scene.add(bordure2);

const bordure3 = new THREE.Mesh(
    new THREE.BoxGeometry(1, 2, 60),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
);

bordure3.position.x = -30;
scene.add(bordure3);

const bordure4 = bordure3.clone();
bordure4.position.x = 30;
scene.add(bordure4);

// =================================
// JOUEUR
// =================================

const joueur = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 2),
    new THREE.MeshStandardMaterial({ color: 0x0066ff })
);

joueur.position.set(0, 1, 0);
scene.add(joueur);

// =================================
// VARIABLES
// =================================

let touches = {};
let ennemis = [];
let balles = [];

let vies = 100;
let score = 0;
let enJeu = false;

const vitesse = 0.18;

// =================================
// COMMANDES FORTNITE
// =================================

document.addEventListener("keydown", function(e) {
    const touche = e.key.toLowerCase();

    touches[touche] = true;

    if (["w", "a", "s", "d", " "].includes(touche)) {
        e.preventDefault();
    }

    if (touche === " " && enJeu && !e.repeat) {
        tirer();
    }
});

document.addEventListener("keyup", function(e) {
    touches[e.key.toLowerCase()] = false;
});

// =================================
// DÉPLACEMENT DU JOUEUR
// =================================

function deplacerJoueur() {

    if (touches["w"]) joueur.position.z -= vitesse;
    if (touches["s"]) joueur.position.z += vitesse;
    if (touches["a"]) joueur.position.x -= vitesse;
    if (touches["d"]) joueur.position.x += vitesse;

    // Empêcher de sortir de l'arène
    joueur.position.x = Math.max(-27, Math.min(27, joueur.position.x));
    joueur.position.z = Math.max(-27, Math.min(27, joueur.position.z));
}

// =================================
// CRÉATION DES ENNEMIS
// =================================

function creerEnnemi() {

    const ennemi = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.MeshStandardMaterial({ color: 0xff2222 })
    );

    ennemi.position.set(
        Math.random() * 40 - 20,
        1,
        Math.random() * 40 - 20
    );

    scene.add(ennemi);
    ennemis.push(ennemi);
}

// =================================
// DÉPLACEMENT DES ENNEMIS
// =================================

function deplacerEnnemis() {

    ennemis.forEach(function(ennemi) {

        const direction = new THREE.Vector3()
            .subVectors(joueur.position, ennemi.position);

        const distance = direction.length();

        if (distance > 2) {
            direction.normalize();
            ennemi.position.add(direction.multiplyScalar(0.045));
        }

        if (distance < 2.5) {
            perdreVie(0.2);
        }
    });
}

// =================================
// TIRER
// =================================

function tirer() {

    if (ennemis.length === 0) return;

    // Trouver l'ennemi le plus proche
    let cible = ennemis[0];
    let distanceMin = Infinity;

    ennemis.forEach(function(ennemi) {
        const distance = joueur.position.distanceTo(ennemi.position);

        if (distance < distanceMin) {
            distanceMin = distance;
            cible = ennemi;
        }
    });

    const balle = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xffff00 })
    );

    balle.position.copy(joueur.position);
    balle.position.y = 1;

    const direction = new THREE.Vector3()
        .subVectors(cible.position, balle.position)
        .normalize();

    scene.add(balle);

    balles.push({
        objet: balle,
        direction: direction,
        vie: 100
    });
}

// =================================
// DÉPLACEMENT DES BALLES
// =================================

function deplacerBalles() {

    for (let i = balles.length - 1; i >= 0; i--) {

        const balle = balles[i];

        balle.objet.position.add(
            balle.direction.clone().multiplyScalar(0.5)
        );

        balle.vie--;

        let toucheEnnemi = false;

        for (let j = ennemis.length - 1; j >= 0; j--) {

            const ennemi = ennemis[j];

            if (balle.objet.position.distanceTo(ennemi.position) < 1.5) {

                scene.remove(ennemi);
                ennemis.splice(j, 1);

                scene.remove(balle.objet);
                balles.splice(i, 1);

                score += 10;
                document.getElementById("score").textContent = score;

                toucheEnnemi = true;
                break;
            }
        }

        if (toucheEnnemi) continue;

        if (balle.vie <= 0) {
            scene.remove(balle.objet);
            balles.splice(i, 1);
        }
    }
}

// =================================
// VIES
// =================================

function perdreVie(nombre) {

    vies -= nombre;

    if (vies < 0) vies = 0;

    document.getElementById("vies").textContent = Math.ceil(vies);

    if (vies <= 0) {
        terminerJeu();
    }
}

// =================================
// CAMÉRA
// =================================

function suivreJoueur() {

    camera.position.set(
        joueur.position.x,
        joueur.position.y + 18,
        joueur.position.z + 20
    );

    camera.lookAt(joueur.position);
}

// =================================
// BOUCLE DU JEU
// =================================

function boucleJeu() {

    requestAnimationFrame(boucleJeu);

    if (enJeu) {

        deplacerJoueur();
        deplacerEnnemis();
        deplacerBalles();
        suivreJoueur();

    }

    renderer.render(scene, camera);
}

// =================================
// COMMENCER LE JEU
// =================================

function commencerJeu() {

    vies = 100;
    score = 0;

    document.getElementById("vies").textContent = "100";
    document.getElementById("score").textContent = "0";

    // Nettoyer les anciens ennemis
    ennemis.forEach(e => scene.remove(e));
    ennemis = [];

    // Nettoyer les anciennes balles
    balles.forEach(b => scene.remove(b.objet));
    balles = [];

    joueur.position.set(0, 1, 0);

    for (let i = 0; i < 5; i++) {
        creerEnnemi();
    }

    enJeu = true;

    document.getElementById("menu").style.display = "none";
    document.getElementById("fin").style.display = "none";
    document.getElementById("interface").style.display = "block";

    suivreJoueur();
}

// =================================
// TERMINER LE JEU
// =================================

function terminerJeu() {

    enJeu = false;

    document.getElementById("fin").style.display = "block";
    document.getElementById("interface").style.display = "none";

    document.getElementById("scoreFinal").textContent = score;
}

// =================================
// BOUTONS JOUER ET REJOUER
// =================================

// On relie les boutons à leurs fonctions
document.getElementById("jouer").addEventListener("click", commencerJeu);
document.getElementById("rejouer").addEventListener("click", commencerJeu);

// =================================
// ADAPTATION DE L'ÉCRAN
// =================================

window.addEventListener("resize", function() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

});

// Lancer la boucle
boucleJeu();
