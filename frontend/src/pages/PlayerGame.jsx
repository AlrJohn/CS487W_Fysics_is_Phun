/**
 * PlayerGame.jsx
 * Player game view - waiting for questions to appear.
 *
 * Purpose (MVP):
 * - Show that player is connected and waiting
 * - Display player name and room code
 * - Detect if session is cancelled
 * - Will later show questions + timer + answer submission
 */

import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildUrl, buildWsUrl } from "../api/httpClient";

// Helper to convert asset paths to full backend URLs
function getImageUrl(imagePath) {
  if (!imagePath) return null;
  if (imagePath.startsWith("/assets/")) return buildUrl(imagePath);
  if (imagePath.startsWith("http")) return imagePath;
  return buildUrl(`/assets/${imagePath}`);
}

export default function PlayerGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode, playerName } = location.state || {};

  const [sessionStatus, setSessionStatus] = useState(null);
  const [error, setError] = useState("");
  const [sessionCancelled, setSessionCancelled] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(null);
  const wsRef = React.useRef(null);

  // game-specific state
  const [phase, setPhase] = useState("submit"); // submit | choose | results
  const [myFake, setMyFake] = useState("");
  const [answers, setAnswers] = useState([]);
  const [myChoice, setMyChoice] = useState(null);
  const [correctAnswer, setCorrectAnswer] = useState(null);

  // Poll for session updates (players count, status)
  useEffect(() => {
    if (!roomCode) return;

    async function pollSessionStatus() {
      try {
        const res = await fetch(buildUrl(`/session-status/${roomCode}`));
        if (res.ok) {
          const data = await res.json();
          setSessionStatus(data);

          // Check if session was cancelled
          if (data.status === "cancelled") {
            setSessionCancelled(true);
          }
        } else if (res.status === 404) {
          // Session not found – probably the backend restarted or the code expired.
          // Send player back to join page so they can try again with a fresh code.
          navigate("/join");
        }
      } catch (err) {
        setError("Lost connection to server");
      }
    }

    pollSessionStatus();
    const interval = setInterval(pollSessionStatus, 2000);
    return () => clearInterval(interval);
  }, [roomCode]);

  // open websocket to receive question updates
  useEffect(() => {
    // only attempt once we know the session still exists (prevent noise when session has vanished)
    if (!roomCode) return;
    if (sessionCancelled) return;

    const wsUrl = buildWsUrl(`/ws/session/${roomCode}`);
    console.log("PlayerGame opening websocket to", wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Player ws opened");
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        console.log("Player ws received", msg);
        if (msg.type === "question") {
          setCurrentQuestionIndex(msg.index);
          setCurrentQuestion(msg.question);
          setSessionStatus((prev) => ({ ...(prev || {}), status: "in-progress" }));
          // reset game-phase state
          setPhase("submit");
          setMyFake("");
          setAnswers([]);
          setMyChoice(null);
          setCorrectAnswer(null);
        } else if (msg.type === "cancelled") {
          setSessionCancelled(true);
        } else if (msg.type === "game_finished") {
          setGameFinished(true);
        } else if (msg.type === "answers") {
          setAnswers(msg.answers || []);
          setPhase("choose");
        } else if (msg.type === "results") {
          setCorrectAnswer(msg.correct || "");
          setPhase("results");
        }
      } catch (e) {
        console.error("Invalid ws msg", e);
      }
    };

    ws.onclose = (e) => console.log("Player ws closed", e.code, e.reason);
    ws.onerror = (e) => console.error("Player ws error", e);

    return () => {
      console.log("Player ws cleanup - closing socket");
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [roomCode, sessionCancelled]);

  if (!roomCode || !playerName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-[#0a0523] to-[#0d011c] flex items-center justify-center p-6">
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-md shadow-[0_0_20px_rgba(139,92,246,0.1)] p-8 text-center max-w-sm w-full">
          <p className="text-pink-200">Error: Session information not found.</p>
        </div>
      </div>
    );
  }

  // Show session cancelled message
  if (sessionCancelled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-[#0a0523] to-[#0d011c] flex items-center justify-center p-6">
        <div className="rounded-2xl border border-pink-500/30 bg-pink-950/20 backdrop-blur-md shadow-[0_0_20px_rgba(236,72,153,0.1)] p-8 max-w-md text-center w-full">
          <h2 className="text-2xl font-bold text-white mb-2 tracking-wide">Session Cancelled</h2>
          <p className="text-sm text-pink-200/70 mb-8">
            The host has cancelled the game session. Please try joining another session.
          </p>
          <button
            onClick={() => navigate("/join")}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-base font-bold text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] hover:scale-[1.02] transition-all"
          >
            Return to Join Page
          </button>
        </div>
      </div>
    );
  }

  // Show game finished message
  if (gameFinished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-[#0a0523] to-[#0d011c] flex items-center justify-center p-6">
        <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 backdrop-blur-md shadow-[0_0_30px_rgba(168,85,247,0.15)] p-8 max-w-md text-center w-full">
          <div className="text-5xl mb-4 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-2 tracking-wide">Game Finished!</h2>
          <p className="text-sm text-purple-200/80 mb-8">
            Thank you for playing. The host has finished all questions.
          </p>
          <button
            onClick={() => navigate("/join")}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-base font-bold text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] hover:scale-[1.02] transition-all"
          >
            Return to Join Page
          </button>
        </div>
      </div>
    );
  }

  // if we have received a question from host, display it
  if (currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-[#0a0523] to-[#0d011c]">
        <header className="border-b border-indigo-900/50 bg-[#0a0523]/80 backdrop-blur sticky top-0 z-10 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          <div className="mx-auto max-w-2xl px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-indigo-300 uppercase tracking-wider font-semibold">Room Code</div>
                <div className="text-2xl font-bold text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.4)]">{roomCode}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-indigo-300 uppercase tracking-wider font-semibold">Your Name</div>
                <div className="text-lg font-semibold text-white">{playerName}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-6 py-10">
          {sessionStatus && (
            <div className="mb-8 rounded-xl bg-indigo-950/30 border border-indigo-500/20 p-4 text-sm text-indigo-200 flex justify-between items-center backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                </span>
                <span className="capitalize">{sessionStatus.status}</span>
              </div>
              <div className="font-semibold">{sessionStatus.players.length} Players</div>
            </div>
          )}

          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-md shadow-[0_0_30px_rgba(139,92,246,0.1)] p-8 text-center relative overflow-hidden">
            {/* Soft background glow light */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>

            <div className="text-xs text-indigo-300 uppercase tracking-wider font-semibold mb-3">Question {currentQuestionIndex + 1}</div>
            <h2 className="text-3xl font-bold text-white mb-6 leading-tight">
              {currentQuestion.Question_Text}
            </h2>
            {currentQuestion.Image_Link && (
              <div className="mb-6 rounded-xl overflow-hidden border border-indigo-500/20 bg-black/40 p-2 shadow-inner">
                <img
                  src={getImageUrl(currentQuestion.Image_Link)}
                  alt="Question"
                  className="mx-auto max-h-64 object-contain rounded-lg"
                />
              </div>
            )}

            {/* phase-specific interaction */}
            {phase === "submit" && (
              <div className="mt-8">
                <input
                  type="text"
                  placeholder="Your fake answer"
                  value={myFake}
                  onChange={(e) => setMyFake(e.target.value)}
                  className="w-full rounded-xl border border-indigo-500/30 bg-indigo-950/30 px-4 py-4 text-lg text-white outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all shadow-inner"
                />
                <button
                  onClick={async () => {
                    if (!myFake) return;
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                      wsRef.current.send(JSON.stringify({
                        type: "fake",
                        player: playerName,
                        text: myFake,
                      }));
                    }
                    setPhase("waiting");
                  }}
                  disabled={!myFake}
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-4 text-lg font-bold text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] hover:scale-[1.02] disabled:hover:scale-100 disabled:opacity-50 transition-all"
                >
                  Submit Fake
                </button>
              </div>
            )}

            {phase === "waiting" && (
              <div className="mt-10 mb-4 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                <div className="text-indigo-200 font-semibold tracking-wide">Waiting for others...</div>
              </div>
            )}

            {phase === "choose" && (
              <div className="mt-8 space-y-4">
                {answers.map((ans, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setMyChoice(ans);
                      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({
                          type: "choice",
                          player: playerName,
                          answer: ans,
                        }));
                      }
                    }}
                    disabled={!!myChoice}
                    className={`w-full rounded-xl border ${myChoice === ans ? 'border-purple-500 bg-purple-900/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'border-indigo-500/30 bg-indigo-950/40 hover:bg-indigo-900/60 hover:border-purple-400'} px-6 py-4 text-lg font-semibold text-white transition-all disabled:opacity-70`}
                  >
                    {ans}
                  </button>
                ))}
              </div>
            )}

            {phase === "results" && correctAnswer && (
              <div className="mt-8 text-left">
                <div className="text-sm font-semibold text-indigo-300 uppercase tracking-wider mb-4 border-b border-indigo-500/20 pb-2">Verdict</div>
                <div className="space-y-3">
                  {/* resultStats is expected to be the correct answer to the question. A message should be displayed stating if user's choice was correct or not */}
                  <div className="text-lg font-semibold text-white">
                    {correctAnswer === myChoice ? `${myChoice} is correct!` : `${myChoice} is incorrect! \nThe correct answer was: ${correctAnswer}`}
                  </div>
                  {/* {Object.entries(resultStats).map(([ans, count]) => (
                    <div key={ans} className="flex justify-between items-center rounded-lg bg-indigo-950/40 border border-indigo-500/20 p-4">
                      <span className="text-white font-medium">{ans}</span>
                      <span className="bg-purple-600/20 text-purple-300 py-1 px-3 rounded-full text-sm font-bold border border-purple-500/30">
                        {count} vote{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ))} */}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-[#0a0523] to-[#0d011c]">
      {/* Header */}
      <header className="border-b border-indigo-900/50 bg-[#0a0523]/80 backdrop-blur sticky top-0 z-10 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="mx-auto max-w-2xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-indigo-300 uppercase tracking-wider font-semibold">Room Code</div>
              <div className="text-2xl font-bold text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.4)]">{roomCode}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-indigo-300 uppercase tracking-wider font-semibold">Your Name</div>
              <div className="text-lg font-semibold text-white">{playerName}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-2xl px-6 py-10">
        {error && (
          <div className="mb-6 rounded-lg border border-pink-500/40 bg-pink-950/40 p-4 text-sm text-pink-200 shadow-lg">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-md shadow-[0_0_30px_rgba(139,92,246,0.1)] p-12 text-center relative overflow-hidden">
          {/* Subtle top border glow */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>

          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-6"></div>

          <h2 className="text-3xl font-bold text-white mb-2 tracking-wide">Waiting for host...</h2>
          <div className="text-sm text-indigo-200/70 uppercase tracking-widest font-semibold">Questions Coming Soon</div>

          {sessionStatus && (
            <div className="mt-8 rounded-xl bg-indigo-950/30 border border-indigo-500/20 p-4 text-sm text-indigo-200 flex justify-between items-center w-full max-w-xs mx-auto">
              <span className="capitalize">{sessionStatus.status}</span>
              <div className="font-semibold text-white">{sessionStatus.players.length} Players</div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-indigo-500/10">
            <div className="inline-block">
              <div className="text-xs text-indigo-400/60 uppercase tracking-wider font-semibold mb-2">Connection</div>
              <div className="flex items-center justify-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                </span>
                <span className="text-white font-medium">Connected</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
