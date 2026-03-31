const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ── Themes ─────────────────────────────────────────────
const THEMES = {
  midnight: {
    name: 'Midnight',
    '--bg': '#1a1a2e', '--surface': '#16213e', '--surface-light': '#1f3056',
    '--primary': '#e94560', '--primary-hover': '#ff6b81',
    '--secondary': '#0f3460', '--secondary-hover': '#154a8a',
    '--text': '#eee', '--text-muted': '#999', '--accent': '#f5c518',
    '--success': '#2ecc71', '--danger': '#e74c3c',
    '--dice-bg': '#fff', '--dice-dot': '#1a1a2e',
    '--dice-selected': '#e94560', '--dice-selected-dot': '#fff', '--dice-locked': '#555',
  },
  forest: {
    name: 'Forest',
    '--bg': '#1b2a1b', '--surface': '#243524', '--surface-light': '#2f4a2f',
    '--primary': '#4caf50', '--primary-hover': '#66bb6a',
    '--secondary': '#2e7d32', '--secondary-hover': '#388e3c',
    '--text': '#e8f5e9', '--text-muted': '#a5d6a7', '--accent': '#fdd835',
    '--success': '#69f0ae', '--danger': '#ef5350',
    '--dice-bg': '#e8f5e9', '--dice-dot': '#1b2a1b',
    '--dice-selected': '#4caf50', '--dice-selected-dot': '#fff', '--dice-locked': '#4a6b4a',
  },
  ocean: {
    name: 'Ocean',
    '--bg': '#0d1b2a', '--surface': '#1b2838', '--surface-light': '#253d50',
    '--primary': '#00bcd4', '--primary-hover': '#26c6da',
    '--secondary': '#01579b', '--secondary-hover': '#0277bd',
    '--text': '#e0f7fa', '--text-muted': '#80cbc4', '--accent': '#ffab40',
    '--success': '#00e676', '--danger': '#ff5252',
    '--dice-bg': '#e0f7fa', '--dice-dot': '#0d1b2a',
    '--dice-selected': '#00bcd4', '--dice-selected-dot': '#fff', '--dice-locked': '#3a5a6e',
  },
  sunset: {
    name: 'Sunset',
    '--bg': '#2d1b30', '--surface': '#3e2244', '--surface-light': '#552e5c',
    '--primary': '#ff6f00', '--primary-hover': '#ff8f00',
    '--secondary': '#6a1b9a', '--secondary-hover': '#8e24aa',
    '--text': '#fce4ec', '--text-muted': '#ce93d8', '--accent': '#ffeb3b',
    '--success': '#76ff03', '--danger': '#ff1744',
    '--dice-bg': '#fce4ec', '--dice-dot': '#2d1b30',
    '--dice-selected': '#ff6f00', '--dice-selected-dot': '#fff', '--dice-locked': '#6b4a6e',
  },
  arctic: {
    name: 'Arctic',
    '--bg': '#e8edf2', '--surface': '#d0d8e0', '--surface-light': '#bcc6d0',
    '--primary': '#1565c0', '--primary-hover': '#1976d2',
    '--secondary': '#546e7a', '--secondary-hover': '#607d8b',
    '--text': '#1a2a3a', '--text-muted': '#5a6a7a', '--accent': '#e65100',
    '--success': '#2e7d32', '--danger': '#c62828',
    '--dice-bg': '#fff', '--dice-dot': '#1a2a3a',
    '--dice-selected': '#1565c0', '--dice-selected-dot': '#fff', '--dice-locked': '#90a4ae',
  },
  casino: {
    name: 'Casino',
    '--bg': '#1a0a0a', '--surface': '#2c1010', '--surface-light': '#3d1a1a',
    '--primary': '#d4af37', '--primary-hover': '#e6c347',
    '--secondary': '#8b0000', '--secondary-hover': '#a52a2a',
    '--text': '#f5e6c8', '--text-muted': '#c9a96e', '--accent': '#d4af37',
    '--success': '#50c878', '--danger': '#dc143c',
    '--dice-bg': '#f5e6c8', '--dice-dot': '#1a0a0a',
    '--dice-selected': '#d4af37', '--dice-selected-dot': '#1a0a0a', '--dice-locked': '#5a3a3a',
  },
  bubblegum: {
    name: 'Bubblegum',
    '--bg': '#fce4ec', '--surface': '#f8bbd0', '--surface-light': '#f48fb1',
    '--primary': '#e91e63', '--primary-hover': '#f06292',
    '--secondary': '#ad1457', '--secondary-hover': '#c2185b',
    '--text': '#311b24', '--text-muted': '#6d4c5e', '--accent': '#7b1fa2',
    '--success': '#00c853', '--danger': '#d50000',
    '--dice-bg': '#fff', '--dice-dot': '#311b24',
    '--dice-selected': '#e91e63', '--dice-selected-dot': '#fff', '--dice-locked': '#c48b9f',
  },
  hacker: {
    name: 'Hacker',
    '--bg': '#0a0a0a', '--surface': '#141414', '--surface-light': '#1e1e1e',
    '--primary': '#00ff41', '--primary-hover': '#33ff66',
    '--secondary': '#003b00', '--secondary-hover': '#005500',
    '--text': '#00ff41', '--text-muted': '#00aa2a', '--accent': '#00ff41',
    '--success': '#00ff41', '--danger': '#ff0040',
    '--dice-bg': '#0a0a0a', '--dice-dot': '#00ff41',
    '--dice-selected': '#00ff41', '--dice-selected-dot': '#0a0a0a', '--dice-locked': '#1a3a1a',
  },
};

