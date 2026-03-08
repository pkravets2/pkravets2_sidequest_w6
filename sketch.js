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
    - Score HUD tracks gems collected

  Controls:
    A / D  or  Left / Right Arrow    Horizontal movement
    W  or  Up Arrow                  Jump
    S  or  Down Arrow                Idle
    Space Bar                        Attack
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
const GRAVITY = 10;                // Week 6: real gravity (was 0)
const GROUND_Y = VIEWH - 12;      // y position of ground surface
const PLAYER_SPEED = 1.5;         // horizontal movement speed
const JUMP_FORCE = -3.8;          // upward impulse on jump

// ─── WEEK 6: FEEDBACK SYSTEMS ───────────────────────────
let particles = [];   // array of particle objects for burst effect
let shakeAmount = 0;  // current screen shake intensity (decays each frame)
let score = 0;        // gems collected

// sound oscillator (created on first user interaction)
let pickupOsc;
let oscReady = false;

// ─── PRELOAD ────────────────────────────────────────────
function preload() {
  playerImg = loadImage("assets/foxSpriteSheet.png");
}

// ─── SETUP ──────────────────────────────────────────────
function setup() {
  new Canvas(VIEWW, VIEWH, "pixelated");
  allSprites.pixelPerfect = true;

  // Week 6: enable gravity so jumps and falls feel physical
  world.gravity.y = GRAVITY;

  // --- GROUND PLATFORM ---
  ground = new Sprite(VIEWW / 2, GROUND_Y, VIEWW, 16, "static");
  ground.color = color(60, 140, 60);  // green ground
  ground.stroke = color(40, 100, 40);

  // --- PLAYER ---
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

  // --- WEEK 6: COLLECTIBLE GEMS ---
  gems = new Group();
  gems.diameter = 8;
  gems.color = color(255, 220, 50);    // gold color
  gems.stroke = color(200, 160, 0);
  gems.strokeWeight = 1;
  gems.collider = "static";            // gems don't fall
  gems.bounciness = 0;

  // spawn a few gems across the level
  spawnGems();
}

// ─── SPAWN GEMS ─────────────────────────────────────────
// Places gems at fixed positions above the ground
function spawnGems() {
  let gemPositions = [
    { x: 60,  y: GROUND_Y - 30 },
    { x: 130, y: GROUND_Y - 50 },
    { x: 200, y: GROUND_Y - 30 },
    { x: 260, y: GROUND_Y - 45 },
  ];
  for (let pos of gemPositions) {
    let g = new gems.Sprite(pos.x, pos.y);
    // small float animation offset stored per gem
    g._baseY = pos.y;
  }
}

// ─── WEEK 6: PICKUP SOUND (synthesized, no audio file needed) ───
// Uses p5.Oscillator to play a short rising tone on gem collect.
// This avoids needing any .mp3/.wav files.
function playPickupSound() {
  // ensure AudioContext is started (browser requires user gesture)
  if (getAudioContext().state !== "running") {
    getAudioContext().resume();
  }

  // create oscillator on first use
  if (!pickupOsc) {
    pickupOsc = new p5.Oscillator("sine");
    pickupOsc.amp(0); // start silent
    pickupOsc.start();
    oscReady = true;
  }

  // play a quick rising "blip" — 440Hz → 880Hz fade out
  pickupOsc.freq(440);
  pickupOsc.amp(0.3, 0.01);    // ramp to volume in 10ms

  // after 60ms, sweep frequency up for a cheerful rising tone
  setTimeout(() => {
    if (pickupOsc) pickupOsc.freq(880, 0.08);
  }, 60);

  // fade out after 150ms
  setTimeout(() => {
    if (pickupOsc) pickupOsc.amp(0, 0.1);
  }, 150);
}

// ─── WEEK 6: PARTICLE BURST ─────────────────────────────
// Spawns a ring of small particles at (x,y) with random velocities.
// Particles are plain objects drawn manually — no sprites needed.
function spawnParticles(x, y) {
  let count = 12; // number of particles per burst
  for (let i = 0; i < count; i++) {
    let angle = random(TWO_PI);
    let speed = random(0.5, 2.5);
    particles.push({
      x: x,
      y: y,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed - 1, // slight upward bias
      life: 1.0,   // 1.0 = full life, fades to 0
      size: random(2, 4),
      col: color(
        random(220, 255),   // warm gold/orange tones
        random(180, 230),
        random(30, 80)
      ),
    });
  }
}

// Update and draw all active particles, remove dead ones
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;         // mini gravity on particles
    p.life -= 0.03;       // fade out over time
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    // draw the particle with fading opacity
    push();
    noStroke();
    let c = color(red(p.col), green(p.col), blue(p.col), p.life * 255);
    fill(c);
    ellipse(p.x, p.y, p.size * p.life, p.size * p.life);
    pop();
  }
}

// ─── WEEK 6: SCREEN SHAKE ───────────────────────────────
// Sets a shake intensity that decays each frame in draw().
function triggerShake(intensity) {
  shakeAmount = intensity;
}

// ─── DRAW (main game loop) ──────────────────────────────
function draw() {
  // --- SCREEN SHAKE offset ---
  if (shakeAmount > 0.1) {
    translate(random(-shakeAmount, shakeAmount), random(-shakeAmount, shakeAmount));
    shakeAmount *= 0.85; // decay shake each frame
  } else {
    shakeAmount = 0;
  }

  // --- BACKGROUND ---
  background("skyblue");

  // --- GEM FLOATING ANIMATION ---
  // Gems bob gently up and down to look collectible
  for (let g of gems) {
    g.y = g._baseY + sin(frameCount * 0.05 + g.x) * 2;
  }

  // --- WEEK 6: COLLISION CHECK (player overlaps gem) ---
  player.overlaps(gems, collectGem);

  // --- PLAYER CONTROLS ---
  let isOnGround = player.colliding(ground);

  // horizontal movement (hold to move)
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

  // jump (press once, only if on ground)
  if ((kb.presses("up") || kb.presses("w")) && isOnGround) {
    player.vel.y = JUMP_FORCE;
    player.ani = "jump";
  }

  // attack
  if (kb.presses(" ")) {
    player.ani = "attack";
  }

  // keep player in bounds horizontally
  player.x = constrain(player.x, 10, VIEWW - 10);

  // --- WEEK 6: DRAW PARTICLES (on top of sprites) ---
  updateParticles();

  // --- HUD: SCORE DISPLAY ---
  push();
  // reset any shake offset for stable HUD
  resetMatrix();
  fill(255);
  stroke(0);
  strokeWeight(0.5);
  textSize(10);
  textAlign(LEFT, TOP);
  text("Gems: " + score, 6, 6);
  pop();
}

// ─── WEEK 6: GEM COLLECTION CALLBACK ────────────────────
// Called automatically by p5play when player overlaps a gem.
// This is where all three feedback effects fire at once.
function collectGem(player, gem) {
  // 1) Sound — synthesized rising blip
  playPickupSound();

  // 2) Particles — burst of gold sparkles at the gem position
  spawnParticles(gem.x, gem.y);

  // 3) Screen shake — small impact feeling
  triggerShake(3);

  // 4) Update score and remove the gem
  score++;
  gem.remove();
}