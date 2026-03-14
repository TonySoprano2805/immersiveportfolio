export const CONFIG = {
  // Card pool and geometric footprint
  CARD_COUNT: 14,
  CARD_SIZE: {
    width: 340,
    height: 440
  },

  // Depth flow (camera moves forward through cards)
  Z_FAR_START: -3600,
  Z_NEAR: 220,
  Z_RECYCLE_BEHIND: 760,
  Z_SPACING: 250,

  // Distance-based opacity: fade in from far, fade out only after passing camera
  FADE_IN_START_Z: -3600,
  FADE_IN_END_Z: -2300,
  FADE_OUT_START_Z: 290,
  FADE_OUT_END_Z: 720,
  RECYCLE_OPACITY_THRESHOLD: 0.02,

  // Horizon composition (screen-space Y; negative is upward)
  Y_CENTER: -24,
  Y_RANGE: 108,
  Y_MAX: -96,
  Y_MIN: 128,

  // Horizontal spread and spawn de-clustering
  X_RANGE: 700,
  MIN_CARD_DISTANCE: 270,
  SPAWN_ATTEMPTS: 28,
  SPAWN_NEARBY_LIMIT: 8,
  SPAWN_NEARBY_Z_MULTIPLIER: 2.8,

  // Depth-of-field feel
  BLUR_FAR_PX: 4.2,
  BLUR_NEAR_PX: 0,
  BLUR_START_Z: -3400,
  BLUR_END_Z: -900,

  // Base travel and input response
  BASE_DRIFT_SPEED: 88,
  SCROLL_STRENGTH: 0.18,
  TOUCH_STRENGTH: 1.15,
  SCROLL_VELOCITY_CLAMP: 290,
  SCROLL_DAMPING: 6.5,
  INPUT_RETURN_DAMPING: 3.8,
  INTERACTION_FADE_DAMPING: 8.5,

  // Rail parallax
  PARALLAX: {
    rotateY: 0,
    rotateX: 0,
    offsetX: 0,
    offsetY: 0,
    damping: 7.5
  },

  // Per-card motion
  CARD_MOTION: {
    mouseOffsetX: 0,
    mouseOffsetY: 0
  },
  MOUSE_ROTATION_INFLUENCE: 0,
  MOUSE_POSITION_PARALLAX_X: 0,
  MOUSE_POSITION_PARALLAX_Y: 0,
  CARD_BASE_ROTATE_X: -1.8,
  CARD_BASE_ROTATION_Y_RANGE: {
    min: -4.5,
    max: 4.5
  },
  CARD_PER_CARD_ROTATION_VARIATION: 1.1,
  BOB_AMPLITUDE_PX: 1.2,
  BOB_SPEED: 0.14,

  // Card visual depth response
  CARD_STYLE: {
    scaleFar: 0.72,
    scaleNear: 1.06,
    baseOpacity: 0.98
  },
  CARD_IDLE_OPACITY: 0.62,
  CARD_HOVER_OPACITY: 1,
  HOVER_OPACITY_EASE: 10.5,

  // Focus interaction
  FOCUS_Z: 180,
  FOCUS_SCALE: 1.14,
  FOCUS_Y: -10,
  DIM_OTHER_OPACITY: 0.34,
  FOCUS_EASE: 9.8,

  // Video overlays (subtle)
  OVERLAYS: {
    topOpacity: 0.12,
    vignetteOpacity: 0.4,
    fogOpacity: 0.3,
    grainOpacity: 0.16
  },

  // Runtime reductions for constrained devices
  MOBILE: {
    CARD_COUNT: 10,
    parallaxMultiplier: 0.38,
    blurMultiplier: 0.28,
    bobMultiplier: 0.55
  },
  REDUCED_MOTION: {
    driftMultiplier: 0.48,
    parallaxMultiplier: 0.16,
    blurMultiplier: 0.12,
    bobMultiplier: 0.2
  }
};
