/** After a selection, bring the detail card into view when it sits below the fold (it stacks under the map between 760px and 1100px). */
export function revealCard(el: HTMLElement | null) {
  if (!el || el.offsetParent === null) return;
  const r = el.getBoundingClientRect();
  if (r.top >= 0 && r.bottom <= window.innerHeight) return;
  if (r.top > 0 && r.top < window.innerHeight * 0.6) return;
  const off = document.documentElement.dataset.motion === "off" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ block: "nearest", behavior: off ? "auto" : "smooth" });
}
