const SIZE = 10;
const GOAL = 300;
const MAX_ROUNDS = 24;
const PLAYER_COLORS = ['#b3df68', '#ef9c72', '#76b6d0', '#c28ac2'];
const PLAYER_NAMES = ['You', 'P2', 'P3', 'P4'];
const propertyList = [
  { id: 11, name: 'Moss Lane', price: 45, rent: 14, color: '#91ad64' },
  { id: 18, name: 'Pine Street', price: 60, rent: 18, color: '#78a584' },
  { id: 24, name: 'Market Row', price: 75, rent: 24, color: '#d3a15e' },
  { id: 37, name: 'The Old Steps', price: 55, rent: 17, color: '#bc8dba' },
  { id: 42, name: 'Willow Walk', price: 65, rent: 20, color: '#81a6b0' },
  { id: 53, name: 'Clover Court', price: 50, rent: 16, color: '#a2b75e' },
  { id: 67, name: 'Lantern Square', price: 80, rent: 26, color: '#d58668' },
  { id: 76, name: 'Juniper Way', price: 70, rent: 22, color: '#718eb2' },
  { id: 86, name: 'Little Harbor', price: 85, rent: 28, color: '#d39c5f' },
  { id: 95, name: 'Sunbeam Terrace', price: 65, rent: 20, color: '#cf8277' }
];
const stairPairs = [[13, 82], [29, 64]];
const coinSeed = [27, 45, 83, 16, 58, 34, 91, 9, 65, 21, 49, 3];
const directions = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
const $ = (id) => document.getElementById(id);
const board = $('board');
let cells = [];
let state;
let toastTimer;

