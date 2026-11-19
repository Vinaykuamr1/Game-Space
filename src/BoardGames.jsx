import { useMemo, useState } from "react";

const GAME_INFO = {
  ludo: { title: "Ludo", icon: "●", description: "Race your tokens home. Roll a six to leave your yard." },
  chess: { title: "Chess", icon: "♞", description: "Classic two-player chess with legal moves, check, and castling." },
  snakes: { title: "Snakes & Ladders", icon: "↗", description: "Climb ladders, avoid snakes, and be first to square 100." }
};
const LUDO_COLORS = ["red", "green", "yellow", "blue"];
const LUDO_STARTS = [0, 13, 26, 39];
const SNAKES = { 29: 9, 38: 15, 47: 5, 62: 19, 84: 58, 92: 53, 99: 1 };
const LADDERS = { 2: 23, 8: 34, 20: 77, 32: 68, 41: 79, 74: 88, 82: 100 };
const PIECES = { wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙", bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟" };

const initialChess = () => [
  ["bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR"], Array(8).fill("bP"),
  ...Array.from({ length: 4 }, () => Array(8).fill(null)), Array(8).fill("wP"),
  ["wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR"]
];
const sideOf = (piece) => piece?.[0] || null;
const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

function attacked(board, row, col, by) {
  const pawnRow = row + (by === "w" ? 1 : -1);
  for (const dc of [-1, 1]) if (inside(pawnRow, col + dc) && board[pawnRow][col + dc] === by + "P") return true;
  for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
    const r = row + dr, c = col + dc;
    if (inside(r,c) && board[r][c] === by + "N") return true;
  }
  for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
    let r = row + dr, c = col + dc, distance = 1;
    while (inside(r,c)) {
      const p = board[r][c];
      if (p) {
        if (sideOf(p) === by && (p[1] === "Q" || (distance === 1 && p[1] === "K") || ((dr === 0 || dc === 0) ? p[1] === "R" : p[1] === "B"))) return true;
        break;
      }
      r += dr; c += dc; distance++;
    }
  }
  return false;
}
function inCheck(board, color) {
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) if (board[r][c] === color + "K") return attacked(board,r,c,color === "w" ? "b" : "w");
  return true;
}
function pseudoMoves(board, r, c, rights) {
  const piece = board[r][c], side = sideOf(piece), kind = piece?.[1], moves = [];
  if (!piece) return moves;
  const add = (rr,cc) => { if (inside(rr,cc) && sideOf(board[rr][cc]) !== side) moves.push([rr,cc]); };
  if (kind === "P") {
    const dir = side === "w" ? -1 : 1, home = side === "w" ? 6 : 1;
    if (inside(r+dir,c) && !board[r+dir][c]) { moves.push([r+dir,c]); if (r === home && !board[r+dir*2][c]) moves.push([r+dir*2,c]); }
    for (const dc of [-1,1]) if (inside(r+dir,c+dc) && sideOf(board[r+dir][c+dc]) && sideOf(board[r+dir][c+dc]) !== side) moves.push([r+dir,c+dc]);
  } else if (kind === "N") {
    for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) add(r+dr,c+dc);
  } else if (kind === "K") {
    for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) if (dr||dc) add(r+dr,c+dc);
    const home = side === "w" ? 7 : 0, enemy = side === "w" ? "b" : "w";
    if (r === home && c === 4 && !inCheck(board,side)) {
      if (rights[side+"k"] && board[home][5] == null && board[home][6] == null && board[home][7] === side+"R" && !attacked(board,home,5,enemy) && !attacked(board,home,6,enemy)) moves.push([home,6]);
      if (rights[side+"q"] && board[home][1] == null && board[home][2] == null && board[home][3] == null && board[home][0] === side+"R" && !attacked(board,home,3,enemy) && !attacked(board,home,2,enemy)) moves.push([home,2]);
    }
  } else {
    const dirs = kind === "B" ? [[-1,-1],[-1,1],[1,-1],[1,1]] : kind === "R" ? [[-1,0],[1,0],[0,-1],[0,1]] : [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dr,dc] of dirs) { let rr=r+dr,cc=c+dc; while(inside(rr,cc)){ if(!board[rr][cc]) moves.push([rr,cc]); else { if(sideOf(board[rr][cc])!==side)moves.push([rr,cc]); break; } rr+=dr;cc+=dc; } }
  }
  return moves;
}
function applyChessMove(board, from, to) {
  const next = board.map((row) => [...row]), piece = next[from[0]][from[1]];
  next[from[0]][from[1]] = null; next[to[0]][to[1]] = piece;
  if (piece?.[1] === "P" && (to[0] === 0 || to[0] === 7)) next[to[0]][to[1]] = piece[0] + "Q";
  if (piece?.[1] === "K" && Math.abs(to[1]-from[1]) === 2) {
    const rookFrom = to[1] === 6 ? 7 : 0, rookTo = to[1] === 6 ? 5 : 3;
    next[from[0]][rookTo] = next[from[0]][rookFrom]; next[from[0]][rookFrom] = null;
  }
  return next;
}
function legalMoves(board, color, rights, from) {
  const piece = board[from[0]][from[1]];
  if (!piece || sideOf(piece) !== color) return [];
  return pseudoMoves(board,from[0],from[1],rights).filter((to) => !inCheck(applyChessMove(board,from,to),color));
}
function allLegal(board, color, rights) {
  const result=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(sideOf(board[r][c])===color)result.push(...legalMoves(board,color,rights,[r,c]).map((to)=>[[r,c],to]));
  return result;
}