let currentTheme = 'midnight';

function applyTheme(themeKey) {
  const theme = THEMES[themeKey];
  if (!theme) return;
  currentTheme = themeKey;
  const root = document.documentElement;
  for (const [prop, value] of Object.entries(theme)) {
    if (prop.startsWith('--')) {
      root.style.setProperty(prop, value);
    }
  }
  localStorage.setItem('farkle-theme', themeKey);
  renderThemeList();
}

// Derive a full theme from the 6 user-picked colors
function buildFullTheme(name, bg, surface, primary, text, accent, diceBg) {
  return {
    name,
    '--bg': bg, '--surface': surface,
    '--surface-light': lighten(surface, 20),
    '--primary': primary, '--primary-hover': lighten(primary, 15),
    '--secondary': darken(primary, 30), '--secondary-hover': darken(primary, 15),
    '--text': text, '--text-muted': blend(text, bg, 0.45),
    '--accent': accent,
    '--success': '#2ecc71', '--danger': '#e74c3c',
    '--dice-bg': diceBg, '--dice-dot': bg,
    '--dice-selected': primary, '--dice-selected-dot': diceBg,
    '--dice-locked': blend(surface, bg, 0.5),
  };
}

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
}

function lighten(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + amount, g + amount, b + amount);
}

function darken(hex, amount) {
  return lighten(hex, -amount);
}

