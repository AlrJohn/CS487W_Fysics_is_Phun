import React, { useEffect } from "react";
import ActiveDeckCard from "../../components/host/ActiveDeckCard.jsx";
import { Link, useNavigate } from "react-router-dom";
import { getHostCode } from "../../utils/hostAuth";

export default function HostHome() {
  const navigate = useNavigate();
  const hostCode = getHostCode();

  // 1. SECURITY GUARD: If no code is found, redirect to login
  useEffect(() => {
    if (!hostCode) {
      // We use window.location here to ensure a "hard" reset of the app state
      window.location.href = "/host?reason=expired";
    }
  }, [hostCode]);

  // 2. NAVIGATION HELPERS: These fix the "ReferenceError"
  function navigateToDeckManager() {
    navigate("/host/decks");
  }

  function navigateToSessionSetup() {
    navigate("/host/session");
  }

  // 3. RENDER PREVENTER: Don't show the dashboard if redirecting
  if (!hostCode) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-[#0a0523] to-[#0d011c]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-indigo-900/50 bg-[#0a0523]/80 backdrop-blur shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 shadow-[0_0_15px_rgba(139,92,246,0.4)] text-white">
              <span className="font-bold text-lg">Φ</span>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                Host View
              </div>
              <div className="text-lg font-bold text-white tracking-wide">
                Fysics is Phun
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => window.open("/join", "_blank")}
              className="text-sm font-semibold uppercase tracking-wider text-indigo-300 hover:text-white transition-colors"
            >
              Player Join Page ↗
            </button>
            <button
              onClick={() => window.open("/jury", "_blank")}
              className="text-sm font-semibold uppercase tracking-wider text-indigo-300 hover:text-white transition-colors"
            >
              Jury Join Page ↗
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-6 py-10 relative">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        <h1 className="text-3xl font-bold text-white tracking-wide">
          Host Dashboard
        </h1>
        <p className="mt-2 text-sm text-indigo-200/80 font-medium">
          Host flow: Session Setup → Create Session → Join Code/QR → Lobby → Run
          game.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* Create Session Card */}
          <section className="flex flex-col rounded-2xl border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-md p-6 hover:bg-indigo-900/30 transition-all">
            <div className="flex-grow">
              <h2 className="text-xl font-bold text-white mb-2">
                Create Session
              </h2>
              <p className="text-sm text-indigo-200/80 leading-relaxed">
                Configure timers and options, then create a session.
              </p>
            </div>
            <button
              onClick={navigateToSessionSetup}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-3 text-sm font-bold text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-[1.02] transition-all"
            >
              Go to Session Setup
            </button>
          </section>

          {/* Deck Manager Card */}
          <section className="flex flex-col rounded-2xl border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-md p-6 hover:bg-indigo-900/30 transition-all">
            <div className="flex-grow">
              <h2 className="text-xl font-bold text-white mb-2">Decks (CSV)</h2>
              <p className="text-sm text-indigo-200/80 leading-relaxed">
                Upload, preview, edit, or backup a CSV deck, or set it as the
                Active Deck.
              </p>
            </div>
            <button
              onClick={navigateToDeckManager}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-sm font-bold text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:scale-[1.02] transition-all"
            >
              Open Deck Manager
            </button>
          </section>
        </div>

        <div className="mt-8 rounded-2xl border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-md p-6">
          <ActiveDeckCard />
        </div>
      </main>
    </div>
  );
}
