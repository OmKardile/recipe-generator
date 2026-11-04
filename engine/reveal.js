/**
 * Engine: reveal — declarative motion through data attributes.
 *   data-split="lines|words|chars"   masked text reveal, on scroll or on intro
 *   data-reveal="up|fade|clip|scale"  block reveal
 *   data-intro                        play with the page intro instead of on scroll
 *   data-delay="0.2"                  extra delay (seconds)
 *   data-parallax="0.12"              scrubbed vertical drift
 * Every effect is skipped under reduced motion; CSS keeps content visible without JS.
 * Only use data-split on text that never re-renders on the client.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ease, prefersReducedMotion } from "./env";

gsap.registerPlugin(ScrollTrigger, SplitText);

const durations = { lines: 1.1, words: 1.0, chars: 0.85 };
const staggers = { lines: 0.09, words: 0.04, chars: 0.02 };

function splitTween(el, isIntro) {
  const type = el.dataset.split || "lines";
  const delay = parseFloat(el.dataset.delay || "0");
  const s = { tween: undefined, done: false, requested: false };
  SplitText.create(el, {
    type: type === "lines" ? "lines" : `lines,${type}`,
    mask: "lines",
    autoSplit: true,
    linesClass: "split-line",
    onSplit(self) {
      gsap.set(el, { visibility: "visible" });
      if (s.done) return;
      const targets =
        type === "lines" ? self.lines : type === "words" ? self.words : self.chars;
      s.tween = gsap.from(targets, {
        yPercent: 110,
        rotate: type === "chars" ? 0 : 1.5,
        duration: durations[type],
        stagger: staggers[type],
        ease: ease.out,
        delay,
        paused: isIntro && !s.requested,
        onComplete: () => {
          s.done = true;
        },
        scrollTrigger: isIntro ? undefined : { trigger: el, start: "top 88%", once: true },
      });
      return s.tween;
    },
  });
  return () => {
    s.requested = true;
    s.tween?.play();
  };
}

function blockTween(el, paused) {
  const kind = el.dataset.reveal || "up";
  const delay = parseFloat(el.dataset.delay || "0");
  const from =
    kind === "fade"
      ? { autoAlpha: 0 }
      : kind === "clip"
        ? { clipPath: "inset(100% 0% 0% 0%)", autoAlpha: 1 }
        : kind === "scale"
          ? { scale: 1.12, clipPath: "inset(10% 10% 10% 10%)", autoAlpha: 1 }
          : { y: 44, autoAlpha: 0 };
  const to =
    kind === "clip" || kind === "scale"
      ? { clipPath: "inset(0% 0% 0% 0%)", scale: 1 }
      : {};
  gsap.set(el, { visibility: "visible" });
  return gsap.fromTo(el, from, {
    ...to,
    y: 0,
    autoAlpha: 1,
    duration: kind === "fade" ? 0.9 : 1.15,
    ease: ease.out,
    delay,
    paused,
    scrollTrigger: paused ? undefined : { trigger: el, start: "top 90%", once: true },
  });
}

/** Wire every reveal inside `root`. Returns the paused intro timeline. */
export function initReveals(root = document) {
  const intro = gsap.timeline({ paused: true });
  if (prefersReducedMotion()) return intro;

  root.querySelectorAll("[data-split]").forEach((el) => {
    const isIntro = el.hasAttribute("data-intro");
    const play = splitTween(el, isIntro);
    if (isIntro) intro.add(play, 0);
  });
  root.querySelectorAll("[data-reveal]").forEach((el) => {
    const isIntro = el.hasAttribute("data-intro");
    const t = blockTween(el, isIntro);
    if (isIntro) intro.add(() => t.play(), 0);
  });
  root.querySelectorAll("[data-parallax]").forEach((el) => {
    const amount = parseFloat(el.dataset.parallax || "0.12");
    gsap.fromTo(
      el,
      { yPercent: -amount * 100 },
      {
        yPercent: amount * 100,
        ease: "none",
        scrollTrigger: {
          trigger: el.parentElement || el,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      }
    );
  });
  return intro;
}
