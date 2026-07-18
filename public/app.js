'use strict';

// ════════════════════════════════════════════
//  ALBERTO WHITE — Client App
//  Multi-Mr-White + Share Link + Auto-join
// ════════════════════════════════════════════

const socket = io({ transports: ['websocket', 'polling'] });

// ─── SESSION ──────────────────────────────────
let savedId = localStorage.getItem('aw_playerId');
if (!savedId) {
  savedId = Math.random().toString(36).substring(2, 10);
  localStorage.setItem('aw_playerId', savedId);
}
const PLAYER_ID = savedId;

// ─── STATE ──────────────────────────────────
const urlParams = new URLSearchParams(window.location.search);
const joinParam = urlParams.get('join')?.toUpperCase();
let initialRoom = localStorage.getItem('aw_lastRoom') || '';

if (joinParam && joinParam !== initialRoom) {
  // If the user clicked a link for a different room, don't auto-reconnect to the old one.
  initialRoom = '';
  localStorage.removeItem('aw_lastRoom');
}

const S = {
  myId:         null,
  myName:       localStorage.getItem('aw_playerName') || '',
  roomCode:     initialRoom,
  isHost:       false,
  myWord:       null,
  isMrWhite:    false,
  wordRevealed: false,
  hasVoted:     false,
  room:         null,
  screen:       'home',
  timerHandle:  null,
  shareUrl:     '',
};

// ─── UTILS ──────────────────────────────────
const $   = id => document.getElementById(id);
const show = id => { const el = $(id); if (el) el.classList.remove('hidden'); };
const hide = id => { const el = $(id); if (el) el.classList.add('hidden'); };
const ava  = name => (name || '?')[0].toUpperCase();

function setScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = $(`screen-${name}`);
  if (el) el.classList.add('active');
  S.screen = name;
  window.scrollTo(0, 0);
}

function toast(msg, type = '') {
  const wrap = $('toasts');
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ` ${type}` : '');
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 320); }, 3500);
}

// ─── AUTO-JOIN FROM URL ──────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const joinCode = params.get('join');
  if (joinCode) {
    $('inp-code-prefill').value = joinCode.toUpperCase();
    // Remove code from URL without reload
    window.history.replaceState({}, '', window.location.pathname);
    // Show a hint
    toast(`🔗 Codice stanza ${joinCode} rilevato! Inserisci il tuo nome e unisciti.`, '');
    // Pre-fill the join code field on main screen
    const joinBanner = $('join-banner');
    if (joinBanner) {
      $('banner-code').textContent = joinCode.toUpperCase();
      joinBanner.classList.remove('hidden');
    }
  }
});

// ─── SOCKET EVENTS ──────────────────────────
socket.on('connect', () => { 
  S.myId = socket.id; 
  // Attempt to restore session if we had a room
  if (S.roomCode) {
    socket.emit('restore-session', { roomCode: S.roomCode, playerId: PLAYER_ID });
  }
});
socket.on('disconnect', () => toast('Connessione persa — tentativo di riconnessione...', 'err'));
socket.on('error',      ({ message }) => toast('❌ ' + message, 'err'));

socket.on('session-restored', ({ code }) => {
  S.roomCode = code;
  S.shareUrl = window.location.origin + '/?join=' + code;
  $('lbl-code').textContent = code;
  renderShareLink(S.shareUrl, code);
  toast('Riconnesso alla stanza!', 'success');
});

socket.on('room-created', ({ code }) => {
  S.roomCode = code;
  S.isHost   = true;
  S.shareUrl = window.location.origin + '/?join=' + code;
  localStorage.setItem('aw_lastRoom', code);
  $('lbl-code').textContent = code;
  renderShareLink(S.shareUrl, code);
  setScreen('lobby');
});

socket.on('room-joined', ({ code }) => {
  S.roomCode = code;
  localStorage.setItem('aw_lastRoom', code);
  $('lbl-code').textContent = code;
  setScreen('lobby');
});

socket.on('your-word', ({ word, isMrWhite, categoryName }) => {
  S.myWord       = word;
  S.isMrWhite    = isMrWhite;
  S.wordRevealed = false;

  $('flip-inner').classList.remove('flipped');
  hide('btn-ready');
  $('word-cat').textContent = categoryName || '';

  setScreen('reveal');
});

socket.on('room-update', room => {
  S.room   = room;
  S.isHost = !!(room.players.find(p => p.id === S.myId)?.isHost);
  routeRoomUpdate(room);
});

