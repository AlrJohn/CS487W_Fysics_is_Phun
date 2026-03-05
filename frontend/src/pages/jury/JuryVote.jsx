import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Courtroom from "../../assets/courtroom.png";

function parseSeedLine(line, index) {
  const clean = String(line || "").trim();
  if (!clean) return null;

  const splitByDoubleColon = clean.split("::");
  if (splitByDoubleColon.length >= 2) {
    return {
      id: `${Date.now()}-${index}`,
      player: splitByDoubleColon[0].trim() || `Player ${index + 1}`,
      text: splitByDoubleColon.slice(1).join("::").trim(),
    };
  }

  return {
    id: `${Date.now()}-${index}`,
    player: `Player ${index + 1}`,
    text: clean,
  };
}

function jurorKey(name) {
  return String(name || "").trim().toLowerCase();
}

export default function JuryVote({ roomCode, seedAnswers = [], onBack, onOpenResults }) {
  const storageKeyAnswers = useMemo(
    () => `jury_answers_${String(roomCode || "GLOBAL").toUpperCase()}`,
    [roomCode]
  );
  const storageKeyVotes = useMemo(
    () => `jury_votes_${String(roomCode || "GLOBAL").toUpperCase()}`,
    [roomCode]
  );

  const [answers, setAnswers] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [jurorName, setJurorName] = useState("");
  const [submitStatus, setSubmitStatus] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    const storedRaw = window.localStorage.getItem(storageKeyAnswers);
    if (storedRaw) {
      try {
        const parsed = JSON.parse(storedRaw);
        if (Array.isArray(parsed) && parsed.length) {
          setAnswers(parsed);
          return;
        }
      } catch {
        // If local storage is invalid, fallback to seed answers.
      }
    }

    const parsedSeed = seedAnswers
      .map((line, index) => parseSeedLine(line, index))
      .filter(Boolean);

    if (parsedSeed.length) {
      setAnswers(parsedSeed);
      window.localStorage.setItem(storageKeyAnswers, JSON.stringify(parsedSeed));
      return;
    }

    setAnswers([]);
  }, [seedAnswers, storageKeyAnswers]);

  useEffect(() => {
    const key = jurorKey(jurorName);
    if (!key) {
      setHasSubmitted(false);
      return;
    }

    const previous = JSON.parse(window.localStorage.getItem(storageKeyVotes) || "[]");
    const alreadySubmitted = Array.isArray(previous)
      ? previous.some((vote) => jurorKey(vote?.juror) === key)
      : false;
    setHasSubmitted(alreadySubmitted);
  }, [jurorName, storageKeyVotes]);

  function submitFinalVote() {
    const key = jurorKey(jurorName);
    if (!key) {
      setSubmitStatus("Enter your juror name to submit your final vote.");
      return;
    }

    if (!selectedId) {
      setSubmitStatus("Select one answer before final submission.");
      return;
    }

    const previous = JSON.parse(window.localStorage.getItem(storageKeyVotes) || "[]");
    const alreadySubmitted = Array.isArray(previous)
      ? previous.some((vote) => jurorKey(vote?.juror) === key)
      : false;
    if (alreadySubmitted) {
      setHasSubmitted(true);
      setSubmitStatus("This juror has already submitted a final vote.");
      return;
    }

    const picked = answers.find((answer) => answer.id === selectedId);
    if (!picked) {
      setSubmitStatus("The selected answer is no longer available.");
      return;
    }

    const voteEntry = {
      votedAt: new Date().toISOString(),
      roomCode: String(roomCode || "").toUpperCase(),
      juror: String(jurorName || "").trim(),
      selectedAnswerId: picked.id,
      selectedAnswer: picked.text,
      selectedPlayer: picked.player,
    };

    const next = Array.isArray(previous) ? [...previous, voteEntry] : [voteEntry];
    window.localStorage.setItem(storageKeyVotes, JSON.stringify(next));
    setHasSubmitted(true);
    setSubmitStatus(`Vote submitted: Best Fake -> ${picked.player}`);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050114] text-white flex flex-col">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-[#0a0523] to-[#050114]"></div>

      {/* Decorative Glows */}
      <div className="pointer-events-none absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/10 blur-[120px]"></div>
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]"></div>

      <header className="jury-fade-up relative z-40 border-b border-indigo-500/20 bg-[#0a0523]/80 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-400/80 mb-0.5">Jury View</div>
            <div className="font-bold text-white text-lg tracking-wide bg-gradient-to-r from-emerald-200 to-teal-200 bg-clip-text text-transparent">Jury Voting</div>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={onBack}
              className="text-sm font-semibold text-indigo-300 hover:text-white transition-colors underline underline-offset-4"
            >
              Back to Jury Home
            </button>
            <Link
              className="text-sm font-semibold text-indigo-300 hover:text-white transition-colors underline underline-offset-4"
              to="/host"
            >
              Host Home
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-8 space-y-8 flex-grow">
        <section className="jury-fade-up rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-8 shadow-[0_0_30px_rgba(139,92,246,0.1)] backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

          <h1 className="text-3xl font-black text-white tracking-wide mb-2 flex items-center gap-3 relative z-10">
            <span className="text-emerald-400 text-4xl">✓</span> Select Best Fake
          </h1>
          <p className="mt-2 text-sm font-medium text-indigo-200/80 relative z-10">
            Jurors review player-submitted answers and choose the best fake response.
          </p>

          <div className="mt-6 text-sm font-medium text-indigo-300 relative z-10">
            Active room: <span className="font-bold text-emerald-400 tracking-wider ml-1">{roomCode || "(none)"}</span>
          </div>

          <div className="mt-8 bg-[#0a0523]/40 border border-indigo-500/20 rounded-xl p-5 relative z-10 max-w-lg">
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-300/80 mb-3">
              Juror name (optional)
            </label>
            <input
              type="text"
              value={jurorName}
              onChange={(event) => setJurorName(event.target.value)}
              className="w-full rounded-xl border border-indigo-500/30 bg-[#0a0523]/60 px-4 py-3 text-white outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 placeholder:text-indigo-400/50 shadow-inner transition-colors"
              placeholder="e.g. Juror 1"
            />
            <div className="mt-3 text-xs font-medium text-indigo-400/60 leading-relaxed">
              Select any circle below to change your choice. Submit once your final choice is set.
            </div>
          </div>
        </section>

        <section
          className="jury-fade-up rounded-2xl border border-indigo-500/20 bg-indigo-950/30 p-8 backdrop-blur-md shadow-inner"
          style={{ animationDelay: "120ms" }}
        >
          <div className="mb-8 border-b border-indigo-500/20 pb-4">
            <h2 className="text-xl font-bold text-white tracking-wide">Player Answers</h2>
            <p className="mt-2 text-sm font-medium text-indigo-300">Tap one circle to highlight your Best Fake vote.</p>
          </div>

          {!answers.length ? (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-6 py-4 text-sm font-bold text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.1)] flex items-center gap-3">
              <span className="text-rose-400 text-xl">ℹ</span> No answers available yet. Pass `answers` via query param or load them into local storage.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
              {answers.map((answer, index) => {
                const selected = selectedId === answer.id;
                return (
                  <button
                    key={answer.id}
                    type="button"
                    onClick={() => setSelectedId(answer.id)}
                    style={{ animationDelay: `${150 + index * 70}ms` }}
                    className={`jury-fade-up aspect-square rounded-full border-2 p-6 text-center transition-all duration-300 transform hover:-translate-y-2 group shadow-lg ${selected
                      ? "border-emerald-400 bg-gradient-to-b from-emerald-500/20 to-teal-900/40 shadow-[0_0_30px_rgba(52,211,153,0.3)] ring-4 ring-emerald-500/20"
                      : "border-indigo-500/30 bg-[#0a0523]/80 hover:border-purple-400/80 hover:bg-indigo-900/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                      }`}
                  >
                    <div className="flex h-full flex-col items-center justify-center">
                      <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-3 ${selected ? "text-emerald-300" : "text-indigo-400 group-hover:text-purple-300"}`}>{answer.player}</div>
                      <div className={`line-clamp-4 text-sm font-bold leading-relaxed break-words px-2 ${selected ? "text-white drop-shadow-md" : "text-indigo-100"}`}>{answer.text}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-12 flex flex-col sm:flex-row gap-4 border-t border-indigo-500/20 pt-8">
            <button
              type="button"
              onClick={submitFinalVote}
              disabled={!selectedId || !jurorKey(jurorName) || hasSubmitted}
              className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-4 text-base font-bold text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2"
            >
              Submit Final Vote
            </button>

            <button
              type="button"
              onClick={onOpenResults}
              className="sm:w-1/3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-base font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:scale-[1.02] active:scale-95 transition-all outline outline-2 outline-offset-2 outline-indigo-500/50 flex items-center justify-center"
            >
              View Results
            </button>
          </div>

          {submitStatus && (
            <div className={`mt-6 rounded-xl border p-4 text-sm font-bold shadow-inner flex items-center gap-3 ${submitStatus.includes("Vote submitted")
                ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-200"
                : "border-pink-500/40 bg-pink-950/40 text-pink-200"
              }`}>
              {submitStatus.includes("Vote submitted") ? "✓" : "⚠"} {submitStatus}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
