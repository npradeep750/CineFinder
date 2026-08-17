/**
 * Premium micro-interactions powered by anime.js.
 *
 * These are imperative DOM effects — attach them to elements via refs/effects
 * from React. Each `attach*` function returns a detach function for cleanup.
 */
import { animate, stagger } from "animejs";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type TiltOpts = {
  /** Degrees of rotation per edge (half-range). Default 8. */
  intensity?: number;
  /** Hover scale. Default 1.02. */
  scale?: number;
};

/**
 * 3D perspective tilt that follows the cursor. Also updates --gx/--gy CSS
 * custom properties so an optional `.card-glare` overlay tracks the pointer.
 * The release back to flat uses a springy anime.js ease.
 */
export function attachTilt(el: HTMLElement, opts: TiltOpts = {}) {
  if (prefersReducedMotion()) return () => {};
  const intensity = opts.intensity ?? 8;
  const scale = opts.scale ?? 1.02;

  let raf = 0;
  let active = false;
  let targetRX = 0;
  let targetRY = 0;
  let currentRX = 0;
  let currentRY = 0;

  const onMove = (e: MouseEvent) => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    targetRY = (px - 0.5) * intensity * 2;
    targetRX = (0.5 - py) * intensity * 2;
    el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
    if (!active) {
      active = true;
      raf = requestAnimationFrame(loop);
    }
  };

  const loop = () => {
    currentRX += (targetRX - currentRX) * 0.14;
    currentRY += (targetRY - currentRY) * 0.14;
    el.style.transform = `perspective(900px) rotateX(${currentRX.toFixed(2)}deg) rotateY(${currentRY.toFixed(2)}deg) scale(${scale})`;
    raf = requestAnimationFrame(loop);
  };

  const onLeave = () => {
    active = false;
    cancelAnimationFrame(raf);
    animate(el, {
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      perspective: 900,
      duration: 700,
      ease: "outElastic",
    });
  };

  el.addEventListener("mousemove", onMove);
  el.addEventListener("mouseleave", onLeave);

  return () => {
    active = false;
    cancelAnimationFrame(raf);
    el.removeEventListener("mousemove", onMove);
    el.removeEventListener("mouseleave", onLeave);
  };
}

/**
 * Magnetic hover: the element is gently attracted to the cursor and springs
 * back to its resting spot on leave.
 */
export function attachMagnetic(el: HTMLElement, strength = 0.3) {
  if (prefersReducedMotion()) return () => {};
  const onMove = (e: MouseEvent) => {
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    animate(el, {
      translateX: dx * strength,
      translateY: dy * strength,
      duration: 240,
      ease: "out",
    });
  };

  const onLeave = () => {
    animate(el, {
      translateX: 0,
      translateY: 0,
      duration: 550,
      ease: "outElastic",
    });
  };

  el.addEventListener("mousemove", onMove);
  el.addEventListener("mouseleave", onLeave);

  return () => {
    el.removeEventListener("mousemove", onMove);
    el.removeEventListener("mouseleave", onLeave);
  };
}

/**
 * Expanding ring that radiates from the click point inside an element.
 * The element should be positioned (relative) so the ring clips inside it.
 */
export function attachRipple(el: HTMLElement, color = "rgba(255,255,255,0.4)") {
  if (prefersReducedMotion()) return () => {};
  if (getComputedStyle(el).position === "static") {
    el.style.position = "relative";
  }

  const onDown = (e: MouseEvent) => {
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const size = Math.max(r.width, r.height) * 2.2;
    const ring = document.createElement("div");
    ring.style.cssText = `position:absolute;left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;border-radius:9999px;border:1.5px solid ${color};pointer-events:none;`;
    el.appendChild(ring);
    animate(ring, {
      scale: [0.15, 1],
      opacity: [0.9, 0],
      duration: 650,
      ease: "outExpo",
      onComplete: () => ring.remove(),
    });
  };

  el.addEventListener("pointerdown", onDown);
  return () => el.removeEventListener("pointerdown", onDown);
}

