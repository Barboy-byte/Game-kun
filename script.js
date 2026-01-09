// Game variables
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const hud = document.getElementById('hud');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');
const scoreEl = document.getElementById('score');
const controls = document.getElementById('controls');
const menu = document.getElementById('menu');
const levelComplete = document.getElementById('level-complete');
const gameOver = document.getElementById('game-over');

let playerImg = new Image();
playerImg.src = 'player.png'; // Load sprite

let gameState = 'menu'; // menu, playing, levelComplete, gameOver
let level = 1;
let lives = 3;
let score = 0;
let gravity = 0.5;
let playerSpeed = 5;
let player = { x: 50, y: 400, vx: 0, vy: 0, width: 32, height: 32, onGround: false, frame: 0 };
let platforms = [];
let enemies = [];
let particles = [];
let shake = 0;

// Controls
let leftPressed = false, rightPressed = false, jumpPressed = false;

document.getElementById('left-btn').addEventListener('touchstart', () => leftPressed = true);
document.getElementById('left-btn').addEventListener('touchend', () => leftPressed = false);
document.getElementById('right-btn').addEventListener('touchstart', () => rightPressed = true);
document.getElementById('right-btn').addEventListener('touchend', () => rightPressed = false);
document.getElementById('jump-btn').addEventListener('touchstart', () => jumpPressed = true);
document.getElementById('jump-btn').addEventListener('touchend', () => jumpPressed = false);

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('next-level-btn').addEventListener('click', nextLevel);
document.getElementById('restart-btn').addEventListener('click', restartGame);

// Levels data
const levels = [
    { // Level 1: Intro Chaos
        platforms: [{ x: 0, y: 500, w: 200, h: 20 }, { x: 300, y: 400, w: 200, h: 20 }, { x: 600, y: 300, w: 200, h: 20 }],
        enemies: [{ x: 400, y: 350, vx: 2, vy: 0 }],
        goal: { x: 750, y: 250, w: 50, h: 50 },
        gravity: 0.5, speed: 5
    },
    { // Level 2: Moving Platforms
        platforms: [{ x: 0, y: 500, w: 200, h: 20, vx: 0 }, { x: 300, y: 400, w: 200, h: 20, vx: 3 }, { x: 600, y: 300, w: 200, h: 20, vx: -2 }],
        enemies: [{ x: 400, y: 350, vx: 4, vy: 0 }],
        goal: { x: 750, y: 250, w: 50, h: 50 },
        gravity: 0.5, speed: 6
    },
    { // Level 3: Falling World
        platforms: [{ x: 0, y: 500, w: 200, h: 20, falling: false }, { x: 300, y: 400, w: 200, h: 20, falling: false }, { x: 600, y: 300, w: 200, h: 20, falling: false }],
        enemies: [{ x: 400, y: 350, vx: 3, vy: 0 }],
        goal: { x: 750, y: 250, w: 50, h: 50 },
        gravity: 0.7, speed: 7
    },
    { // Level 4: Unstable Reality
        platforms: [{ x: 0, y: 500, w: 200, h: 20, vx: Math.random() * 4 - 2 }, { x: 300, y: 400, w: 200, h: 20, vx: Math.random() * 4 - 2 }, { x: 600, y: 300, w: 200, h: 20, vx: Math.random() * 4 - 2 }],
        enemies: [{ x: 400, y: 350, vx: 3, vy: 0 }, { x: 200, y: 450, vx: -2, vy: 0 }],
        goal: { x: 750, y: 250, w: 50, h: 50 },
        gravity: 0.8, speed: 8
    },
    { // Level 5: Total Chaos
        platforms: [{ x: 0, y: 500, w: 200, h: 20, vx: Math.random() * 6 - 3, falling: false }, { x: 300, y: 400, w: 200, h: 20, vx: Math.random() * 6 - 3, falling: false }, { x: 600, y: 300, w: 200, h: 20, vx: Math.random() * 6 - 3, falling: false }],
        enemies: [{ x: 400, y: 350, vx: 5, vy: 0 }, { x: 200, y: 450, vx: -4, vy: 0 }],
        goal: { x: 750, y: 250, w: 50, h: 50 },
        gravity: 1.0, speed: 10
    }
];

// Functions
function startGame() {
    menu.style.display = 'none';
    gameState = 'playing';
    loadLevel();
    gameLoop();
}

function loadLevel() {
    const lvl = levels[level - 1];
    platforms = lvl.platforms.map(p => ({ ...p }));
    enemies = lvl.enemies.map(e => ({ ...e }));
    gravity = lvl.gravity;
    playerSpeed = lvl.speed;
    player.x = 50;
    player.y = 400;
    player.vx = 0;
    player.vy = 0;
    levelEl.textContent = `Level: ${level}`;
}