function blend(hex1, hex2, t) {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

// Load custom themes from localStorage
function loadCustomThemes() {
  try {
    const saved = JSON.parse(localStorage.getItem('farkle-custom-themes') || '{}');
    for (const [key, theme] of Object.entries(saved)) {
      THEMES[key] = theme;
    }
  } catch (e) { /* ignore */ }
}

function saveCustomThemes() {
  const custom = {};
  for (const [key, theme] of Object.entries(THEMES)) {
    if (theme._custom) custom[key] = theme;
  }
  localStorage.setItem('farkle-custom-themes', JSON.stringify(custom));
}

function initCustomThemeEditor() {
  const toggle = $('#custom-theme-toggle');
  const editor = $('#custom-theme-editor');
  const colorInputs = editor.querySelectorAll('input[type="color"]');

  toggle.addEventListener('click', () => {
    editor.classList.toggle('hidden');
    if (!editor.classList.contains('hidden')) {
      // Reset to current theme colors for editing
      const editing = THEMES[currentTheme];
      if (editing) {
        const varMap = { '--bg': 0, '--surface': 1, '--primary': 2, '--text': 3, '--accent': 4, '--dice-bg': 5 };
        colorInputs.forEach((inp) => {
          const v = inp.dataset.var;
          if (editing[v]) inp.value = editing[v];
        });
      }
      $('#custom-theme-name').value = '';
      $('#custom-theme-delete').classList.add('hidden');
    }
  });

  // Live preview on color change
  colorInputs.forEach((inp) => {
    inp.addEventListener('input', () => {
      document.documentElement.style.setProperty(inp.dataset.var, inp.value);
    });
  });

  $('#custom-theme-save').addEventListener('click', () => {
    const name = $('#custom-theme-name').value.trim() || 'My Theme';
    const key = 'custom-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    const vals = {};
    colorInputs.forEach((inp) => { vals[inp.dataset.var] = inp.value; });

    const theme = buildFullTheme(
      name, vals['--bg'], vals['--surface'], vals['--primary'],
      vals['--text'], vals['--accent'], vals['--dice-bg']
    );
    theme._custom = true;
    THEMES[key] = theme;
    saveCustomThemes();
    applyTheme(key);
    editor.classList.add('hidden');
  });

  $('#custom-theme-delete').addEventListener('click', () => {
    if (THEMES[currentTheme] && THEMES[currentTheme]._custom) {
      delete THEMES[currentTheme];
      saveCustomThemes();
      applyTheme('midnight');
    }
  });
}

function renderThemeList() {
  const html = Object.entries(THEMES)
    .map(([key, t]) => {
      const isActive = key === currentTheme;
      const isCustom = t._custom;
      const swatches = [t['--bg'], t['--primary'], t['--accent']]
        .map((c) => `<div class="theme-swatch" style="background:${c}"></div>`)
        .join('');
      return `<button class="theme-option ${isActive ? 'active' : ''}" data-theme="${key}">
        <div class="theme-swatches">${swatches}</div>
        <span class="theme-name">${esc(t.name)}${isCustom ? ' <span class="custom-badge">custom</span>' : ''}</span>
      </button>`;
    })
    .join('');

  // Render into all theme list containers
  $$('.theme-list').forEach((container) => {
    container.innerHTML = html;
    container.querySelectorAll('.theme-option').forEach((btn) => {
      btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
    });
  });

  // Show/hide delete button based on whether current theme is custom
  const deleteBtn = $('#custom-theme-delete');
  if (deleteBtn) {
    deleteBtn.classList.toggle('hidden', !THEMES[currentTheme]?._custom);
  }
}

// ── State ──────────────────────────────────────────────
const state = {
  players: [],
  currentPlayerIndex: 0,
  turnScore: 0,
  dice: [],          // { value, selected, locked }
  rollCount: 0,
  hasRolled: false,
  finalRound: false,
  finalRoundTriggerPlayer: -1,
  gameOver: false,
  hotDiceCount: 0,   // track consecutive hot dice in a turn
  houseRules: {
    fourOfAKindPlusPair: true,
    twoTriplets: true,
    partialStraight: false,
    sixInstantWin: false,
    openingThreshold: false,
    threeFarklePenalty: true,
    forcedHotDice: false,
    exactWin: false,
  },
};

const WINNING_SCORE = 10000;

// ── Setup ──────────────────────────────────────────────
let selectedCount = 3;

function initSetup() {
  renderPlayerInputs(selectedCount);

  $$('.count-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.count-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedCount = +btn.dataset.count;
      renderPlayerInputs(selectedCount);
    });
  });

  $('#start-btn').addEventListener('click', startGame);
  $('#menu-btn').addEventListener('click', () => showScreen('setup-screen'));
  $('#roll-btn').addEventListener('click', rollDice);
  $('#bank-btn').addEventListener('click', bankPoints);
  $('#farkle-btn').addEventListener('click', confirmFarkle);
  $('#combos-btn').addEventListener('click', () => $('#combos-overlay').classList.remove('hidden'));
  $('#combos-close').addEventListener('click', () => $('#combos-overlay').classList.add('hidden'));
  $('#combos-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) $('#combos-overlay').classList.add('hidden');
  });
  $('#settings-btn').addEventListener('click', () => {
    renderThemeList();
    $('#settings-overlay').classList.remove('hidden');
  });
  $('#settings-close').addEventListener('click', () => $('#settings-overlay').classList.add('hidden'));
  $('#settings-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) $('#settings-overlay').classList.add('hidden');
  });
  $('#play-again-btn').addEventListener('click', () => {
    state.gameOver = false;
    showScreen('setup-screen');
  });
}

