let players = [];
let winners = [];
let historyStack = [];
let currentPlayerIndex = 0;
let currentMultiplier = 1; 
let dartsThrown = 0;
let currentGameMode = "501";
let useKillerMultipliers = true;
let doubleOutRequired = false;

const funnyEmojis = ["🎯", "🍺", "🍕", "🔥", "🚀", "💀", "💩", "🦄", "👽", "🤖", "🤡", "🦖", "🥨", "🧠", "💅", "🎸", "🕺", "🐱‍👤", "🥑", "🧨"];
let selectedEmoji = funnyEmojis[0];

window.onload = () => { renderEmojiPicker(); updateGameDescription(); };

function renderEmojiPicker() {
    const container = document.getElementById('emoji-picker');
    container.innerHTML = funnyEmojis.map(emoji => {
        const isTaken = players.some(p => p.emoji === emoji);
        const takenClass = isTaken ? 'taken' : '';
        const selectedClass = (emoji === selectedEmoji && !isTaken) ? 'selected' : '';
        const clickAction = isTaken ? '' : `onclick="selectEmoji('${emoji}')"`;
        return `<span class="emoji-option ${selectedClass} ${takenClass}" ${clickAction}>${emoji}</span>`;
    }).join("");
}

function selectEmoji(emoji) { selectedEmoji = emoji; renderEmojiPicker(); }

function updateGameDescription() {
    currentGameMode = document.getElementById('game-type-select').value;
    const killerOpts = document.getElementById('killer-options');
    const sX01 = document.getElementById('settings-x01');
    const desc = document.getElementById('game-desc');
    
    if (currentGameMode.includes("01")) {
        desc.innerText = `Race to 0 from ${currentGameMode}.`;
        killerOpts.style.display = "none";
        sX01.style.display = "block";
    } else if (currentGameMode === "killer") {
        desc.innerText = "Killer: Hit your target 3x to kill others!";
        killerOpts.style.display = "block";
        sX01.style.display = "none";
    } else {
        desc.innerText = "Cricket: Close 15-20 & Bull. Score points!";
        killerOpts.style.display = "none";
        sX01.style.display = "none";
    }
}

function addPlayer() {
    const input = document.getElementById('player-name-input');
    const name = input.value.trim();
    if (name === "" || players.length >= 6) return;
    if (players.some(p => p.emoji === selectedEmoji)) return;

    players.push({ 
        name, emoji: selectedEmoji, score: 0, targetNumber: 0, hits: 0, lives: 5, 
        isKiller: false, finished: false, totalRankPoints: 0,
        cricket: { 20:0, 19:0, 18:0, 17:0, 16:0, 15:0, 25:0 } 
    });

    input.value = "";
    selectedEmoji = funnyEmojis.find(e => !players.some(p => p.emoji === e)) || funnyEmojis[0];
    renderPlayers();
    renderEmojiPicker();
}

function renderPlayers() {
    const display = document.getElementById('player-list-display');
    const startBtn = document.getElementById('start-game-btn');
    display.innerHTML = players.map(p => `<span>${p.emoji}</span>`).join(" ");
    startBtn.style.display = players.length > 0 ? "block" : "none";
}

function startGame() {
    winners = [];
    historyStack = [];
    currentPlayerIndex = 0;
    dartsThrown = 0;
    let randomTargets = (currentGameMode === "killer") ? getRandomNumbers() : [];
    
    useKillerMultipliers = document.getElementById('killer-multipliers-toggle').checked;
    doubleOutRequired = document.getElementById('double-out-toggle').checked;
    let startScore = (currentGameMode.includes("01")) ? parseInt(currentGameMode) : 0; 

    players.forEach((p, i) => {
        p.finished = false;
        p.score = startScore;
        p.hits = 0; p.lives = 5; p.isKiller = false;
        p.cricket = { 20:0, 19:0, 18:0, 17:0, 16:0, 15:0, 25:0 };
        if (currentGameMode === "killer") p.targetNumber = randomTargets[i];
    });

    document.getElementById('setup-screen').style.display = "none";
    document.getElementById('results-screen').style.display = "none";
    document.getElementById('game-screen').style.display = "flex";
    document.getElementById('game-title-display').innerText = currentGameMode.toUpperCase();
    
    generateKeypad();
    updateUI();
}

function generateKeypad() {
    const container = document.getElementById('number-buttons');
    container.innerHTML = Array.from({length:20}, (_,i) => `<button onclick="submitScore(${i+1})">${i+1}</button>`).join("");
}

function setMultiplier(m) {
    if (navigator.vibrate) navigator.vibrate(10);
    currentMultiplier = (currentMultiplier === m) ? 1 : m;
    updateModifierUI();
}

function submitScore(points) {
    if (navigator.vibrate) navigator.vibrate(20);
    saveState();
    let mult = (points === 25 || points === 50) ? 1 : currentMultiplier;
    
    if (currentGameMode.includes("01")) handleX01(points, mult);
    else if (currentGameMode === "killer") handleKiller(points, mult);
    else if (currentGameMode === "cricket") handleCricket(points, mult);

    currentMultiplier = 1; 
    updateModifierUI();
    updateUI();
}

