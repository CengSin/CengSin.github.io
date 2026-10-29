import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, X, EnvelopeSimple } from "@phosphor-icons/react";

export function Contact({ email, github }) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  return <section className="contact-section" id="contact" aria-labelledby="contact-title">
    <div><p className="contact-label">CONTACT</p><h2 id="contact-title">从一个问题开始。</h2></div>
    <motion.div className="contact-morph" animate={{ width: open ? "100%" : 72, height: open ? 88 : 72, borderRadius: open ? 44 : 36 }} transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}>
      <button type="button" className="contact-toggle" aria-label={open ? "收起联系方式" : "展开联系方式"} aria-expanded={open} aria-controls="contact-links" onClick={() => setOpen(!open)} onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}>
        {open ? <X size={24}/> : <ArrowUpRight size={28}/>}
      </button>
      <div id="contact-links" className="contact-links" hidden={!open}>
        <a href={`mailto:${email}`}><EnvelopeSimple size={18}/><span>{email}</span></a>
        <a href={github} target="_blank" rel="noopener noreferrer">GitHub <ArrowUpRight size={16}/></a>
      </div>
    </motion.div>
  </section>;
}
