import "./poker-card.js";
import "./table-seats.js";
import "./vote-results.js";
import { escapeHtml, DECK } from "./util.js";

class RoomScreen extends HTMLElement {
  connectedCallback() {
    this.roomId = this.getAttribute("room-id");
    this.socket = null;
    this.myId = null;
    this.selectedVote = null;
    this.state = { participants: [], revealed: false, hostId: null, average: null, consensus: false };

    const rememberedName = localStorage.getItem(`poker-name-${this.roomId}`);
    if (rememberedName) {
      this.renderConnecting();
      this.connect(rememberedName);
    } else {
      this.renderJoinGate();
    }
  }

  disconnectedCallback() {
    if (this.socket) this.socket.close();
  }

  renderConnecting() {
    this.innerHTML = `<div class="join-gate"><p class="room-id">Rejoining room…</p></div>`;
  }

  renderJoinGate() {
    const lastName = localStorage.getItem("poker-name") || "";
    this.innerHTML = `
      <div class="join-gate">
        <h1>Join room</h1>
        <p class="room-id">Room: <strong>${escapeHtml(this.roomId)}</strong></p>
        <input id="name" placeholder="Your name" value="${escapeHtml(lastName)}" maxlength="40" autocomplete="off" />
        <button id="join" type="button">Join</button>
      </div>
    `;

    const input = this.querySelector("#name");
    const doJoin = () => {
      const name = input.value.trim();
      if (!name) {
        input.focus();
        return;
      }
      localStorage.setItem("poker-name", name);
      localStorage.setItem(`poker-name-${this.roomId}`, name);
      this.connect(name);
    };

    this.querySelector("#join").addEventListener("click", doJoin);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doJoin();
    });
    input.focus();
  }

  connect(name) {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${location.host}/parties/poker-room/${this.roomId}`;
    const hostToken = localStorage.getItem(`poker-host-${this.roomId}`) || null;

    const ws = new WebSocket(url);
    this.socket = ws;

    ws.addEventListener("open", () => {
      this.send({ type: "join", name, hostToken });
    });

    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "welcome") {
        this.myId = msg.id;
        if (!this.querySelector(".room")) this.renderRoom();
      } else if (msg.type === "state") {
        this.state = msg;
        this.updateRoom();
      }
    });

    ws.addEventListener("close", () => {
      // Only reconnect if this socket is still the active one — avoids
      // resurrecting a stale session after an intentional close (e.g. switching name).
      if (this.socket !== ws) return;
      setTimeout(() => {
        if (this.isConnected && this.socket === ws) this.connect(name);
      }, 1500);
    });
  }

  send(payload) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }

  renderRoom() {
    this.innerHTML = `
      <div class="room">
        <header>
          <h1>Planning Poker</h1>
          <div class="header-actions">
            <button id="share" type="button">Copy invite link</button>
            <button id="switch-name" type="button" class="link-btn">Not you?</button>
          </div>
        </header>
        <div class="table-wrap">
          <table-seats></table-seats>
          <div class="table">
            <p class="wait-msg" hidden>Waiting for the host to reveal…</p>
            <vote-results hidden></vote-results>
            <button id="reveal" type="button" class="reveal-btn" hidden>Reveal cards</button>
            <button id="reset" type="button" class="reset-btn" hidden>New round</button>
          </div>
        </div>
        <div class="deck"></div>
      </div>
    `;

    this.querySelector("#share").addEventListener("click", async (e) => {
      await navigator.clipboard.writeText(location.href);
      const btn = e.currentTarget;
      const original = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = original), 1500);
    });

    this.querySelector("#switch-name").addEventListener("click", () => {
      localStorage.removeItem(`poker-name-${this.roomId}`);
      if (this.socket) this.socket.close();
      this.socket = null;
      this.myId = null;
      this.selectedVote = null;
      this.renderJoinGate();
    });

    const deckEl = this.querySelector(".deck");
    DECK.forEach((value) => {
      const card = document.createElement("poker-card");
      card.setAttribute("value", value);
      card.addEventListener("click", () => this.castVote(value));
      deckEl.appendChild(card);
    });

    this.querySelector("#reveal").addEventListener("click", () => this.send({ type: "reveal" }));
    this.querySelector("#reset").addEventListener("click", () => this.send({ type: "reset" }));

    this.updateRoom();
  }

  castVote(value) {
    if (this.state.revealed) return;
    this.selectedVote = this.selectedVote === value ? null : value;
    this.send({ type: "vote", value: this.selectedVote });
    this.querySelectorAll("poker-card").forEach((c) => {
      c.toggleAttribute("selected", c.getAttribute("value") === this.selectedVote);
    });
  }

  updateRoom() {
    if (!this.querySelector(".room")) return;

    const revealed = this.state.revealed;
    const isHost = this.state.hostId !== null && this.state.hostId === this.myId;

    const me = this.state.participants.find((p) => p.id === this.myId);
    if (me && !me.hasVoted) {
      this.selectedVote = null;
    }

    this.querySelector("table-seats").setState(this.state, this.myId);

    const results = this.querySelector("vote-results");
    results.hidden = !revealed;
    if (revealed) results.setState(this.state);

    this.querySelector(".wait-msg").hidden = isHost || revealed;
    this.querySelector("#reveal").hidden = !(isHost && !revealed);
    this.querySelector("#reset").hidden = !(isHost && revealed);

    this.querySelector(".deck").hidden = revealed;

    if (!revealed) {
      this.querySelectorAll("poker-card").forEach((c) => {
        c.toggleAttribute("selected", c.getAttribute("value") === this.selectedVote);
      });
    }
  }
}

customElements.define("room-screen", RoomScreen);