function renderPlayerInputs(count) {
  const container = $('#player-names');
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Player ${i + 1}`;
    input.maxLength = 16;
    container.appendChild(input);
  }
}

// ── Game Start ─────────────────────────────────────────
function startGame() {
  const inputs = $$('#player-names input');
  state.players = Array.from(inputs).map((inp, i) => ({
    name: inp.value.trim() || `Player ${i + 1}`,
    score: 0,
    onBoard: false,
    consecutiveFarkles: 0,
  }));
  state.currentPlayerIndex = 0;
  state.turnScore = 0;
  state.dice = [];
  state.rollCount = 0;
  state.hasRolled = false;
  state.finalRound = false;
  state.finalRoundTriggerPlayer = -1;
  state.gameOver = false;
  state.hotDiceCount = 0;

  // Read house rules from checkboxes
  state.houseRules.fourOfAKindPlusPair = $('#rule-four-pair').checked;
  state.houseRules.twoTriplets = $('#rule-two-triplets').checked;
  state.houseRules.partialStraight = $('#rule-partial-straight').checked;
  state.houseRules.sixInstantWin = $('#rule-six-instant-win').checked;
  state.houseRules.openingThreshold = $('#rule-opening-threshold').checked;
  state.houseRules.threeFarklePenalty = $('#rule-three-farkle-penalty').checked;
  state.houseRules.forcedHotDice = $('#rule-forced-hot-dice').checked;
  state.houseRules.exactWin = $('#rule-exact-win').checked;

  // If opening threshold is on, nobody starts on the board
  if (!state.houseRules.openingThreshold) {
    state.players.forEach((p) => (p.onBoard = true));
  }

  // Show/hide house rule rows in combos table
  toggleComboRow('combo-four-pair', state.houseRules.fourOfAKindPlusPair);
  toggleComboRow('combo-two-triplets', state.houseRules.twoTriplets);
  toggleComboRow('combo-partial-straight', state.houseRules.partialStraight);
  toggleComboRow('combo-six-instant-win', state.houseRules.sixInstantWin);

  showScreen('game-screen');
  renderScoreboard();
  startTurn();
}

function toggleComboRow(id, show) {
  const row = $(`#${id}`);
  if (row) row.style.display = show ? '' : 'none';
}

// ── Screen Management ──────────────────────────────────
function showScreen(id) {
  $$('.screen').forEach((s) => s.classList.add('hidden'));
  $(`#${id}`).classList.remove('hidden');
}

// ── Scoreboard ─────────────────────────────────────────
function renderScoreboard() {
  const sb = $('#scoreboard');
  sb.innerHTML = state.players
    .map((p, i) => {
      const isActive = i === state.currentPlayerIndex;
      let farklePips = '';
      if (state.houseRules.threeFarklePenalty) {
        farklePips = `<div class="farkle-pips">
          ${[0, 1, 2].map((j) => `<div class="farkle-pip ${j < p.consecutiveFarkles ? 'active' : ''}"></div>`).join('')}
        </div>`;
      }
      const notOnBoard = state.houseRules.openingThreshold && !p.onBoard
        ? '<div class="not-on-board">not on board</div>'
        : '';
      return `<div class="score-card ${isActive ? 'active' : ''}">
        <div class="name">${esc(p.name)}</div>
        <div class="score">${p.score.toLocaleString()}</div>
        ${notOnBoard}
        ${farklePips}
      </div>`;
    })
    .join('');
}

