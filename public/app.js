import "./components/home-screen.js";
import "./components/room-screen.js";

const app = document.getElementById("app");
const path = location.pathname.replace(/^\/+|\/+$/g, "");

if (!path) {
  app.appendChild(document.createElement("home-screen"));
} else {
  const roomScreen = document.createElement("room-screen");
  roomScreen.setAttribute("room-id", path);
  app.appendChild(roomScreen);
}
