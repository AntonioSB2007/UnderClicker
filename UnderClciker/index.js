// Game State
let gold = 0;
let gps = 0;
let dt = 0;

const DT_BONUS_PER_POINT = 0.05; // 5% bonus per DT point
const RESET_THRESHOLD = 1000000;

// DOM Elements
const goldCountElement = document.getElementById('gold-count');
const gpsCountElement = document.getElementById('gps-count');
const dtCountElement = document.getElementById('dt-count');
const soulHeartElement = document.getElementById('soul-heart');
const upgradesListElement = document.getElementById('upgrades-list');
const resetButton = document.getElementById('reset-button');

// --- Audio Setup ---
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let clickSoundBuffer;
let purchaseSoundBuffer;

async function setupSounds() {
    // Helper function to fetch and decode audio
    const loadSound = async (url) => {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return await audioContext.decodeAudioData(arrayBuffer);
        } catch (error) {
            console.error(`Failed to load sound: ${url}`, error);
            return null;
        }
    };
    
    // Load all sounds
    [clickSoundBuffer, purchaseSoundBuffer] = await Promise.all([
        loadSound('snd_damage.wav'),
        loadSound('purchase.mp3')
    ]);
}

// Function to play sounds if the buffer is loaded
function playSound(buffer) {
    if (!buffer || audioContext.state === 'suspended') return;
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
}

// Resume AudioContext on first user interaction
function resumeAudio() {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}
// --- End Audio Setup ---


// Game Data
const upgrades = [
    { id: 'flowey', name: 'Flowey', baseCost: 15, gps: 1, count: 0 },
    { id: 'toriel', name: 'Toriel', baseCost: 100, gps: 5, count: 0 },
    { id: 'papyrus', name: 'Papyrus', baseCost: 500, gps: 20, count: 0 },
    { id: 'undyne', name: 'Undyne', baseCost: 3000, gps: 100, count: 0 },
    { id: 'alphys', name: 'Alphys', baseCost: 10000, gps: 450, count: 0 },
    { id: 'sans', name: 'Sans', baseCost: 100000, gps: 5000, count: 0 },
];

// Functions
function calculateCost(upgrade) {
    return Math.ceil(upgrade.baseCost * Math.pow(1.15, upgrade.count));
}

function updateDisplay() {
    const dtBonus = 1 + dt * DT_BONUS_PER_POINT;
    goldCountElement.textContent = Math.floor(gold);
    gpsCountElement.textContent = `${gps} (+${(gps * dtBonus - gps).toFixed(1)})`;
    dtCountElement.textContent = dt;
    
    upgrades.forEach(upgrade => {
        const upgradeEl = document.getElementById(upgrade.id);
        if (upgradeEl) {
            const currentCost = calculateCost(upgrade);
            upgradeEl.querySelector('.upgrade-count').textContent = `x${upgrade.count}`;
            upgradeEl.querySelector('.upgrade-cost').textContent = `${currentCost}`;

            if (gold >= currentCost) {
                upgradeEl.classList.remove('disabled');
            } else {
                upgradeEl.classList.add('disabled');
            }
        }
    });

    // Show/hide reset button
    if (gold >= RESET_THRESHOLD) {
        resetButton.classList.remove('hidden');
        const dtOnReset = calculateDtOnReset();
        resetButton.textContent = `* RESET (+${dtOnReset} DT)`;
    } else {
        resetButton.classList.add('hidden');
    }
}

function handleSoulClick() {
    resumeAudio(); // Ensure audio plays on click
    const dtBonus = 1 + dt * DT_BONUS_PER_POINT;
    gold += 1 * dtBonus;
    playSound(clickSoundBuffer);
    updateDisplay();
}

function purchaseUpgrade(upgradeId) {
    resumeAudio();
    const upgrade = upgrades.find(u => u.id === upgradeId);
    const currentCost = calculateCost(upgrade);

    if (upgrade && gold >= currentCost) {
        gold -= currentCost;
        gps += upgrade.gps;
        upgrade.count++;
        playSound(purchaseSoundBuffer);
        updateDisplay();
    }
}

function generateUpgrades() {
    upgrades.forEach(upgrade => {
        const upgradeEl = document.createElement('div');
        upgradeEl.id = upgrade.id;
        upgradeEl.className = 'upgrade';
        const initialCost = calculateCost(upgrade);
        upgradeEl.innerHTML = `
            <div class="upgrade-details">
                <span>* ${upgrade.name}</span>
                <span class="upgrade-cost-dps">Cost: <span class="upgrade-cost">${initialCost}</span> Gold (+${upgrade.gps} Gold/s)</span>
            </div>
            <span class="upgrade-count">x${upgrade.count}</span>
        `;
        upgradeEl.addEventListener('click', () => purchaseUpgrade(upgrade.id));
        upgradesListElement.appendChild(upgradeEl);
    });
}

function gameLoop() {
    const dtBonus = 1 + dt * DT_BONUS_PER_POINT;
    gold += (gps / 10) * dtBonus; // Process game logic 10 times per second for smoother updates
    updateDisplay();
}

function calculateDtOnReset() {
    if (gold < RESET_THRESHOLD) return 0;
    return Math.floor(Math.cbrt(gold / RESET_THRESHOLD));
}

function handleReset() {
    resumeAudio();
    const dtGained = calculateDtOnReset();
    if (dtGained <= 0) return;

    const confirmation = confirm(`* Are you sure you want to reset for ${dtGained} DT?\n* Your Gold, G/s, and upgrades will be lost.`);

    if (confirmation) {
        dt += dtGained;
        
        // Reset progress
        gold = 0;
        gps = 0;
        upgrades.forEach(u => u.count = 0);
        
        // Save DT to localStorage to persist it
        localStorage.setItem('undertaleClickerDt', dt);

        // Re-render upgrades to reset their counts and costs in the UI
        upgradesListElement.innerHTML = '';
        generateUpgrades();
        updateDisplay();
    }
}

// Initial Setup
function init() {
    // Load persistent DT
    const savedDt = localStorage.getItem('undertaleClickerDt');
    if (savedDt) {
        dt = parseInt(savedDt, 10);
    }

    generateUpgrades();
    soulHeartElement.addEventListener('click', handleSoulClick);
    resetButton.addEventListener('click', handleReset);
    setInterval(gameLoop, 100); // Game loop runs every 100ms
    setupSounds();
    updateDisplay();
}

init();