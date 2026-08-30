import { escapeHtml } from "./util.js";

class TableSeats extends HTMLElement {
  setState(state, myId) {
    const people = state.participants;
    const n = people.length;

    if (!n) {
      this.innerHTML = `<p class="empty">Waiting for people to join…</p>`;
      return;
    }

    const seats = people
      .map((p, i) => {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2;
        const x = 50 + 46 * Math.cos(angle);
        const y = 50 + 42 * Math.sin(angle);

        let cardClass = "empty";
        let cardContent = "";
        if (state.revealed) {
          cardClass = "revealed";
          cardContent = p.vote != null ? escapeHtml(p.vote) : "—";
        } else if (p.hasVoted) {
          cardClass = "voted";
        }

        const youTag = p.id === myId ? '<span class="you-tag">you</span>' : "";
        const hostTag = p.id === state.hostId ? '<span class="seat-host-crown" title="Host">👑</span>' : "";

        return `
          <div class="seat" style="left:${x}%; top:${y}%;">
            <div class="seat-card ${cardClass}">${cardContent}</div>
            <div class="seat-person">
              ${hostTag}
              <span class="seat-name">${escapeHtml(p.name)}</span>
              ${youTag}
            </div>
          </div>
        `;
      })
      .join("");

    this.innerHTML = `<div class="seats">${seats}</div>`;
  }
}

customElements.define("table-seats", TableSeats);
