const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { wordBank } = require('./data/gameData');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ─── ROOMS ──────────────────────────────────────────────────────────────────
const rooms = {};

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c;
  do { c = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''); }
  while (rooms[c]);
  return c;
}

function getRoomOf(socketId) {
  for (const [code, room] of Object.entries(rooms)) {
    if (room.players.find(p => p.id === socketId)) return { code, room };
  }
  return null;
}

/** Number of Mr. Whites: 1 per every 6 players, minimum 1 */
function calcMrWhiteCount(n) {
  return Math.max(1, Math.floor(n / 6));
}

/** Public state sent to all clients — never includes secret words */
function pub(room) {
  return {
    code: room.code,
    phase: room.phase,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      ready: p.ready,
      hasVoted: !!room.votes[p.id],
      connected: p.connected !== false,
    })),
    currentPlayerIndex: room.currentPlayerIndex,
    category: room.category,
    categoryName: room.categoryName,
    roundNumber: room.roundNumber,
    readyCount: room.players.filter(p => p.ready).length,
    votes: room.votes,
    winner: room.winner,
    secretWord: room.phase === 'game-over' ? room.secretWord : null,
    mrWhiteNames: room.mrWhiteNames,
    mrWhiteIds: room.mrWhiteIds,
    mrWhiteCount: room.mrWhiteIds ? room.mrWhiteIds.length : 0,
    totalPlayers: room.players.length,
  };
}

function broadcast(code) {
  const room = rooms[code];
  if (room) io.to(code).emit('room-update', pub(room));
}

