import { useCallback, useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import BoardGames from "./BoardGames.jsx";

let guestSessionPromise;
function guestSession() {
  if (!guestSessionPromise) {
    guestSessionPromise = api("/auth/guest", "", { method: "POST", body: "{}" }).catch((error) => {
      guestSessionPromise = null;
      throw error;
    });
  }
  return guestSessionPromise;
}

async function api(path, token, options = {}) {
  const response = await fetch("/api" + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}), ...(options.headers || {}) }
  });
  const responseText = await response.text();
  let body = {};
  try { body = responseText ? JSON.parse(responseText) : {}; } catch {
    const readableText = responseText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (readableText && readableText.length < 300) body.message = readableText;
  }
  if (!response.ok) throw new Error(body.message || body.error || body.detail || "Request failed (" + response.status + ")");
  return body;
}
const colors = ["RED", "BLUE", "GREEN", "YELLOW"];
const label = (card) => card.color === "WILD" ? (card.type === "WILD_DRAW_FOUR" ? "+4" : "WILD") :
  card.type === "NUMBER" ? card.value : ({ SKIP: "⊘", REVERSE: "⇄", DRAW_TWO: "+2" })[card.type];
const colorClass = (color) => ({ RED: "red", BLUE: "blue", GREEN: "green", YELLOW: "yellow", WILD: "wild" })[color] || "wild";

function Card({ card, disabled, onClick, featured = false, style }) {
  return <button className={"uno-card " + colorClass(card.color) + (featured ? " featured" : "") + (disabled ? " dim" : "")} disabled={disabled} onClick={onClick} style={style} aria-label={`${card.color} ${label(card)}`}>
    <span className="card-corner corner-top">{label(card)}</span><span className="card-oval"><b>{label(card)}</b></span><span className="card-corner corner-bottom">{label(card)}</span>
  </button>;
}
function Brand({ right }) {
  return <header className="top"><div className="brand-mark">G</div><strong>GAME <em>AREA</em></strong><div className="top-right">{right || "REAL-TIME MULTIPLAYER"}</div></header>;
}