// ── Turn Management ────────────────────────────────────
function startTurn() {
  state.turnScore = 0;
  state.rollCount = 0;
  state.hasRolled = false;
  state.hotDiceCount = 0;
  state.dice = Array.from({ length: 6 }, () => ({
    value: 0,
    selected: false,
    locked: false,
  }));

  renderScoreboard();
  renderDice();
  updateTurnInfo();
  setMessage(`${currentPlayer().name}'s turn — Roll the dice!`, 'info');
  $('#roll-btn').disabled = false;
  $('#bank-btn').disabled = true;
  $('#farkle-btn').classList.add('hidden');
  $('#selection-score').textContent = '';
}

function currentPlayer() {
  return state.players[state.currentPlayerIndex];
}

function nextPlayer() {
  const next = (state.currentPlayerIndex + 1) % state.players.length;

  if (state.finalRound && next === state.finalRoundTriggerPlayer) {
    endGame();
    return;
  }

  state.currentPlayerIndex = next;
  startTurn();
}

// ── Turn Score Calculation ─────────────────────────────
function recalcTurnScore() {
  const lockedValues = state.dice.filter((d) => d.locked).map((d) => d.value);
  state.turnScore = calculateScore(lockedValues);
  updateTurnInfo();
}

// ── Dice Rolling ───────────────────────────────────────
function rollDice() {
  // Before rolling, lock any selected dice
  if (state.hasRolled) {
    const selected = state.dice.filter((d) => d.selected && !d.locked);
    if (selected.length === 0) {
      setMessage('Select at least one scoring die before rolling again.', 'info');
      return;
    }

    const alreadyLocked = state.dice.filter((d) => d.locked).map((d) => d.value);
    const selValues = selected.map((d) => d.value);
    const combinedScore = calculateScore([...alreadyLocked, ...selValues]);
    const lockedOnlyScore = calculateScore(alreadyLocked);
    if (combinedScore <= lockedOnlyScore) {
      setMessage('Selected dice must be scoring dice!', 'info');
      return;
    }

    // Check if any individual selected die doesn't contribute
    if (hasDeadDice(alreadyLocked, selValues)) {
      setMessage('Some dice you selected aren\'t worth points — deselect them.', 'info');
      return;
    }

    selected.forEach((d) => {
      d.locked = true;
      d.selected = false;
    });

    state.dice.forEach((d) => {
      if (d.locked) d.selected = false;
    });

    recalcTurnScore();

    // Hot dice check
    if (state.dice.every((d) => d.locked)) {
      state.hotDiceCount++;
      state.dice.forEach((d) => {
        d.locked = false;
        d.value = 0;
      });
      setMessage('Hot Dice! All 6 dice freed — roll again!', 'success');
    }
  }

  state.hasRolled = true;
  state.rollCount++;

  // Roll unlocked dice
  const diceArea = $('#dice-area');
  state.dice.forEach((d) => {
    if (!d.locked) {
      d.value = Math.ceil(Math.random() * 6);
      d.selected = false;
    }
  });

  renderDice();
  diceArea.querySelectorAll('.die:not(.locked)').forEach((el) => {
    el.classList.add('rolling');
    el.addEventListener('animationend', () => el.classList.remove('rolling'), { once: true });
  });

  updateTurnInfo();

  // Check for six of a kind instant win on the roll
  if (state.houseRules.sixInstantWin) {
    const allValues = state.dice.map((d) => d.value);
    const counts = [0, 0, 0, 0, 0, 0, 0];
    allValues.forEach((v) => counts[v]++);
    if (counts.some((c) => c === 6)) {
      setMessage(`SIX OF A KIND! ${currentPlayer().name} wins instantly!`, 'success');
      $('#roll-btn').disabled = true;
      $('#bank-btn').disabled = true;
      $('#farkle-btn').classList.add('hidden');
      disableDiceSelection();
      // Select all dice visually
      state.dice.forEach((d) => (d.selected = true));
      renderDice();
      setTimeout(() => {
        currentPlayer().score = Math.max(currentPlayer().score, WINNING_SCORE);
        state.finalRound = false;
        endGame();
      }, 2000);
      return;
    }
  }

  // Check for farkle — a die counts if it scores on its own OR
  // if adding it to locked dice increases the combined score
  const unlocked = state.dice.filter((d) => !d.locked).map((d) => d.value);
  const lockedValues = state.dice.filter((d) => d.locked).map((d) => d.value);
  const lockedScore = calculateScore(lockedValues);
  const canScore = unlocked.some((val) => {
    // Check if this die scores on its own (1s and 5s)
    if (calculateScore([val]) > 0) return true;
    // Check if adding this die to locked dice increases the score
    if (calculateScore([...lockedValues, val]) > lockedScore) return true;
    return false;
  });
  // Also check if the full set of unlocked dice has combos (e.g. three of a kind among unlocked)
  const fullUnlockedScores = calculateScore(unlocked) > 0;

  if (!canScore && !fullUnlockedScores) {
    setMessage('FARKLE! No scoring dice — press Farkle to end your turn.', 'farkle');
    $('#roll-btn').disabled = true;
    $('#bank-btn').disabled = true;
    $('#farkle-btn').classList.remove('hidden');
    disableDiceSelection();
    return;
  }

  setMessage('Select scoring dice, then roll again or bank. Click kept dice to build combos.', '');
  $('#roll-btn').disabled = false;
  $('#bank-btn').disabled = false;
  $('#farkle-btn').classList.add('hidden');
  $('#selection-score').textContent = '';
}

