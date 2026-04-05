// ============================================================
// Emoji Battle — Turn-based Strategy with Bot + Local + Online
// ============================================================

const GRID_COLS = 26;
const GRID_ROWS = 14;
const CELL_PX = 48;
const DIVIDER_COL = GRID_COLS / 2; // 13

// --- Definitions ---
const BUILDINGS = {
  castle:   { emoji: '🏰', name: 'Castle',   cost: 0,  hp: 50, income: 0,  desc: 'Your HQ — lose it and you lose!' },
  house:    { emoji: '🏠', name: 'House',     cost: 30, hp: 10, income: 5,  desc: '+5 💰 per turn' },
  wall:     { emoji: '🧱', name: 'Wall',      cost: 15, hp: 25, income: 0,  desc: 'Blocks enemies' },
  tower:    { emoji: '🗼', name: 'Tower',     cost: 50, hp: 15, income: 0,  desc: 'Shoots nearby enemies (2 dmg)', range: 2, attack: 2 },
  barracks: { emoji: '⚔️',  name: 'Barracks',  cost: 40, hp: 15, income: 0,  desc: 'Required to train soldiers' },
  farm:     { emoji: '🌾', name: 'Farm',      cost: 25, hp: 8,  income: 3,  desc: '+3 💰 per turn' },
  mine:     { emoji: '⛏️',  name: 'Mine',      cost: 60, hp: 10, income: 10, desc: '+10 💰 per turn' },
};

const UNITS = {
  swordsman: { emoji: '🗡️', name: 'Swordsman', cost: 20, hp: 8,  attack: 3, speed: 1, desc: 'Basic melee fighter' },
  archer:    { emoji: '🏹', name: 'Archer',    cost: 30, hp: 5,  attack: 2, speed: 1, desc: 'Ranged (2 tiles)', range: 2 },
  cavalry:   { emoji: '🐴', name: 'Cavalry',   cost: 45, hp: 10, attack: 4, speed: 2, desc: 'Fast & strong' },
  knight:    { emoji: '🛡️', name: 'Knight',    cost: 55, hp: 18, attack: 2, speed: 1, desc: 'Tanky defender' },
  wizard:    { emoji: '🧙', name: 'Wizard',    cost: 70, hp: 6,  attack: 6, speed: 1, desc: 'High damage caster', range: 3 },
};

// --- State ---
let game = null;
let net = { peer: null, conn: null, isHost: false, myIndex: 0, roomCode: null };

function createPlayer(id) {
  return { id, gold: 100, income: 5, buildings: [], units: [] };
}

function initGame(mode, difficulty) {
  game = {
    mode, difficulty,
    players: [createPlayer(1), createPlayer(2)],
    currentPlayer: 0,
    turn: 1,
    phase: 'play',
    selected: null,
    grid: [],
    effects: [],
    log: [],
    winner: null,
    botTimer: null,
  };

  for (let r = 0; r < GRID_ROWS; r++) {
    game.grid[r] = [];
    for (let c = 0; c < GRID_COLS; c++) game.grid[r][c] = null;
  }

  placeBuilding(0, 'castle', Math.floor(GRID_ROWS / 2), 2);
  placeBuilding(1, 'castle', Math.floor(GRID_ROWS / 2), GRID_COLS - 3);

  if (mode === 'bot') game.log = ['Game started! You go first. 🤖 Bot is on the right.'];
  else if (mode === 'online') game.log = [net.isHost ? 'Connected! You are 🔵 (left). Your turn!' : 'Connected! You are 🔴 (right). Waiting...'];
  else game.log = ['Game started! Player 1 goes first.'];
}

// ============================================================
// GRID
// ============================================================

function inBounds(r, c) { return r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS; }
function playerTerritory(pi, col) { return pi === 0 ? col < DIVIDER_COL : col >= DIVIDER_COL; }
function cellOccupied(r, c) { return game.grid[r][c] !== null; }

function rebuildGrid() {
  for (let r = 0; r < GRID_ROWS; r++)
    for (let c = 0; c < GRID_COLS; c++)
      game.grid[r][c] = null;
  for (let p = 0; p < 2; p++) {
    game.players[p].buildings.forEach((b, i) => {
      if (b.hp > 0) game.grid[b.row][b.col] = { player: p, entityType: 'building', entityIdx: i };
    });
    game.players[p].units.forEach((u, i) => {
      if (u.hp > 0) game.grid[u.row][u.col] = { player: p, entityType: 'unit', entityIdx: i };
    });
  }
}

// ============================================================
// BUILDINGS & UNITS
// ============================================================

function placeBuilding(pi, type, row, col) {
  const def = BUILDINGS[type];
  const b = { type, row, col, hp: def.hp, maxHp: def.hp };
  game.players[pi].buildings.push(b);
  game.grid[row][col] = { player: pi, entityType: 'building', entityIdx: game.players[pi].buildings.length - 1 };
  if (def.income > 0) game.players[pi].income += def.income;
  return b;
}