// Force every word to its final, fully-visible state (used on complete and
// as a safety net in case the animation ever stalls).
function forceVisible(targets: HTMLElement[]) {
  targets.forEach((t) => {
    t.style.opacity = "1";
    t.style.transform = "none";
  });
}

/**
 * Staggered word-reveal for headlines. Each word (and any child element, e.g.
 * an <em> highlight) is wrapped in an overflow-hidden span and rises into
 * place with a fade. Uses px offsets (measured from the element) rather than
 * percentage transforms, and guarantees the final state is visible via
 * onComplete plus a safety timeout — so the headline can never get stuck
 * invisible. Mutates the element's DOM, so call it on a node React will not
 * re-render (e.g. inside a memoized component).
 */
export function revealWords(el: HTMLElement, start = 120) {
  if (prefersReducedMotion()) return null;
  if (el.dataset.revealed) return null;
  el.dataset.revealed = "1";

  const originalHTML = el.innerHTML;
  const offset = el.offsetHeight || 40; // px to drop words below the clip

  type Fragment = { text: string; clone?: HTMLElement };
  const fragments: Fragment[] = [];
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      (node.textContent || "")
        .split(/\s+/)
        .filter(Boolean)
        .forEach((word) => fragments.push({ text: word }));
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      fragments.push({
        text: (node as HTMLElement).textContent || "",
        clone: node as HTMLElement,
      });
    }
  });

  const targets: HTMLElement[] = [];
  try {
    el.textContent = "";
    fragments.forEach((frag) => {
      const wrap = document.createElement("span");
      // The mask needs a little padding so descenders and the handwritten
      // chalk swashes (e.g. the tail of "n" in Caveat) aren't clipped by
      // overflow:hidden. Matching negative margins keep the layout unchanged.
      wrap.style.cssText =
        "display:inline-block;overflow:hidden;vertical-align:bottom;" +
        "padding:0.12em 0.2em 0.34em 0.08em;" +
        "margin:-0.12em -0.2em -0.34em -0.08em;";

      let inner: HTMLElement;
      if (frag.clone) {
        inner = frag.clone.cloneNode(true) as HTMLElement;
        inner.style.display = "inline-block";
      } else {
        inner = document.createElement("span");
        inner.style.display = "inline-block";
        inner.textContent = frag.text;
      }
      inner.style.opacity = "0";
      inner.style.transform = `translateY(${offset}px)`;
      wrap.appendChild(inner);
      el.appendChild(wrap);
      el.appendChild(document.createTextNode("\u00A0"));
      targets.push(inner);
    });

    const anim = animate(targets, {
      translateY: { from: offset, to: 0 },
      opacity: { from: 0, to: 1 },
      duration: 800,
      delay: stagger(55, { start }),
      ease: "outExpo",
      onComplete: () => forceVisible(targets),
    });

    // Safety net: even if the animation stalls, reveal the words so the
    // headline is never left invisible.
    const totalDelay = start + (targets.length - 1) * 55 + 800 + 250;
    window.setTimeout(() => forceVisible(targets), totalDelay);
    return anim;
  } catch (e) {
    el.innerHTML = originalHTML;
    return null;
  }
}

/**
 * Small celebratory particle burst at a viewport position — used as a premium
 * "saved!" cue. Particles are cleaned up automatically.
 */
export function sparkleBurst(
  x: number,
  y: number,
  color = "#fbbf24",
  count = 12,
) {
  if (prefersReducedMotion()) return;
  for (let i = 0; i < count; i++) {
    const dot = document.createElement("div");
    const size = 4 + Math.random() * 4;
    dot.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${size}px;height:${size}px;border-radius:9999px;background:${color};box-shadow:0 0 8px ${color};pointer-events:none;z-index:9999;`;
    document.body.appendChild(dot);

    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
    const dist = 38 + Math.random() * 48;

    animate(dot, {
      translateX: Math.cos(angle) * dist,
      translateY: Math.sin(angle) * dist - 26,
      opacity: [1, 0],
      scale: [1, 0.1],
      duration: 700 + Math.random() * 350,
      ease: "outExpo",
      onComplete: () => dot.remove(),
    });
  }
}