function makePlayers(count) {
  const starts = [
    { snake: [72, 71, 70], direction: 'right' },
    { snake: [87, 88, 89], direction: 'left' },
    { snake: [5, 4, 3], direction: 'down' },
    { snake: [94, 95, 96], direction: 'up' }
  ];
  return starts.slice(0, count).map((start, id) => ({
    id, name: PLAYER_NAMES[id], color: PLAYER_COLORS[id], cash: 120, owned: new Set(),
    snake: [...start.snake], direction: start.direction, moves: 0, finished: false, won: false
  }));
}
function freshState(count = 1) {
  return { started: false, finished: false, players: makePlayers(count), active: 0,
    coins: new Set(coinSeed), pending: null, round: 1, playerCount: count, selection: count };
}
function currentPlayer() { return state.players[state.active]; }
function getOwner(id) { return state.players.find((player) => player.owned.has(id)); }
function allSnakes() { return state.players.flatMap((player) => player.snake); }
function propertyAt(id) { return propertyList.find((p) => p.id === id); }
function stairMate(id) {
  for (const pair of stairPairs) if (pair.includes(id)) return pair[0] === id ? pair[1] : pair[0];
  return null;
}
function setupBoard() {
  board.innerHTML = '';
  cells = [];
  for (let id = 0; id < SIZE * SIZE; id++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.setAttribute('role', 'gridcell');
    cell.dataset.index = String(id + 1).padStart(2, '0');
    board.appendChild(cell);
    cells.push(cell);
  }
}
function updateBoard() {
  const occupied = new Map();
  state.players.forEach((player) => player.snake.forEach((id, index) => {
    if (!occupied.has(id)) occupied.set(id, { player, head: index === 0 });
  }));
  cells.forEach((cell, id) => {
    const property = propertyAt(id);
    const isStair = stairMate(id) !== null;
    cell.className = 'cell';
    cell.removeAttribute('aria-label');
    cell.innerHTML = '';
    if (property) {
      cell.classList.add('property');
      cell.style.setProperty('--tile-color', property.color);
      const owner = getOwner(id);
      if (owner) cell.classList.add('owned');
      if (owner) cell.style.setProperty('--tile-color', owner.color);
      cell.innerHTML = `<span class="property-band"></span><span class="tile-icon">${owner ? '⌂' : '＋'}</span><span class="cell-label">${property.name}</span>`;
      cell.setAttribute('aria-label', `${property.name}, ${owner ? `owned by ${owner.name}` : `for sale, $${property.price}`}`);
    } else if (isStair) {
      cell.classList.add('stair');
      cell.innerHTML = '<span class="tile-icon">↗</span>';
      cell.setAttribute('aria-label', 'Stairway');
    } else if (state.coins.has(id)) {
      cell.classList.add('coin');
      cell.innerHTML = '<span class="tile-icon">✦</span>';
      cell.setAttribute('aria-label', 'Loose change');
    } else {
      cell.setAttribute('aria-label', `City square ${id + 1}`);
    }
    if (occupied.has(id)) {
      const occupant = occupied.get(id);
      cell.classList.add('snake-on-tile');
      const segment = document.createElement('span');
      segment.style.setProperty('--snake-color', occupant.player.color);
      segment.className = `snake-segment${occupant.head ? ` snake-head dir-${occupant.player.direction}` : ''}`;
      cell.appendChild(segment);
    }
  });
}
function updateUI() {
  const player = currentPlayer();
  $('cash-value').textContent = player.cash;
  $('wallet-title').innerHTML = `${player.name.toUpperCase()}'S WALLET <span>↗</span>`;
  $('goal-title').textContent = player.owned.size ? `${player.name.toUpperCase()}'S LITTLE EMPIRE` : 'YOUR LITTLE EMPIRE';
  $('turn-value').textContent = String(Math.min(state.round, MAX_ROUNDS)).padStart(2, '0');
  $('round-note').textContent = `of ${MAX_ROUNDS}`;
  $('move-label').innerHTML = `ROUND <b>${String(Math.min(state.round, MAX_ROUNDS)).padStart(2, '0')}</b> <i>/ ${MAX_ROUNDS}</i> · ${player.name.toUpperCase()}'S TURN`;
  $('owned-count').textContent = player.owned.size;
  const percent = Math.min(100, Math.round(player.cash / GOAL * 100));
  $('goal-percent').textContent = `${percent}%`;
  $('goal-progress-fill').style.width = `${percent}%`;
  $('cash-note').textContent = player.cash >= GOAL ? 'A city of your own!' : player.cash > 200 ? 'Looking like a local tycoon' : player.cash > 120 ? 'Your pockets are getting heavier' : 'A modest little start';
  $('player-strip').innerHTML = state.players.length > 1 ? state.players.map((p, index) => `<span class="player-chip${index === state.active ? ' active' : ''}"><i style="--player-color:${p.color}"></i><b>${p.name}</b> $${p.cash}</span>`).join('') : '';
  document.querySelectorAll('.player-count').forEach((button) => {
    const selected = Number(button.dataset.players) === state.selection;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  document.getElementById('player-select').classList.toggle('hidden', state.started);
  const card = $('purchase-card');
  card.classList.toggle('hidden', !state.pending);
  $('deal-card').classList.toggle('hidden', Boolean(state.pending));
  if (state.pending) {
    const p = state.pending;
    $('purchase-name').textContent = p.name;
    $('purchase-price').textContent = `$${p.price}`;
    $('purchase-rent').textContent = `$${p.rent}`;
    $('purchase-color').style.background = p.color;
    $('buy-button').disabled = player.cash < p.price;
    $('buy-button').style.opacity = player.cash < p.price ? '.48' : '1';
    $('buy-button').textContent = player.cash < p.price ? 'NOT ENOUGH CASH' : 'BUY THIS CORNER →';
  }
  updateBoard();
}
function setEvent(kicker, message, icon = '✦') {
  $('event-kicker').textContent = kicker;
  $('event-message').textContent = message;
  $('event-icon').textContent = icon;
}
function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1650);
}
function setOverlay(title, message, button, icon = '↗') {
  const overlay = $('start-overlay');
  overlay.querySelector('.overlay-icon').textContent = icon;
  overlay.querySelector('h2').textContent = title;
  overlay.querySelector('p').innerHTML = message;
  $('start-button').innerHTML = `${button} <span>→</span>`;
  overlay.classList.remove('hidden');
}
function startGame() {
  if (state.started && !state.finished) return;
  const count = state.selection || state.playerCount || 1;
  state = freshState(count);
  state.started = true;
  for (const id of allSnakes()) state.coins.delete(id);
  $('start-overlay').classList.add('hidden');
  setEvent('ROUND ONE', `${currentPlayer().name} is up first. Take one careful step.`, '↗');
  updateUI();
}
function finishGame(winner = null) {
  state.finished = true;
  state.pending = null;
  const standings = [...state.players].sort((a, b) => b.cash - a.cash);
  const champ = winner || standings[0];
  setEvent(winner ? 'YOU DID IT' : 'FINAL TALLY', `${champ.name} takes the city with $${champ.cash}.`, '✳');
  const scores = standings.map((p, index) => `${index + 1}. ${p.name} — $${p.cash}`).join('<br>');
  setOverlay(winner ? `${champ.name} wins the city!` : 'The books are closed.', `${scores}<br><br>One more little game?`, 'PLAY AGAIN', '✳');
  showToast(`${champ.name} wins with $${champ.cash}!`);
  updateUI();
}
function spawnFor(player) {
  const starts = [
    { snake: [72, 71, 70], direction: 'right' },
    { snake: [87, 88, 89], direction: 'left' },
    { snake: [5, 4, 3], direction: 'down' },
    { snake: [94, 95, 96], direction: 'up' }
  ];
  const start = starts[player.id];
  player.snake = [...start.snake];
  player.direction = start.direction;
}
function endTurn() {
  const completed = currentPlayer();
  completed.moves++;
  if (state.active === state.players.length - 1) {
    state.active = 0;
    state.round++;
  } else {
    state.active++;
  }
  if (state.round > MAX_ROUNDS) return finishGame();
  const next = currentPlayer();
  setEvent(`ROUND ${String(state.round).padStart(2, '0')}`, `${next.name}'s turn. One move, then pass the city on.`, '⌁');
  updateUI();
}
function crash() {
  const player = currentPlayer();
  player.cash = Math.max(0, player.cash - 25);
  spawnFor(player);
  setEvent('A LITTLE DETOUR', `${player.name} hit trouble. −$25. Turn passes to the next player.`, '↻');
  showToast(`${player.name}: tail trouble! −$25`);
  endTurn();
}
function addCoin() {
  const blocked = new Set([...allSnakes(), ...propertyList.map((p) => p.id), ...stairPairs.flat()]);
  const options = [];
  for (let i = 0; i < SIZE * SIZE; i++) if (!blocked.has(i) && !state.coins.has(i)) options.push(i);
  if (options.length) state.coins.add(options[Math.floor(Math.random() * options.length)]);
}
function handleLanding(id) {
  const player = currentPlayer();
  if (state.coins.has(id)) {
    state.coins.delete(id);
    player.cash += 30;
    addCoin();
    setEvent('LOOSE CHANGE!', `${player.name} found a shiny $30 coin.`, '✦');
    showToast(`${player.name} collected $30!`);
  }
  const property = propertyAt(id);
  const owner = getOwner(id);
  if (property && owner === player) {
    player.cash += property.rent;
    setEvent('YOUR CORNER, YOUR RENT', `${property.name} paid ${player.name} $${property.rent} in passing rent.`, '⌂');
    showToast(`${player.name} collected $${property.rent} rent.`);
  } else if (property && !owner) {
    state.pending = property;
    setEvent('A GOOD CORNER', `${property.name} is up for grabs. ${player.name}, make the call.`, '＋');
  } else if (property && owner) {
    const paid = Math.min(player.cash, property.rent);
    player.cash -= paid;
    owner.cash += paid;
    setEvent('RENT IS DUE', `${player.name} paid ${owner.name} $${paid} rent.`, '⌂');
    showToast(`${player.name} paid ${owner.name} $${paid} rent.`);
  }
}
function step(direction) {
  if (!state.started || state.finished || state.pending) return;
  const player = currentPlayer();
  if (opposite[player.direction] === direction && player.snake.length > 1) {
    showToast('No U-turns — your tail is right there!');
    return;
  }
  player.direction = direction;
  const [dy, dx] = directions[direction];
  const head = player.snake[0];
  const row = Math.floor(head / SIZE) + dy;
  const col = head % SIZE + dx;
  if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return crash();
  let next = row * SIZE + col;
  const mate = stairMate(next);
  if (mate !== null) {
    next = mate;
    setEvent('STAIRWAY SHORTCUT', `${player.name} hops across town.`, '↗');
  }
  const eating = state.coins.has(next);
  const ownBody = eating ? player.snake : player.snake.slice(0, -1);
  if (ownBody.includes(next) || state.players.some((other) => other !== player && other.snake.includes(next))) return crash();
  player.snake.unshift(next);
  if (!eating) player.snake.pop();
  handleLanding(next);
  updateUI();
  if (player.cash >= GOAL) return finishGame(player);
  if (!state.pending) endTurn();
}
function resolvePurchase(buy) {
  if (!state.pending || state.finished) return;
  const player = currentPlayer();
  const property = state.pending;
  state.pending = null;
  if (buy && player.cash >= property.price) {
    player.cash -= property.price;
    player.owned.add(property.id);
    setEvent('NEW DEED, WHO DIS?', `${property.name} belongs to ${player.name}. Rent is $${property.rent}.`, '⌂');
    showToast(`${player.name} bought ${property.name}!`);
  } else {
    setEvent('MAYBE NEXT TIME', `${player.name} left ${property.name} on the market.`, '↗');
  }
  if (player.cash >= GOAL) return finishGame(player);
  endTurn();
}
function resetGame() {
  const count = state.playerCount || state.selection || 1;
  state = freshState(count);
  state.selection = count;
  setEvent('A FRESH START', 'Choose your snakes, then take turns around town.');
  $('start-overlay').classList.remove('hidden');
  setOverlay('Your city awaits.', 'Collect coins. Claim corners.<br>Each snake gets one move per round.', 'START YOUR RUN');
  updateUI();
}

