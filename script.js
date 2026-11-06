
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

// SCÈNE 3D
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 25, 65);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

camera.position.set(0, 1.7, 8);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// LUMIÈRES
const soleil = new THREE.DirectionalLight(0xffffff, 2);
soleil.position.set(10, 20, 10);
soleil.castShadow = true;
scene.add(soleil);

scene.add(new THREE.HemisphereLight(0xffffff, 0x557744, 1));

// SOL
const sol = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50),
  new THREE.MeshStandardMaterial({ color: 0x478b45 })
);

sol.rotation.x = -Math.PI / 2;
sol.receiveShadow = true;
scene.add(sol);

// DÉCORATIONS ET OBSTACLES
function creerBloc(x, z, largeur, hauteur, profondeur) {
  const bloc = new THREE.Mesh(
    new THREE.BoxGeometry(largeur, hauteur, profondeur),
    new THREE.MeshStandardMaterial({ color: 0x777777 })
  );

  bloc.position.set(x, hauteur / 2, z);
  bloc.castShadow = true;
  bloc.receiveShadow = true;
  scene.add(bloc);
}

creerBloc(-8, -5, 3, 2, 3);
creerBloc(8, -5, 3, 2, 3);
creerBloc(-7, 7, 3, 2, 3);
creerBloc(7, 7, 3, 2, 3);
creerBloc(0, -12, 8, 2, 2);

// JOUEUR
let vie = 100;
let score = 0;
let munitions = 12;
let recharge = false;
let vivant = true;
let enJeu = false;

const joueur = {
  vitesse: 6,
  saut: 0,
  vitesseVerticale: 0,
  auSol: true
};

let touches = {};
let yaw = 0;
let pitch = 0;

const rayon = new THREE.Raycaster();

const ennemis = [];
const traits = [];

const vieTexte = document.getElementById("vie");
const ammoTexte = document.getElementById("ammo");
const scoreTexte = document.getElementById("score");
const menu = document.getElementById("menu");
const message = document.getElementById("message");

// CAMÉRA ET SOURIS
document.addEventListener("mousemove", e => {
  if (document.pointerLockElement !== renderer.domElement) return;

  yaw -= e.movementX * 0.002;
  pitch -= e.movementY * 0.002;

  pitch = THREE.MathUtils.clamp(
    pitch, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1
  );

  camera.rotation.order = "YXZ";
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
});

// TOUCHES
document.addEventListener("keydown", e => {
  touches[e.code] = true;

  if (e.code === "Space") {
    e.preventDefault();

    if (joueur.auSol && vivant && enJeu) {
      joueur.vitesseVerticale = 7;
      joueur.auSol = false;
    }
  }

  if (e.code === "KeyR") recharger();
});

document.addEventListener("keyup", e => {
  touches[e.code] = false;
});

// DÉPLACEMENTS
function deplacerJoueur(dt) {
  if (!enJeu || !vivant) return;

  const vitesse = touches["ShiftLeft"] ? 10 : joueur.vitesse;

  const avant = new THREE.Vector3(
    -Math.sin(yaw), 0, -Math.cos(yaw)
  );

  const droite = new THREE.Vector3(
    Math.cos(yaw), 0, -Math.sin(yaw)
  );

  const direction = new THREE.Vector3();

  if (touches["KeyW"]) direction.add(avant);
  if (touches["KeyS"]) direction.sub(avant);
  if (touches["KeyD"]) direction.add(droite);
  if (touches["KeyA"]) direction.sub(droite);

  if (direction.length() > 0) {
    direction.normalize();
    camera.position.addScaledVector(direction, vitesse * dt);
  }

  // LIMITES DE L'ARÈNE
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -23, 23);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -23, 23);

  // GRAVITÉ ET SAUT
  joueur.vitesseVerticale -= 18 * dt;
  camera.position.y += joueur.vitesseVerticale * dt;

  if (camera.position.y <= 1.7) {
    camera.position.y = 1.7;
    joueur.vitesseVerticale = 0;
    joueur.auSol = true;
  }
}

// CRÉATION DES ENNEMIS
function creerEnnemi() {
  const ennemi = new THREE.Group();

  const corps = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.45, 0.8, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0xe52b2b })
  );

  corps.position.y = 0.9;
  corps.castShadow = true;
  ennemi.add(corps);

  const tete = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xff9999 })
  );

  tete.position.y = 1.65;
  ennemi.add(tete);

  const x = Math.random() * 36 - 18;
  const z = Math.random() * 36 - 18;

  ennemi.position.set(x, 0, z);
  scene.add(ennemi);

  ennemis.push({
    objet: ennemi,
    vie: 3,
    vitesse: 1.5,
    attaque: 0
  });
}

// AJOUTER DES ENNEMIS
for (let i = 0; i < 5; i++) {
  creerEnnemi();
}

