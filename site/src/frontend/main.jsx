import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "./styles/app.css";
import { Contact } from "./components/Contact";
import { Music } from "./components/Music";

function mount() {
  const contact = document.getElementById("contact-root");
  if (contact && !contact.dataset.mounted) {
    contact.dataset.mounted = "true";
    createRoot(contact).render(<Contact email={contact.dataset.email} github={contact.dataset.github}/>);
  }
  const music = document.getElementById("music-root");
  if (music && !music.dataset.mounted) {
    music.dataset.mounted = "true";
    createRoot(music).render(<Music compact={music.dataset.compact === "true"}/>);
  }
}
mount();
document.addEventListener("site-updated", mount);
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reduced && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add("revealed"); observer.unobserve(entry.target); } }), { threshold: .06 });
  document.querySelectorAll(".home-block, .home-history, #contact-root").forEach(node => { node.classList.add("reveal"); observer.observe(node); });
}