socket.on('vote-result',           data => renderVoteResult(data));
socket.on('mr-white-guess-result', data => renderGuessResult(data));

// ─── HOME ────────────────────────────────────
// Prefill name if we have it
if (S.myName) $('inp-name').value = S.myName;

$('btn-create').addEventListener('click', () => {
  const name = $('inp-name').value.trim();
  if (!name) return toast('Inserisci il tuo nome!', 'err');
  S.myName = name;
  localStorage.setItem('aw_playerName', name);
  socket.emit('create-room', { playerName: name, playerId: PLAYER_ID });
});

$('btn-join-show').addEventListener('click', () => {
  const name = $('inp-name').value.trim();
  if (!name) return toast('Inserisci il tuo nome!', 'err');
  S.myName = name;
  localStorage.setItem('aw_playerName', name);
  const prefill = $('inp-code-prefill')?.value;
  if (prefill) $('inp-code').value = prefill;
  setScreen('join');
});

$('inp-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('btn-create').click();
});

// ─── JOIN ─────────────────────────────────────
$('btn-back-join').addEventListener('click', () => setScreen('home'));
$('btn-join').addEventListener('click', doJoin);
$('inp-code').addEventListener('keydown', e => { if (e.key === 'Enter') doJoin(); });
$('inp-code').addEventListener('input',   e => { e.target.value = e.target.value.toUpperCase(); });

function doJoin() {
  const code = $('inp-code').value.trim().toUpperCase();
  if (code.length < 4) return toast('Inserisci il codice di 4 caratteri!', 'err');
  socket.emit('join-room', { roomCode: code, playerName: S.myName, playerId: PLAYER_ID });
}

// ─── LOBBY ────────────────────────────────────
$('btn-copy').addEventListener('click', () => {
  const toCopy = S.shareUrl || S.roomCode;
  navigator.clipboard?.writeText(toCopy)
    .then(() => toast(S.shareUrl ? '🔗 Link copiato negli appunti!' : '📋 Codice copiato!', 'success'))
    .catch(() => toast(toCopy));
});

$('btn-leave-room')?.addEventListener('click', () => {
  if (!confirm('Vuoi davvero uscire dalla stanza?')) return;
  socket.emit('leave-room', { roomCode: S.roomCode });
  localStorage.removeItem('aw_lastRoom');
  S.roomCode = '';
  S.isHost = false;
  S.room = null;
  setScreen('home');
});

$('btn-start').addEventListener('click', () => {
  const category = $('sel-cat').value;
  socket.emit('start-game', { roomCode: S.roomCode, category });
});

// ─── WORD REVEAL ──────────────────────────────
$('flip-wrap').addEventListener('click', () => {
  if (S.wordRevealed) return;
  S.wordRevealed = true;
  $('flip-inner').classList.add('flipped');

  if (S.isMrWhite) {
    $('word-big').textContent  = '???';
    $('word-big').className    = 'word-big is-mrwhite';
    $('word-role').textContent = '🕵️ Sei Mr. White!';
    $('word-role').className   = 'word-role mrwhite';
    $('word-hint').textContent = 'Non sai la parola. Fingiti informato e non farti scoprire!';
  } else {
    $('word-big').textContent  = S.myWord;
    $('word-big').className    = 'word-big';
    $('word-role').textContent = '✅ Sei un Cittadino';
    $('word-role').className   = 'word-role citizen';
    $('word-hint').textContent = 'Questa è la parola segreta. Dai indizi senza rivelarla mai!';
  }

  setTimeout(() => show('btn-ready'), 2000);
});

$('btn-ready').addEventListener('click', () => {
  hide('btn-ready');
  socket.emit('player-ready', { roomCode: S.roomCode });
  toast('In attesa degli altri...', '');
});

// ─── CLUES ────────────────────────────────────
$('btn-clue').addEventListener('click', sendClue);
$('inp-clue').addEventListener('keydown', e => { if (e.key === 'Enter') sendClue(); });

function sendClue() {
  const txt = $('inp-clue').value.trim();
  if (!txt) return toast('Scrivi un indizio!', 'err');
  $('inp-clue').value = '';
  socket.emit('submit-clue', { roomCode: S.roomCode, clue: txt });
}

$('btn-vote-now').addEventListener('click',  () => socket.emit('start-voting', { roomCode: S.roomCode }));
$('btn-force-vote').addEventListener('click', () => socket.emit('start-voting', { roomCode: S.roomCode }));