// ── Farkle Confirmation ────────────────────────────────
function confirmFarkle() {
  const player = currentPlayer();
  player.consecutiveFarkles++;

  let msg = `${player.name} farkled! All points from this turn are lost.`;

  // Three farkle penalty
  if (state.houseRules.threeFarklePenalty && player.consecutiveFarkles >= 3) {
    player.score = Math.max(0, player.score - 1000);
    player.consecutiveFarkles = 0;
    msg += ' Three farkles in a row! -1,000 points!';
    renderScoreboard();
  }

  setMessage(msg, 'farkle');
  $('#farkle-btn').classList.add('hidden');
  renderScoreboard();
  setTimeout(() => nextPlayer(), 1500);
}

// ── Banking ────────────────────────────────────────────
function bankPoints() {
  const allKept = state.dice.filter((d) => d.locked || d.selected);
  const allValues = allKept.map((d) => d.value);
  const totalScore = calculateScore(allValues);

  const selected = state.dice.filter((d) => d.selected && !d.locked);
  if (selected.length > 0) {
    const lockedOnly = state.dice.filter((d) => d.locked).map((d) => d.value);
    const lockedScore = calculateScore(lockedOnly);
    if (totalScore <= lockedScore) {
      setMessage('Selected dice don\'t score — deselect them or pick scoring dice.', 'info');
      return;
    }
    const selValues = selected.map((d) => d.value);
    if (hasDeadDice(lockedOnly, selValues)) {
      setMessage('Some dice you selected aren\'t worth points — deselect them.', 'info');
      return;
    }
  }

  if (totalScore === 0) {
    setMessage('You need to score some points first!', 'info');
    return;
  }

  // Forced hot dice: if all dice would be locked/selected, must re-roll
  if (state.houseRules.forcedHotDice) {
    const allDiceKept = state.dice.every((d) => d.locked || d.selected);
    if (allDiceKept) {
      setMessage('Forced Hot Dice! All dice score — you must roll again!', 'info');
      return;
    }
  }

  const player = currentPlayer();

  // Opening threshold check
  if (state.houseRules.openingThreshold && !player.onBoard) {
    if (totalScore < 500) {
      setMessage(`Need at least 500 to get on the board! (current: ${totalScore})`, 'info');
      return;
    }
    player.onBoard = true;
  }

  // Exact win check
  if (state.houseRules.exactWin) {
    const wouldBe = player.score + totalScore;
    if (wouldBe > WINNING_SCORE) {
      setMessage(`Would exceed ${WINNING_SCORE.toLocaleString()}! Turn lost — must hit exactly.`, 'farkle');
      player.consecutiveFarkles = 0; // not a real farkle
      renderScoreboard();
      setTimeout(() => nextPlayer(), 1500);
      $('#roll-btn').disabled = true;
      $('#bank-btn').disabled = true;
      $('#farkle-btn').classList.add('hidden');
      disableDiceSelection();
      return;
    }
  }

  player.score += totalScore;
  player.consecutiveFarkles = 0;
  setMessage(`${player.name} banks ${totalScore.toLocaleString()} points!`, 'success');

  // Check for win trigger
  if (player.score >= WINNING_SCORE && !state.finalRound) {
    state.finalRound = true;
    state.finalRoundTriggerPlayer = state.currentPlayerIndex;
    setMessage(
      `${player.name} hits ${WINNING_SCORE.toLocaleString()}! Everyone else gets one final turn!`,
      'success'
    );
  }

  renderScoreboard();
  setTimeout(() => nextPlayer(), 1200);
  $('#roll-btn').disabled = true;
  $('#bank-btn').disabled = true;
  $('#farkle-btn').classList.add('hidden');
  disableDiceSelection();
}