export default function MultiplayerApp() {
  const [token, setToken] = useState(() => localStorage.getItem("uno-token") || "");
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("uno-user") || "null"));
  const [authPage, setAuthPage] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [selectedGame, setSelectedGame] = useState(() => localStorage.getItem("uno-room") ? "uno" : "");
  const [rooms, setRooms] = useState([]);
  const [room, setRoom] = useState(() => JSON.parse(localStorage.getItem("uno-room") || "null"));
  const [game, setGame] = useState(null);
  const [roomName, setRoomName] = useState("Friday night");
  const [roomCode, setRoomCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [botCount, setBotCount] = useState(1);
  const [wildId, setWildId] = useState("");
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const say = (text) => { setNotice(text); window.setTimeout(() => setNotice(""), 3500); };

  const acceptSession = (result) => {
    localStorage.setItem("uno-token", result.token);
    localStorage.setItem("uno-user", JSON.stringify(result.user));
    setToken(result.token); setUser(result.user); setAuthPassword("");
  };
  const submitLogin = async (event) => {
    event.preventDefault(); setAuthBusy(true); setAuthError(""); setAuthMessage("");
    try { acceptSession(await api("/auth/login", "", { method: "POST", body: JSON.stringify({ email: authEmail, password: authPassword }) })); }
    catch (e) { setAuthError(e.message); } finally { setAuthBusy(false); }
  };
  const submitRegister = async (event) => {
    event.preventDefault(); setAuthBusy(true); setAuthError(""); setAuthMessage("");
    try { acceptSession(await api("/auth/register", "", { method: "POST", body: JSON.stringify({ username: authUsername, email: authEmail, password: authPassword }) })); }
    catch (e) { setAuthError(e.message); } finally { setAuthBusy(false); }
  };
  const requestPasswordCode = async (event) => {
    event.preventDefault(); setAuthBusy(true); setAuthError(""); setAuthMessage("");
    try { const result = await api("/auth/forgot-password", "", { method: "POST", body: JSON.stringify({ email: authEmail }) }); setAuthMessage(result.developmentCode ? `${result.message} Code: ${result.developmentCode}` : result.message); }
    catch (e) { setAuthError(e.message); } finally { setAuthBusy(false); }
  };
  const submitPasswordReset = async (event) => {
    event.preventDefault(); setAuthBusy(true); setAuthError(""); setAuthMessage("");
    try {
      const result = await api("/auth/reset-password", "", { method: "POST", body: JSON.stringify({ email: authEmail, code: authCode, newPassword }) });
      setAuthPage("login"); setAuthPassword(""); setNewPassword(""); setAuthCode(""); setAuthMessage(result.message);
    } catch (e) { setAuthError(e.message); } finally { setAuthBusy(false); }
  };
  const continueAsGuest = async () => {
    setAuthBusy(true); setAuthError("");
    try { acceptSession(await guestSession()); }
    catch (e) { setAuthError(e.message || "Could not connect to the game server."); } finally { setAuthBusy(false); }
  };
  const signOut = () => {
    localStorage.removeItem("uno-token"); localStorage.removeItem("uno-user"); localStorage.removeItem("uno-room");
    setToken(""); setUser(null); setRoom(null); setGame(null); setSelectedGame(""); setAuthPage("login"); setAuthError(""); setAuthMessage("");
  };

  const refreshRooms = useCallback(async () => {
    try { setRooms(await api("/rooms", token)); } catch (e) { if (token) say(e.message); }
  }, [token]);
  useEffect(() => { refreshRooms(); const timer = setInterval(refreshRooms, 4000); return () => clearInterval(timer); }, [refreshRooms]);

  const loadGame = useCallback(async (id) => {
    try { setGame(await api("/games/" + encodeURIComponent(id), token)); }
    catch (e) { if (!String(e.message).includes("GAME_NOT_FOUND")) say(e.message); }
  }, [token]);

  const syncRoom = useCallback(async () => {
    const id = room?.code;
    if (!id || !token) return;
    try {
      const updated = await api("/rooms/" + encodeURIComponent(id), token);
      setRoom((old) => JSON.stringify(old) === JSON.stringify(updated) ? old : updated);
      if (updated.status === "PLAYING") await loadGame(updated.code);
      else setGame(null);
    } catch (e) {
      const message = String(e.message || "").toUpperCase();
      if (message.includes("ROOM_NOT_FOUND") || message.includes("ROOM NOT FOUND")) {
        localStorage.removeItem("uno-room"); setRoom(null); setGame(null); setSelectedGame("uno");
      } else say(e.message);
    }
  }, [room?.code, token, loadGame]);
  useEffect(() => {
    if (!room || !token) return;
    localStorage.setItem("uno-room", JSON.stringify(room));
    syncRoom();
    const timer = setInterval(syncRoom, 2200);
    return () => clearInterval(timer);
  }, [room?.code, token, syncRoom]);

  useEffect(() => {
    if (!room || !token || !game) return;
    const client = new Client({
      webSocketFactory: () => new SockJS("/ws"),
      reconnectDelay: 2500,
      onConnect: () => client.subscribe("/topic/game/" + room.code, () => loadGame(room.code))
    });
    client.activate();
    return () => { client.deactivate(); };
  }, [room?.code, token, Boolean(game), loadGame]);

  const createRoom = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      const created = await api("/rooms", token, { method: "POST", body: JSON.stringify({ name: roomName, maxPlayers: Number(maxPlayers), isPrivate: false }) });
      setRoom(created); setGame(null); await refreshRooms();
    } catch (e) { say(e.message); } finally { setBusy(false); }
  };
  const createComputerGame = async () => {
    setBusy(true);
    try {
      const session = await api("/rooms/computer", token, { method: "POST", body: JSON.stringify({ botCount: Number(botCount) }) });
      setSelectedGame("uno"); setRoom(session.room); setGame(session.game);
    } catch (e) { say(e.message); } finally { setBusy(false); }
  };
  const joinRoom = async (code) => {
    setBusy(true);
    try {
      const joined = await api("/rooms/" + encodeURIComponent(code) + "/join", token, { method: "POST", body: "{}" });
      setRoom(joined); setGame(null); await refreshRooms();
    } catch (e) { say(e.message); } finally { setBusy(false); }
  };
  const startGame = async () => {
    setBusy(true);
    try { setGame(await api("/rooms/" + encodeURIComponent(room.code) + "/start", token, { method: "POST" })); }
    catch (e) { say(e.message); } finally { setBusy(false); }
  };
  const endGame = async () => {
    setBusy(true);
    try {
      await api("/rooms/" + encodeURIComponent(room.code) + "/end", token, { method: "POST" });
      localStorage.removeItem("uno-room"); setRoom(null); setGame(null); setSelectedGame("uno"); setShowEndConfirmation(false);
      await refreshRooms();
    } catch (e) { say(e.message); } finally { setBusy(false); }
  };
  useEffect(() => {
    if (game?.status !== "FINISHED" || !game.winnerId) return;
    setShowWinAnimation(true);
    const timer = setTimeout(async () => {
      if (room?.hostId === user?.id && room?.code) {
        try { await api("/rooms/" + encodeURIComponent(room.code) + "/end", token, { method: "POST" }); } catch {}
      }
      localStorage.removeItem("uno-room");
      setRoom(null); setGame(null); setSelectedGame("uno"); setShowWinAnimation(false);
      refreshRooms();
    }, 5200);
    return () => clearTimeout(timer);
  }, [game?.status, game?.winnerId, room?.code, room?.hostId, user?.id, token, refreshRooms]);
  useEffect(() => {
    if (!room?.computer || game?.status !== "PLAYING" || !game.players?.length) return;
    const bot = game.players[game.currentPlayer];
    if (!bot?.id?.startsWith("BOT-")) return;
    const timer = setTimeout(async () => {
      try {
        const updated = await api("/games/" + encodeURIComponent(room.code) + "/computer-turn", token, {
          method: "POST", body: JSON.stringify({ botId: bot.id })
        });
        setGame(updated);
      } catch (e) { say(e.message); }
    }, 2000);
    return () => clearTimeout(timer);
  }, [room?.computer, room?.code, game?.status, game?.players?.[game?.currentPlayer]?.id, token]);
  const backToLobby = () => {
    localStorage.removeItem("uno-room");
    setRoom(null); setGame(null); setSelectedGame("uno");
  };
  const action = async (name, payload) => {
    setBusy(true);
    try {
      const result = await api("/games/" + encodeURIComponent(room.code) + "/" + name, token, {
        method: "POST", ...(payload ? { body: JSON.stringify(payload) } : {})
      });
      setGame(result);
    } catch (e) { say(e.message); } finally { setBusy(false); }
  };
  const myIndex = game?.players?.findIndex((p) => p.id === user?.id) ?? -1;
  const myHand = myIndex >= 0 ? game.players[myIndex].hand : [];
  const turn = game?.currentPlayer === myIndex && game?.status === "PLAYING";
  const top = game?.topCard;
  const playable = (c) => c.color === "WILD" || c.color === game?.currentColor ||
    (c.type === top?.type && c.type !== "NUMBER") ||
    (c.type === "NUMBER" && top?.type === "NUMBER" && c.value === top.value);

  if (!token || !user) return <main className="online-app auth-screen">
    <Brand right="UNO · GAME AREA" />
    <section className="auth-card auth-panel">
      <span className="kicker">GAME AREA ACCOUNT</span>
      <h1>{authPage === "register" ? "Create your account" : authPage === "forgot" ? "Reset your password" : "Welcome back"}</h1>
      <p className="auth-intro">{authPage === "register" ? "Create an account to save your player name and sign in again later." : authPage === "forgot" ? "We’ll email you a one-time code to reset your password." : "Sign in to play UNO with friends or computer opponents."}</p>
      {authError && <div className="auth-alert error-alert" role="alert">{authError}</div>}
      {authMessage && <div className="auth-alert success-alert" role="status">{authMessage}</div>}
      {authPage === "login" && <form className="auth-form" onSubmit={submitLogin}>
        <label>EMAIL<input type="email" autoComplete="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} /></label>
        <label>PASSWORD<input type="password" autoComplete="current-password" required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} /></label>
        <button className="auth-link align-right" type="button" onClick={() => { setAuthPage("forgot"); setAuthError(""); setAuthMessage(""); }}>Forgot password?</button>
        <button className="primary full" disabled={authBusy}>{authBusy ? "Signing in…" : "Sign in"}</button>
        <div className="auth-switch">New here? <button className="auth-link" type="button" onClick={() => { setAuthPage("register"); setAuthError(""); setAuthMessage(""); }}>Create account</button></div>
      </form>}
      {authPage === "register" && <form className="auth-form" onSubmit={submitRegister}>
        <label>PLAYER NAME<input autoComplete="nickname" minLength="2" maxLength="32" required value={authUsername} onChange={(e) => setAuthUsername(e.target.value)} /></label>
        <label>EMAIL<input type="email" autoComplete="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} /></label>
        <label>PASSWORD <small>At least 8 characters</small><input type="password" autoComplete="new-password" minLength="8" maxLength="72" required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} /></label>
        <button className="primary full" disabled={authBusy}>{authBusy ? "Creating account…" : "Create account"}</button>
        <div className="auth-switch">Already have an account? <button className="auth-link" type="button" onClick={() => { setAuthPage("login"); setAuthError(""); setAuthMessage(""); }}>Sign in</button></div>
      </form>}
      {authPage === "forgot" && <div className="auth-form">
        <form className="request-code-form" onSubmit={requestPasswordCode}>
          <label>ACCOUNT EMAIL<input type="email" autoComplete="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} /></label>
          <button className="secondary full" disabled={authBusy}>{authBusy ? "Sending code…" : "Send one-time code"}</button>
        </form>
        <form className="reset-code-form" onSubmit={submitPasswordReset}>
          <label>6-DIGIT EMAIL CODE<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" required value={authCode} onChange={(e) => setAuthCode(e.target.value.replace(/\D/g, "").slice(0, 6))} /></label>
          <label>NEW PASSWORD<input type="password" autoComplete="new-password" minLength="8" maxLength="72" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label>
          <button className="primary full" disabled={authBusy}>{authBusy ? "Updating password…" : "Reset password"}</button>
        </form>
        <div className="auth-switch"><button className="auth-link" type="button" onClick={() => { setAuthPage("login"); setAuthError(""); setAuthMessage(""); }}>← Back to sign in</button></div>
      </div>}
      {authPage !== "forgot" && <button className="guest-button" type="button" disabled={authBusy} onClick={continueAsGuest}>Or continue as a guest</button>}
    </section>
  </main>;

  return <main className="online-app">
    <Brand right={<div className="user-tools"><span>{user.username}</span><button type="button" onClick={signOut}>Sign out</button></div>} />
    {!room && !selectedGame && <section className="home-page">
      <div className="kicker">GAME AREA</div><h1>Pick a game.</h1><p className="intro">Choose something to play with friends or against the computer.</p>
      <div className="game-library">
        <button className="game-tile uno-tile" onClick={() => setSelectedGame("uno")}><span className="tile-symbol">UNO</span><span className="tile-copy"><b>UNO Arena</b><small>Multiplayer cards, room codes, and computer opponents</small></span><span className="tile-play">Play UNO →</span></button>
        {[['ludo','●','Ludo','Race your tokens around the board.'],['chess','♞','Chess','Classic strategy for two players.'],['snakes','↗','Snakes & Ladders','Climb to 100 and avoid the snakes.']].map(([id,icon,title,desc])=><button key={id} className="game-tile uno-tile" onClick={()=>setSelectedGame(id)}><span className="tile-symbol muted-symbol">{icon}</span><span className="tile-copy"><b>{title}</b><small>{desc} Local pass-and-play.</small></span><span className="tile-play">Play {title} →</span></button>)}
      </div>
    </section>}
    {!room && selectedGame && selectedGame !== "uno" && <BoardGames type={selectedGame} userName={user.username} onBack={() => setSelectedGame("")} />}
    {!room && selectedGame === "uno" && <section className="lobby">
      <button className="back" onClick={() => setSelectedGame("")}>← All games</button>
      <div className="kicker">THE TABLE IS YOURS</div><h1>Play UNO <em>together.</em></h1><p className="intro">Create a room and share its code, or join a friend’s open table.</p>
      <div className="lobby-grid">
        <form className="panel" onSubmit={createRoom}><span className="panel-tag">HOST A GAME</span><h2>Create a room</h2>
          <label>ROOM NAME<input value={roomName} maxLength={48} required onChange={(e) => setRoomName(e.target.value)} /></label>
          <label>PLAYERS<select value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)}><option value="2">2 players</option><option value="3">3 players</option><option value="4">4 players</option></select></label>
          <button className="primary" disabled={busy}>Create room</button>
        </form>
        <section className="panel computer-panel"><span className="panel-tag">PLAY SOLO</span><h2>UNO vs computer</h2>
          <p className="mode-description">Play a full UNO game against computer opponents.</p>
          <label>COMPUTER PLAYERS<select value={botCount} onChange={(e) => setBotCount(e.target.value)}><option value="1">1 computer</option><option value="2">2 computers</option><option value="3">3 computers</option></select></label>
          <button className="primary" type="button" disabled={busy} onClick={createComputerGame}>Play vs computer</button>
        </section>
        <section className="panel"><span className="panel-tag">JOIN A GAME</span><h2>Enter a room code</h2>
          <form className="join" onSubmit={(e) => { e.preventDefault(); joinRoom(roomCode.trim().toUpperCase()); }}>
            <input placeholder="UNO-123" value={roomCode} required onChange={(e) => setRoomCode(e.target.value.toUpperCase())} /><button className="secondary" disabled={busy}>Join</button>
          </form><div className="divider">OPEN TABLES</div><div className="room-list">
            {rooms.length === 0 ? <p className="empty">No open tables right now. Create one and invite a friend.</p> : rooms.map((r) => <article className="room" key={r.code}>
              <div><b>{r.name}</b><small>{r.hostName} · {r.players}/{r.maxPlayers} players · {r.code}</small></div>
              <button onClick={() => joinRoom(r.code)} disabled={busy || r.players >= r.maxPlayers}>Join</button>
            </article>)}
          </div>
        </section>
      </div><p className="hint">For same-Wi-Fi play, friends open this site using your computer’s Wi-Fi address.</p>
    </section>}
    {room && !game && <section className="waiting">
      <button className="back" onClick={backToLobby}>← Back to lobby</button><span className="kicker">ROOM CODE</span><div className="code-large">{room.code}</div><p>Share this code with your friends.</p>
      <div className="panel"><h2>{room.name}</h2><div className="seats">
        {Array.from({ length: room.maxPlayers || 4 }).map((_, i) => { const seat = room.seats?.[i]; return <div className="seat" key={i}><i>{seat ? seat[1].slice(0, 1).toUpperCase() : "+"}</i><span>{seat ? seat[1] : "Waiting for player"}</span>{seat?.[0] === room.hostId && <small>HOST</small>}</div>; })}
      </div><button className="primary full" disabled={busy || room.hostId !== user.id || room.players < 2} onClick={startGame}>
        {room.hostId !== user.id ? "Waiting for host…" : room.players < 2 ? "Waiting for another player…" : "Start game"}
      </button><p className="hint center">This room updates while players join.</p></div>
    </section>}
    {room && game && <section className="play">
      <div className="gamebar">{room.hostId === user.id && <button className="end-game-button" onClick={() => setShowEndConfirmation(true)}>End game</button>}<span>ROOM <b>{room.code}</b></span><span className="live">● LIVE</span></div>
      {game.status === "FINISHED" && <div className="winner">{game.winnerId ? `${game.players.find((p) => p.id === game.winnerId)?.username || "A player"} wins!` : "The host ended the game."}</div>}
      <div className="table">
        <div className="opponents">{game.players.filter((_, i) => i !== myIndex).map((p) => <div className="opponent" key={p.id}>
          <i>{p.username.slice(0, 1).toUpperCase()}</i><b>{p.username}</b><small>{p.cardCount} cards</small>
          <div className="backs">{Array.from({ length: Math.min(p.cardCount, 6) }).map((_, i) => <span key={i} />)}</div>
        </div>)}</div>
        <div className="piles"><div><button className="draw-pile" onClick={() => action("draw")} disabled={!turn || busy}>UNO</button><small>DRAW · {game.drawPileCount}</small></div>
          <div><Card key={top?.id} card={top} disabled featured onClick={() => {}}/><small>TOP · {game.currentColor}</small></div></div>
        <div className="table-actions"><div className="turn">{turn ? "YOUR TURN" : (game.players[game.currentPlayer]?.username || "Player") + "’S TURN"}</div></div>
      </div>
      <div className="hand-title"><div><small>YOUR HAND</small><b>{myHand.length} cards</b></div><button className="uno" onClick={() => action("uno")} disabled={myHand.length !== 1 || busy}>UNO!</button></div>
      <div className="hand">{myHand.map((card, index) => <Card key={card.id} card={card} style={{ animationDelay: `${index * 35}ms` }} disabled={!turn || !playable(card) || busy}
        onClick={() => card.color === "WILD" ? setWildId(card.id) : action("play", { cardId: card.id })} />)}</div>
      {wildId && <div className="overlay"><section className="dialog"><h2>Choose a color</h2><div className="colors">{colors.map((color) => <button key={color} className={colorClass(color)} aria-label={color} onClick={() => { const id = wildId; setWildId(""); action("play", { cardId: id, color }); }} />)}</div></section></div>}
      {showEndConfirmation && <div className="overlay"><section className="dialog end-dialog" role="dialog" aria-modal="true" aria-labelledby="end-title"><span className="panel-tag">END THIS MATCH?</span><h2 id="end-title">Return to the UNO page?</h2><p>This ends the game for everyone and returns all players to the UNO lobby.</p><div className="dialog-actions"><button className="secondary" disabled={busy} onClick={() => setShowEndConfirmation(false)}>Keep playing</button><button className="end-game-button" disabled={busy} onClick={endGame}>{busy ? "Ending…" : "End game"}</button></div></section></div>}
      {showWinAnimation && <div className="win-celebration" role="status" aria-live="polite"><div className="confetti" aria-hidden="true">{Array.from({ length: 18 }).map((_, i) => <i key={i} style={{ left: `${(i * 5.7) % 100}%`, backgroundColor: `hsl(${(i * 53) % 360} 85% 62%)`, animationDelay: `${-i * .19}s`, animationDuration: `${2.2 + (i % 5) * .32}s`, "--drift": `${((i % 9) - 4) * 10}px`, transform: `rotate(${i * 31}deg)` }} />)}</div><section className="win-card"><div className="trophy">🏆</div><span className="panel-tag">GAME OVER</span><h2>{game.players.find((p) => p.id === game.winnerId)?.username || "A player"} wins!</h2><p>Great game!</p><button className="primary" onClick={() => setShowWinAnimation(false)}>Continue</button></section></div>}
    </section>}
    {notice && <div className="toast">{notice}<button onClick={() => setNotice("")}>×</button></div>}
  </main>;
}