export default function BoardGames({ type, userName = "Player 1", onBack }) {
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState([userName, "Player 2", "Player 3", "Player 4"]);
  const [started, setStarted] = useState(false);
  const info = GAME_INFO[type];
  if (!started) return <section className="boardgame-setup">
    <button className="back" onClick={onBack}>← Game Area</button>
    <div className="kicker">LOCAL PASS-AND-PLAY</div><h1>{info.title}</h1><p className="intro">{info.description} Take turns on this device.</p>
    <div className="panel setup-panel">
      {type !== "chess" && <label>PLAYERS<select value={playerCount} onChange={(e)=>setPlayerCount(Number(e.target.value))}><option value="2">2 players</option><option value="3">3 players</option><option value="4">4 players</option></select></label>}
      {Array.from({length:type === "chess" ? 2 : playerCount}).map((_,i)=><label key={i}>{type === "chess" ? (i===0?"WHITE PLAYER":"BLACK PLAYER") : `PLAYER ${i+1}`}<input value={names[i]} maxLength={24} onChange={(e)=>setNames((old)=>old.map((n,index)=>index===i?e.target.value: n))}/></label>)}
      <button className="primary full" onClick={()=>setStarted(true)}>Start {info.title}</button>
    </div>
  </section>;
  const gameKey = `${type}-${names.slice(0,type === "chess"?2:playerCount).join("-")}`;
  return <section className="boardgame-page"><button className="back" onClick={onBack}>← Game Area</button>
    {type === "ludo" ? <LudoBoard key={gameKey} names={names.slice(0,playerCount)} onBack={onBack}/> : type === "chess" ? <ChessBoard key={gameKey} names={names.slice(0,2)} onBack={onBack}/> : <SnakesBoard key={gameKey} names={names.slice(0,playerCount)} onBack={onBack}/>} 
  </section>;
}

