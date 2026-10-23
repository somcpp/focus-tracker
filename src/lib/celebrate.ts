import confetti from "canvas-confetti";

const PALETTE = ["#ff6b6b", "#ff9f43", "#f7c531", "#7bd389", "#2ec4b6", "#4d96ff", "#9b5de5", "#f15bb5"];

export function smallBurst(x = 0.5, y = 0.5) {
  confetti({ particleCount: 40, spread: 60, startVelocity: 28, origin: { x, y }, colors: PALETTE, scalar: 0.9 });
}

export function bigCelebration() {
  const end = Date.now() + 1200;
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors: PALETTE });
    confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors: PALETTE });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

/** Short two-note chime using WebAudio (no asset needed) */
export function chime() {
  try {
    const ctx = new AudioContext();
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  } catch {
    /* audio not available */
  }
}
