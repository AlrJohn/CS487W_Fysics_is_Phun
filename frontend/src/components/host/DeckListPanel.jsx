import React, { useEffect, useState } from "react";
import { listDecksApi, getDeckDetailApi } from "../../api/decks.js";
import { useDeck } from "../../state/DeckContext.jsx";

export default function DeckListPanel() {
  const { setActiveDeck } = useDeck();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [decks, setDecks] = useState([]);

  async function loadDecks() {
    setBusy(true);
    setError("");
    setDecks([]);

    const res = await listDecksApi();

    if (!res.ok) {
      if ([404, 405, 501].includes(res.status)) {
        setError("Deck listing is not available yet (server endpoint /decks not implemented).");
      } else if (res.status === 401 || res.status === 403) {
        setError("Not authorized. Please log in again with the host code.");
      } else {
        setError(`Failed to load decks (HTTP ${res.status}).`);
      }
      setBusy(false);
      return;
    }

    const payload = res.data;
    const list = Array.isArray(payload) ? payload : payload?.decks;

    if (!Array.isArray(list)) {
      setError("Unexpected response format from server.");
      setBusy(false);
      return;
    }

    // If list is filenames, fetch details for each filename.
    // If list is already deck objects, this can be skipped later.
    const detailed = await Promise.all(
      list.map(async (item) => {
        // If it's already an object, keep it.
        if (item && typeof item === "object") return item;

        // If it's a string filename, try to fetch details.
        const detailRes = await getDeckDetailApi(item);
        if (detailRes.ok) return detailRes.data;

        // Fallback object if detail endpoint fails
        return { deck_id: item, questions: { status: "error", data: [] } };
      })
    );

    setDecks(detailed);
    setBusy(false);
  }

  useEffect(() => {
    loadDecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSetActive(deck) {
    const questionsArray = Array.isArray(deck?.questions?.data) ? deck.questions.data : [];

    setActiveDeck({
      name: deck?.deck_id || deck?.name || "Deck",
      questions: questionsArray,
      uploadedAt: Date.now(),
      deckId: deck?.id || deck?.deck_id,
    });
  }

  return (
    <section className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Stored Decks</h2>
        <button
          onClick={loadDecks}
          disabled={busy}
          className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-60"
        >
          {busy ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <p className="mt-2 text-sm text-slate-300">
        Decks saved on the server. Select one to mark it as the Active Deck (used later during Session Setup).
      </p>

      {error && (
        <div className="mt-3 rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      {!error && !busy && decks.length === 0 && (
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-300">
          No decks found yet.
        </div>
      )}

      {decks.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {decks.map((deck, idx) => {
            const title = deck?.deck_id || deck?.name || `Deck ${idx + 1}`;
            const questionsArray = Array.isArray(deck?.questions?.data) ? deck.questions.data : [];
            const count = questionsArray.length;

            return (
              <div
                key={deck?.id || deck?.deck_id || idx}
                className="rounded-lg border border-slate-800 bg-slate-950/30 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{title}</div>
                    <div className="mt-1 text-xs text-slate-400">{count} question(s)</div>
                  </div>

                  <button
                    onClick={() => onSetActive(deck)}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    Set Active
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