// ─── MR. WHITE GUESS ──────────────────────────
$('btn-guess').addEventListener('click', () => {
  const g = $('inp-guess').value.trim();
  if (!g) return toast('Inserisci la tua risposta!', 'err');
  socket.emit('mr-white-guess', { roomCode: S.roomCode, guess: g });
  $('btn-guess').disabled = true;
  $('btn-guess').textContent = '⏳ In attesa...';
});
$('inp-guess').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-guess').click(); });

// ─── CONTINUE / NEW GAME ──────────────────────
$('btn-continue').addEventListener('click', () => {
  S.hasVoted = false;
  socket.emit('continue-game', { roomCode: S.roomCode });
});

$('btn-newgame').addEventListener('click', () => socket.emit('new-game', { roomCode: S.roomCode }));

// ════════════════════════════════════════════
//  RENDER FUNCTIONS
// ════════════════════════════════════════════

function routeRoomUpdate(room) {
  switch (room.phase) {
    case 'lobby':          renderLobby(room);              break;
    case 'word-reveal':    renderRevealStatus(room);        break;
    case 'giving-clues':   renderClues(room);               break;
    case 'voting':         renderVoting(room);              break;
    case 'mr-white-guess': renderMrWhiteGuessScreen(room);  break;
    case 'game-over':      renderGameOver(room);            break;
  }
}

// ── SHARE LINK ────────────────────────────────
function renderShareLink(shareUrl, code) {
  const box = $('share-box');
  if (!box) return;
  if (shareUrl) {
    $('share-url-txt').textContent = shareUrl;
    box.classList.remove('hidden');
  }
}

// ── LOBBY ─────────────────────────────────────
function renderLobby(room) {
  if (S.screen !== 'lobby') setScreen('lobby');
  $('lbl-code').textContent     = room.code;
  $('lbl-nplayers').textContent = room.players.length;

  // Mr. White count info
  const mwCount = Math.max(1, Math.floor(room.players.length / 6));
  $('lbl-mrwhite-count').textContent = mwCount;
  $('lbl-mrwhite-total').textContent = room.players.length;

  const list = $('player-list');
  list.innerHTML = room.players.map(p => `
    <div class="player-item ${!p.connected ? 'offline' : ''}">
      <div class="p-ava">${ava(p.name)}</div>
      <span class="p-name">${escHtml(p.name)} ${!p.connected ? '(Disconnesso)' : ''}</span>
      <div style="display:flex;gap:4px;flex-wrap:wrap">
        ${p.id === S.myId  ? '<span class="badge badge-you">Tu</span>'   : ''}
        ${p.isHost         ? '<span class="badge badge-host">Host</span>' : ''}
      </div>
    </div>
  `).join('');

  if (S.isHost) { show('host-panel'); hide('guest-panel'); }
  else          { hide('host-panel'); show('guest-panel'); }
}

// ── REVEAL STATUS ─────────────────────────────
function renderRevealStatus(room) {
  if (S.screen !== 'reveal') return;
  const n = room.readyCount;
  const t = room.players.length;
  $('lbl-ready').textContent    = n;
  $('lbl-ready-of').textContent = t;
  $('prog-fill').style.width    = `${(n / t) * 100}%`;
}

