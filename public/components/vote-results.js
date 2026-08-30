import "./poker-card.js";
import { DECK } from "./util.js";

const NUMERIC_DECK = DECK.map(Number).filter((n) => !Number.isNaN(n)).sort((a, b) => a - b);

function card(value) {
  return `<poker-card value="${value}" small readonly></poker-card>`;
}

function renderRange(average) {
  if (average == null || NUMERIC_DECK.includes(average)) return "";

  let low = null;
  let high = null;
  for (const n of NUMERIC_DECK) {
    if (n < average) low = n;
    if (n > average && high === null) high = n;
  }

  if (low != null && high != null) {
    return `<div class="range">${card(low)}<span class="range-label">and</span>${card(high)}</div>`;
  }
  if (low != null) return `<div class="range"><span class="range-label">Above</span>${card(low)}</div>`;
  if (high != null) return `<div class="range"><span class="range-label">Below</span>${card(high)}</div>`;
  return "";
}

class VoteResults extends HTMLElement {
  setState(state) {
    const avg = state.average != null ? state.average.toFixed(1) : "—";

    this.innerHTML = `
      ${state.consensus ? '<p class="consensus-banner">Consensus! 🎉</p>' : ""}
      <p class="average">Average: <strong>${avg}</strong></p>
      ${renderRange(state.average)}
    `;
  }
}

customElements.define("vote-results", VoteResults);