// ── Scoring Logic ──────────────────────────────────────
// Check if any die in selValues doesn't contribute when combined with base
function hasDeadDice(base, selValues) {
  const fullScore = calculateScore([...base, ...selValues]);
  for (let i = 0; i < selValues.length; i++) {
    const without = [...base, ...selValues.slice(0, i), ...selValues.slice(i + 1)];
    if (calculateScore(without) === fullScore) {
      return true; // removing this die didn't reduce score — it's dead weight
    }
  }
  return false;
}

function calculateScore(diceValues) {
  const counts = [0, 0, 0, 0, 0, 0, 0]; // index 0 unused, 1-6
  diceValues.forEach((v) => counts[v]++);

  let score = 0;
  const n = diceValues.length;

  // Straight: 1-2-3-4-5-6
  if (n === 6 && counts[1] === 1 && counts[2] === 1 && counts[3] === 1 &&
      counts[4] === 1 && counts[5] === 1 && counts[6] === 1) {
    return 1500;
  }

  // Three pairs (includes 2+2+2 pattern)
  if (n === 6) {
    const pairs = counts.filter((c) => c === 2).length;
    if (pairs === 3) return 1500;
  }

  // House rule: four of a kind + a pair = 1500
  if (state.houseRules.fourOfAKindPlusPair && n === 6) {
    const hasFour = counts.some((c) => c === 4);
    const hasPair = counts.filter((c) => c === 2).length === 1;
    if (hasFour && hasPair) return 1500;
  }

  // House rule: two triplets = 2500
  if (state.houseRules.twoTriplets && n === 6) {
    const triplets = counts.filter((c) => c === 3).length;
    if (triplets === 2) return 2500;
  }

  // House rule: partial straight (1-2-3-4-5 or 2-3-4-5-6) = 500
  if (state.houseRules.partialStraight && n === 5) {
    const lowStraight = counts[1] === 1 && counts[2] === 1 && counts[3] === 1 &&
                        counts[4] === 1 && counts[5] === 1;
    const highStraight = counts[2] === 1 && counts[3] === 1 && counts[4] === 1 &&
                         counts[5] === 1 && counts[6] === 1;
    if (lowStraight || highStraight) return 500;
  }

  // Process multiples (3, 4, 5, 6 of a kind)
  const remaining = [...counts];
  for (let face = 1; face <= 6; face++) {
    if (remaining[face] >= 6) {
      const base = face === 1 ? 1000 : face * 100;
      score += base * 8;
      remaining[face] -= 6;
    } else if (remaining[face] >= 5) {
      const base = face === 1 ? 1000 : face * 100;
      score += base * 4;
      remaining[face] -= 5;
    } else if (remaining[face] >= 4) {
      const base = face === 1 ? 1000 : face * 100;
      score += base * 2;
      remaining[face] -= 4;
    } else if (remaining[face] >= 3) {
      const base = face === 1 ? 1000 : face * 100;
      score += base;
      remaining[face] -= 3;
    }
  }

  // Remaining 1s and 5s
  score += remaining[1] * 100;
  score += remaining[5] * 50;

  return score;
}