// ── CLUES ──────────────────────────────────────
function renderClues(room) {
  if (S.screen !== 'clues') {
    setScreen('clues');
    S.hasVoted = false;
  }

  const active   = room.players.filter(p => !p.eliminated);
  const cur      = active[room.currentPlayerIndex];
  const isMyTurn = cur?.id === S.myId;

  $('chip-round').textContent = `Round ${room.roundNumber}`;
  $('chip-cat').textContent   = room.categoryName || '';

  const turnCard = $('turn-card');
  turnCard.className = 'turn-card' + (isMyTurn ? ' my-turn' : '');
  $('turn-sub').textContent  = isMyTurn ? '🎯 È il tuo turno!' : 'Sta parlando';
  $('turn-name').textContent = cur?.name || '---';

  if (isMyTurn) {
    show('my-clue-panel');
    $('my-word-val').textContent = S.myWord || '???';
    setTimeout(() => $('inp-clue').focus(), 100);
  } else {
    hide('my-clue-panel');
  }

  if (S.isHost) { show('host-vote-panel'); show('btn-force-vote'); }
  else          { hide('host-vote-panel'); hide('btn-force-vote'); }

  // Players strip
  const strip = $('players-strip');
  strip.innerHTML = active.map((p, i) => {
    const isCur = i === room.currentPlayerIndex;
    const isMe  = p.id === S.myId;
    return `
      <div class="strip-player ${isCur ? 'current' : ''} ${p.eliminated ? 'eliminated' : ''}">
        <div class="strip-ava">${ava(p.name)}</div>
        <div class="strip-pname">${escHtml(p.name)}${isMe ? ' ★' : ''}</div>
      </div>
    `;
  }).join('');

  // Clue log
  const allClues = [];
  room.players.forEach(p => {
    (p.clues || []).forEach(c => allClues.push({ ...c, pname: p.name }));
  });
  const log = $('clue-log');
  if (allClues.length === 0) {
    log.innerHTML = '<p class="muted small text-center">Nessun indizio ancora...</p>';
  } else {
    log.innerHTML = allClues.map(c => `
      <div class="clue-entry">
        <div class="clue-ava">${ava(c.pname)}</div>
        <div class="clue-body">
          <div class="clue-who">${escHtml(c.pname)}</div>
          <div class="clue-text">${escHtml(c.text)}</div>
        </div>
        <span class="clue-r">R${c.round}</span>
      </div>
    `).join('');
    log.scrollTop = log.scrollHeight;
  }

  resetTimer(15);
}

// ── VOTING ─────────────────────────────────────
function renderVoting(room) {
  if (S.screen !== 'voting') {
    setScreen('voting');
    clearTimer();
  }

  const active    = room.players.filter(p => !p.eliminated);
  const votesDone = Object.keys(room.votes || {}).length;

  $('lbl-votes').textContent    = votesDone;
  $('lbl-votes-of').textContent = active.length;

  if (S.hasVoted || room.votes?.[S.myId]) {
    S.hasVoted = true;
    hide('vote-list-wrap');
    show('voted-wait');
    return;
  }

  show('vote-list-wrap');
  hide('voted-wait');

  const list = $('vote-list');
  list.innerHTML = '';

  active.forEach(p => {
    if (p.id === S.myId) return;

    const btn = document.createElement('button');
    btn.className = 'vote-btn';
    const clueCount = (p.clues || []).length;
    btn.innerHTML = `
      <div class="vote-ava">${ava(p.name)}</div>
      <div style="flex:1">
        <div class="vote-name">${escHtml(p.name)}</div>
        <div class="vote-clues">${clueCount} indiz${clueCount === 1 ? 'io' : 'i'} dat${clueCount === 1 ? 'o' : 'i'}</div>
      </div>
      <span class="vote-arrow">→</span>
    `;
    btn.addEventListener('click', () => {
      if (!confirm(`Votare ${p.name} come Mr. White?`)) return;
      S.hasVoted = true;
      socket.emit('submit-vote', { roomCode: S.roomCode, targetId: p.id });
      hide('vote-list-wrap');
      show('voted-wait');
    });
    list.appendChild(btn);
  });
}

// ── VOTE RESULT ────────────────────────────────
function renderVoteResult(data) {
  setScreen('vote-result');
  clearTimer();
  S.hasVoted = false;

  const wrap = $('vr-content');
  hide('continue-panel');

  if (data.wasImpostor) {
    if (data.partialCatch) {
      // A Mr. White caught but more remain
      wrap.innerHTML = `
        <div class="result-card bad">
          <span class="result-emoji">😱</span>
          <div class="result-title">${escHtml(data.eliminatedName)} era Mr. White!</div>
          <div class="result-sub">${data.isTie ? '⚡ Pareggio risolto casualmente. ' : ''}
            Ma ci sono ancora <strong>${data.remainingMrWhites}</strong> Mr. White tra voi!<br>
            La partita continua...
          </div>
        </div>
      `;
      if (S.isHost) show('continue-panel');
    } else {
      // Last Mr. White caught — guess phase
      wrap.innerHTML = `
        <div class="result-card good">
          <span class="result-emoji">🎉</span>
          <div class="result-title">${escHtml(data.eliminatedName)} era Mr. White!</div>
          <div class="result-sub">${data.isTie ? '⚡ Pareggio risolto casualmente. ' : ''}Adesso Mr. White tenta di indovinare la parola...</div>
        </div>
      `;
    }
  } else {
    // Innocent eliminated
    wrap.innerHTML = `
      <div class="result-card bad">
        <span class="result-emoji">😬</span>
        <div class="result-title">${escHtml(data.eliminatedName)} era innocente!</div>
        <div class="result-sub">${data.isTie ? '⚡ Pareggio risolto casualmente. ' : ''}Mr. White è ancora tra voi...
          ${data.gameOver ? `<br><br>Mr. White ha vinto per superiorità numerica!<br><strong>La parola era: ${escHtml(data.secretWord)}</strong>` : ''}
        </div>
      </div>
    `;

    if (!data.gameOver && S.isHost) {
      show('continue-panel');
    }
  }
}