function countBuildings(pi, type) {
  return game.players[pi].buildings.filter(b => b.type === type && b.hp > 0).length;
}

function hasBarracks(pi) { return countBuildings(pi, 'barracks') > 0; }

function spawnUnit(pi, type) {
  const def = UNITS[type];
  const castle = game.players[pi].buildings.find(b => b.type === 'castle' && b.hp > 0);
  if (!castle) return null;
  const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
  for (const [dr, dc] of dirs) {
    const nr = castle.row + dr, nc = castle.col + dc;
    if (inBounds(nr, nc) && !cellOccupied(nr, nc) && playerTerritory(pi, nc)) {
      const u = {
        type, row: nr, col: nc,
        hp: def.hp, maxHp: def.hp,
        attack: def.attack, speed: def.speed,
        range: def.range || 1,
      };
      game.players[pi].units.push(u);
      rebuildGrid();
      return u;
    }
  }
  return null;
}

// ============================================================
// COMBAT — runs when a player ends their turn
// ============================================================

function dist(r1, c1, r2, c2) { return Math.abs(r1 - r2) + Math.abs(c1 - c2); }

function pLabel(idx) {
  if (game.mode === 'bot') return idx === 0 ? '🔵' : '🤖';
  return idx === 0 ? '🔵' : '🔴';
}

// Move units belonging to player pi
function moveUnits(pi) {
  const player = game.players[pi];
  const dir = pi === 0 ? 1 : -1;
  const enemy = 1 - pi;

  const sorted = player.units
    .filter(u => u.hp > 0)
    .sort((a, b) => (b.col - a.col) * dir);

  for (const u of sorted) {
    // If adjacent to an enemy, don't move (stay and fight)
    if (hasAdjacentEnemy(u, pi)) continue;

    for (let step = 0; step < u.speed; step++) {
      const nc = u.col + dir;
      if (inBounds(u.row, nc) && !cellOccupied(u.row, nc)) {
        u.col = nc;
        rebuildGrid();
      } else {
        let moved = false;
        for (const dr of [-1, 1]) {
          const nr = u.row + dr;
          if (inBounds(nr, nc) && !cellOccupied(nr, nc)) {
            u.row = nr;
            u.col = nc;
            rebuildGrid();
            moved = true;
            break;
          }
        }
        if (!moved) break;
      }
    }
  }
}

function hasAdjacentEnemy(u, pi) {
  const enemy = game.players[1 - pi];
  for (const eu of enemy.units) {
    if (eu.hp > 0 && dist(u.row, u.col, eu.row, eu.col) <= 1) return true;
  }
  for (const eb of enemy.buildings) {
    if (eb.hp > 0 && dist(u.row, u.col, eb.row, eb.col) <= 1) return true;
  }
  return false;
}

function unitAttacks(pi) {
  const player = game.players[pi];
  const enemy = game.players[1 - pi];

  for (const u of player.units) {
    if (u.hp <= 0) continue;
    const range = u.range || 1;
    let target = null, targetType = null, td = Infinity;

    for (const eu of enemy.units) {
      if (eu.hp <= 0) continue;
      const d = dist(u.row, u.col, eu.row, eu.col);
      if (d <= range && d < td) { target = eu; targetType = 'unit'; td = d; }
    }
    for (const eb of enemy.buildings) {
      if (eb.hp <= 0) continue;
      const d = dist(u.row, u.col, eb.row, eb.col);
      if (d <= range && d < td) { target = eb; targetType = 'building'; td = d; }
    }

    if (target) {
      target.hp -= u.attack;
      addEffect('💥', target.row, target.col);
      if (target.hp <= 0) {
        const emoji = targetType === 'unit' ? UNITS[target.type].emoji : BUILDINGS[target.type].emoji;
        addLog(`${pLabel(pi)} ${UNITS[u.type].emoji} destroyed ${emoji}!`);
        if (targetType === 'building' && target.type === 'castle') {
          game.phase = 'over';
          game.winner = pi;
        }
        if (targetType === 'building') {
          const def = BUILDINGS[target.type];
          if (def.income > 0) game.players[1 - pi].income -= def.income;
        }
      }
    }
  }
}

function towerAttacks(pi) {
  const player = game.players[pi];
  const enemy = game.players[1 - pi];
  for (const b of player.buildings) {
    if (b.hp <= 0) continue;
    const def = BUILDINGS[b.type];
    if (!def.attack) continue;
    let closest = null, cd = Infinity;
    for (const eu of enemy.units) {
      if (eu.hp <= 0) continue;
      const d = dist(b.row, b.col, eu.row, eu.col);
      if (d <= def.range && d < cd) { closest = eu; cd = d; }
    }
    if (closest) {
      closest.hp -= def.attack;
      addEffect('💥', closest.row, closest.col);
      if (closest.hp <= 0) addLog(`${pLabel(pi)} Tower destroyed ${UNITS[closest.type].emoji}!`);
    }
  }
}

