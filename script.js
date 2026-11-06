
window.addEventListener("DOMContentLoaded", function () {

    const menu = document.getElementById("menu");
    const fin = document.getElementById("fin");
    const boutonJouer = document.getElementById("jouer");
    const boutonRejouer = document.getElementById("rejouer");
    const erreur = document.getElementById("erreur");

    // Vérifier Three.js
    if (typeof THREE === "undefined") {
        erreur.textContent = "Erreur : Three.js ne se charge pas. Vérifie Internet.";
        boutonJouer.disabled = true;
        return;
    }

    // SCÈNE
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

    // LUMIÈRES
    const lumiere = new THREE.DirectionalLight(0xffffff, 1);
    lumiere.position.set(10, 20, 10);
    scene.add(lumiere);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // TERRAIN
    const sol = new THREE.Mesh(
        new THREE.BoxGeometry(60, 1, 60),
        new THREE.MeshStandardMaterial({ color: 0x338833 })
    );

    sol.position.y = -0.5;
    scene.add(sol);

    // BORDURES
    function mur(x, z, largeur, profondeur) {
        const objet = new THREE.Mesh(
            new THREE.BoxGeometry(largeur, 2, profondeur),
            new THREE.MeshStandardMaterial({ color: 0x555555 })
        );

        objet.position.set(x, 0.5, z);
        scene.add(objet);
    }

    mur(0, -30, 60, 1);
    mur(0, 30, 60, 1);
    mur(-30, 0, 1, 60);
    mur(30, 0, 1, 60);

    // JOUEUR
    const joueur = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.MeshStandardMaterial({ color: 0x0066ff })
    );

    joueur.position.set(0, 1, 0);
    scene.add(joueur);

    // VARIABLES
    let touches = {};
    let ennemis = [];
    let balles = [];
    let vies = 100;
    let score = 0;
    let enJeu = false;
    let dernierTir = 0;

    const vitesse = 0.18;

    // COMMANDES
    document.addEventListener("keydown", function (e) {
        const touche = e.key.toLowerCase();

        if (["w", "a", "s", "d", " "].includes(touche)) {
            e.preventDefault();
        }

        touches[touche] = true;

        if (touche === " " && enJeu && !e.repeat) {
            tirer();
        }
    });

    document.addEventListener("keyup", function (e) {
        touches[e.key.toLowerCase()] = false;
    });

    // CRÉER UN ENNEMI
    function creerEnnemi() {
        const ennemi = new THREE.Mesh(
            new THREE.BoxGeometry(2, 2, 2),
            new THREE.MeshStandardMaterial({ color: 0xff2222 })
        );

        let x, z;

        do {
            x = Math.random() * 40 - 20;
            z = Math.random() * 40 - 20;
        } while (Math.hypot(x - joueur.position.x, z - joueur.position.z) < 8);

        ennemi.position.set(x, 1, z);
        scene.add(ennemi);
        ennemis.push(ennemi);
    }

    // DÉPLACEMENT
    function deplacerJoueur() {
        if (touches["w"]) joueur.position.z -= vitesse;
        if (touches["s"]) joueur.position.z += vitesse;
        if (touches["a"]) joueur.position.x -= vitesse;
        if (touches["d"]) joueur.position.x += vitesse;

        joueur.position.x = Math.max(-27, Math.min(27, joueur.position.x));
        joueur.position.z = Math.max(-27, Math.min(27, joueur.position.z));
    }

    // ENNEMIS
    function deplacerEnnemis() {
        ennemis.forEach(function (ennemi) {
            const dx = joueur.position.x - ennemi.position.x;
            const dz = joueur.position.z - ennemi.position.z;
            const distance = Math.hypot(dx, dz);

            if (distance > 2.5) {
                ennemi.position.x += dx / distance * 0.045;
                ennemi.position.z += dz / distance * 0.045;
            } else {
                perdreVie(0.2);
            }
        });
    }

    // TIRER SUR L'ENNEMI LE PLUS PROCHE
    function tirer() {
        const maintenant = Date.now();

        if (maintenant - dernierTir < 300) return;
        dernierTir = maintenant;

        if (ennemis.length === 0) return;

        let cible = ennemis[0];
        let distanceMin = Infinity;

        ennemis.forEach(function (ennemi) {
            const distance = joueur.position.distanceTo(ennemi.position);

            if (distance < distanceMin) {
                distanceMin = distance;
                cible = ennemi;
            }
        });

        const direction = new THREE.Vector3(
            cible.position.x - joueur.position.x,
            0,
            cible.position.z - joueur.position.z
        ).normalize();

        const balle = new THREE.Mesh(
            new THREE.SphereGeometry(0.35, 12, 12),
            new THREE.MeshStandardMaterial({ color: 0xffff00 })
        );

        balle.position.set(
            joueur.position.x,
            1,
            joueur.position.z
        );

        scene.add(balle);

        balles.push({
            objet: balle,
            direction: direction,
            vie: 100
        });
    }

    // BALLES ET COLLISIONS
    function deplacerBalles() {
        for (let i = balles.length - 1; i >= 0; i--) {
            const balle = balles[i];

            balle.objet.position.add(
                balle.direction.clone().multiplyScalar(0.5)
            );

            balle.vie--;

            let touche = false;

            for (let j = ennemis.length - 1; j >= 0; j--) {
                const ennemi = ennemis[j];

                if (balle.objet.position.distanceTo(ennemi.position) < 1.5) {
                    scene.remove(ennemi);
                    ennemis.splice(j, 1);

                    scene.remove(balle.objet);
                    balles.splice(i, 1);

                    score += 10;
                    document.getElementById("score").textContent = score;

                    // Remplacer l'ennemi éliminé
                    creerEnnemi();

                    touche = true;
                    break;
                }
            }

            if (touche) continue;

            if (balle.vie <= 0) {
                scene.remove(balle.objet);
                balles.splice(i, 1);
            }
        }
    }

    // VIES
    function perdreVie(nombre) {
        if (!enJeu) return;

        vies = Math.max(0, vies - nombre);

        document.getElementById("vies").textContent =
            Math.ceil(vies);

        if (vies <= 0) {
            terminerJeu();
        }
    }

    // CAMÉRA
    function suivreJoueur() {
        camera.position.set(
            joueur.position.x,
            joueur.position.y + 18,
            joueur.position.z + 20
        );

        camera.lookAt(joueur.position);
    }

    // COMMENCER
    function commencerJeu() {
        vies = 100;
        score = 0;

        document.getElementById("vies").textContent = "100";
        document.getElementById("score").textContent = "0";

        ennemis.forEach(e => scene.remove(e));
        balles.forEach(b => scene.remove(b.objet));

        ennemis = [];
        balles = [];
        touches = {};

        joueur.position.set(0, 1, 0);

        for (let i = 0; i < 5; i++) {
            creerEnnemi();
        }

        enJeu = true;

        menu.style.display = "none";
        fin.style.display = "none";

        document.getElementById("interface").style.display = "block";
        document.getElementById("commandes").style.display = "block";

        suivreJoueur();
    }

    // FIN
    function terminerJeu() {
        enJeu = false;

        document.getElementById("scoreFinal").textContent = score;

        document.getElementById("interface").style.display = "none";
        document.getElementById("commandes").style.display = "none";

        fin.style.display = "block";
    }

    // BOUTONS
    boutonJouer.addEventListener("click", commencerJeu);
    boutonRejouer.addEventListener("click", commencerJeu);

    // BOUCLE
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

    // ÉCRAN
    window.addEventListener("resize", function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    boucleJeu();

});
