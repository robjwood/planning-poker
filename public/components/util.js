export const DECK = ["1", "2", "3", "5", "8", "13", "20", "?"];

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

export function generateRoomId() {
  return Array.from({ length: 3 }, () => Math.random().toString(36).slice(2, 6)).join("-");
}