function handleX01(points, mult) {
    let p = players[currentPlayerIndex];
    let hit = points * mult;
    let next = p.score - hit;

    if (doubleOutRequired) {
        if (next === 0 && (mult === 2 || points === 50)) {
            p.score = 0; p.finished = true; winners.push(p.name); checkGameOver(); return;
        } else if (next <= 1) { alert("Bust!"); nextTurn(); return; }
    }
    if (next < 0) { alert("Bust!"); nextTurn(); }
    else {
        p.score = next;
        dartsThrown++;
        if (p.score === 0) { p.finished = true; winners.push(p.name); checkGameOver(); }
        else if (dartsThrown >= 3) nextTurn();
    }
}

function handleKiller(points, mult) {
    let p = players[currentPlayerIndex];
    let val = useKillerMultipliers ? mult : 1;
    if (points === p.targetNumber) {
        p.hits += val;
        if (p.hits >= 3 && !p.isKiller) { p.isKiller = true; alert(p.name + " is a Killer!"); }
    } else {
        let vic = players.find(v => v.targetNumber === points && !v.finished);
        if (p.isKiller && vic) {
            vic.lives -= val;
            if (vic.lives <= 0) { vic.lives = 0; vic.finished = true; winners.unshift(vic.name); checkGameOver(); }
        }
    }
    dartsThrown++;
    if (dartsThrown >= 3) nextTurn();
}

function handleCricket(points, mult) {
    let p = players[currentPlayerIndex];
    let t = (points === 50) ? 25 : points;
    let hits = (points === 50) ? 2 : mult;
    if (p.cricket.hasOwnProperty(t)) {
        for (let i = 0; i < hits; i++) {
            if (p.cricket[t] < 3) p.cricket[t]++;
            else if (players.some(o => o.name !== p.name && o.cricket[t] < 3)) p.score += t;
        }
    }
    let closed = Object.values(p.cricket).every(h => h >= 3);
    let lead = players.every(o => p.score >= o.score);
    dartsThrown++;
    if (closed && lead) { p.finished = true; winners.push(p.name); checkGameOver(); }
    else if (dartsThrown >= 3) nextTurn();
}

function checkGameOver() {
    let active = players.filter(p => !p.finished);
    if ((currentGameMode !== "killer" && winners.length > 0) || active.length <= 1) {
        if (active.length === 1 && !winners.includes(active[0].name)) winners.unshift(active[0].name);
        endGame();
    } else nextTurn();
}

function nextTurn() {
    dartsThrown = 0;
    do { currentPlayerIndex = (currentPlayerIndex + 1) % players.length; } while (players[currentPlayerIndex].finished);
}

function endGame() {
    document.getElementById('game-screen').style.display = "none";
    document.getElementById('results-screen').style.display = "block";
    winners.forEach((w, i) => {
        const p = players.find(obj => obj.name === w);
        if (p) p.totalRankPoints += (3 - i > 0 ? 3 - i : 0);
    });
    const display = document.getElementById('leaderboard-display');
    let sorted = [...players].sort((a, b) => b.totalRankPoints - a.totalRankPoints);
    display.innerHTML = sorted.map(p => `<div class="leaderboard-item">${p.emoji} ${p.name}: ${p.totalRankPoints} pts</div>`).join("");
}

function resetToMenu() {
    document.getElementById('results-screen').style.display = "none";
    document.getElementById('game-screen').style.display = "none";
    document.getElementById('setup-screen').style.display = "block";
    renderEmojiPicker();
}

function updateModifierUI() {
    document.getElementById('btn-double').className = (currentMultiplier === 2) ? "mod-btn active-mod" : "mod-btn";
    document.getElementById('btn-triple').className = (currentMultiplier === 3) ? "mod-btn active-mod" : "mod-btn";
}

function updateUI() {
    const area = document.getElementById('scoreboard-area');
    area.innerHTML = players.map((p, i) => {
        if (p.finished && currentGameMode.includes("01")) return "";
        let a = (i === currentPlayerIndex) ? "active-player" : "";
        let c = "";
        if (currentGameMode.includes("01")) c = `Score: ${p.score}`;
        else if (currentGameMode === "killer") c = `T:${p.targetNumber} L:${p.lives} H:${p.hits}`;
        else {
            c = `<div class="cricket-grid">`;
            for (let t in p.cricket) {
                let locked = players.every(pl => pl.cricket[t] >= 3);
                let cls = locked ? "target-locked" : (p.cricket[t] >= 3 ? "target-closed" : "target-open");
                let m = p.cricket[t] >= 3 ? "XXX" : "X".repeat(p.cricket[t]) || "-";
                c += `<span class="${cls}">${t==25?'B':t}:${m}</span>`;
            }
            c += `</div>`;
        }
        return `<div class="player-card ${a}">${p.emoji}<br><b>${p.name}</b><br>${c}</div>`;
    }).join("");
    
    if (players[currentPlayerIndex]) {
        document.getElementById('current-turn-display').innerText = players[currentPlayerIndex].name;
        document.getElementById('dart-count-display').innerText = `Dart: ${dartsThrown + 1} / 3`;
    }
}

function getRandomNumbers() { return Array.from({length: 20}, (_, i) => i + 1).sort(() => Math.random() - 0.5); }
function saveState() { historyStack.push(JSON.parse(JSON.stringify({ players, currentPlayerIndex, dartsThrown, winners }))); }
function undoLastThrow() { if (historyStack.length > 0) { const s = historyStack.pop(); players = s.players; currentPlayerIndex = s.currentPlayerIndex; dartsThrown = s.dartsThrown; winners = s.winners; updateUI(); } }
function quitGame() { if(confirm("Quit?")) resetToMenu(); }