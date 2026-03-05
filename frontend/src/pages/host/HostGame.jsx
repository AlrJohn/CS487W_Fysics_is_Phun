/**
 * HostGame.jsx
 * Host Game View - Display questions to the host
 *
 * Purpose (MVP):
 * - Show current question being displayed to players
 * - Navigate through questions with next/previous buttons
 * - Later: add timers, show player answers, tally scores, jury view
 */

import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDeck } from "../../state/DeckContext.jsx";
import { buildUrl, buildWsUrl } from "../../api/httpClient";
import { getHostCode } from "../../utils/hostAuth";

// Helper to convert asset paths to full backend URLs
function getImageUrl(imagePath) {
  if (!imagePath) return null;
  if (imagePath.startsWith("/assets/")) return buildUrl(imagePath);
  if (imagePath.startsWith("http")) return imagePath;
  return buildUrl(`/assets/${imagePath}`);
}

export default function HostGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode } = location.state || {};
  const { activeDeck } = useDeck();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [phase, setPhase] = useState("collecting"); // collecting | answers | results
  const [submissions, setSubmissions] = useState([]); // list of player names
  const [answerPool, setAnswerPool] = useState([]);
  const [resultStats, setResultStats] = useState(null);
  const wsRef = React.useRef(null);

  // If no deck or room code, redirect
  useEffect(() => {
    if (!activeDeck) {
      navigate("/host");
      return;
    }
    if (!roomCode) {
      navigate("/host/lobby");
      return;
    }
  }, [activeDeck, roomCode, navigate]);

  // establish websocket connection for real-time question broadcasting
  useEffect(() => {
    if (!roomCode) return;
    // use helper that picks up current host from window.location
    const wsUrl = buildWsUrl(`/ws/session/${roomCode}`);
    console.log("HostGame opening websocket to", wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Host websocket connected");
      setWsConnected(true);
    };
    ws.onclose = () => console.log("Host websocket closed");
    ws.onmessage = (evt) => {
      console.log("Host received ws message", evt.data);
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === "submission") {
          // someone submitted fake answer
          setSubmissions((prev) => [...prev, msg.player]);
        } else if (msg.type === "answers") {
          // save answer pool and switch phase
          setAnswerPool(msg.answers || []);
          setPhase("answers");
        } else if (msg.type === "results") {
          setResultStats(msg.stats);
          setPhase("results");
        }
      } catch (e) {
        // ignore
      }
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
      wsRef.current = null;
    };
  }, [roomCode]);

  if (!activeDeck || !roomCode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-300">Loading...</div>
      </div>
    );
  }

  const questions = activeDeck.questions || [];
  const totalQuestions = questions.length;
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  const currentQuestion = questions[currentQuestionIndex] || {};

  // helper that sends the current question over the socket (if available)
  function sendCurrentQuestion() {
    if (
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN
    ) {
      wsRef.current.send(
        JSON.stringify({
          type: "question",
          index: currentQuestionIndex,
          question: currentQuestion,
        })
      );
    }
  }

  // whenever question index changes we reset phase/submissions/stats
  useEffect(() => {
    setPhase("collecting");
    setSubmissions([]);
    setAnswerPool([]);
    setResultStats(null);
    if (wsConnected) {
      sendCurrentQuestion();
    }
  }, [currentQuestionIndex, currentQuestion, wsConnected]);

  function goToPrevious() {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }

  function goToNext() {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }

  function broadcastAnswers() {
    // compile answers: correct, predefined fake, plus submitted fakes
    const answerSet = [];
    if (currentQuestion.Correct_Answer) answerSet.push(currentQuestion.Correct_Answer);
    if (currentQuestion.Predefined_Fake) answerSet.push(currentQuestion.Predefined_Fake);
    // submissions contain names only; server stores text – but host doesn't have those texts yet.
    // We'll rely on server to keep them but we don't display them here.
    // Send placeholder; players will combine correct/predefined and fakes locally
    wsRef.current.send(JSON.stringify({ type: "answers", answers: answerSet }));
    setPhase("answers");
  }

  function requestResults() {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "results_request" }));
    }
  }

  async function onEndGame() {
    // Broadcast game finished message to all players via websocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "game_finished",
        })
      );
    }
    // Navigate to leaderboard
    navigate("/host/leaderboard", { state: { roomCode } });
  }

  async function onExitGame() {
    // cancel session on backend so players are notified
    try {
      const hostCode = getHostCode?.() || "";
      const headers = hostCode ? { "X-Host-Code": hostCode } : {};
      await fetch(buildUrl(`/session/${roomCode}`), { method: "DELETE", headers });
    } catch (e) {
      console.warn("Failed to cancel session", e);
    }
    navigate("/host");
  }

  return (
    <div className="min-h-screen bg-[#050114] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-[#0a0523] to-[#050114] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-indigo-500/20 bg-[#0a0523]/80 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-400/80 mb-0.5">Host View</div>
            <div className="font-bold text-white text-lg tracking-wide bg-gradient-to-r from-indigo-200 to-purple-200 bg-clip-text text-transparent">
              Game in Progress
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-sm font-medium text-indigo-200">
              Room: <span className="font-bold text-emerald-400 ml-1 tracking-wider">{roomCode}</span>
            </div>
            <button
              onClick={onExitGame}
              className="text-sm font-bold text-pink-400 hover:text-pink-300 underline underline-offset-4 transition-colors"
            >
              Exit Game
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-5xl px-4 py-8 space-y-6 flex-grow flex flex-col">
        {/* Question Counter */}
        <section className="rounded-2xl border border-indigo-500/20 bg-indigo-950/30 backdrop-blur-md shadow-[0_0_20px_rgba(139,92,246,0.05)] p-6 shrink-0 relative overflow-hidden group">
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-indigo-400/80 mb-1">Question Progress</div>
              <div className="mt-1 text-3xl font-black text-white tracking-wide mix-blend-screen drop-shadow-md">
                <span className="text-emerald-400">{currentQuestionIndex + 1}</span>
                <span className="text-indigo-400 font-medium text-xl mx-1">/</span>
                <span className="text-indigo-200">{totalQuestions}</span>
              </div>
            </div>
            <div className="w-full md:w-64 h-3 bg-[#0a0523]/60 border border-indigo-500/30 rounded-full overflow-hidden shadow-inner flex-shrink-0">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all duration-700 ease-out"
                style={{
                  width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`,
                }}
              />
            </div>
          </div>
        </section>

        {/* Question Display */}
        {/* Question Display */}
        <section className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 backdrop-blur-md shadow-[0_0_30px_rgba(139,92,246,0.1)] p-8 md:p-12 flex-grow flex flex-col justify-center relative">
          {/* Decorative corner accents */}
          <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-indigo-500/40 rounded-tl-2xl m-2 opacity-50"></div>
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-purple-500/40 rounded-br-2xl m-2 opacity-50"></div>

          {/* Question Text */}
          <div className="mb-8 text-center max-w-3xl mx-auto w-full z-10">
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-4 flex items-center justify-center gap-2">
              <span className="w-8 h-px bg-indigo-500/40"></span>
              Current Question
              <span className="w-8 h-px bg-indigo-500/40"></span>
            </div>
            <div className="text-3xl md:text-4xl font-black text-white leading-tight break-words drop-shadow-md">
              {currentQuestion.Question_Text || "(No question text)"}
            </div>
          </div>

          {/* Question Image (if present) */}
          {currentQuestion.Image_Link && (
            <div className="mb-8 rounded-xl overflow-hidden border border-indigo-500/30 bg-[#0a0523]/60 shadow-[0_0_20px_rgba(0,0,0,0.4)] mx-auto max-w-2xl relative z-10 group">
              <div className="absolute inset-0 bg-indigo-500/10 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <img
                src={getImageUrl(currentQuestion.Image_Link)}
                alt="Question media"
                className="w-full max-h-[400px] object-contain"
              />
            </div>
          )}

          {/* Correct Answer */}
          {phase === "results" && (
            <div className="grid gap-4 md:grid-cols-2 mt-auto mx-auto w-full max-w-4xl z-10 transition-all duration-500">
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-5 shadow-[0_0_20px_rgba(16,185,129,0.15)] flex flex-col items-center text-center transform hover:scale-[1.02] transition-transform">
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2 bg-emerald-900/40 px-3 py-1 rounded-full border border-emerald-500/30">CORRECT ANSWER</div>
                <div className="text-xl md:text-2xl font-bold text-white">
                  {currentQuestion.Correct_Answer || "(No answer)"}
                </div>
              </div>

              {/* Predefined Fake */}
              <div className="rounded-xl border border-pink-500/40 bg-pink-950/40 p-5 shadow-[0_0_20px_rgba(236,72,153,0.15)] flex flex-col items-center text-center transform hover:scale-[1.02] transition-transform">
                <div className="text-[10px] font-black uppercase tracking-widest text-pink-400 mb-2 bg-pink-900/40 px-3 py-1 rounded-full border border-pink-500/30">PREDEFINED FAKE</div>
                <div className="text-xl md:text-2xl font-bold text-white">
                  {currentQuestion.Predefined_Fake || "(No fake answer)"}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Navigation Controls (phase‑aware) */}
        {/* Navigation Controls (phase‑aware) */}
        <section className="flex flex-col sm:flex-row gap-4 shrink-0">
          <button
            onClick={goToPrevious}
            disabled={isFirstQuestion || phase !== "collecting"}
            className="sm:w-1/4 rounded-xl bg-indigo-950/60 border border-indigo-500/30 px-4 py-4 text-sm font-bold text-indigo-200 hover:bg-indigo-800 hover:text-white hover:border-indigo-400 disabled:opacity-40 disabled:hover:bg-indigo-950/60 disabled:hover:text-indigo-200 disabled:hover:border-indigo-500/30 transition-all flex items-center justify-center gap-2 shadow-inner"
          >
            ← Previous
          </button>

          {phase === "collecting" && (
            <button
              onClick={broadcastAnswers}
              className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-base font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              Show Answers
              <span className="bg-[#0a0523]/40 border border-indigo-400/30 px-2 py-0.5 rounded-full text-xs shadow-inner">
                {submissions.length} submitted
              </span>
            </button>
          )}

          {phase === "answers" && (
            <button
              onClick={requestResults}
              className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-4 text-base font-bold text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-[1.02] active:scale-95 transition-all outline outline-2 outline-offset-2 outline-emerald-500/50"
            >
              Show Results
            </button>
          )}

          {phase === "results" && (
            <button
              onClick={isLastQuestion ? onEndGame : goToNext}
              className={`flex-1 rounded-xl px-6 py-4 text-base font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 ${isLastQuestion
                  ? "bg-gradient-to-r from-emerald-600 to-teal-500 shadow-[0_0_25px_rgba(16,185,129,0.4)] ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-slate-900"
                  : "bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                }`}
            >
              {isLastQuestion ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                  </svg>
                  End Game
                </>
              ) : "Next Question →"}
            </button>
          )}

          <button
            onClick={onExitGame}
            className="shrink-0 sm:w-1/6 rounded-xl bg-pink-950/40 border border-pink-900/50 px-4 py-4 text-sm font-bold text-pink-400 hover:bg-pink-600 hover:text-white hover:border-transparent hover:shadow-[0_0_15px_rgba(219,39,119,0.5)] transition-all flex items-center justify-center"
          >
            Exit
          </button>
        </section>

        {/* Phase-specific information */}
        {phase === "collecting" && (
          <section className="rounded-xl border border-indigo-500/20 bg-indigo-950/30 p-5 shadow-inner flex items-center justify-between">
            <div className="text-sm font-bold text-indigo-200">
              Waiting for players to submit fakes
            </div>
            <div className="flex -space-x-2">
              {Array.from({ length: Math.min(submissions.length, 5) }).map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-indigo-600 border-2 border-[#0a0523] animate-pulse relative z-[1]" style={{ animationDelay: `${i * 150}ms`, zIndex: 10 - i }}></div>
              ))}
              {submissions.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-indigo-800 border-2 border-[#0a0523] flex items-center justify-center text-[10px] font-bold text-white relative z-0">
                  +{submissions.length - 5}
                </div>
              )}
            </div>
          </section>
        )}
        {phase === "answers" && (
          <section className="rounded-xl border border-indigo-500/20 bg-indigo-950/30 p-6 shadow-inner">
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-300 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
              Answers currently shown to players
            </div>
            <div className="flex flex-wrap gap-3">
              {answerPool.map((ans, i) => (
                <div key={i} className="bg-[#0a0523]/60 border border-indigo-500/30 text-indigo-100 px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
                  {ans}
                </div>
              ))}
            </div>
          </section>
        )}
        {phase === "results" && resultStats && (
          <section className="rounded-xl border border-indigo-500/20 bg-indigo-950/30 p-6 shadow-inner">
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-300 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Voting Results
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(resultStats).map(([ans, count]) => {
                const isCorrect = ans === currentQuestion.Correct_Answer;
                return (
                  <div key={ans} className={`flex items-center justify-between p-3 rounded-xl border ${isCorrect ? "border-emerald-500/40 bg-emerald-950/30" : "border-indigo-500/30 bg-[#0a0523]/60"
                    }`}>
                    <span className={`text-sm font-medium truncate pr-2 ${isCorrect ? "text-emerald-200" : "text-indigo-100"}`}>
                      {ans}
                    </span>
                    <span className={`text-base font-black px-2 py-0.5 rounded-md ${isCorrect ? "bg-emerald-500/20 text-emerald-300" : "bg-indigo-900/50 text-indigo-300"
                      }`}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Info Section */}
        <section className="rounded-xl border border-indigo-500/20 bg-[#0a0523]/40 p-5 mt-auto opacity-70 hover:opacity-100 transition-opacity">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Session Info & Analytics</h3>
              <div className="text-sm font-medium text-indigo-200">
                Deck: <span className="text-white font-bold">{activeDeck.name}</span>
              </div>
            </div>
            <div className="text-xs font-medium text-indigo-400/60 bg-indigo-950/40 px-3 py-1.5 rounded-lg border border-indigo-500/10">
              <span className="text-purple-300">Coming soon:</span> Timers and detailed answer tallying
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