function nextLevel() {
    levelComplete.style.display = 'none';
    level++;
    if (level > 5) {
        gameState = 'gameOver'; // Win condition
        gameOver.querySelector('h2').textContent = 'You Win!';
        gameOver.style.display = 'flex';
    } else {
        loadLevel();
        gameState = 'playing';
    }
}

function restartGame() {
    gameOver.style.display = 'none';
    level = 1;
    lives = 3;
    score = 0;
    livesEl.textContent = `Lives: ${lives}`;
    scoreEl.textContent = `Score: ${score}`;
    loadLevel();
    gameState = 'playing';
}

function update() {
    if (gameState !== 'playing') return;

    // Player movement
    if (leftPressed) player.vx = -playerSpeed;
    else if (rightPressed) player.vx = playerSpeed;
    else player.vx *= 0.8; // Friction

    if (jumpPressed && player.onGround) {
        player.vy = -12;
        player.onGround = false;
        addParticles(player.x + player.width / 2, player.y + player.height, 5);
        playSound(440, 0.1); // Jump sound
    }

    player.vy += gravity;
    player.x += player.vx;
    player.y += player.vy;

    // Animation
    player.frame = (player.frame + 1) % 60; // Simple frame cycling

    // Platforms
    platforms.forEach(p => {
        if (p.vx) p.x += p.vx;
        if (p.falling && p.fallingTimer > 0) {
            p.fallingTimer--;
            if (p.fallingTimer <= 0) p.y += 5; // Fall
        }
        if (player.x < p.x + p.w && player.x + player.width > p.x && player.y < p.y + p.h && player.y + player.height > p.y) {
            if (player.vy > 0) {
                player.y = p.y - player.height;
                player.vy = 0;
                player.onGround = true;
                shake = 5;
                if (p.falling === false) {
                    p.falling = true;
                    p.fallingTimer = 60; // Delay before falling
                }
            }
        }
    });

    // Enemies
    enemies.forEach(e => {
        e.x += e.vx;
        if (Math.random() < 0.01) e.vx *= -1; // Random direction change
        if (player.x < e.x + 20 && player.x + player.width > e.x && player.y < e.y + 20 && player.y + player.height > e.y) {
            loseLife();
        }
    });

    // Goal
    const goal = levels[level - 1].goal;
    if (player.x < goal.x + goal.w && player.x + player.width > goal.x && player.y < goal.y + goal.h && player.y + player.height > goal.y) {
        gameState = 'levelComplete';
        levelComplete.style.display = 'flex';
        score += 100;
        scoreEl.textContent = `Score: ${score}`;
    }

    // Fall off screen
    if (player.y > canvas.height) loseLife();

    // Particles
    particles.forEach(p => {
        p.y += p.vy;
        p.vy += 0.1;
        p.life--;
    });
    particles = particles.filter(p => p.life > 0);

    // Shake
    if (shake > 0) shake--;
}

function loseLife() {
    lives--;
    livesEl.textContent = `Lives: ${lives}`;
    addParticles(player.x + player.width / 2, player.y + player.height, 10);
    playSound(220, 0.2); // Death sound
    shake = 10;
    if (lives <= 0) {
        gameState = 'gameOver';
        gameOver.style.display = 'flex';
    } else {
        player.x = 50;
        player.y = 400;
        player.vx = 0;
        player.vy = 0;
    }
}

function addParticles(x, y, count) {
    for (let i = 0; i < count; i++) {
        particles.push({ x, y, vx: Math.random() * 4 - 2, vy: Math.random() * -4, life: 30 });
    }
}

function playSound(freq, duration) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Shake effect
    const offsetX = shake ? Math.random() * 4 - 2 : 0;
    const offsetY = shake ? Math.random() * 4 - 2 : 0;
    ctx.save();
    ctx.translate(offsetX, offsetY);

    // Platforms
    ctx.fillStyle = '#0f0';
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));

    // Enemies
    ctx.fillStyle = '#f00';
    enemies.forEach(e => ctx.fillRect(e.x, e.y, 20, 20));

    // Goal
    const goal = levels[level - 1].goal;
    ctx.fillStyle = '#ff0';
    ctx.fillRect(goal.x, goal.y, goal.w, goal.h);

    // Player
    ctx.drawImage(playerImg, player.frame < 30 ? 0 : 32, 0, 32, 32, player.x, player.y, player.width, player.height);

    // Particles
    ctx.fillStyle = '#fff';
    particles.forEach(p => ctx.fillRect(p.x, p.y, 2, 2));

    ctx.restore();
}

function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Initial setup
livesEl.textContent = `Lives: ${lives}`;
scoreEl.textContent = `Score: ${score}`;
