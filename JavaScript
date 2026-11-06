
const canvas = document.getElementById("jeu");
const ctx = canvas.getContext("2d");

const vieTexte = document.getElementById("vie");
const scoreTexte = document.getElementById("score");

let joueur = {
  x: 450,
  y: 275,
  rayon: 18,
  vie: 100,
  vitesse: 4
};

let ennemis = [];
let balles = [];
let touches = {};
let score = 0;
let fini = false;

document.addEventListener("keydown", e => {
  touches[e.key.toLowerCase()] = true;
});

document.addEventListener("keyup", e => {
  touches[e.key.toLowerCase()] = false;
});

canvas.addEventListener("click", e => {
  if (fini) return;

  const rect = canvas.getBoundingClientRect();

  const mx = (e.clientX - rect.left) * canvas.width / rect.width;
  const my = (e.clientY - rect.top) * canvas.height / rect.height;

  const angle = Math.atan2(my - joueur.y, mx - joueur.x);

  balles.push({
    x: joueur.x,
    y: joueur.y,
    vx: Math.cos(angle) * 8,
    vy: Math.sin(angle) * 8,
    rayon: 6
  });
});

function creerEnnemi() {
  const cote = Math.floor(Math.random() * 4);
  let x, y;

  if (cote === 0) {
    x = 0;
    y = Math.random() * canvas.height;
  } else if (cote === 1) {
    x = canvas.width;
    y = Math.random() * canvas.height;
  } else if (cote === 2) {
    x = Math.random() * canvas.width;
    y = 0;
  } else {
    x = Math.random() * canvas.width;
    y = canvas.height;
  }

  ennemis.push({
    x: x,
    y: y,
    rayon: 17,
    vie: 2,
    vitesse: 1.3
  });
}

function deplacerJoueur() {
  if (touches["z"] || touches["arrowup"]) joueur.y -= joueur.vitesse;
  if (touches["s"] || touches["arrowdown"]) joueur.y += joueur.vitesse;
  if (touches["q"] || touches["arrowleft"]) joueur.x -= joueur.vitesse;
  if (touches["d"] || touches["arrowright"]) joueur.x += joueur.vitesse;

  joueur.x = Math.max(joueur.rayon, Math.min(canvas.width - joueur.rayon, joueur.x));
  joueur.y = Math.max(joueur.rayon, Math.min(canvas.height - joueur.rayon, joueur.y));
}

function dessinerJoueur() {
  ctx.fillStyle = "#3289ff";
  ctx.beginPath();
  ctx.arc(joueur.x, joueur.y, joueur.rayon, 0, Math.PI * 2);
  ctx.fill();
}

function dessinerEnnemis() {
  ennemis.forEach(ennemi => {
    ctx.fillStyle = "#ed3434";
    ctx.beginPath();
    ctx.arc(ennemi.x, ennemi.y, ennemi.rayon, 0, Math.PI * 2);
    ctx.fill();
  });
}

function deplacerEnnemis() {
  ennemis.forEach(ennemi => {
    const angle = Math.atan2(
      joueur.y - ennemi.y,
      joueur.x - ennemi.x
    );

    ennemi.x += Math.cos(angle) * ennemi.vitesse;
    ennemi.y += Math.sin(angle) * ennemi.vitesse;

    const distance = Math.hypot(
      joueur.x - ennemi.x,
      joueur.y - ennemi.y
    );

    if (distance < joueur.rayon + ennemi.rayon) {
      joueur.vie -= 0.15;
      vieTexte.textContent = Math.max(0, Math.floor(joueur.vie));
    }
  });
}

function dessinerBalles() {
  balles.forEach(balle => {
    ctx.fillStyle = "#ffe43b";
    ctx.beginPath();
    ctx.arc(balle.x, balle.y, balle.rayon, 0, Math.PI * 2);
    ctx.fill();

    balle.x += balle.vx;
    balle.y += balle.vy;
  });

  balles = balles.filter(b =>
    b.x > 0 && b.x < canvas.width &&
    b.y > 0 && b.y < canvas.height
  );
}

function verifierCollisions() {
  for (let i = ennemis.length - 1; i >= 0; i--) {
    for (let j = balles.length - 1; j >= 0; j--) {
      const e = ennemis[i];
      const b = balles[j];

      if (Math.hypot(e.x - b.x, e.y - b.y) < e.rayon + b.rayon) {
        e.vie--;
        balles.splice(j, 1);

        if (e.vie <= 0) {
          ennemis.splice(i, 1);
          score++;
          scoreTexte.textContent = score;
        }

        break;
      }
    }
  }
}

function recommencer() {
  joueur.x = 450;
  joueur.y = 275;
  joueur.vie = 100;
  ennemis = [];
  balles = [];
  score = 0;
  fini = false;
  vieTexte.textContent = 100;
  scoreTexte.textContent = 0;
  dessiner();
}

function dessiner() {
  if (fini) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  deplacerJoueur();
  deplacerEnnemis();
  dessinerBalles();
  verifierCollisions();

  dessinerJoueur();
  dessinerEnnemis();

  if (joueur.vie <= 0) {
    fini = true;
    ctx.fillStyle = "white";
    ctx.font = "bold 45px Arial";
    ctx.textAlign = "center";
    ctx.fillText("PARTIE TERMINÉE !", 450, 260);
    return;
  }

  requestAnimationFrame(dessiner);
}

setInterval(() => {
  if (!fini && ennemis.length < 8) {
    creerEnnemi();
  }
}, 1800);

dessiner();
