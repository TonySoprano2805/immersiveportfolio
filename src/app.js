import { CONFIG } from "./config.js";
import { createGallery } from "./gallery.js";
import { createInputController } from "./input.js";
import { createInteractions } from "./interactions.js";
import { createScene } from "./scene.js";
import { damp, isMobile } from "./utils.js";

function cloneConfig(value) {
  return JSON.parse(JSON.stringify(value));
}

const mobile = isMobile();
const runtimeConfig = cloneConfig(CONFIG);
if (mobile) {
  runtimeConfig.CARD_COUNT = CONFIG.MOBILE.CARD_COUNT;
}

const scene = createScene({ config: runtimeConfig });
const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

const runtime = {
  driftSpeed: CONFIG.BASE_DRIFT_SPEED,
  blurMultiplier: 1,
  bobMultiplier: 1
};

if (mobile) {
  runtime.blurMultiplier *= CONFIG.MOBILE.blurMultiplier;
  runtime.bobMultiplier *= CONFIG.MOBILE.bobMultiplier;
}

if (reduceMotionQuery.matches) {
  runtime.driftSpeed *= CONFIG.REDUCED_MOTION.driftMultiplier;
  runtime.blurMultiplier *= CONFIG.REDUCED_MOTION.blurMultiplier;
  runtime.bobMultiplier *= CONFIG.REDUCED_MOTION.bobMultiplier;
}

const input = createInputController({ el: scene.appEl });
const interactions = createInteractions({ rootEl: scene.appEl });
const gallery = createGallery({
  railEl: scene.railEl,
  cardCount: runtimeConfig.CARD_COUNT,
  config: runtimeConfig,
  interactions
});

let t = 0;
let lastFrame = performance.now();
let scrollVelocity = 0;

function animate(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  t += dt;

  input.update(dt);
  const inputState = input.getState();

  scrollVelocity = damp(
    scrollVelocity,
    inputState.scrollVelocityTarget,
    runtimeConfig.SCROLL_DAMPING,
    dt
  );

  gallery.update({
    t,
    dt,
    scrollVelocity,
    runtime,
    focusId: interactions.getFocusId()
  });

  requestAnimationFrame(animate);
}

scene.boot();
requestAnimationFrame(animate);
