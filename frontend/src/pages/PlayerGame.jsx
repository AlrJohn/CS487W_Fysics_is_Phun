/**
 * PlayerGame.jsx
 * Player game view - waiting for questions to appear.
 *
 * Purpose (MVP):
 * - Show that player is connected and waiting
 * - Display player name and room code
 * - Will later show questions + timer + answer submission
 */

import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { buildUrl } from "../api/httpClient";

export default function PlayerGame() {
  const location = useLocation();
  const { roomCode, playerName } = location.state || {};

  const [sessionStatus, setSessionStatus] = useState(null);
  const [error, setError] = useState("");

  // Poll for session updates
  useEffect(() => {
    if (!roomCode) return;

    async function pollSessionStatus() {
      try {
        const res = await fetch(buildUrl(`/session-status/${roomCode}`));
        if (res.ok) {
          const data = await res.json();
          setSessionStatus(data);
        }
      } catch (err) {
        setError("Lost connection to server");
      }
    }

    pollSessionStatus();
    const interval = setInterval(pollSessionStatus, 2000);
    return () => clearInterval(interval);
  }, [roomCode]);

  if (!roomCode || !playerName) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center">
          <p className="text-slate-300">Error: Session information not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-400">Room Code</div>
              <div className="text-2xl font-bold text-emerald-400">{roomCode}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">Your Name</div>
              <div className="text-lg font-semibold text-slate-100">{playerName}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-2xl px-4 py-8">
        {error && (
          <div className="rounded-lg border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-100">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center">
          <div className="text-sm text-slate-400 mb-2">Waiting for the host...</div>
          <h2 className="text-2xl font-semibold text-slate-100">Questions Coming Soon</h2>

          {sessionStatus && (
            <div className="mt-6 rounded-lg bg-slate-950/50 p-4 text-sm text-slate-300">
              <div>Status: {sessionStatus.status}</div>
              <div>Players Connected: {sessionStatus.players.length}</div>
            </div>
          )}

          <div className="mt-8">
            <div className="inline-block">
              <div className="text-sm text-slate-400 mb-2">Connection Status</div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-slate-200">Connected</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
