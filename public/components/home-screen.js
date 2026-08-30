import { generateRoomId } from "./util.js";

class HomeScreen extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="home">
        <h1>Planning Poker</h1>
        <p>Create a room, share the link, and vote together in real time.</p>
        <button id="create" type="button">Create room</button>
      </div>
    `;
    this.querySelector("#create").addEventListener("click", () => this.createRoom());
  }

  createRoom() {
    const roomId = generateRoomId();
    const hostToken = crypto.randomUUID();
    localStorage.setItem(`poker-host-${roomId}`, hostToken);
    location.href = `/${roomId}`;
  }
}

customElements.define("home-screen", HomeScreen);
