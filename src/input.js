import { CONFIG } from "./config.js";
import { clamp, damp } from "./utils.js";

export function createInputController({ el }) {
  const state = {
    mouseNX: 0,
    mouseNY: 0,
    scrollVelocityTarget: 0,
    isInteracting: false
  };

  let interactionWeight = 0;
  let touchLastY = 0;
  let touchActive = false;

  const markInteracting = () => {
    interactionWeight = 1;
  };

  const onWheel = (event) => {
    event.preventDefault();
    markInteracting();
    state.scrollVelocityTarget += event.deltaY * CONFIG.SCROLL_STRENGTH;
    state.scrollVelocityTarget = clamp(
      state.scrollVelocityTarget,
      -CONFIG.SCROLL_VELOCITY_CLAMP,
      CONFIG.SCROLL_VELOCITY_CLAMP
    );
  };

  const onTouchStart = (event) => {
    if (!event.touches.length) return;
    touchActive = true;
    touchLastY = event.touches[0].clientY;
    markInteracting();
  };

  const onTouchMove = (event) => {
    if (!touchActive || !event.touches.length) return;
    event.preventDefault();
    const y = event.touches[0].clientY;
    const dy = touchLastY - y;
    touchLastY = y;

    markInteracting();
    state.scrollVelocityTarget += dy * CONFIG.TOUCH_STRENGTH;
    state.scrollVelocityTarget = clamp(
      state.scrollVelocityTarget,
      -CONFIG.SCROLL_VELOCITY_CLAMP,
      CONFIG.SCROLL_VELOCITY_CLAMP
    );
  };

  const onTouchEnd = () => {
    touchActive = false;
  };

  el.addEventListener("wheel", onWheel, { passive: false });
  el.addEventListener("touchstart", onTouchStart, { passive: true });
  el.addEventListener("touchmove", onTouchMove, { passive: false });
  el.addEventListener("touchend", onTouchEnd, { passive: true });
  el.addEventListener("touchcancel", onTouchEnd, { passive: true });

  const update = (dt) => {
    state.scrollVelocityTarget = damp(
      state.scrollVelocityTarget,
      0,
      CONFIG.INPUT_RETURN_DAMPING,
      dt
    );

    interactionWeight = damp(
      interactionWeight,
      0,
      CONFIG.INTERACTION_FADE_DAMPING,
      dt
    );
    state.isInteracting = interactionWeight > 0.05;
  };

  const getState = () => state;

  return { update, getState };
}
