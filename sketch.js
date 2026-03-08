/*
  Week 6 — Side Quest: Sound + Physics Feedback
  Base: Example 1 (Sprites, Sprite Sheets, & Animation)

  Course: GBDA302 | Instructors: Dr. Karen Cochrane & David Han
  Date: Feb. 26, 2026

  What's new (Week 6 additions):
    - Gravity + ground platform make the world physical
    - Player can now move and jump with real velocity
    - Collectible gems trigger THREE reactive feedback effects:
        1. Synthesized pickup sound (p5.Oscillator)
        2. Particle burst at the gem's position
        3. Brief screen shake for impact feeling
    - Gems respawn every few seconds in new positions
    - Press R to restart at any time
    - Score + high score + wave counter HUD

  Controls:
    A / D  or  Left / Right Arrow    Horizontal movement
    W  or  Up Arrow                  Jump
    Space Bar                        Attack
    R                                Restart
*/

// ─── SPRITES & IMAGES ───────────────────────────────────
let player;
let playerImg;
let ground;
let gems; // p5play Group for collectible gems

let playerAnis = {
  idle:   { row: 0, frames: 4, frameDelay: 10 },
  run:    { row: 1, frames: 4, frameDelay: 3 },
  jump:   { row: 2, frames: 3, frameDelay: 8, frame: 0 },
  attack: { row: 3, frames: 6, frameDelay: 2 },
};

// ─── LEVEL CONSTANTS ────────────────────────────────────
const VIEWW = 320, VIEWH = 180;   // camera view size
const FRAME_W = 32, FRAME_H = 32; // animation frame size
const GRAVITY = 10;                // real gravity
const GROUND_Y = VIEWH - 12;      // y position of ground surface
const PLAYER_SPEED = 1.5;         // horizontal movement speed
const JUMP_FORCE = -3.8;          // upward impulse on jump

// ─── WEEK 6: FEEDBACK SYSTEMS ───────────────────────────
let particles = [];   // particle objects for burst effect
let shakeAmount = 0;  // screen shake intensity (decays each frame)

// ─── GAME STATE ─────────────────────────────────────────
let score = 0;
let highScore = 0;
let wave = 1;
let lastSpawnTime = 0;            // millis() when gems last spawned
const RESPAWN_INTERVAL = 4000;    // ms between gem waves
let spawnFlashTimer = 0;          // countdown for "new gems!" text

// sound oscillator
let pickupOsc;

// ─── PRELOAD ────────────────────────────────────────────
function preload() {
  playerImg = loadImage("assets/foxSpriteSheet.png");
}

// ─── SETUP ──────────────────────────────────────────────
function setup() {
  new Canvas(VIEWW, VIEWH, "pixelated");
  allSprites.pixelPerfect = true;
  world.gravity.y = GRAVITY;

  // --- GROUND PLATFORM ---
  ground = new Sprite(VIEWW / 2, GROUND_Y, VIEWW, 16, "static");
  ground.color = color(60, 140, 60);
  ground.stroke = color(40, 100, 40);

  // --- PLAYER ---
  createPlayer();

  // --- GEMS ---
  gems = new Group();
  gems.diameter = 8;
  gems.color = color(255, 220, 50);
  gems.stroke = color(200, 160, 0);
  gems.strokeWeight = 1;
  gems.collider = "static";
  gems.bounciness = 0;

  spawnGems();
  lastSpawnTime = millis();
}

// ─── CREATE / RESET PLAYER ──────────────────────────────
function createPlayer() {
  player = new Sprite(VIEWW / 2, GROUND_Y - 30, FRAME_W, FRAME_H);
  player.spriteSheet = playerImg;
  player.rotationLock = true;
  player.anis.w = FRAME_W;
  player.anis.h = FRAME_H;
  player.anis.offset.y = -4;
  player.addAnis(playerAnis);
  player.ani = "idle";
  player.w = 18;
  player.h = 20;
  player.friction = 0;
  player.bounciness = 0;
}

// ─── SPAWN GEMS ─────────────────────────────────────────
// Places 4 gems at random x positions above the ground,
// with some vertical variety so they're interesting to reach.
function spawnGems() {
  let count = 4;
  let margin = 30; // keep gems away from screen edges
  for (let i = 0; i < count; i++) {
    let gx = random(margin, VIEWW - margin);
    let gy = GROUND_Y - random(25, 55); // random height above ground
    let g = new gems.Sprite(gx, gy);
    g._baseY = gy; // store for float animation
  }
  // show the "new gems!" flash
  spawnFlashTimer = 60; // frames (~1 second)
}

// ─── RESTART GAME ───────────────────────────────────────
// Resets everything back to initial state. Keeps high score.
function restartGame() {
  // update high score before resetting
  if (score > highScore) highScore = score;

  // remove all existing gems
  gems.removeAll();

  // remove player and recreate
  player.remove();
  createPlayer();

  // reset state
  score = 0;
  wave = 1;
  particles = [];
  shakeAmount = 0;

  // spawn fresh gems
  spawnGems();
  lastSpawnTime = millis();
}

