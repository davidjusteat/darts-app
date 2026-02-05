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

window.onload = function() { renderEmojiPicker(); };

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
    const select = document.getElementById('game-type-select');
    const killerOpts = document.getElementById('killer-options');
    const sX01 = document.getElementById('settings-x01');
    currentGameMode = select.value;
    
    if (currentGameMode.includes("01")) {
        document.getElementById('game-desc').innerText = `Race to zero from ${currentGameMode}.`;
        killerOpts.style.display = "none";
        sX01.style.display = "block";
    } else if (currentGameMode === "killer") {
        document.getElementById('game-desc').innerText = "Killer: Hit your target 3x to become a Killer!";
        killerOpts.style.display = "block";
        sX01.style.display = "none";
    } else {
        document.getElementById('game-desc').innerText = "Cricket: Close 15-20 and Bullseye!";
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
    const nextAvailable = funnyEmojis.find(e => !players.some(p => p.emoji === e));
    if (nextAvailable) selectedEmoji = nextAvailable;
    renderPlayers();
    renderEmojiPicker();
}

function renderPlayers() {
    const display = document.getElementById('player-list-display');
    const startBtn = document.getElementById('start-game-btn');
    display.innerHTML = players.map((p) => `<span>${p.emoji}</span>`).join(" ");
    if (players.length > 0) startBtn.style.display = "block";
}

function startGame() {
    winners = [];
    historyStack = [];
    currentPlayerIndex = 0;
    dartsThrown = 0;
    let randomTargets = (currentGameMode === "killer") ? getRandomNumbers() : [];
    
    useKillerMultipliers = document.getElementById('killer-multipliers-toggle').checked;
    doubleOutRequired = document.getElementById('double-out-toggle').checked;

    let startingScore = (currentGameMode.includes("01")) ? parseInt(currentGameMode) : 0; 

    players.forEach((p, index) => {
        p.finished = false;
        p.score = startingScore;
        p.hits = 0;
        p.lives = 5;
        p.isKiller = false;
        p.cricket = { 20:0, 19:0, 18:0, 17:0, 16:0, 15:0, 25:0 };
        if (currentGameMode === "killer") p.targetNumber = randomTargets[index];
    });

    document.getElementById('setup-screen').style.display = "none";
    document.getElementById('results-screen').style.display = "none";
    document.getElementById('game-screen').style.display = "block";
    document.getElementById('game-title-display').innerText = currentGameMode.toUpperCase();
    
    generateKeypad();
    updateUI();
}

function generateKeypad() {
    const container = document.getElementById('number-buttons');
    container.innerHTML = ""; 
    for (let i = 1; i <= 20; i++) {
        container.innerHTML += `<button onclick="submitScore(${i})">${i}</button>`;
    }
}