function cleanupDead() {
  for (let p = 0; p < 2; p++)
    game.players[p].units = game.players[p].units.filter(u => u.hp > 0);
  rebuildGrid();
}

function addEffect(emoji, row, col) { game.effects.push({ emoji, row, col, ttl: 20 }); }

function addLog(msg) {
  game.log.unshift(msg);
  if (game.log.length > 10) game.log.pop();
}

// ============================================================
// TURN LOGIC
// ============================================================

function isMyTurn() {
  if (game.mode === 'online') return game.currentPlayer === net.myIndex;
  if (game.mode === 'bot') return game.currentPlayer === 0;
  return true;
}

function endTurn() {
  if (game.phase !== 'play' || !isMyTurn()) return;

  if (game.mode === 'online') {
    if (net.isHost) {
      executeTurnEnd(game.currentPlayer);
      broadcastState();
    } else {
      netSend({ type: 'action', action: { kind: 'end_turn' } });
    }
  } else {
    executeTurnEnd(game.currentPlayer);
  }
}

function executeTurnEnd(pi) {
  // 1. Towers for current player shoot
  towerAttacks(pi);

  // 2. Current player's soldiers move toward enemy
  moveUnits(pi);

  // 3. Current player's soldiers attack
  unitAttacks(pi);

  cleanupDead();

  if (game.phase === 'over') {
    showWinScreen();
    if (game.mode === 'online' && net.isHost) broadcastState();
    return;
  }

  // Switch to next player
  game.currentPlayer = 1 - game.currentPlayer;
  const next = game.players[game.currentPlayer];

  if (game.currentPlayer === 0) game.turn++;

  // Collect income
  next.gold += next.income;

  game.selected = null;

  if (game.mode === 'bot' && game.currentPlayer === 1) {
    addLog(`🤖 Bot's turn...`);
  } else if (game.mode === 'online') {
    const mine = game.currentPlayer === net.myIndex;
    addLog(`Turn ${game.turn}: ${mine ? 'Your' : "Opponent's"} turn (+${next.income} 💰)`);
  } else {
    addLog(`Turn ${game.turn}: Player ${next.id}'s turn (+${next.income} 💰)`);
  }

  updateUI();

  // Bot turn
  if (game.mode === 'bot' && game.currentPlayer === 1 && game.phase === 'play') {
    setNotMyTurn(true);
    scheduleBotTurn();
  }
}

// ============================================================
// BOT AI
// ============================================================

function setNotMyTurn(val) {
  const panel = document.getElementById('shop-panel');
  if (val) {
    panel.classList.add('not-my-turn');
  } else {
    panel.classList.remove('not-my-turn');
  }
}

function scheduleBotTurn() {
  const actions = planBotActions();
  let delay = 500;

  actions.forEach((action, i) => {
    setTimeout(() => {
      if (game.phase !== 'play' || game.currentPlayer !== 1) return;
      executeBotAction(action);
      updateUI();
    }, delay + i * 350);
  });

  setTimeout(() => {
    if (game && game.phase === 'play' && game.currentPlayer === 1) {
      executeTurnEnd(1);
      // executeTurnEnd calls updateUI which handles setNotMyTurn
    }
  }, delay + actions.length * 350 + 250);
}

function planBotActions() {
  const actions = [];
  const bot = game.players[1];
  let gold = bot.gold;
  const diff = game.difficulty;
  const aggression = diff === 'easy' ? 0.3 : diff === 'medium' ? 0.55 : 0.75;

  // Build
  if (!hasBarracks(1) && gold >= 40) {
    const cell = findBotBuildCell('barracks');
    if (cell) { actions.push({ kind: 'build', type: 'barracks', ...cell }); gold -= 40; }
  }

  const econTypes = shuffle(diff === 'hard'
    ? ['mine', 'house', 'farm', 'house', 'farm']
    : ['house', 'farm', 'house', 'farm']);
  for (const type of econTypes) {
    if (gold >= BUILDINGS[type].cost && Math.random() < 0.6) {
      const cell = findBotBuildCell(type);
      if (cell) { actions.push({ kind: 'build', type, ...cell }); gold -= BUILDINGS[type].cost; break; }
    }
  }

  if (Math.random() < 0.4) {
    for (const type of shuffle(['tower', 'wall'])) {
      if (gold >= BUILDINGS[type].cost) {
        const cell = findBotBuildCell(type);
        if (cell) { actions.push({ kind: 'build', type, ...cell }); gold -= BUILDINGS[type].cost; break; }
      }
    }
  }

  // Train
  if (hasBarracks(1) || actions.some(a => a.type === 'barracks')) {
    const priority = getUnitPriority(diff);
    const maxTrain = diff === 'easy' ? 1 : diff === 'medium' ? 2 : 3;
    let trained = 0;
    for (const type of priority) {
      if (trained >= maxTrain) break;
      if (gold >= UNITS[type].cost && Math.random() < aggression + 0.3) {
        actions.push({ kind: 'train', type });
        gold -= UNITS[type].cost;
        trained++;
      }
    }
  }

  return actions;
}

