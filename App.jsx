
import React, { useMemo, useState } from "react";

const LEVEL_SCORE = { E: 1, "E+": 2, D: 3, "D+": 4, C: 5, A: 6, "A+": 7 };
const LEVEL_COLORS = {
  E: "badge-gray",
  "E+": "badge-blue",
  D: "badge-indigo",
  "D+": "badge-teal",
  C: "badge-green",
  A: "badge-orange",
  "A+": "badge-red",
};

const initialPlayers = [
  { id: 1, name: "Ayesha", level: "C", gender: "Lady", waiting: 24, paused: false },
  { id: 2, name: "Naresh", level: "D+", gender: "Man", waiting: 20, paused: false },
  { id: 3, name: "Immy", level: "D", gender: "Lady", waiting: 18, paused: false },
  { id: 4, name: "Athifa", level: "D+", gender: "Lady", waiting: 16, paused: false },
  { id: 5, name: "Saji", level: "C", gender: "Man", waiting: 13, paused: false },
  { id: 6, name: "Manoj", level: "A", gender: "Man", waiting: 10, paused: false },
  { id: 7, name: "Robin", level: "D", gender: "Man", waiting: 8, paused: false },
  { id: 8, name: "Stacy", level: "E+", gender: "Lady", waiting: 6, paused: false },
];

const initialCourts = Array.from({ length: 7 }, (_, i) => ({
  id: i + 1,
  name: `Court ${i + 1}`,
  team1: [],
  team2: [],
  status: "Available",
  finalScore1: "",
  finalScore2: "",
}));

function nameClass(gender) {
  return gender === "Lady" ? "name-lady" : "name-man";
}

function balanceText(team1, team2) {
  if (team1.length !== 2 || team2.length !== 2) return "Incomplete";
  const a = team1.reduce((s, p) => s + LEVEL_SCORE[p.level], 0);
  const b = team2.reduce((s, p) => s + LEVEL_SCORE[p.level], 0);
  const diff = Math.abs(a - b);
  if (diff <= 1) return "Balanced";
  if (diff <= 3) return "Slight";
  return "Poor";
}

function pairKey(a, b) {
  return [a, b].sort((x, y) => x - y).join("-");
}

function oppositionKey(teamA, teamB) {
  return [...teamA].sort((x, y) => x - y).join("-") + "_vs_" + [...teamB].sort((x, y) => x - y).join("-");
}

function buildBestMatch(players, partnerCounts, oppositionCounts) {
  if (players.length < 4) return { team1: players.slice(0, 2), team2: players.slice(2, 4) };
  const pool = players.slice(0, Math.min(players.length, 8));
  let best = null;
  let bestScore = Infinity;

  for (let a = 0; a < pool.length; a++) {
    for (let b = a + 1; b < pool.length; b++) {
      for (let c = b + 1; c < pool.length; c++) {
        for (let d = c + 1; d < pool.length; d++) {
          const four = [pool[a], pool[b], pool[c], pool[d]];
          const options = [
            { team1: [four[0], four[1]], team2: [four[2], four[3]] },
            { team1: [four[0], four[2]], team2: [four[1], four[3]] },
            { team1: [four[0], four[3]], team2: [four[1], four[2]] },
          ];

          for (const opt of options) {
            const balA = opt.team1.reduce((s, p) => s + LEVEL_SCORE[p.level], 0);
            const balB = opt.team2.reduce((s, p) => s + LEVEL_SCORE[p.level], 0);
            const balancePenalty = Math.abs(balA - balB) * 100;
            const pair1 = partnerCounts[pairKey(opt.team1[0].id, opt.team1[1].id)] || 0;
            const pair2 = partnerCounts[pairKey(opt.team2[0].id, opt.team2[1].id)] || 0;
            const opp1 = oppositionCounts[oppositionKey(opt.team1.map(p => p.id), opt.team2.map(p => p.id))] || 0;
            const opp2 = oppositionCounts[oppositionKey(opt.team2.map(p => p.id), opt.team1.map(p => p.id))] || 0;
            const repeatPenalty = (pair1 + pair2 + opp1 + opp2) * 25;
            const waitReward = four.reduce((s, p) => s + p.waiting, 0);
            const score = balancePenalty + repeatPenalty - waitReward;

            if (score < bestScore) {
              bestScore = score;
              best = opt;
            }
          }
        }
      }
    }
  }

  return best || { team1: pool.slice(0, 2), team2: pool.slice(2, 4) };
}