// ─── WEEK 6: PICKUP SOUND (synthesized) ─────────────────
function playPickupSound() {
  if (getAudioContext().state !== "running") {
    getAudioContext().resume();
  }
  if (!pickupOsc) {
    pickupOsc = new p5.Oscillator("sine");
    pickupOsc.amp(0);
    pickupOsc.start();
  }
  pickupOsc.freq(440);
  pickupOsc.amp(0.3, 0.01);
  setTimeout(() => { if (pickupOsc) pickupOsc.freq(880, 0.08); }, 60);
  setTimeout(() => { if (pickupOsc) pickupOsc.amp(0, 0.1); }, 150);
}

// ─── WEEK 6: PARTICLE BURST ─────────────────────────────
function spawnParticles(x, y) {
  for (let i = 0; i < 12; i++) {
    let angle = random(TWO_PI);
    let speed = random(0.5, 2.5);
    particles.push({
      x: x, y: y,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed - 1,
      life: 1.0,
      size: random(2, 4),
      col: color(random(220, 255), random(180, 230), random(30, 80)),
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.life -= 0.03;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    push();
    noStroke();
    fill(red(p.col), green(p.col), blue(p.col), p.life * 255);
    ellipse(p.x, p.y, p.size * p.life, p.size * p.life);
    pop();
  }
}

// ─── WEEK 6: SCREEN SHAKE ───────────────────────────────
function triggerShake(intensity) {
  shakeAmount = intensity;
}

// ─── DRAW ───────────────────────────────────────────────
function draw() {
  // --- SCREEN SHAKE ---
  if (shakeAmount > 0.1) {
    translate(random(-shakeAmount, shakeAmount), random(-shakeAmount, shakeAmount));
    shakeAmount *= 0.85;
  } else {
    shakeAmount = 0;
  }

  background("skyblue");

  // --- GEM FLOAT ANIMATION ---
  for (let g of gems) {
    g.y = g._baseY + sin(frameCount * 0.05 + g.x) * 2;
  }

  // --- GEM RESPAWN TIMER ---
  // If all gems are collected (or it's been long enough), spawn a new wave
  if (gems.length === 0 && millis() - lastSpawnTime > RESPAWN_INTERVAL) {
    wave++;
    spawnGems();
    lastSpawnTime = millis();
  }

  // --- COLLISION: player overlaps gem ---
  player.overlaps(gems, collectGem);

  // --- PLAYER CONTROLS ---
  let isOnGround = player.colliding(ground);

  if (kb.pressing("left") || kb.pressing("a")) {
    player.vel.x = -PLAYER_SPEED;
    if (isOnGround) player.ani = "run";
    player.mirror.x = true;
  } else if (kb.pressing("right") || kb.pressing("d")) {
    player.vel.x = PLAYER_SPEED;
    if (isOnGround) player.ani = "run";
    player.mirror.x = false;
  } else {
    player.vel.x = 0;
    if (isOnGround && player.ani.name !== "attack") {
      player.ani = "idle";
    }
  }

  if ((kb.presses("up") || kb.presses("w")) && isOnGround) {
    player.vel.y = JUMP_FORCE;
    player.ani = "jump";
  }

  if (kb.presses(" ")) {
    player.ani = "attack";
  }

  // restart
  if (kb.presses("r")) {
    restartGame();
  }

  // keep player in bounds
  player.x = constrain(player.x, 10, VIEWW - 10);

  // --- PARTICLES ---
  updateParticles();

  // --- HUD ---
  drawHUD();
}

// ─── GEM COLLECTION CALLBACK ────────────────────────────
function collectGem(player, gem) {
  playPickupSound();
  spawnParticles(gem.x, gem.y);
  triggerShake(3);
  score++;
  gem.remove();

  // when all gems in this wave are gone, record the time
  // so the respawn timer starts counting
  if (gems.length === 0) {
    lastSpawnTime = millis();
  }
}

// ─── HUD ────────────────────────────────────────────────
function drawHUD() {
  push();
  resetMatrix(); // ignore screen shake for HUD

  fill(255);
  stroke(0);
  strokeWeight(0.5);
  textSize(10);
  textAlign(LEFT, TOP);
  text("Gems: " + score, 6, 6);
  text("Wave: " + wave, 6, 18);

  // show high score if we have one
  if (highScore > 0) {
    textAlign(RIGHT, TOP);
    text("Best: " + highScore, VIEWW - 6, 6);
  }

  // restart hint (bottom center)
  textAlign(CENTER, BOTTOM);
  fill(255, 255, 255, 150);
  textSize(7);
  text("R = Restart", VIEWW / 2, VIEWH - 4);

  // "new gems!" flash when a wave spawns
  if (spawnFlashTimer > 0) {
    spawnFlashTimer--;
    let alpha = map(spawnFlashTimer, 60, 0, 255, 0);
    fill(255, 220, 50, alpha);
    stroke(0, 0, 0, alpha * 0.5);
    textSize(12);
    textAlign(CENTER, CENTER);
    text("New Gems!", VIEWW / 2, VIEWH / 2 - 20);
  }

  pop();
}