function LudoBoard({names}) {
  const [players,setPlayers]=useState(names.map((name,i)=>({name:name||`Player ${i+1}`,color:LUDO_COLORS[i],progress:[-1,-1,-1,-1]})));
  const [active,setActive]=useState(0),[dice,setDice]=useState(null),[message,setMessage]=useState("Roll a six to bring a token out of the yard.");
  const [winner,setWinner]=useState(null);
  const colors={red:"#ee5264",green:"#4ed19a",yellow:"#f6d253",blue:"#64a8ff"};
  const point=(angle,radius)=>({x:250+Math.cos((angle-90)*Math.PI/180)*radius,y:250+Math.sin((angle-90)*Math.PI/180)*radius});
  const valid=players[active].progress.map((p,i)=>(p===-1?dice===6:p+dice<=57)?i:-1).filter(i=>i>=0);
  const tokenPoint=(p,i,t)=>{
    if(p<0){const center=point(t*90+45,108);return{x:center.x+(i%2?20:-20),y:center.y+(i<2?-17:17)}}
    if(p>=57){const center=point(t*90+45,10);return{x:center.x+(i%2?9:-9),y:center.y+(i<2?-9:9)}}
    if(p>=52)return point(t*90,168-(p-52)*22);
    return point((LUDO_STARTS[t]+p)*360/52,207);
  };
  const roll=()=>{if(dice!==null||winner)return;const n=Math.floor(Math.random()*6)+1;setDice(n);setMessage(`${players[active].name} rolled ${n}. ${n===6?"Choose a token to leave or move.":"Choose a token."}`);};
  const move=(index)=>{if(dice===null||!valid.includes(index)||winner)return;const updated=players.map(p=>({...p,progress:[...p.progress]}));const old=updated[active].progress[index],next=old===-1?0:old+dice;updated[active].progress[index]=next;
    let captured=0;if(next<=51){const cell=(LUDO_STARTS[active]+next)%52,safe=[0,8,13,21,26,34,39,47].includes(cell);if(!safe)updated.forEach((p,pi)=>{if(pi!==active)p.progress=p.progress.map(pos=>{if(pos>=0&&pos<=51&&(LUDO_STARTS[pi]+pos)%52===cell){captured++;return -1}return pos})})}
    const won=updated[active].progress.every(p=>p===57);setPlayers(updated);setDice(null);if(won){setWinner(active);setMessage(`${updated[active].name} wins Ludo!`)}else if(captured)setMessage(`${updated[active].name} captured ${captured} token${captured>1?"s":""}! Roll again.`);else setMessage(`${updated[active].name} moved. ${dice===6?"Roll again.":"Next player's turn."}`);if(!won&&dice!==6)setActive((active+1)%players.length);
  };
  return <><div className="boardgame-heading"><div><span className="kicker">LUDO · {players.length} PLAYERS</span><h1>Ludo</h1></div><button className="secondary" onClick={()=>{setPlayers(names.map((name,i)=>({name,color:LUDO_COLORS[i],progress:[-1,-1,-1,-1]})));setActive(0);setDice(null);setWinner(null);setMessage("Roll a six to bring a token out of the yard.")}}>New game</button></div>
    <div className="ludo-layout"><div className="ludo-board"><svg viewBox="0 0 500 500" role="img" aria-label="Ludo board"><circle cx="250" cy="250" r="242" fill="#133e30" stroke="#c6a778" strokeWidth="8"/><circle cx="250" cy="250" r="224" fill="#204b3a" stroke="#e7d3a2" strokeWidth="2"/>
      {players.map((p,i)=>{const c=point(i*90+45,110);return <circle key={p.color} cx={c.x} cy={c.y} r="64" fill={colors[p.color]} opacity=".24" stroke={colors[p.color]} strokeWidth="4"/>})}
      {Array.from({length:52}).map((_,i)=>{const p=point(i*360/52,207),seat=LUDO_STARTS.indexOf(i);return <circle key={i} cx={p.x} cy={p.y} r="15" fill={seat>=0?colors[LUDO_COLORS[seat]]:"#eee5cf"} stroke="#364338" strokeWidth="2"/>})}
      {players.map((p,t)=>p.progress.map((prog,i)=>{const pnt=tokenPoint(prog,i,t),isClickable=dice!==null&&t===active&&valid.includes(i);return <g key={`${t}-${i}`} className={isClickable?"ludo-token selectable":"ludo-token"} onClick={()=>move(i)} role={isClickable?"button":undefined} tabIndex={isClickable?0:undefined} onKeyDown={(e)=>{if(isClickable&&(e.key==="Enter"||e.key===" "))move(i)}}><circle cx={pnt.x} cy={pnt.y} r="11" fill={colors[p.color]} stroke="#fff" strokeWidth="3"/><text x={pnt.x} y={pnt.y+4} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#102017">{i+1}</text></g>}))}
      <path d="M250 205 L295 250 L250 295 L205 250 Z" fill="#f1dfb6" stroke="#785c39" strokeWidth="3"/><path d="M250 205 L250 250 L205 250 Z" fill={colors.red}/><path d="M295 250 L250 250 L250 205 Z" fill={colors.green}/><path d="M250 295 L250 250 L295 250 Z" fill={colors.yellow}/><path d="M205 250 L250 250 L250 295 Z" fill={colors.blue}/>
      </svg></div><div className="boardgame-controls"><div className="turn-card"><small>CURRENT TURN</small><strong style={{color:colors[players[active].color]}}>{players[active].name}</strong></div><div className="dice-face">{dice||"🎲"}</div><button className="primary full" onClick={roll} disabled={dice!==null||Boolean(winner)}>{dice===null?"Roll dice":"Choose a token"}</button>{dice!==null&&valid.length===0&&<button className="secondary full" onClick={()=>{setDice(null);if(dice!==6)setActive((active+1)%players.length);setMessage(dice===6?"No valid move—roll again.":"No valid move. Next player's turn.")}}>{dice===6?"No move · Roll again":"No move · Next turn"}</button>}<p>{winner!==null?`${players[winner].name} wins!`:message}</p>{players.map((p,i)=><small className="score-line" key={i}><i style={{background:colors[p.color]}}/>{p.name}: {p.progress.filter(v=>v===57).length}/4 home</small>)}</div></div></>;
}

function SnakesBoard({names}) {
  const [players,setPlayers]=useState(names.map((name,i)=>({name:name||`Player ${i+1}`,position:0,color:["#f16472","#61a7ff","#f2ce4c","#55d59c"][i]})));
  const [active,setActive]=useState(0),[dice,setDice]=useState(null),[message,setMessage]=useState("Roll the dice to start climbing."),[winner,setWinner]=useState(null);
  const cells=useMemo(()=>Array.from({length:100},(_,i)=>{const row=9-Math.floor(i/10),col=Math.floor(i/10)%2===0?i%10:9-(i%10);return{i:i+1,row,col}}),[]);
  const roll=()=>{if(winner!==null)return;const n=1+Math.floor(Math.random()*6),before=players[active].position,step=before+n<=100?before+n:before;let landed=step,note=`${players[active].name} rolled ${n}.`;if(step===100){setWinner(active);note+=` ${players[active].name} wins!`}else if(SNAKES[step]){landed=SNAKES[step];note+=` Snake! Slide down to ${landed}.`}else if(LADDERS[step]){landed=LADDERS[step];note+=` Ladder! Climb to ${landed}.`}else if(step===before)note+=" Need an exact roll to reach 100.";const next=players.map((p,i)=>i===active?{...p,position:landed}:p);setPlayers(next);setDice(n);setMessage(note);if(step!==100)setActive((active+1)%players.length);};
  return <><div className="boardgame-heading"><div><span className="kicker">SNAKES & LADDERS · {players.length} PLAYERS</span><h1>Snakes & Ladders</h1></div><button className="secondary" onClick={()=>{setPlayers(names.map((name,i)=>({name,position:0,color:["#f16472","#61a7ff","#f2ce4c","#55d59c"][i]})));setActive(0);setDice(null);setWinner(null);setMessage("Roll the dice to start climbing.")}}>New game</button></div>
    <div className="snakes-layout"><div className="snakes-board">{cells.map(({i,row,col})=><div className={`snake-cell ${(row+col)%2?"alt":""} ${SNAKES[i]?"snake-start":""} ${LADDERS[i]?"ladder-start":""}`} key={i} style={{gridRow:row+1,gridColumn:col+1}}><span>{i}</span>{SNAKES[i]&&<small>🐍 ↓{SNAKES[i]}</small>}{LADDERS[i]&&<small>🪜 ↑{LADDERS[i]}</small>}<div className="cell-pawns">{players.filter(p=>p.position===i).map((p,pi)=><i key={pi} style={{background:p.color}} title={p.name}/>)}</div></div>)}</div><aside className="boardgame-controls"><div className="turn-card"><small>CURRENT TURN</small><strong style={{color:players[active].color}}>{players[active].name}</strong></div><div className="dice-face">{dice||"🎲"}</div><button className="primary full" onClick={roll} disabled={winner!==null}>Roll dice</button><p>{message}</p>{players.map((p,i)=><small className="score-line" key={i}><i style={{background:p.color}}/>{p.name}: {p.position||"Start"}</small>)}</aside></div></>;
}

function ChessBoard({names}) {
  const [board,setBoard]=useState(initialChess),[turn,setTurn]=useState("w"),[selected,setSelected]=useState(null),[rights,setRights]=useState({wk:true,wq:true,bk:true,bq:true}),[lastMove,setLastMove]=useState(null),[status,setStatus]=useState("White to move."),[winner,setWinner]=useState(null);
  const available=selected?legalMoves(board,turn,rights,selected):[];
  const move=(to)=>{const piece=board[selected[0]][selected[1]],captured=board[to[0]][to[1]],next=applyChessMove(board,selected,to),nextRights={...rights};if(piece==="wK")nextRights.wk=nextRights.wq=false;if(piece==="bK")nextRights.bk=nextRights.bq=false;if(selected[0]===7&&selected[1]===0||to[0]===7&&to[1]===0)nextRights.wq=false;if(selected[0]===7&&selected[1]===7||to[0]===7&&to[1]===7)nextRights.wk=false;if(selected[0]===0&&selected[1]===0||to[0]===0&&to[1]===0)nextRights.bq=false;if(selected[0]===0&&selected[1]===7||to[0]===0&&to[1]===7)nextRights.bk=false;
    const nextTurn=turn==="w"?"b":"w",moves=allLegal(next,nextTurn,nextRights),check=inCheck(next,nextTurn);setBoard(next);setRights(nextRights);setLastMove([selected,to]);setSelected(null);setTurn(nextTurn);if(!moves.length){if(check){setWinner(turn);setStatus(`Checkmate! ${names[turn==="w"?0:1]} wins.`)}else setStatus("Stalemate — draw.")}else setStatus(check?`${nextTurn==="w"?"White":"Black"} is in check.`:`${nextTurn==="w"?"White":"Black"} to move.`);if(captured)setStatus(check?`${nextTurn==="w"?"White":"Black"} is in check.`:`${nextTurn==="w"?"White":"Black"} to move.`);};
  const choose=(r,c)=>{if(winner)return;if(selected&&available.some(([rr,cc])=>rr===r&&cc===c)){move([r,c]);return}if(sideOf(board[r][c])===turn)setSelected([r,c]);else setSelected(null)};
  const reset=()=>{setBoard(initialChess());setTurn("w");setSelected(null);setRights({wk:true,wq:true,bk:true,bq:true});setLastMove(null);setWinner(null);setStatus("White to move.")};
  return <><div className="boardgame-heading"><div><span className="kicker">CHESS · TWO PLAYERS</span><h1>Chess</h1></div><button className="secondary" onClick={reset}>New game</button></div><div className="chess-layout"><div className="chess-board" role="grid" aria-label="Chess board">{board.flatMap((row,r)=>row.map((piece,c)=>{const isSelected=selected?.[0]===r&&selected?.[1]===c,isLegal=available.some(([rr,cc])=>rr===r&&cc===c),isLast=lastMove?.some(([rr,cc])=>rr===r&&cc===c);return <button key={`${r}-${c}`} role="gridcell" className={`chess-square ${(r+c)%2?"dark":"light"} ${isSelected?"selected":""} ${isLast?"last-move":""} ${isLegal?"legal-target":""}`} onClick={()=>choose(r,c)} aria-label={`${String.fromCharCode(97+c)}${8-r}${piece?` ${piece}`:""}`}>{piece&&<span className={piece[0]==="w"?"white-piece":"black-piece"}>{PIECES[piece]}</span>}{isLegal&&!piece&&<i/>}</button>}))}</div><aside className="boardgame-controls"><div className="turn-card"><small>{winner?"GAME OVER":"CURRENT TURN"}</small><strong>{winner?names[winner==="w"?0:1]:names[turn==="w"?0:1]}</strong></div><div className="chess-player"><span>♔</span>{names[0]} · White</div><div className="chess-player"><span>♚</span>{names[1]} · Black</div><p>{status}</p><small className="chess-help">Select one of your pieces, then a highlighted square. Pawns promote to queens. Castling is supported.</small></aside></div></>;
}