function getUnitPriority(diff) {
  if (diff === 'easy') return shuffle(['swordsman', 'swordsman', 'archer']);
  if (diff === 'medium') return shuffle(['swordsman', 'archer', 'cavalry', 'knight']);
  const eu = game.players[0].units.filter(u => u.hp > 0).length;
  if (eu > 5) return ['knight', 'wizard', 'cavalry'];
  return ['cavalry', 'swordsman', 'wizard', 'archer', 'knight'];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function findBotBuildCell(type) {
  const castle = game.players[1].buildings.find(b => b.type === 'castle' && b.hp > 0);
  if (!castle) return null;
  const isDefense = type === 'wall' || type === 'tower';
  const candidates = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = DIVIDER_COL; c < GRID_COLS; c++) {
      if (cellOccupied(r, c)) continue;
      const dc = dist(r, c, castle.row, castle.col);
      const df = c - DIVIDER_COL;
      let score;
      if (isDefense) {
        score = 100 - df * 10 + Math.random() * 5;
        if (type === 'wall' && df <= 2) score += 20;
        if (type === 'tower' && df >= 1 && df <= 3) score += 15;
      } else {
        score = 100 - dc * 5 + df * 3 + Math.random() * 5;
      }
      candidates.push({ row: r, col: c, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || null;
}

function executeBotAction(action) {
  const bot = game.players[1];
  if (action.kind === 'build') {
    const def = BUILDINGS[action.type];
    if (bot.gold >= def.cost && !cellOccupied(action.row, action.col)) {
      placeBuilding(1, action.type, action.row, action.col);
      bot.gold -= def.cost;
      addLog(`🤖 Built ${def.emoji}`);
    }
  }
  if (action.kind === 'train') {
    const def = UNITS[action.type];
    if (bot.gold >= def.cost && hasBarracks(1)) {
      const unit = spawnUnit(1, action.type);
      if (unit) { bot.gold -= def.cost; addLog(`🤖 Trained ${def.emoji}`); }
    }
  }
}

// ============================================================
// NETWORKING (PeerJS)
// ============================================================

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function netSend(data) {
  if (net.conn && net.conn.open) net.conn.send(JSON.stringify(data));
}

function getSerializableState() {
  return {
    players: game.players.map(p => ({
      id: p.id, gold: p.gold, income: p.income,
      buildings: p.buildings.map(b => ({ type: b.type, row: b.row, col: b.col, hp: b.hp, maxHp: b.maxHp })),
      units: p.units.map(u => ({
        type: u.type, row: u.row, col: u.col,
        hp: u.hp, maxHp: u.maxHp, attack: u.attack, speed: u.speed, range: u.range,
      })),
    })),
    currentPlayer: game.currentPlayer,
    turn: game.turn,
    phase: game.phase,
    winner: game.winner,
    log: game.log,
  };
}

function applyState(state) {
  game.players = state.players;
  game.currentPlayer = state.currentPlayer;
  game.turn = state.turn;
  game.phase = state.phase;
  game.winner = state.winner;
  game.log = state.log;
  game.selected = null;
  rebuildGrid();
  updateUI();
  if (game.phase === 'over') showWinScreen();
}

function broadcastState() {
  netSend({ type: 'state', state: getSerializableState() });
}

function handleNetMessage(raw) {
  let data;
  try { data = JSON.parse(raw); } catch { return; }

  if (data.type === 'state' && !net.isHost) {
    applyState(data.state);
  }

  if (data.type === 'action' && net.isHost) {
    handleRemoteAction(data.action, 1);
  }

  if (data.type === 'start') {
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    initGame('online');
    resizeCanvas();
    updateUI();
    if (!animFrameId) startRenderLoop();
  }
}

function handleRemoteAction(action, fromPlayer) {
  if (game.phase !== 'play') return;
  if (game.currentPlayer !== fromPlayer && action.kind === 'end_turn') {
    return; // Not their turn
  }
  const player = game.players[fromPlayer];

  if (action.kind === 'build') {
    const def = BUILDINGS[action.type];
    if (playerTerritory(fromPlayer, action.col) && !cellOccupied(action.row, action.col) && player.gold >= def.cost) {
      placeBuilding(fromPlayer, action.type, action.row, action.col);
      player.gold -= def.cost;
      addLog(`${pLabel(fromPlayer)} Built ${def.emoji}`);
      updateUI();
      broadcastState();
    }
  }

  if (action.kind === 'train') {
    const def = UNITS[action.type];
    if (player.gold >= def.cost && hasBarracks(fromPlayer)) {
      const unit = spawnUnit(fromPlayer, action.type);
      if (unit) { player.gold -= def.cost; addLog(`${pLabel(fromPlayer)} Trained ${def.emoji}`); updateUI(); broadcastState(); }
    }
  }

  if (action.kind === 'end_turn') {
    executeTurnEnd(fromPlayer);
    broadcastState();
  }
}

function setupConnection(conn) {
  net.conn = conn;
  conn.on('data', handleNetMessage);
  conn.on('close', () => { if (game && game.phase === 'play') addLog('Opponent disconnected!'); });
  conn.on('error', (err) => showLobbyError('Connection lost: ' + err.message));
}

function hostGame() {
  const roomCode = generateRoomCode();
  net.roomCode = roomCode;
  net.isHost = true;
  net.myIndex = 0;
  showLobbyError('');
  document.getElementById('lobby-choices').classList.add('hidden');
  document.getElementById('host-waiting').classList.remove('hidden');
  document.getElementById('room-code-text').textContent = roomCode;
  document.getElementById('lobby-status').textContent = 'Creating room...';

  net.peer = new Peer('emojibattle-' + roomCode.toLowerCase());
  net.peer.on('open', () => { document.getElementById('lobby-status').textContent = 'Waiting for opponent...'; });
  net.peer.on('connection', (conn) => {
    setupConnection(conn);
    conn.on('open', () => {
      document.getElementById('lobby-screen').classList.add('hidden');
      document.getElementById('game-screen').classList.remove('hidden');
      initGame('online');
      resizeCanvas();
      updateUI();
      if (!animFrameId) startRenderLoop();
      netSend({ type: 'start' });
      setTimeout(() => broadcastState(), 300);
    });
  });
  net.peer.on('error', (err) => {
    if (err.type === 'unavailable-id') showLobbyError('Room code in use. Try again.');
    else showLobbyError('Error: ' + err.message);
  });
}

function joinGame(code) {
  net.roomCode = code.toUpperCase();
  net.isHost = false;
  net.myIndex = 1;
  showLobbyError('');
  document.getElementById('join-waiting').classList.remove('hidden');
  document.getElementById('join-loader').classList.remove('hidden');
  document.getElementById('join-connect-btn').disabled = true;

  net.peer = new Peer('emojibattle-guest-' + Math.random().toString(36).slice(2, 8));
  net.peer.on('open', () => {
    const conn = net.peer.connect('emojibattle-' + code.toLowerCase(), { reliable: true });
    conn.on('open', () => {
      setupConnection(conn);
      document.getElementById('join-waiting').textContent = 'Connected! Starting...';
      document.getElementById('join-waiting').classList.add('connected-text');
      document.getElementById('join-loader').classList.add('hidden');
    });
    conn.on('error', (err) => { showLobbyError('Could not connect: ' + err.message); resetJoinUI(); });
    setTimeout(() => {
      if (!conn.open) { showLobbyError('Room not found. Check the code.'); resetJoinUI(); if (net.peer) { net.peer.destroy(); net.peer = null; } }
    }, 10000);
  });
  net.peer.on('error', (err) => { showLobbyError('Error: ' + err.message); resetJoinUI(); });
}

function resetJoinUI() {
  document.getElementById('join-waiting').classList.add('hidden');
  document.getElementById('join-loader').classList.add('hidden');
  document.getElementById('join-connect-btn').disabled = false;
}

function showLobbyError(msg) {
  const el = document.getElementById('lobby-error');
  if (msg) { el.textContent = msg; el.classList.remove('hidden'); } else el.classList.add('hidden');
}

function cleanupNet() {
  if (net.conn) { net.conn.close(); net.conn = null; }
  if (net.peer) { net.peer.destroy(); net.peer = null; }
  net.isHost = false; net.myIndex = 0; net.roomCode = null;
}

// ============================================================
// RENDERING
// ============================================================

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let animFrameId = null;

function resizeCanvas() {
  const wrapper = document.getElementById('grid-wrapper');
  const maxW = wrapper.clientWidth - 16;
  const maxH = wrapper.clientHeight - 16;
  const scaleX = maxW / (GRID_COLS * CELL_PX);
  const scaleY = maxH / (GRID_ROWS * CELL_PX);
  const scale = Math.min(scaleX, scaleY, 1);
  canvas.width = Math.floor(GRID_COLS * CELL_PX * scale);
  canvas.height = Math.floor(GRID_ROWS * CELL_PX * scale);
  canvas.style.width = canvas.width + 'px';
  canvas.style.height = canvas.height + 'px';
}

function cellSize() { return canvas.width / GRID_COLS; }

function drawGrid() {
  const cs = cellSize();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const x = c * cs, y = r * cs;
      const light = (r + c) % 2 === 0;
      if (c < DIVIDER_COL) {
        ctx.fillStyle = light ? 'rgba(30, 80, 200, 0.12)' : 'rgba(30, 80, 200, 0.06)';
      } else {
        ctx.fillStyle = light ? 'rgba(200, 40, 40, 0.12)' : 'rgba(200, 40, 40, 0.06)';
      }
      ctx.fillRect(x, y, cs, cs);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, cs, cs);
    }
  }

  // Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(DIVIDER_COL * cs, 0);
  ctx.lineTo(DIVIDER_COL * cs, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Highlight valid placement
  if (game && game.selected && game.selected.kind === 'shop_building') {
    const pi = game.selected.forPlayer;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (playerTerritory(pi, c) && !cellOccupied(r, c)) {
          ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
          ctx.fillRect(c * cs, r * cs, cs, cs);
        }
      }
    }
  }

  if (!game) return;

  // Entities
  const fontSize = Math.floor(cs * 0.6);
  ctx.font = `${fontSize}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let p = 0; p < 2; p++) {
    game.players[p].buildings.forEach(b => {
      if (b.hp <= 0) return;
      ctx.fillText(BUILDINGS[b.type].emoji, b.col * cs + cs / 2, b.row * cs + cs / 2);
      drawHpBar(b.col * cs, b.row * cs + cs - 6, cs, 4, b.hp, b.maxHp, p);
    });
    game.players[p].units.forEach(u => {
      if (u.hp <= 0) return;
      ctx.fillText(UNITS[u.type].emoji, u.col * cs + cs / 2, u.row * cs + cs / 2);
      drawHpBar(u.col * cs, u.row * cs + cs - 6, cs, 4, u.hp, u.maxHp, p);
      ctx.fillStyle = p === 0 ? '#4488ff' : '#ff4444';
      ctx.beginPath();
      ctx.arc(u.col * cs + 6, u.row * cs + 6, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Effects
  for (let i = game.effects.length - 1; i >= 0; i--) {
    const e = game.effects[i];
    ctx.globalAlpha = e.ttl / 20;
    ctx.font = `${Math.floor(cs * 0.4)}px serif`;
    ctx.fillText(e.emoji, e.col * cs + cs / 2, e.row * cs + cs * 0.3);
    ctx.globalAlpha = 1;
    e.ttl--;
    if (e.ttl <= 0) game.effects.splice(i, 1);
  }
}

function drawHpBar(x, y, w, h, hp, maxHp, pi) {
  const pct = Math.max(0, hp / maxHp);
  const barW = w * 0.8, barX = x + (w - barW) / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(barX, y, barW, h);
  ctx.fillStyle = pct > 0.5 ? '#4f4' : pct > 0.25 ? '#ff4' : '#f44';
  ctx.fillRect(barX, y, barW * pct, h);
  ctx.strokeStyle = pi === 0 ? 'rgba(30,100,255,0.5)' : 'rgba(255,50,50,0.5)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(barX, y, barW, h);
}

function renderFrame() {
  drawGrid();
  animFrameId = requestAnimationFrame(renderFrame);
}

function startRenderLoop() {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  renderFrame();
}

// ============================================================
// UI
// ============================================================

function updateUI() {
  if (!game) return;
  const p1 = game.players[0], p2 = game.players[1];
  document.getElementById('p1-gold').textContent = p1.gold;
  document.getElementById('p1-income').textContent = p1.income;
  document.getElementById('p2-gold').textContent = p2.gold;
  document.getElementById('p2-income').textContent = p2.income;
  document.getElementById('turn-num').textContent = game.turn;

  const cp = game.currentPlayer;
  if (game.mode === 'bot') {
    document.getElementById('current-player').textContent = cp === 0 ? '🔵 Your Turn' : '🤖 Bot Thinking...';
    document.getElementById('p1-label').textContent = '🔵 You';
    document.getElementById('p2-label').textContent = '🤖 Bot';
  } else if (game.mode === 'online') {
    const myTurn = cp === net.myIndex;
    document.getElementById('current-player').textContent = myTurn ? '⚡ Your Turn' : "⏳ Opponent's Turn";
    document.getElementById('p1-label').innerHTML = net.myIndex === 0
      ? '🔵 You <span class="you-tag">YOU</span>' : '🔵 Opponent';
    document.getElementById('p2-label').innerHTML = net.myIndex === 1
      ? '🔴 You <span class="you-tag">YOU</span>' : '🔴 Opponent';
  } else {
    document.getElementById('current-player').textContent = `${cp === 0 ? '🔵' : '🔴'} Player ${cp + 1}'s Turn`;
    document.getElementById('p1-label').textContent = '🔵 Player 1';
    document.getElementById('p2-label').textContent = '🔴 Player 2';
  }

  // End turn button
  const endBtn = document.getElementById('end-turn-btn');
  const myTurn = isMyTurn();
  endBtn.disabled = !myTurn;
  if (game.mode === 'bot' && cp === 1) endBtn.textContent = '🤖 Bot Playing...';
  else if (game.mode === 'online' && !myTurn) endBtn.textContent = '⏳ Waiting...';
  else endBtn.textContent = 'End Turn ⏭️';

  setNotMyTurn(!myTurn);
  buildShop();
  updateLog();
}

