import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { httpPostJson } from "../../api/httpClient";
import Courtroom from "../../assets/courtroom.png";
import JuryVote from "./JuryVote.jsx";
import JuryResults from "./JuryResults.jsx";

const DEFAULT_JURORS = 1;
const MIN_JURORS = 1;
const MAX_JURORS = 25;
const POLL_MS = 2000;

function normalizeNames(payload, limit) {
  if (!payload || !Array.isArray(payload.current_jurors)) return [];

  return payload.current_jurors.slice(0, limit) // ensure we don't exceed seat count
    .map((name) => String(name || "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

function JurorChair({ seatNumber, name }) {
  const filled = Boolean(name);

  return (
    <article
      style={{ animationDelay: `${120 + seatNumber * 90}ms` }}
      className={`jury-fade-up relative overflow-hidden rounded-2xl border p-6 text-center transition-all duration-300 transform hover:-translate-y-2 ${filled
        ? "jury-seat-filled border-indigo-400/50 bg-[#0a0523]/80 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
        : "border-indigo-500/20 bg-indigo-950/30 backdrop-blur-sm"
        }`}
    >
      <div
        className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border text-3xl transition-all duration-300 shadow-inner ${filled
          ? "border-indigo-400 bg-gradient-to-br from-indigo-500/40 to-purple-600/40 text-indigo-100 shadow-[0_0_15px_rgba(99,102,241,0.4)]"
          : "border-indigo-500/30 bg-[#0a0523]/60 text-indigo-400/50"
          }`}
      >
        {filled ? "⚖" : "□"}
      </div>

      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400/80">Seat {seatNumber}</div>
      <div className={`mt-2 min-h-7 text-lg font-bold tracking-wide ${filled ? "text-white drop-shadow-sm" : "text-indigo-300/60"}`}>
        {filled ? name : "Waiting for Juror"}
      </div>
    </article>
  );
}

export default function JuryHome() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedView = searchParams.get("view");
  const view = requestedView === "vote" || requestedView === "results" ? requestedView : "lobby";
  const initialRoomCode = (searchParams.get("room") || "").toUpperCase();
  const rawAnswers = searchParams.get("answers") || "";

  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode);
  const [activeRoomCode, setActiveRoomCode] = useState(initialRoomCode);
  const [jurorSeatCount, setJurorSeatCount] = useState(DEFAULT_JURORS);
  const [jurors, setJurors] = useState([]);
  const [statusText, setStatusText] = useState("Enter a room code to watch jury seats.");

  const seatCountKey = useMemo(
    () => `jury_seat_count_${String(activeRoomCode || "GLOBAL").toUpperCase()}`,
    [activeRoomCode]
  );

  useEffect(() => {
    const saved = Number.parseInt(window.localStorage.getItem(seatCountKey) || "", 10);
    if (Number.isNaN(saved)) {
      setJurorSeatCount(DEFAULT_JURORS);
      return;
    }
    setJurorSeatCount(Math.max(MIN_JURORS, Math.min(MAX_JURORS, saved)));
  }, [seatCountKey]);

  useEffect(() => {
    window.localStorage.setItem(seatCountKey, String(jurorSeatCount));
  }, [jurorSeatCount, seatCountKey]);

  useEffect(() => {
    if (!activeRoomCode) return;

    let cancelled = false;

    async function loadStatus() {
      const response = await httpPostJson("/join-session", {
        player_type: "juror",
        room_code: activeRoomCode.trim().toUpperCase(),
        player_name: "", // No player name for juror seats
      });
      if (cancelled) return;

      if (!response.ok) {
        setJurors([]);
        if (response.status === 404) {
          setStatusText("Room not found. Check the code and try again.");
        } else if (response.status === 400) {
          setStatusText("Game has already started or room is full.");
        } else {
          setStatusText(`Failed to join (HTTP ${response.status}).`);
        }
        setBusy(false);
        return;
      }


      const nextJurors = normalizeNames(response.data, jurorSeatCount);
      console.log("Loaded jurors:", response.data, "->", nextJurors);
      setJurors(nextJurors);
      setStatusText(
        nextJurors.length >= jurorSeatCount
          ? "All jury seats are now filled."
          : `Waiting for ${jurorSeatCount - nextJurors.length} more juror(s).`
      );
    }

    loadStatus();
    const timer = window.setInterval(loadStatus, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeRoomCode, jurorSeatCount]);

  const seatNames = useMemo(() => {
    const seats = [...jurors];
    while (seats.length < jurorSeatCount) seats.push("");
    return seats;
  }, [jurors, jurorSeatCount]);

  const seedAnswers = useMemo(
    () =>
      rawAnswers
        .split("|")
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    [rawAnswers]
  );

  function buildSearch(nextView, roomCode) {
    const params = {};
    if (roomCode) params.room = roomCode;
    if (nextView === "vote" || nextView === "results") params.view = nextView;
    if (seedAnswers.length) params.answers = seedAnswers.join("|");
    return params;
  }

  function handleWatchRoom(event) {
    event.preventDefault();
    const cleaned = roomCodeInput.trim().toUpperCase();

    setActiveRoomCode(cleaned);
    setSearchParams(buildSearch(view, cleaned));

    if (!cleaned) {
      setJurors([]);
      setStatusText("Enter a room code to watch jury seats.");
    }
  }

  if (view === "vote") {
    return (
      <JuryVote
        roomCode={activeRoomCode}
        seedAnswers={seedAnswers}
        onBack={() => setSearchParams(buildSearch("lobby", activeRoomCode))}
        onOpenResults={() => setSearchParams(buildSearch("results", activeRoomCode))}
      />
    );
  }

  if (view === "results") {
    return (
      <JuryResults
        roomCode={activeRoomCode}
        onBack={() => setSearchParams(buildSearch("lobby", activeRoomCode))}
        onOpenVote={() => setSearchParams(buildSearch("vote", activeRoomCode))}
      />
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050114] text-white">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-[#0a0523] to-[#050114]"></div>

      {/* Decorative Glows */}
      <div className="pointer-events-none absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px]"></div>
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px]"></div>

      <header className="jury-fade-up relative z-40 border-b border-indigo-500/20 bg-[#0a0523]/80 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-400/80 mb-0.5">Jury View</div>
            <div className="font-bold text-white text-lg tracking-wide bg-gradient-to-r from-indigo-200 to-purple-200 bg-clip-text text-transparent">Courtroom Lobby</div>
          </div>

          <Link
            className="text-sm font-semibold text-indigo-300 hover:text-white transition-colors underline underline-offset-4"
            to="/host"
          >
            Back to Host Home
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-8 flex-grow flex flex-col">
        <section className="jury-fade-up rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-8 shadow-[0_0_30px_rgba(139,92,246,0.1)] backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

          <h1 className="text-3xl font-black text-white tracking-wide mb-2 flex items-center gap-3 relative z-10">
            <span className="text-indigo-400 text-4xl">⚖</span> Jury Home
          </h1>
          <p className="mt-2 text-sm font-medium text-indigo-200/80 relative z-10">
            As the host assigns jurors, these courtroom chairs fill with player names.
          </p>

          <form className="mt-8 flex flex-col gap-4 sm:flex-row relative z-10" onSubmit={handleWatchRoom}>
            <input
              type="text"
              value={roomCodeInput}
              onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())}
              placeholder="Enter Room Code (e.g. AB12)"
              className="w-full rounded-xl border border-indigo-500/30 bg-[#0a0523]/60 px-4 py-3 text-base text-white placeholder:text-indigo-400/50 sm:max-w-xs outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 shadow-inner transition-colors"
            />

            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] hover:scale-[1.02] active:scale-95 transition-all"
            >
              Watch Jury Seats
            </button>

            <button
              type="button"
              onClick={() => setSearchParams(buildSearch("vote", activeRoomCode))}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-3 text-sm font-bold text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:scale-[1.02] active:scale-95 transition-all"
            >
              Open Jury Voting
            </button>

            <button
              type="button"
              onClick={() => setSearchParams(buildSearch("results", activeRoomCode))}
              className="rounded-xl bg-gradient-to-r from-pink-600 to-rose-500 px-6 py-3 text-sm font-bold text-white shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:shadow-[0_0_25px_rgba(236,72,153,0.5)] hover:scale-[1.02] active:scale-95 transition-all"
            >
              Open Jury Results
            </button>
          </form>

          <div className="mt-6 text-sm font-medium text-indigo-300 relative z-10">
            Active room: <span className="font-bold text-emerald-400 tracking-wider ml-1">{activeRoomCode || "(none)"}</span>
          </div>

          <div className="mt-8 flex items-center gap-4 relative z-10 bg-[#0a0523]/40 p-5 rounded-xl border border-indigo-500/20 inline-flex w-full sm:w-auto">
            <div className="text-sm font-bold text-white tracking-wide">Number of Jurors</div>
            <div className="inline-flex items-center rounded-xl border border-indigo-500/30 bg-indigo-950/50 shadow-inner overflow-hidden">
              <div className="w-14 px-2 py-2 text-center text-xl font-black text-emerald-400 drop-shadow-sm">
                {jurorSeatCount}
              </div>
              <div className="flex flex-col border-l border-indigo-500/30">
                <button
                  type="button"
                  onClick={() => setJurorSeatCount((value) => Math.min(MAX_JURORS, value + 1))}
                  className="px-3 py-1.5 text-[10px] text-indigo-300 bg-[#0a0523]/40 transition-colors hover:bg-indigo-600 hover:text-white active:bg-indigo-700"
                  aria-label="Increase jurors"
                  title="Increase jurors"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => setJurorSeatCount((value) => Math.max(MIN_JURORS, value - 1))}
                  className="border-t border-indigo-500/30 px-3 py-1.5 text-[10px] text-indigo-300 bg-[#0a0523]/40 transition-colors hover:bg-indigo-600 hover:text-white active:bg-indigo-700"
                  aria-label="Decrease jurors"
                  title="Decrease jurors"
                >
                  ▼
                </button>
              </div>
            </div>
            <div className="text-xs font-medium text-indigo-400/60 ml-2">Minimum: {MIN_JURORS}</div>
          </div>
        </section>

        <section className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {seatNames.map((name, index) => (
            <JurorChair key={index} seatNumber={index + 1} name={name} />
          ))}
        </section>

        <section
          className="jury-fade-up mt-8 rounded-xl border border-indigo-500/20 bg-[#0a0523]/60 px-5 py-4 text-sm font-medium text-indigo-300 shadow-inner flex items-center justify-center gap-3 backdrop-blur-sm"
          style={{ animationDelay: "420ms" }}
        >
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          {statusText}
        </section>
      </main>
    </div>
  );
}