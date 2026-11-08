"use client";

import { useEffect } from "react";
import { splitText, type BionicLevel } from "@/lib/bionic";

// Focus reading: when switched on in Settings (<html data-bionic="subtle"> or "strong"), the first letters of each word inside
// elements marked data-focus-reading are wrapped in a bold span. Code, formulas, buttons and form fields are skipped.
// Turning it off puts the original text nodes back. Server-rendered text only: marked areas hold no live client state.

// Headings, labels, links' buttons and emphasis stay plain: only running text gets the bold starts, which keeps the page calm.
const SKIP =
  "pre, code, kbd, samp, svg, textarea, input, select, button, script, style, .katex, [contenteditable], [data-no-bionic], .bionic-lead, " +
  "h1, h2, h3, h4, h5, h6, strong, b, th, summary, nav, figcaption, label, dt";
const WRAP = "bionic-wrap";

function apply(root: Element, level: BionicLevel) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest(SKIP) || parent.closest(`.${WRAP}`)) return NodeFilter.FILTER_REJECT;
      return /\p{L}/u.test(node.nodeValue ?? "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    const wrap = document.createElement("span");
    wrap.className = WRAP;
    for (const piece of splitText(node.nodeValue ?? "", level)) {
      if (piece.bold) {
        const b = document.createElement("span");
        b.className = "bionic-lead";
        b.textContent = piece.text;
        wrap.append(b);
      } else {
        wrap.append(document.createTextNode(piece.text));
      }
    }
    node.replaceWith(wrap);
  }
}

function remove() {
  for (const wrap of document.querySelectorAll(`.${WRAP}`)) wrap.replaceWith(document.createTextNode(wrap.textContent ?? ""));
}

export function FocusReading() {
  useEffect(() => {
    const html = document.documentElement;
    let scheduled = 0;
    let applied: string | null = null; // the strength currently drawn

    const run = () => {
      scheduled = 0;
      observer.disconnect(); // do not react to our own changes
      const setting = html.getAttribute("data-bionic");
      if (setting !== applied) {
        remove(); // strength changed: start again from plain text
        applied = setting;
      }
      if (setting === "subtle" || setting === "strong") {
        for (const area of document.querySelectorAll("[data-focus-reading]")) apply(area, setting);
      }
      watch();
    };
    const schedule = () => {
      if (!scheduled) scheduled = window.setTimeout(run, 60);
    };
    const observer = new MutationObserver(schedule);
    const watch = () => {
      observer.observe(document.body, { childList: true, subtree: true });
      observer.observe(html, { attributes: true, attributeFilter: ["data-bionic"] });
    };

    run();
    return () => {
      observer.disconnect();
      window.clearTimeout(scheduled);
      remove();
    };
  }, []);

  return null;
}