// DÉPLACEMENT DES ENNEMIS
function deplacerEnnemis(dt) {
  if (!vivant) return;

  ennemis.forEach(e => {
    const direction = new THREE.Vector3(
      camera.position.x - e.objet.position.x,
      0,
      camera.position.z - e.objet.position.z
    );

    const distance = direction.length();

    if (distance > 1.4) {
      direction.normalize();
      e.objet.position.addScaledVector(direction, e.vitesse * dt);
    } else {
      e.attaque -= dt;

      if (e.attaque <= 0) {
        vie -= 10;
        e.attaque = 1;
        vieTexte.textContent = Math.max(0, vie);

        if (vie <= 0) terminerPartie();
      }
    }
  });
}

// TIRER
function tirer() {
  if (!vivant || !enJeu || recharge || munitions <= 0) return;

  munitions--;
  ammoTexte.textContent = munitions;

  rayon.setFromCamera(new THREE.Vector2(0, 0), camera);

  const objets = ennemis.flatMap(e => e.objet.children);
  const collisions = rayon.intersectObjects(objets, true);

  let fin = rayon.ray.origin.clone().add(
    rayon.ray.direction.clone().multiplyScalar(35)
  );

  if (collisions.length > 0) {
    fin = collisions[0].point.clone();

    const cible = collisions[0].object.parent;
    const ennemi = ennemis.find(e => e.objet === cible);

    if (ennemi) {
      ennemi.vie--;

      if (ennemi.vie <= 0) {
        scene.remove(ennemi.objet);
        ennemis.splice(ennemis.indexOf(ennemi), 1);

        score++;
        scoreTexte.textContent = score;
      }
    }
  }

  // EFFET DU TIR
  const points = [
    camera.position.clone(),
    fin
  ];

  const ligne = new THREE.BufferGeometry().setFromPoints(points);

  const laser = new THREE.Line(
    ligne,
    new THREE.LineBasicMaterial({ color: 0xffff00 })
  );

  scene.add(laser);
  traits.push({ objet: laser, temps: 0.08 });
}

document.addEventListener("mousedown", e => {
  if (e.button === 0) tirer();
});

// RECHARGEMENT
function recharger() {
  if (recharge || munitions === 12 || !vivant) return;

  recharge = true;
  message.textContent = "RECHARGEMENT...";

  setTimeout(() => {
    if (!vivant) return;

    munitions = 12;
    ammoTexte.textContent = munitions;
    recharge = false;
    message.textContent = "";
  }, 1500);
}

// FIN DE PARTIE
function terminerPartie() {
  vivant = false;
  enJeu = false;

  document.exitPointerLock();

  menu.style.display = "flex";
  menu.innerHTML = `
    <h1>PARTIE TERMINÉE !</h1>
    <p>Éliminations : ${score}</p>
    <button id="start">REJOUER</button>
  `;

  document.getElementById("start").addEventListener("click", demarrer);
}

// DÉMARRER
function demarrer() {
  if (!vivant) recommencer();

  menu.style.display = "none";
  renderer.domElement.requestPointerLock();
}

document.getElementById("start").addEventListener("click", demarrer);

document.addEventListener("pointerlockchange", () => {
  enJeu = document.pointerLockElement === renderer.domElement;

  if (!enJeu && vivant) {
    menu.style.display = "flex";
    menu.innerHTML = `
      <h1>PAUSE</h1>
      <p>Clique pour reprendre</p>
      <button id="start">REPRENDRE</button>
    `;
    document.getElementById("start").addEventListener("click", demarrer);
  }
});

// RECOMMENCER
function recommencer() {
  vie = 100;
  score = 0;
  munitions = 12;
  recharge = false;
  vivant = true;

  ennemis.forEach(e => scene.remove(e.objet));
  ennemis.length = 0;

  camera.position.set(0, 1.7, 8);
  yaw = 0;
  pitch = 0;

  vieTexte.textContent = vie;
  scoreTexte.textContent = score;
  ammoTexte.textContent = munitions;
  message.textContent = "";

  for (let i = 0; i < 5; i++) creerEnnemi();
}

// BOUCLE DU JEU
let dernierTemps = 0;

function animation(temps) {
  requestAnimationFrame(animation);

  const dt = Math.min((temps - dernierTemps) / 1000, 0.05);
  dernierTemps = temps;

  if (enJeu && vivant) {
    deplacerJoueur(dt);
    deplacerEnnemis(dt);
  }

  for (let i = traits.length - 1; i >= 0; i--) {
    traits[i].temps -= dt;

    if (traits[i].temps <= 0) {
      scene.remove(traits[i].objet);
      traits[i].objet.geometry.dispose();
      traits[i].objet.material.dispose();
      traits.splice(i, 1);
    }
  }

  renderer.render(scene, camera);
}

animation(0);

// ADAPTER À LA TAILLE DE L'ÉCRAN
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});