setupBoard();
state = freshState();
updateUI();
$('start-button').addEventListener('click', startGame);
document.querySelectorAll('.player-count').forEach((button) => {
  button.addEventListener('click', () => {
    if (state.started && !state.finished) return;
    state.selection = Number(button.dataset.players);
    state.playerCount = state.selection;
    updateUI();
  });
});
$('buy-button').addEventListener('click', () => resolvePurchase(true));
$('pass-button').addEventListener('click', () => resolvePurchase(false));
$('restart-button').addEventListener('click', resetGame);
document.querySelectorAll('.dpad-button').forEach((button) => {
  button.addEventListener('click', () => step(button.dataset.dir));
});
document.addEventListener('keydown', (event) => {
  const keyMap = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
  if (keyMap[event.key]) {
    event.preventDefault();
    step(keyMap[event.key]);
  }
  if (event.key === 'Escape') $('help-modal').classList.add('hidden');
});
$('help-button').addEventListener('click', () => $('help-modal').classList.remove('hidden'));
$('close-help').addEventListener('click', () => $('help-modal').classList.add('hidden'));
$('got-it-button').addEventListener('click', () => $('help-modal').classList.add('hidden'));
$('help-modal').addEventListener('click', (event) => { if (event.target === $('help-modal')) $('help-modal').classList.add('hidden'); });
$('sound-toggle').addEventListener('click', (event) => {
  const button = event.currentTarget;
  button.classList.toggle('sound-on');
  button.title = button.classList.contains('sound-on') ? 'Sound effects are not enabled' : 'Sound is off';
  showToast(button.classList.contains('sound-on') ? 'Sound effects coming soon.' : 'Sound is off.');
});
