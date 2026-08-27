/**
 * Audio feedback player using your custom audio asset (mixkit-fast-double-click-on-mouse-275.wav)
 * with instant Web Audio API fallback.
 */

let audioAsset = null;

if (typeof window !== 'undefined') {
  try {
    audioAsset = new Audio('/click-sound.wav');
    audioAsset.preload = 'auto';
    audioAsset.volume = 0.6;
  } catch (e) {
    console.warn('[Sound] Failed to preload audio asset:', e);
  }
}

export const playSelectSound = () => {
  try {
    if (audioAsset) {
      // Clone or reset time to allow rapid repeated clicks
      const soundInstance = audioAsset.cloneNode(true);
      soundInstance.volume = 0.6;
      const playPromise = soundInstance.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          playSynthesizedFallback();
        });
      }
    } else {
      playSynthesizedFallback();
    }
  } catch (err) {
    playSynthesizedFallback();
  }
};

const playSynthesizedFallback = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(960, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.045);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.045);
  } catch (err) {
    // Autoplay restrictions
  }
};