// ─── SOCKET ─────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {

  // ── CREATE ROOM ──────────────────────────────────────
  socket.on('create-room', ({ playerName, playerId }) => {
    const name = (playerName || '').trim().substring(0, 20);
    if (!name) return socket.emit('error', { message: 'Nome non valido!' });

    const code = genCode();
    rooms[code] = {
      code,
      phase: 'lobby',
      players: [{ id: socket.id, playerId, name, isHost: true, eliminated: false, ready: false, connected: true }],
      currentPlayerIndex: 0,
      category: null,
      categoryName: null,
      secretWord: null,
      mrWhiteIds: [],
      mrWhiteNames: [],
      roundNumber: 1,
      votes: {},
      winner: null,
    };
    socket.join(code);
    const shareUrl = `${process.env.BASE_URL || `http://localhost:${PORT}`}/?join=${code}`;
    socket.emit('room-created', { code, shareUrl });
    broadcast(code);
    console.log(`[+] Room ${code} created by ${name}`);
  });

  // ── JOIN ROOM ────────────────────────────────────────
  socket.on('join-room', ({ roomCode, playerName, playerId }) => {
    const name = (playerName || '').trim().substring(0, 20);
    if (!name) return socket.emit('error', { message: 'Nome non valido!' });

    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms[code];

    if (!room)                         return socket.emit('error', { message: 'Stanza non trovata! Controlla il codice.' });
    
    // Allow reconnect if player already exists
    const existing = room.players.find(p => p.playerId === playerId);
    if (existing) {
      existing.id = socket.id;
      existing.name = name;
      existing.connected = true;
      socket.join(code);
      socket.emit('room-joined', { code });
      broadcast(code);
      console.log(`[+] ${name} reconnected to ${code}`);
      return;
    }

    if (room.phase !== 'lobby')        return socket.emit('error', { message: 'Partita già iniziata!' });
    if (room.players.length >= 30)     return socket.emit('error', { message: 'Stanza piena (max 30).' });
    if (room.players.find(p => p.name.toLowerCase() === name.toLowerCase()))
                                       return socket.emit('error', { message: 'Nome già in uso!' });

    room.players.push({ id: socket.id, playerId, name, isHost: false, eliminated: false, ready: false, connected: true });
    socket.join(code);
    socket.emit('room-joined', { code });
    broadcast(code);
    console.log(`[+] ${name} joined ${code}`);
  });

  // ── RESTORE SESSION ──────────────────────────────────
  socket.on('restore-session', ({ roomCode, playerId }) => {
    const room = rooms[roomCode];
    if (!room) return;
    const p = room.players.find(p => p.playerId === playerId);
    if (p) {
      p.id = socket.id;
      p.connected = true;
      socket.join(roomCode);
      socket.emit('session-restored', { code: roomCode });
      broadcast(roomCode);
      console.log(`[+] Restored session for ${p.name} in ${roomCode}`);
    }
  });

  // ── START GAME ───────────────────────────────────────
  socket.on('start-game', ({ roomCode, category }) => {
    const room = rooms[roomCode];
    if (!room) return;
    const me = room.players.find(p => p.id === socket.id);
    if (!me || !me.isHost) return;
    if (room.players.length < 3) return socket.emit('error', { message: 'Servono almeno 3 giocatori!' });

    // Pick category
    let catKey = category;
    if (catKey === 'random') catKey = Object.keys(wordBank)[Math.floor(Math.random() * Object.keys(wordBank).length)];
    const cat = wordBank[catKey];
    if (!cat) return socket.emit('error', { message: 'Categoria non valida.' });

    // Pick random secret word
    const secretWord = cat.words[Math.floor(Math.random() * cat.words.length)];

    // Determine how many Mr. Whites (1 per 6 players, min 1)
    const n = room.players.length;
    const mrWhiteCount = calcMrWhiteCount(n);

    // Shuffle indices and pick first mrWhiteCount as Mr. Whites
    const indices = Array.from({ length: n }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const mrWhiteIndices = new Set(indices.slice(0, mrWhiteCount));

    room.players.forEach((p, i) => {
      p.eliminated = false;
      p.ready = false;
      p.isMrWhite = mrWhiteIndices.has(i);
    });

    room.secretWord = secretWord;
    room.mrWhiteIds   = room.players.filter(p => p.isMrWhite).map(p => p.id);
    room.mrWhiteNames = room.players.filter(p => p.isMrWhite).map(p => p.name);
    room.category = catKey;
    room.categoryName = cat.name;
    room.phase = 'word-reveal';
    room.currentPlayerIndex = 0;
    room.roundNumber = 1;
    room.votes = {};
    room.winner = null;

    // Send each player their private word
    room.players.forEach(p => {
      io.to(p.id).emit('your-word', {
        word: p.isMrWhite ? null : secretWord,
        isMrWhite: p.isMrWhite,
        categoryName: cat.name,
      });
    });

    broadcast(roomCode);
    console.log(`[GAME] ${roomCode}: "${secretWord}" | MrWhites (${mrWhiteCount}): ${room.mrWhiteNames.join(', ')}`);
  });

  // ── PLAYER READY ─────────────────────────────────────
  socket.on('player-ready', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.phase !== 'word-reveal') return;
    const me = room.players.find(p => p.id === socket.id);
    if (!me) return;

    me.ready = true;

    // Auto-start discussion phase when everyone is ready
    if (room.players.every(p => p.ready)) {
      room.phase = 'discussion';
    }

    broadcast(roomCode);
  });

  // ── START VOTING ─────────────────────────────────────
  socket.on('start-voting', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.phase !== 'discussion') return;
    const me = room.players.find(p => p.id === socket.id);
    if (!me || !me.isHost) return;

    room.phase = 'voting';
    room.votes = {};
    broadcast(roomCode);
  });

  // ── SUBMIT VOTE ──────────────────────────────────────
  socket.on('submit-vote', ({ roomCode, targetId }) => {
    const room = rooms[roomCode];
    if (!room || room.phase !== 'voting') return;
    const me = room.players.find(p => p.id === socket.id);
    if (!me || me.eliminated || room.votes[socket.id]) return;

    const target = room.players.find(p => p.id === targetId && !p.eliminated);
    if (!target) return;

    room.votes[socket.id] = targetId;

    const active = room.players.filter(p => !p.eliminated);
    const allVoted = active.every(p => room.votes[p.id]);

    broadcast(roomCode);

    if (!allVoted) return;

    // ── Tally votes ──────────────────────────────────
    const tally = {};
    Object.values(room.votes).forEach(id => { tally[id] = (tally[id] || 0) + 1; });

    let maxV = 0;
    let candidates = [];
    for (const [id, count] of Object.entries(tally)) {
      if (count > maxV) { maxV = count; candidates = [id]; }
      else if (count === maxV) candidates.push(id);
    }

    // Random tie-break
    const eliminatedId = candidates[Math.floor(Math.random() * candidates.length)];
    const eliminated = room.players.find(p => p.id === eliminatedId);
    if (eliminated) eliminated.eliminated = true;

    const isTie = candidates.length > 1;

    if (eliminated.isMrWhite) {
      // A Mr. White was caught — check if ALL Mr. Whites are now eliminated
      const remainingMrWhites = room.players.filter(p => p.isMrWhite && !p.eliminated);
      if (remainingMrWhites.length === 0) {
        // All Mr. Whites caught → last one guesses
        room.phase = 'mr-white-guess';
        // The guessing Mr. White is the one just eliminated
        room.guessingMrWhiteId   = eliminatedId;
        room.guessingMrWhiteName = eliminated.name;
        broadcast(roomCode);
        io.to(roomCode).emit('vote-result', {
          eliminatedId,
          eliminatedName: eliminated.name,
          wasImpostor: true,
          isTie,
          voteCounts: tally,
        });
      } else {
        // More Mr. Whites remain — continue game
        broadcast(roomCode);
        io.to(roomCode).emit('vote-result', {
          eliminatedId,
          eliminatedName: eliminated.name,
          wasImpostor: true,
          partialCatch: true,
          remainingMrWhites: remainingMrWhites.length,
          isTie,
          voteCounts: tally,
          gameOver: false,
        });
      }
    } else {
      // Innocent eliminated — check if game should continue
      const remainingMrWhite = room.players.filter(p => p.isMrWhite && !p.eliminated);
      const remainingCitizens = room.players.filter(p => !p.isMrWhite && !p.eliminated);

      let gameOver = false;
      let winner = null;

      if (remainingMrWhite.length === 0) {
        gameOver = true; winner = 'citizens';
      } else if (remainingCitizens.length <= remainingMrWhite.length) {
        // Mr. Whites outnumber or match citizens → they win
        gameOver = true; winner = 'mrwhite';
      }

      if (gameOver) {
        room.phase = 'game-over';
        room.winner = winner;
      }

      broadcast(roomCode);
      io.to(roomCode).emit('vote-result', {
        eliminatedId,
        eliminatedName: eliminated.name,
        wasImpostor: false,
        isTie,
        voteCounts: tally,
        gameOver,
        winner,
        secretWord: gameOver ? room.secretWord : null,
        mrWhiteNames: room.mrWhiteNames,
      });
    }
  });

  // ── MR. WHITE GUESS ──────────────────────────────────
  socket.on('mr-white-guess', ({ roomCode, guess }) => {
    const room = rooms[roomCode];
    if (!room || room.phase !== 'mr-white-guess') return;
    // Only the designated guessing Mr. White may guess
    const guesser = room.guessingMrWhiteId || (room.mrWhiteIds && room.mrWhiteIds[0]);
    if (socket.id !== guesser) return;

    const normalized = (s) => s.trim().toLowerCase().replace(/[^a-zàáâãäåèéêëìíîïòóôõöùúûü\s]/gi, '');
    const correct = normalized(guess) === normalized(room.secretWord);

    room.winner = correct ? 'mrwhite' : 'citizens';
    room.phase = 'game-over';

    broadcast(roomCode);
    io.to(roomCode).emit('mr-white-guess-result', {
      mrWhiteName: room.guessingMrWhiteName || (room.mrWhiteNames && room.mrWhiteNames[0]),
      guess: guess.trim(),
      correct,
      secretWord: room.secretWord,
    });
  });

  // ── CONTINUE GAME ────────────────────────────────────
  socket.on('continue-game', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;
    const me = room.players.find(p => p.id === socket.id);
    if (!me || !me.isHost) return;

    room.phase = 'discussion';
    room.votes = {};
    broadcast(roomCode);
  });

  // ── NEW GAME ─────────────────────────────────────────
  socket.on('new-game', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;
    const me = room.players.find(p => p.id === socket.id);
    if (!me || !me.isHost) return;

    room.phase = 'lobby';
    room.players.forEach(p => {
      p.eliminated = false;
      p.ready = false;
      p.isMrWhite = false;
    });
    room.secretWord = null;
    room.mrWhiteIds = [];
    room.mrWhiteNames = [];
    room.guessingMrWhiteId = null;
    room.guessingMrWhiteName = null;
    room.votes = {};
    room.currentPlayerIndex = 0;
    room.roundNumber = 1;
    room.winner = null;
    broadcast(roomCode);
  });

  // ── LEAVE ROOM (EXPLICIT) ────────────────────────────
  socket.on('leave-room', () => {
    const r = getRoomOf(socket.id);
    if (!r) return;
    const { code, room } = r;

    const leaving = room.players.find(p => p.id === socket.id);
    if (leaving) {
      room.players = room.players.filter(p => p.id !== socket.id);
      console.log(`[-] ${leaving.name} explicitly left ${code}`);

      if (room.players.length === 0) { 
        delete rooms[code]; 
        return; 
      }
      if (leaving.isHost && room.players.length > 0) { 
        room.players[0].isHost = true; 
      }

      // Fix currentPlayerIndex if out of range
      const active = room.players.filter(p => !p.eliminated);
      if (room.currentPlayerIndex >= active.length) room.currentPlayerIndex = 0;

      broadcast(code);
    }
  });

  // ── DISCONNECT ───────────────────────────────────────
  socket.on('disconnect', () => {
    const r = getRoomOf(socket.id);
    if (!r) return;
    const { code, room } = r;

    const p = room.players.find(p => p.id === socket.id);
    if (p) {
      p.connected = false;
      console.log(`[-] ${p.name} disconnected from ${code}`);
    }

    // Clean up completely empty rooms after everyone is disconnected
    if (room.players.every(p => !p.connected)) {
      setTimeout(() => {
        if (rooms[code] && rooms[code].players.every(p => !p.connected)) {
          delete rooms[code];
          console.log(`[!] Room ${code} deleted (empty)`);
        }
      }, 900000); // 15 minutes grace period
    }

    broadcast(code);
  });
});

// ─── START ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  const line = '═'.repeat(48);
  console.log(`\n🧪 ${line}`);
  console.log(`   ALBERTO WHITE — Mr. White Farmacologico`);
  console.log(`   Server avviato ✓  http://localhost:${PORT}`);
  console.log(`🧪 ${line}\n`);
});