function buildShop() {
  const container = document.getElementById('shop-items');
  container.innerHTML = '';

  // Determine which player's shop to show
  let pi;
  if (game.mode === 'online') pi = net.myIndex;
  else if (game.mode === 'bot') pi = 0;
  else pi = game.currentPlayer;
  const player = game.players[pi];
  const myTurn = isMyTurn();

  for (const [key, def] of Object.entries(BUILDINGS)) {
    if (key === 'castle') continue;
    const canAfford = player.gold >= def.cost;
    const disabled = !canAfford || !myTurn;
    const el = document.createElement('div');
    el.className = 'shop-item' + (disabled ? ' disabled' : '');
    el.innerHTML = `<span class="shop-emoji">${def.emoji}</span><span class="shop-name">${def.name}</span><span class="shop-cost">💰 ${def.cost}</span>`;
    if (!disabled) el.addEventListener('click', () => selectShopItem('shop_building', key, pi));
    container.appendChild(el);
  }

  const sep = document.createElement('div');
  sep.style.cssText = 'width:2px;background:rgba(255,255,255,0.15);align-self:stretch;margin:0 0.3rem;';
  container.appendChild(sep);

  const canTrain = hasBarracks(pi);
  for (const [key, def] of Object.entries(UNITS)) {
    const canAfford = player.gold >= def.cost;
    const disabled = !canAfford || !canTrain || !myTurn;
    const el = document.createElement('div');
    el.className = 'shop-item' + (disabled ? ' disabled' : '');
    el.innerHTML = `<span class="shop-emoji">${def.emoji}</span><span class="shop-name">${def.name}${!canTrain ? ' (⚔️)' : ''}</span><span class="shop-cost">💰 ${def.cost}</span>`;
    if (!disabled) el.addEventListener('click', () => selectShopItem('shop_unit', key, pi));
    container.appendChild(el);
  }
}