function setMultiplier(m) {
    // Vibrate on tap (if supported)
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

// ... logic functions (handleX01, handleKiller, handleCricket) remain identical to previous ...
function handleX01(points, mult) {
    let p = players[currentPlayerIndex];
    let totalHit = points * mult;
    let newScore = p.score - totalHit;
    if (doubleOutRequired) {
        if (newScore === 0) {
            if (mult === 2 || points === 50) {
                p.score = 0; p.finished = true; winners.push(p.name); checkGameOver(); return;
            } else {
                alert("Bust! Double required."); nextTurn(); return;
            }
        } else if (newScore === 1) {
            alert("Bust! Left 1."); nextTurn(); return;
        }
    }
    if (newScore < 0) { alert("Bust!"); nextTurn(); }
    else {
        p.score = newScore;
        dartsThrown++;
        if (p.score === 0) { p.finished = true; winners.push(p.name); checkGameOver(); }
        else if (dartsThrown >= 3) nextTurn();
    }
}

function handleKiller(points, mult) {
    let p = players[currentPlayerIndex];
    let hitVal = useKillerMultipliers ? mult : 1;
    if (points === p.targetNumber) {
        if (!p.isKiller) {
            p.hits += hitVal;
            if (p.hits >= 3) { p.isKiller = true; alert(p.name + " is now a Killer!"); }
        }
    } else {
        let victim = players.find(v => v.targetNumber === points && !v.finished);
        if (p.isKiller && victim) {
            victim.lives -= hitVal;
            if (victim.lives <= 0) { victim.lives = 0; victim.finished = true; winners.unshift(victim.name); checkGameOver(); }
        }
    }
    dartsThrown++;
    if (dartsThrown >= 3) nextTurn();
}

function handleCricket(points, mult) {
    let p = players[currentPlayerIndex];
    let target = (points === 50) ? 25 : points;
    let hitsFromDart = (points === 50) ? 2 : mult;
    if (p.cricket.hasOwnProperty(target)) {
        for (let i = 0; i < hitsFromDart; i++) {
            if (p.cricket[target] < 3) p.cricket[target]++;
            else if (players.some(o => o.name !== p.name && o.cricket[target] < 3)) p.score += target;
        }
    }
    let allClosed = Object.values(p.cricket).every(h => h >= 3);
    let topScore = players.every(o => p.score >= o.score);
    dartsThrown++;
    if (allClosed && topScore) { p.finished = true; winners.push(p.name); checkGameOver(); }
    else if (dartsThrown >= 3) nextTurn();
}

function checkGameOver() {
    let active = players.filter(p => !p.finished);
    if (currentGameMode !== "killer" && winners.length > 0) endGame();
    else if (active.length <= 1) {
        if (active.length === 1 && !winners.includes(active[0].name)) winners.unshift(active[0].name);
        endGame();
    } else nextTurn();
}

function nextTurn() {
    dartsThrown = 0;
    do {
        currentPlayerIndex++;
        if (currentPlayerIndex >= players.length) currentPlayerIndex = 0;
    } while (players[currentPlayerIndex].finished);
}

function endGame() {
    document.getElementById('game-screen').style.display = "none";
    document.getElementById('results-screen').style.display = "block";
    winners.forEach((w, i) => {
        const p = players.find(obj => obj.name === w);
        if (p) {
            if (i === 0) p.totalRankPoints += 3;
            else if (i === 1) p.totalRankPoints += 2;
            else if (i === 2) p.totalRankPoints += 1;
        }
    });
    const display = document.getElementById('leaderboard-display');
    display.innerHTML = "<h3>Standings:</h3>";
    let sorted = [...players].sort((a, b) => b.totalRankPoints - a.totalRankPoints);
    sorted.forEach(p => { display.innerHTML += `<div>${p.emoji} ${p.name}: ${p.totalRankPoints} pts</div>`; });
}

function resetToMenu() {
    document.getElementById('results-screen').style.display = "none";
    document.getElementById('game-screen').style.display = "none";
    document.getElementById('setup-screen').style.display = "block";
    renderEmojiPicker();
}

function updateUI() {
    const scoreArea = document.getElementById('scoreboard-area');
    scoreArea.innerHTML = "";
    players.forEach((p, idx) => {
        if (p.finished && currentGameMode.includes("01")) return;
        let aClass = (idx === currentPlayerIndex) ? "active-player" : "";
        let content = "";
        if (currentGameMode.includes("01")) content = `Score: ${p.score}`;
        else if (currentGameMode === "killer") content = `T:${p.targetNumber} L:${p.lives} H:${p.hits}`;
        else {
            content = `<div class="cricket-grid">`;
            for (let t in p.cricket) {
                let lbl = (t == 25) ? "B" : t;
                let h = p.cricket[t];
                let isLocked = players.every(player => player.cricket[t] >= 3);
                let colorClass = isLocked ? "target-locked" : (h >= 3 ? "target-closed" : "target-open");
                let m = (h === 1) ? "X" : (h === 2) ? "XX" : (h >= 3) ? "XXX" : "-";
                content += `<span class="${colorClass}">${lbl}:${m}</span>`;
            }
            content += `</div>`;
        }
        scoreArea.innerHTML += `<div class="player-card ${aClass}">${p.emoji}<br><strong>${p.name}</strong><br>${content}</div>`;
    });
    if (players[currentPlayerIndex]) {
        document.getElementById('current-turn-display').innerText = `${players[currentPlayerIndex].name}'s Turn`;
        document.getElementById('dart-count-display').innerText = `Dart: ${dartsThrown + 1} / 3`;
    }
}

function getRandomNumbers() { return Array.from({length: 20}, (_, i) => i + 1).sort(() => Math.random() - 0.5); }
function saveState() { historyStack.push(JSON.parse(JSON.stringify({ players, currentPlayerIndex, dartsThrown, winners }))); }
function undoLastThrow() { if (historyStack.length > 0) { const s = historyStack.pop(); players = s.players; currentPlayerIndex = s.currentPlayerIndex; dartsThrown = s.dartsThrown; winners = s.winners; updateUI(); } }
function quitGame() { if(confirm("Quit?")) resetToMenu(); }
function updateModifierUI() {
    document.getElementById('btn-double').style.border = (currentMultiplier === 2) ? "2px solid white" : "none";
    document.getElementById('btn-triple').style.border = (currentMultiplier === 3) ? "2px solid white" : "none";
}