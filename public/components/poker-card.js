import { escapeHtml } from "./util.js";

class PokerCard extends HTMLElement {
  static get observedAttributes() {
    return ["value", "selected", "small", "readonly"];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const value = this.getAttribute("value") ?? "";
    const tag = this.hasAttribute("readonly") ? "div" : "button";
    const typeAttr = tag === "button" ? ' type="button"' : "";
    this.innerHTML = `<${tag}${typeAttr} class="poker-card-btn">${escapeHtml(value)}</${tag}>`;

    const el = this.querySelector(".poker-card-btn");
    el.classList.toggle("selected", this.hasAttribute("selected"));
    el.classList.toggle("small", this.hasAttribute("small"));
  }
}

customElements.define("poker-card", PokerCard);