function selectShopItem(kind, type, playerIdx) {
  if (!isMyTurn()) return;

  if (game.selected && game.selected.kind === kind && game.selected.type === type) {
    game.selected = null;
    updateSelectedInfo();
    return;
  }

  game.selected = { kind, type, forPlayer: playerIdx };
  updateSelectedInfo();

  if (kind === 'shop_unit') {
    const player = game.players[playerIdx];
    const def = UNITS[type];

    if (game.mode === 'online' && !net.isHost) {
      netSend({ type: 'action', action: { kind: 'train', type } });
    } else {
      const unit = spawnUnit(playerIdx, type);
      if (unit) {
        player.gold -= def.cost;
        addLog(`${pLabel(playerIdx)} Trained ${def.emoji}`);
        if (game.mode === 'online') broadcastState();
      } else {
        addLog('No space near castle!');
      }
    }
    game.selected = null;
    buildShop();
    updateSelectedInfo();
  }
}

function updateSelectedInfo() {
  const info = document.getElementById('selected-info');
  if (!game || !game.selected || game.selected.kind === 'shop_unit') { info.classList.add('hidden'); return; }
  info.classList.remove('hidden');
  const def = BUILDINGS[game.selected.type];
  document.getElementById('selected-name').textContent = `${def.emoji} ${def.name}`;
  document.getElementById('selected-desc').textContent = def.desc + ' — Click your territory to place.';
}