export default function App() {
  const [waitingPlayers, setWaitingPlayers] = useState(initialPlayers);
  const [pausedPlayers, setPausedPlayers] = useState([]);
  const [courts, setCourts] = useState(initialCourts);
  const [team1, setTeam1] = useState([]);
  const [team2, setTeam2] = useState([]);
  const [history, setHistory] = useState([]);
  const [partnerCounts, setPartnerCounts] = useState({});
  const [oppositionCounts, setOppositionCounts] = useState({});

  const selectedIds = useMemo(() => [...team1, ...team2].map(p => p.id), [team1, team2]);
  const availableWaiting = useMemo(() => waitingPlayers.filter(p => !selectedIds.includes(p.id)), [waitingPlayers, selectedIds]);
  const autoMatch = useMemo(() => buildBestMatch(availableWaiting, partnerCounts, oppositionCounts), [availableWaiting, partnerCounts, oppositionCounts]);
  const preferredCourt = useMemo(() => courts.find(c => c.status === "Available") || null, [courts]);
  const balance = useMemo(() => balanceText(team1, team2), [team1, team2]);

  const addToTeam = (player, which) => {
    if (which === 1 && team1.length < 2) setTeam1(prev => [...prev, player]);
    if (which === 2 && team2.length < 2) setTeam2(prev => [...prev, player]);
  };

  const removeFromTeam = (id, which) => {
    if (which === 1) setTeam1(prev => prev.filter(p => p.id !== id));
    if (which === 2) setTeam2(prev => prev.filter(p => p.id !== id));
  };

  const loadAutoMatch = () => {
    setTeam1(autoMatch.team1 || []);
    setTeam2(autoMatch.team2 || []);
  };

  const loadAutoMatchToPreferredCourt = () => {
    if (!preferredCourt) return;
    const nextTeam1 = autoMatch.team1 || [];
    const nextTeam2 = autoMatch.team2 || [];
    if (nextTeam1.length !== 2 || nextTeam2.length !== 2) return;

    setCourts(prev => prev.map(c => c.id === preferredCourt.id ? {
      ...c,
      team1: nextTeam1,
      team2: nextTeam2,
      status: "Ready",
      finalScore1: "",
      finalScore2: "",
    } : c));
    setWaitingPlayers(prev => prev.filter(p => ![...nextTeam1, ...nextTeam2].some(s => s.id === p.id)));
    setTeam1([]);
    setTeam2([]);
  };

  const pausePlayer = (id) => {
    const player = waitingPlayers.find(p => p.id === id);
    if (!player) return;
    setWaitingPlayers(prev => prev.filter(p => p.id !== id));
    setPausedPlayers(prev => [...prev, { ...player, paused: true }]);
    setTeam1(prev => prev.filter(p => p.id !== id));
    setTeam2(prev => prev.filter(p => p.id !== id));
  };

  const resumePlayer = (id) => {
    const player = pausedPlayers.find(p => p.id === id);
    if (!player) return;
    setPausedPlayers(prev => prev.filter(p => p.id !== id));
    setWaitingPlayers(prev => [...prev, { ...player, paused: false }]);
  };

  const assignToCourt = (courtId) => {
    if (team1.length !== 2 || team2.length !== 2) return;
    setCourts(prev => prev.map(c => c.id === courtId ? { ...c, team1, team2, status: "In Game", finalScore1: "", finalScore2: "" } : c));
    setWaitingPlayers(prev => prev.filter(p => ![...team1, ...team2].some(s => s.id === p.id)));
    setTeam1([]);
    setTeam2([]);
  };

  const finishGame = (courtId) => {
    const court = courts.find(c => c.id === courtId);
    if (!court || court.finalScore1 === "" || court.finalScore2 === "") return;

    const t1Ids = court.team1.map(p => p.id);
    const t2Ids = court.team2.map(p => p.id);

    const p1 = pairKey(t1Ids[0], t1Ids[1]);
    const p2 = pairKey(t2Ids[0], t2Ids[1]);
    const o1 = oppositionKey(t1Ids, t2Ids);
    const o2 = oppositionKey(t2Ids, t1Ids);

    setPartnerCounts(prev => ({ ...prev, [p1]: (prev[p1] || 0) + 1, [p2]: (prev[p2] || 0) + 1 }));
    setOppositionCounts(prev => ({ ...prev, [o1]: (prev[o1] || 0) + 1, [o2]: (prev[o2] || 0) + 1 }));

    setHistory(prev => [{
      id: Date.now(),
      court: court.name,
      team1: court.team1,
      team2: court.team2,
      score1: Number(court.finalScore1),
      score2: Number(court.finalScore2),
      winner: Number(court.finalScore1) > Number(court.finalScore2) ? "Team 1" : "Team 2",
    }, ...prev]);

    setWaitingPlayers(prev => [...prev, ...court.team1.map(p => ({ ...p, waiting: 0 })), ...court.team2.map(p => ({ ...p, waiting: 0 }))]);
    setCourts(prev => prev.map(c => c.id === courtId ? { ...c, team1: [], team2: [], status: "Available", finalScore1: "", finalScore2: "" } : c));
  };

  return (
    <div className="page">
      <div className="container">
        <h1>Fire Rallies Deployment-Ready V4</h1>

        <div className="panel">
          <div className="row between wrap gap">
            <div>
              <h2>Auto Assignment + Manual Override</h2>
              <p className="muted">Auto-suggest the next balanced match, then edit if needed.</p>
              <p className="muted">Preferred court: <strong>{preferredCourt ? preferredCourt.name : "No court available"}</strong></p>
            </div>
            <div className="row gap wrap">
              <button className="btn" onClick={loadAutoMatch}>Load Auto Match</button>
              <button className="btn green" onClick={loadAutoMatchToPreferredCourt} disabled={!preferredCourt}>Auto Fill Preferred Court</button>
            </div>
          </div>
        </div>

        <div className="panel">
          <h2>Waiting Players</h2>
          <div className="chips">
            {availableWaiting.map(p => (
              <div key={p.id} className="chip">
                <div className={nameClass(p.gender)}>{p.name}</div>
                <div className={`badge ${LEVEL_COLORS[p.level]}`}>{p.level}</div>
                <div className="muted small">Waiting {p.waiting}m</div>
                <div className="row gap">
                  <button className="tiny blue" onClick={() => addToTeam(p, 1)}>Team 1</button>
                  <button className="tiny gold" onClick={() => addToTeam(p, 2)}>Team 2</button>
                  <button className="tiny red" onClick={() => pausePlayer(p.id)}>Pause</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Paused Players</h2>
          <div className="chips">
            {pausedPlayers.length ? pausedPlayers.map(p => (
              <div key={p.id} className="chip paused">
                <div className={nameClass(p.gender)}>{p.name}</div>
                <div className="muted small">Waiting preserved: {p.waiting}m</div>
                <button className="tiny green" onClick={() => resumePlayer(p.id)}>Resume</button>
              </div>
            )) : <div className="muted">No paused players.</div>}
          </div>
        </div>

        <div className="grid2">
          <div className="panel team team1">
            <h2>Team 1</h2>
            {team1.map(p => (
              <div key={p.id} className={`member ${LEVEL_COLORS[p.level]}`}>
                <span className={nameClass(p.gender)}>{p.name}</span>
                <button className="tiny red" onClick={() => removeFromTeam(p.id, 1)}>Remove</button>
              </div>
            ))}
          </div>

          <div className="panel team team2">
            <h2>Team 2</h2>
            {team2.map(p => (
              <div key={p.id} className={`member ${LEVEL_COLORS[p.level]}`}>
                <span className={nameClass(p.gender)}>{p.name}</span>
                <button className="tiny red" onClick={() => removeFromTeam(p.id, 2)}>Remove</button>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Balance</h2>
          <div><strong>{balance}</strong></div>
          <div className="row gap wrap top">
            {courts.map(c => (
              <button key={c.id} className="btn" onClick={() => assignToCourt(c.id)}>Send to {c.name}</button>
            ))}
          </div>
        </div>

        <div className="courts">
          {courts.map(c => (
            <div key={c.id} className="panel">
              <div className="row between">
                <h3>{c.name}</h3>
                <span className="muted">{c.status}</span>
              </div>
              <div className="grid2 top">
                <div className="subteam">
                  <strong>Team 1</strong>
                  {c.team1.length ? c.team1.map(p => <div key={p.id} className={nameClass(p.gender)}>{p.name}</div>) : <div className="muted">No players</div>}
                </div>
                <div className="subteam">
                  <strong>Team 2</strong>
                  {c.team2.length ? c.team2.map(p => <div key={p.id} className={nameClass(p.gender)}>{p.name}</div>) : <div className="muted">No players</div>}
                </div>
              </div>
              {(c.status === "In Game" || c.status === "Ready") && (
                <div className="grid2 top">
                  <input className="input" type="number" placeholder="Team 1 final score" value={c.finalScore1} onChange={e => setCourts(prev => prev.map(x => x.id === c.id ? { ...x, finalScore1: e.target.value } : x))} />
                  <input className="input" type="number" placeholder="Team 2 final score" value={c.finalScore2} onChange={e => setCourts(prev => prev.map(x => x.id === c.id ? { ...x, finalScore2: e.target.value } : x))} />
                </div>
              )}
              {(c.status === "In Game" || c.status === "Ready") && (
                <button className="btn green top" onClick={() => finishGame(c.id)}>End Game</button>
              )}
            </div>
          ))}
        </div>

        <div className="panel">
          <h2>Match History</h2>
          {history.length ? history.map(m => (
            <div key={m.id} className="history">
              <div><strong>{m.court}</strong></div>
              <div>Team 1: {m.team1.map(p => p.name).join(" / ")} — {m.score1}</div>
              <div>Team 2: {m.team2.map(p => p.name).join(" / ")} — {m.score2}</div>
              <div className="muted">Winner: {m.winner}</div>
            </div>
          )) : <div className="muted">No completed games yet.</div>}
        </div>
      </div>
    </div>
  );
}
