// frontend/src/pages/host/HostHome.jsx
// Step 1 Host placeholder page.
// This is NOT implementing game logic yet.
// It's just a clean layout that proves the UI stack is working.

import React from "react";

export default function HostHome() {
  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-800 flex items-center justify-center">
              <span className="font-bold">Φ</span>
            </div>
            <div>
              <div className="text-sm text-slate-400">Host View</div>
              <div className="font-semibold">Fysics is Phun</div>
            </div>
          </div>

          <a
            className="text-sm text-slate-300 hover:text-white underline underline-offset-4"
            href="/join"
          >
            Go to Join Page (later)
          </a>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Host Dashboard (Step 1)</h1>
        <p className="mt-2 text-slate-300">
          This is a placeholder to confirm React + Tailwind + routing work.
          Next step will add the Host flow: Host Code → Create Session → Join Code/QR → Lobby.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {/* Card 1 */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="text-lg font-semibold">Create Session</h2>
            <p className="mt-2 text-sm text-slate-300">
              Next step: prompt for Host Code, then create a session and show join code + QR.
            </p>

            <button
              disabled
              className="mt-4 w-full rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 opacity-60"
              title="Enabled in the next step"
            >
              Create New Session (next step)
            </button>
          </section>

          {/* Card 2 */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="text-lg font-semibold">Decks (CSV)</h2>
            <p className="mt-2 text-sm text-slate-300">
              Next step: Host can import/list/select decks (CSV), before starting the game.
            </p>

            <button
              disabled
              className="mt-4 w-full rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 opacity-60"
              title="Enabled in the next step"
            >
              Open Deck Manager (next step)
            </button>
          </section>
        </div>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="text-lg font-semibold">Planned Host Flow</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-300">
            <li>Enter Host Code</li>
            <li>Create Session → display Join Code + Join URL + QR</li>
            <li>Lobby: roster updates + assign Jury (min 1) + Start Game</li>
            <li>Stage 1 monitor → Stage 2 monitor → Results → Final + Export</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