function updateLog() {
  const el = document.getElementById('log-entries');
  if (game) el.innerHTML = game.log.slice(0, 3).map(l => `<span class="log-entry">${l}</span>`).join('');
}

// ============================================================
// INPUT
// ============================================================

canvas.addEventListener('click', (e) => {
  if (!game || game.phase !== 'play') return;
  if (!isMyTurn()) return;

  const rect = canvas.getBoundingClientRect();
  const cs = cellSize();
  const col = Math.floor((e.clientX - rect.left) / cs);
  const row = Math.floor((e.clientY - rect.top) / cs);
  if (!inBounds(row, col)) return;

  if (game.selected && game.selected.kind === 'shop_building') {
    const pi = game.selected.forPlayer;
    const player = game.players[pi];
    const type = game.selected.type;
    const def = BUILDINGS[type];

    if (!playerTerritory(pi, col)) { addLog("Can't build on enemy territory!"); updateLog(); return; }
    if (cellOccupied(row, col)) { addLog('Cell is occupied!'); updateLog(); return; }
    if (player.gold < def.cost) { addLog('Not enough gold!'); updateLog(); return; }

    if (game.mode === 'online' && !net.isHost) {
      netSend({ type: 'action', action: { kind: 'build', type, row, col } });
    } else {
      placeBuilding(pi, type, row, col);
      player.gold -= def.cost;
      addLog(`${pLabel(pi)} Built ${def.emoji} ${def.name}`);
      if (game.mode === 'online') broadcastState();
    }
    game.selected = null;
    buildShop();
    updateSelectedInfo();
    return;
  }

  // Info click
  const cell = game.grid[row][col];
  if (cell && cell.entityType === 'unit') {
    const u = game.players[cell.player].units[cell.entityIdx];
    const def = UNITS[u.type];
    addLog(`${def.emoji} ${def.name} — HP: ${u.hp}/${u.maxHp}, ATK: ${u.attack}`);
    updateLog();
  } else if (cell && cell.entityType === 'building') {
    const b = game.players[cell.player].buildings[cell.entityIdx];
    const def = BUILDINGS[b.type];
    addLog(`${def.emoji} ${def.name} — HP: ${b.hp}/${b.maxHp}`);
    updateLog();
  }
});

