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
        // Check if anyone has already picked this emoji
        const isTaken = players.some(p => p.emoji === emoji);
        const takenClass = isTaken ? 'taken' : '';
        const selectedClass = (emoji === selectedEmoji && !isTaken) ? 'selected' : '';
        
        // If it's taken, we remove the onclick
        const clickAction = isTaken ? '' : `onclick="selectEmoji('${emoji}')"`;
        
        return `<span class="emoji-option ${selectedClass} ${takenClass}" ${clickAction}>${emoji}</span>`;
    }).join("");
}

function selectEmoji(emoji) { 
    selectedEmoji = emoji; 
    renderEmojiPicker(); 
}

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
        document.getElementById('game-desc').innerText = "Cricket: Close 15-20 and Bull. Score on open numbers!";
        killerOpts.style.display = "none";
        sX01.style.display = "none";
    }
}

function addPlayer() {
    const input = document.getElementById('player-name-input');
    const name = input.value.trim();
    
    if (name === "" || players.length >= 6) return;
    
    // Safety check: ensure the current selected emoji isn't taken
    if (players.some(p => p.emoji === selectedEmoji)) {
        alert("That emoji is already taken!");
        return;
    }

    players.push({ 
        name, emoji: selectedEmoji, score: 0, targetNumber: 0, hits: 0, lives: 5, 
        isKiller: false, finished: false, totalRankPoints: 0,
        cricket: { 20:0, 19:0, 18:0, 17:0, 16:0, 15:0, 25:0 } 
    });

    input.value = "";
    
    // Find the next available emoji for the next player
    const nextAvailable = funnyEmojis.find(e => !players.some(p => p.emoji === e));
    if (nextAvailable) selectedEmoji = nextAvailable;

    renderPlayers();
    renderEmojiPicker(); // Refresh picker to gray out the used emoji
}

function renderPlayers() {
    const display = document.getElementById('player-list-display');
    const startBtn = document.getElementById('start-game-btn');
    display.innerHTML = players.map((p) => `<p>${p.emoji} ${p.name}</p>`).join("");
    if (players.length > 0) startBtn.style.display = "block";
}

function startGame() {
    winners = [];
    historyStack = [];
    currentPlayerIndex = 0;
    dartsThrown = 0;
    let randomTargets = (currentGameMode === "killer") ? getRandomNumbers() : [];
    const kToggle = document.getElementById('killer-multipliers-toggle');
    const dToggle = document.getElementById('double-out-toggle');
    if(kToggle) useKillerMultipliers = kToggle.checked;
    if(dToggle) doubleOutRequired = dToggle.checked;

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
    document.getElementById('game-title-display').innerText = "Game: " + currentGameMode.toUpperCase();
    generateKeypad();
    updateUI();
}

function getRandomNumbers() {
    return Array.from({length: 20}, (_, i) => i + 1).sort(() => Math.random() - 0.5);
}

function generateKeypad() {
    const container = document.getElementById('number-buttons');
    container.innerHTML = ""; 
    for (let i = 1; i <= 20; i++) {
        container.innerHTML += `<button onclick="submitScore(${i})">${i}</button>`;
    }
}

function setMultiplier(m) {
    currentMultiplier = (currentMultiplier === m) ? 1 : m;
    updateModifierUI();
}

function saveState() {
    historyStack.push(JSON.parse(JSON.stringify({ players, currentPlayerIndex, dartsThrown, winners })));
}

function undoLastThrow() {
    if (historyStack.length === 0) return;
    const lastState = historyStack.pop();
    players = lastState.players;
    currentPlayerIndex = lastState.currentPlayerIndex;
    dartsThrown = lastState.dartsThrown;
    winners = lastState.winners;
    updateUI();
}

function quitGame() {
    if(confirm("Are you sure?")) resetToMenu();
}

function submitScore(points) {
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
            if (p.hits >= 3) { p.isKiller = true; alert(p.name + " is a Killer!"); }
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
            if (p.cricket[target] < 3) {
                p.cricket[target]++;
            } else {
                let openForOthers = players.some(o => o.name !== p.name && o.cricket[target] < 3);
                if (openForOthers) p.score += target;
            }
        }
    }
    let allClosed = Object.values(p.cricket).every(h => h >= 3);
    let topScore = players.every(o => p.score >= o.score);
    dartsThrown++;
    if (allClosed && topScore) {
        p.finished = true; winners.push(p.name); checkGameOver();
    } else if (dartsThrown >= 3) {
        nextTurn();
    }
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
    winners.forEach((wName, idx) => {
        const p = players.find(pObj => pObj.name === wName);
        if (p) {
            if (idx === 0) p.totalRankPoints += 3;
            else if (idx === 1) p.totalRankPoints += 2;
            else if (idx === 2) p.totalRankPoints += 1;
        }
    });
    const display = document.getElementById('leaderboard-display');
    display.innerHTML = "<h3>Standings:</h3>";
    let sorted = [...players].sort((a, b) => b.totalRankPoints - a.totalRankPoints);
    sorted.forEach(p => { display.innerHTML += `<div class="leaderboard-item">${p.emoji} ${p.name}: ${p.totalRankPoints} pts</div>`; });
}

function resetToMenu() {
    // Note: To allow players to pick different emojis when returning to menu, 
    // we would need to clear the players list or allow editing.
    // For now, we go back to setup with current players saved.
    document.getElementById('results-screen').style.display = "none";
    document.getElementById('game-screen').style.display = "none";
    document.getElementById('setup-screen').style.display = "block";
    renderPlayers();
    renderEmojiPicker();
}

function updateModifierUI() {
    document.getElementById('btn-double').className = (currentMultiplier === 2) ? "active-modifier" : "";
    document.getElementById('btn-triple').className = (currentMultiplier === 3) ? "active-modifier" : "";
}

function updateUI() {
    const scoreArea = document.getElementById('scoreboard-area');
    scoreArea.innerHTML = "";
    players.forEach((p, idx) => {
        if (p.finished && currentGameMode.includes("01")) return;
        let aClass = (idx === currentPlayerIndex) ? "active-player" : "";
        let content = "";
        
        if (currentGameMode.includes("01")) content = `Score: ${p.score}`;
        else if (currentGameMode === "killer") content = `T:${p.targetNumber} | L:${p.lives} | H:${p.hits}/3`;
        else {
            content = `Score: ${p.score}<div class="cricket-grid">`;
            for (let t in p.cricket) {
                let lbl = (t == 25) ? "B" : t;
                let hits = p.cricket[t];
                let isLocked = players.every(player => player.cricket[t] >= 3);
                let colorClass = isLocked ? "target-locked" : (hits >= 3 ? "target-closed" : "target-open");
                let marks = "";
                if (hits === 1) marks = "X";
                if (hits === 2) marks = "XX";
                if (hits >= 3) marks = "XXX";
                content += `<span class="${colorClass}">${lbl}: ${marks}</span>`;
            }
            content += `</div>`;
        }
        scoreArea.innerHTML += `<div class="player-card ${aClass}"><div style="font-size: 1.5rem;">${p.emoji}</div><strong>${p.name}</strong><br>${content}</div>`;
    });
    if (players[currentPlayerIndex]) {
        document.getElementById('current-turn-display').innerText = `${players[currentPlayerIndex].emoji} ${players[currentPlayerIndex].name}'s Turn`;
        document.getElementById('dart-count-display').innerText = `Dart: ${dartsThrown + 1} / 3`;
    }
}