// ── MR. WHITE GUESS SCREEN ─────────────────────
function renderMrWhiteGuessScreen(room) {
  if (S.screen !== 'guess') setScreen('guess');

  // The guesser is the last eliminated Mr. White
  const guesserName = room.players.find(p => p.isMrWhite && p.eliminated)?.name
    || (room.mrWhiteNames && room.mrWhiteNames[0]) || 'Mr. White';
  $('guess-name').textContent = guesserName;

  // Is THIS player the designated guesser?
  const guesserIds = room.mrWhiteIds || [];
  const amGuesser  = S.isMrWhite && guesserIds.includes(S.myId) &&
    room.players.find(p => p.id === S.myId)?.eliminated;

  if (amGuesser) {
    show('guess-input-panel');
    hide('guess-wait');
    $('btn-guess').disabled = false;
    $('btn-guess').textContent = '💡 Indovina!';
    setTimeout(() => $('inp-guess').focus(), 150);
  } else {
    hide('guess-input-panel');
    show('guess-wait');
  }
}

// ── GUESS RESULT ───────────────────────────────
function renderGuessResult(data) {
  setScreen('vote-result');
  hide('continue-panel');

  $('vr-content').innerHTML = data.correct
    ? `<div class="result-card mrw">
         <span class="result-emoji">🕵️</span>
         <div class="result-title">Mr. White ha vinto!</div>
         <div class="result-sub">${escHtml(data.mrWhiteName)} ha indovinato "<strong>${escHtml(data.secretWord)}</strong>"!<br>L'impostore trionfa.</div>
       </div>`
    : `<div class="result-card good">
         <span class="result-emoji">🎊</span>
         <div class="result-title">I Cittadini vincono!</div>
         <div class="result-sub">${escHtml(data.mrWhiteName)} ha detto "<strong>${escHtml(data.guess)}</strong>"<br>La parola segreta era "<strong>${escHtml(data.secretWord)}</strong>"</div>
       </div>`;
}

// ── GAME OVER ──────────────────────────────────
function renderGameOver(room) {
  if (S.screen !== 'gameover') setScreen('gameover');
  clearTimer();

  const isCitWin = room.winner === 'citizens';
  $('go-content').innerHTML = isCitWin
    ? `<div class="go-card citizens">
         <span class="go-emoji">🏆</span>
         <div class="go-title">I Cittadini Vincono!</div>
         <div class="go-sub">Mr. White scoperto e sconfitto.
           <div class="go-secret">
             <div class="word-reveal-label">La parola segreta era</div>
             <div class="word-reveal-val">${escHtml(room.secretWord || '')}</div>
           </div>
         </div>
       </div>`
    : `<div class="go-card mrwhite">
         <span class="go-emoji">🕵️</span>
         <div class="go-title">Mr. White Vince!</div>
         <div class="go-sub">L'impostore ce l'ha fatta!
           <div class="go-secret">
             <div class="word-reveal-label">La parola segreta era</div>
             <div class="word-reveal-val">${escHtml(room.secretWord || '')}</div>
           </div>
         </div>
       </div>`;

  if (S.isHost) { show('btn-newgame'); hide('lbl-wait-host'); }
  else          { hide('btn-newgame'); show('lbl-wait-host'); }
}

// ─── TIMER ────────────────────────────────────
function resetTimer(seconds) {
  clearTimer();
  const fill = $('timer-fill');
  if (!fill) return;
  fill.style.width = '100%';
  fill.className = 'timer-fill';
  let elapsed = 0;
  S.timerHandle = setInterval(() => {
    elapsed++;
    const pct = Math.max(0, (1 - elapsed / seconds) * 100);
    fill.style.width = pct + '%';
    if (pct < 30) fill.className = 'timer-fill warn';
    if (elapsed >= seconds) clearTimer();
  }, 1000);
}
function clearTimer() {
  if (S.timerHandle) { clearInterval(S.timerHandle); S.timerHandle = null; }
}

// ─── SECURITY ─────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