// ── Dice Rendering ─────────────────────────────────────
function renderDice() {
  const area = $('#dice-area');
  area.innerHTML = '';

  state.dice.forEach((die, i) => {
    const el = document.createElement('div');
    el.className = 'die';
    if (die.selected) el.classList.add('selected');
    if (die.locked) el.classList.add('locked');
    el.dataset.value = die.value;
    el.dataset.index = i;

    const dotPositions = getDotPositions(die.value);
    for (let pos = 0; pos < 9; pos++) {
      const dot = document.createElement('div');
      dot.className = 'dot' + (dotPositions.includes(pos) ? ' visible' : '');
      el.appendChild(dot);
    }

    if (state.hasRolled && die.value > 0) {
      el.addEventListener('click', () => toggleDie(i));
    }

    area.appendChild(el);
  });
}

function getDotPositions(value) {
  switch (value) {
    case 1: return [4];
    case 2: return [2, 6];
    case 3: return [2, 4, 6];
    case 4: return [0, 2, 6, 8];
    case 5: return [0, 2, 4, 6, 8];
    case 6: return [0, 2, 3, 5, 6, 8];
    default: return [];
  }
}

function toggleDie(index) {
  const die = state.dice[index];
  die.selected = !die.selected;
  renderDice();
  updateSelectionPreview();
}

function disableDiceSelection() {
  $$('.die').forEach((el) => {
    el.style.pointerEvents = 'none';
  });
}

function updateSelectionPreview() {
  const selected = state.dice.filter((d) => d.selected);
  const el = $('#selection-score');
  if (selected.length === 0) {
    el.textContent = '';
    return;
  }

  const allKept = state.dice.filter((d) => d.locked || d.selected);
  const allValues = allKept.map((d) => d.value);
  const combinedScore = calculateScore(allValues);
  const lockedOnly = state.dice.filter((d) => d.locked && !d.selected).map((d) => d.value);
  const lockedScore = calculateScore(lockedOnly);
  const addedScore = combinedScore - lockedScore;

  if (addedScore > 0) {
    const hasLockedSelected = selected.some((d) => d.locked);
    const label = hasLockedSelected ? 'Combined selection worth' : 'Selected dice worth';
    el.textContent = `${label}: +${addedScore} points (turn total: ${combinedScore})`;
    el.style.color = 'var(--success)';
  } else {
    el.textContent = 'Selected dice don\'t add points';
    el.style.color = 'var(--danger)';
  }
}

// ── UI Updates ─────────────────────────────────────────
function updateTurnInfo() {
  $('#current-player-name').textContent = currentPlayer().name;
  $('#turn-score').textContent = state.turnScore.toLocaleString();
}

function setMessage(text, type) {
  const el = $('#message');
  el.textContent = text;
  el.className = 'message' + (type ? ` ${type}` : '');
}

// ── Game Over ──────────────────────────────────────────
function endGame() {
  state.gameOver = true;
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  $('#winner-text').textContent = `${winner.name} Wins!`;

  const container = $('#final-scores');
  container.innerHTML = sorted
    .map(
      (p, i) =>
        `<div class="final-score-row ${i === 0 ? 'winner' : ''}">
          <span><span class="rank">#${i + 1}</span> ${esc(p.name)}</span>
          <span class="points">${p.score.toLocaleString()}</span>
        </div>`
    )
    .join('');

  showScreen('gameover-screen');
}

// ── Utilities ──────────────────────────────────────────
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ── Init ───────────────────────────────────────────────
loadCustomThemes();
const savedTheme = localStorage.getItem('farkle-theme');
if (savedTheme && THEMES[savedTheme]) {
  applyTheme(savedTheme);
}
initSetup();
initCustomThemeEditor();
renderThemeList();