document.getElementById('end-turn-btn').addEventListener('click', endTurn);
document.getElementById('cancel-btn').addEventListener('click', () => {
  if (game) { game.selected = null; updateSelectedInfo(); }
});

// ============================================================
// SCREENS
// ============================================================

function showWinScreen() {
  document.getElementById('game-screen').classList.add('hidden');
  document.getElementById('win-screen').classList.remove('hidden');
  const w = game.winner;
  let msg;
  if (game.mode === 'bot') msg = w === 0 ? '🎉 You Win!' : '🤖 Bot Wins!';
  else if (game.mode === 'online') msg = w === net.myIndex ? '🎉 You Win!' : '😔 You Lost!';
  else msg = `${w === 0 ? '🔵' : '🔴'} Player ${w + 1} Wins! 🎉`;
  document.getElementById('win-message').textContent = msg;
}

function startNewGame(mode, difficulty) {
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('lobby-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  initGame(mode, difficulty || 'medium');
  resizeCanvas();
  updateUI();
  if (!animFrameId) startRenderLoop();
}

function backToTitle() {
  cleanupNet();
  if (game && game.botTimer) clearTimeout(game.botTimer);
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  game = null;
  document.getElementById('win-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.add('hidden');
  document.getElementById('lobby-screen').classList.add('hidden');
  document.getElementById('title-screen').classList.remove('hidden');
  document.getElementById('difficulty-select').classList.add('hidden');
}

// --- Event Listeners ---
document.getElementById('start-bot-btn').addEventListener('click', () => {
  document.getElementById('difficulty-select').classList.remove('hidden');
});
document.getElementById('start-pvp-btn').addEventListener('click', () => startNewGame('pvp'));
document.getElementById('start-online-btn').addEventListener('click', () => {
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('lobby-screen').classList.remove('hidden');
  document.getElementById('lobby-choices').classList.remove('hidden');
  document.getElementById('host-waiting').classList.add('hidden');
  document.getElementById('join-form').classList.add('hidden');
  document.getElementById('lobby-status').textContent = 'Choose an option';
  showLobbyError('');
});
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => startNewGame('bot', btn.dataset.diff));
});
document.getElementById('host-btn').addEventListener('click', hostGame);
document.getElementById('join-btn').addEventListener('click', () => {
  document.getElementById('lobby-choices').classList.add('hidden');
  document.getElementById('join-form').classList.remove('hidden');
  document.getElementById('lobby-status').textContent = 'Join a room';
  document.getElementById('join-code-input').focus();
});
document.getElementById('join-connect-btn').addEventListener('click', () => {
  const code = document.getElementById('join-code-input').value.trim();
  if (!code || code.length < 3) { showLobbyError('Enter a valid room code.'); return; }
  joinGame(code);
});
document.getElementById('join-code-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('join-connect-btn').click();
});
document.getElementById('copy-code-btn').addEventListener('click', () => {
  navigator.clipboard.writeText(document.getElementById('room-code-text').textContent).then(() => {
    const btn = document.getElementById('copy-code-btn');
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 2000);
  });
});
document.getElementById('lobby-back-btn').addEventListener('click', () => { cleanupNet(); backToTitle(); });
document.getElementById('restart-btn').addEventListener('click', backToTitle);
window.addEventListener('resize', () => { if (game) resizeCanvas(); });

document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && game && game.phase === 'play' && isMyTurn()) {
    if (document.activeElement?.tagName === 'INPUT') return;
    e.preventDefault();
    endTurn();
  }
  if (e.key === 'Escape' && game) {
    game.selected = null;
    updateSelectedInfo();
  }
});
