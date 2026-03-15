import { clamp, damp, lerp, mapRange } from "./utils.js";

const PLACEHOLDER_PROJECTS = Array.from({ length: 24 }, (_, idx) => {
  const n = String(idx + 1).padStart(2, "0");
  return {
    id: `project-${n}`,
    title: `Project ${n}`,
    category: idx % 2 === 0 ? "Direction" : "Visual Design"
  };
});

function randomIn(min, max) {
  return min + Math.random() * (max - min);
}

function randomFromRange(range) {
  return randomIn(range.min, range.max);
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value >= edge1 ? 1 : 0;
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function getYBounds(config) {
  const bandLow = config.Y_CENTER - config.Y_RANGE;
  const bandHigh = config.Y_CENTER + config.Y_RANGE;

  // Negative Y is upward: Y_MAX acts as a strict sky cap.
  const yMin = Math.max(bandLow, config.Y_MAX);
  const yMax = Math.min(bandHigh, config.Y_MIN);

  if (yMin <= yMax) return [yMin, yMax];
  return [Math.min(config.Y_MAX, config.Y_MIN), Math.max(config.Y_MAX, config.Y_MIN)];
}

function getNearbyCards({ cards, z, ignoreId, config }) {
  const nearby = [];
  const maxDz = config.Z_SPACING * config.SPAWN_NEARBY_Z_MULTIPLIER;

  for (let i = 0; i < cards.length; i += 1) {
    const card = cards[i];
    if (card.id === ignoreId) continue;

    const dz = Math.abs(z - card.z);
    if (dz <= maxDz) {
      nearby.push({ card, dz });
    }
  }

  nearby.sort((a, b) => a.dz - b.dz);
  return nearby.slice(0, config.SPAWN_NEARBY_LIMIT).map((entry) => entry.card);
}

function pickSpawnPoint({ cards, config, z, ignoreId }) {
  const [yMin, yMax] = getYBounds(config);
  const nearbyCards = getNearbyCards({ cards, z, ignoreId, config });
  let bestCandidate = null;
  let bestDistance = -Infinity;

  for (let attempt = 0; attempt < config.SPAWN_ATTEMPTS; attempt += 1) {
    const candidate = {
      x: randomIn(-config.X_RANGE, config.X_RANGE),
      y: randomIn(yMin, yMax)
    };

    let minDistance = Infinity;

    for (let i = 0; i < nearbyCards.length; i += 1) {
      const other = nearbyCards[i];
      const distance = Math.hypot(candidate.x - other.x, candidate.y - other.y);
      minDistance = Math.min(minDistance, distance);
    }

    if (nearbyCards.length === 0 || minDistance >= config.MIN_CARD_DISTANCE) {
      return candidate;
    }

    if (minDistance > bestDistance) {
      bestDistance = minDistance;
      bestCandidate = candidate;
    }
  }

  return (
    bestCandidate || {
      x: randomIn(-config.X_RANGE, config.X_RANGE),
      y: randomIn(yMin, yMax)
    }
  );
}

function getDistanceOpacity(z, config) {
  const fadeIn = smoothstep(config.FADE_IN_START_Z, config.FADE_IN_END_Z, z);
  const fadeOut = 1 - smoothstep(config.FADE_OUT_START_Z, config.FADE_OUT_END_Z, z);
  return clamp(fadeIn * fadeOut, 0, 1);
}

function getDistanceBlur(z, config) {
  const blurT = smoothstep(config.BLUR_START_Z, config.BLUR_END_Z, z);
  return lerp(config.BLUR_FAR_PX, config.BLUR_NEAR_PX, blurT);
}

export function createGallery({ railEl, cardCount, config, interactions }) {
  const cards = [];
  const rangeZ = Math.max(1, config.Z_NEAR - config.Z_FAR_START);

  for (let i = 0; i < cardCount; i += 1) {
    const project = PLACEHOLDER_PROJECTS[i % PLACEHOLDER_PROJECTS.length];
    const cardId = `${project.id}-${i + 1}`;
    const cardEl = document.createElement("article");
    cardEl.className = "project-card";
    cardEl.dataset.id = cardId;

    const categoryEl = document.createElement("p");
    categoryEl.className = "project-category";
    categoryEl.textContent = project.category;

    const titleEl = document.createElement("h2");
    titleEl.className = "project-title";
    titleEl.textContent = project.title;

    cardEl.append(categoryEl, titleEl);
    railEl.appendChild(cardEl);

    const z = config.Z_FAR_START + i * config.Z_SPACING;
    const spawn = pickSpawnPoint({ cards, config, z, ignoreId: cardId });

    const card = {
      id: cardId,
      index: i,
      el: cardEl,
      x: spawn.x,
      y: spawn.y,
      z,
      phase: randomIn(0, Math.PI * 2),
      baseRotateX:
        config.CARD_BASE_ROTATE_X +
        randomIn(
          -config.CARD_PER_CARD_ROTATION_VARIATION,
          config.CARD_PER_CARD_ROTATION_VARIATION
        ) *
          0.35,
      baseRotateY:
        randomFromRange(config.CARD_BASE_ROTATION_Y_RANGE) +
        (spawn.x / config.X_RANGE) * config.CARD_PER_CARD_ROTATION_VARIATION,
      focusBlend: 0,
      hoverBlend: 0,
      hovered: false,
      frame: null
    };

    cardEl.addEventListener("click", (event) => {
      event.stopPropagation();
      interactions.setFocus(card.id);
    });
    cardEl.addEventListener("pointerenter", () => {
      card.hovered = true;
    });
    cardEl.addEventListener("pointerleave", () => {
      card.hovered = false;
    });

    cards.push(card);
  }

  const recycleCard = (card) => {
    card.z = config.Z_FAR_START;
    const spawn = pickSpawnPoint({
      cards,
      config,
      z: card.z,
      ignoreId: card.id
    });
    card.x = spawn.x;
    card.y = spawn.y;
    card.phase = randomIn(0, Math.PI * 2);
    card.baseRotateX =
      config.CARD_BASE_ROTATE_X +
      randomIn(
        -config.CARD_PER_CARD_ROTATION_VARIATION,
        config.CARD_PER_CARD_ROTATION_VARIATION
      ) *
        0.35;
    card.baseRotateY =
      randomFromRange(config.CARD_BASE_ROTATION_Y_RANGE) +
      (spawn.x / config.X_RANGE) * config.CARD_PER_CARD_ROTATION_VARIATION;
    card.hovered = false;
  };

  const update = ({
    t,
    dt,
    sharedBoost,
    runtime,
    focusId
  }) => {
    const driftSpeed =
      runtime.driftSpeed + sharedBoost * config.CARD_SPEED_BOOST_MULTIPLIER;
    let maxFocusBlend = 0;

    for (let i = 0; i < cards.length; i += 1) {
      const card = cards[i];
      const isFocusedCard = focusId === card.id;

      if (!isFocusedCard) {
        card.z += driftSpeed * dt;
      }

      const focusTarget = isFocusedCard ? 1 : 0;
      card.focusBlend = damp(card.focusBlend, focusTarget, config.FOCUS_EASE, dt);
      maxFocusBlend = Math.max(maxFocusBlend, card.focusBlend);
      card.hoverBlend = damp(
        card.hoverBlend,
        card.hovered ? 1 : 0,
        config.HOVER_OPACITY_EASE,
        dt
      );

      const distanceOpacity = isFocusedCard
        ? 1
        : getDistanceOpacity(card.z, config);
      const canRecycle =
        !isFocusedCard &&
        card.z > config.Z_RECYCLE_BEHIND &&
        distanceOpacity <= config.RECYCLE_OPACITY_THRESHOLD;
      if (canRecycle) {
        recycleCard(card);
      }

      const depthN = clamp((card.z - config.Z_FAR_START) / rangeZ, 0, 1);
      const bob =
        Math.sin(t * config.BOB_SPEED * Math.PI * 2 + card.phase) *
        config.BOB_AMPLITUDE_PX
        * runtime.bobMultiplier;

      const x = card.x;
      const y = card.y + bob;
      const scale = mapRange(
        depthN,
        0,
        1,
        config.CARD_STYLE.scaleFar,
        config.CARD_STYLE.scaleNear
      );
      const blurPx = isFocusedCard
        ? 0
        : getDistanceBlur(card.z, config) * runtime.blurMultiplier;
      const rotateY = card.baseRotateY;
      const rotateX = card.baseRotateX;
      const opacity = isFocusedCard
        ? 1
        : distanceOpacity * config.CARD_STYLE.baseOpacity;
      const hoverOpacityFactor = lerp(
        config.CARD_IDLE_OPACITY,
        config.CARD_HOVER_OPACITY,
        card.hoverBlend
      );

      card.frame = {
        driftX: x,
        driftY: y,
        driftZ: card.z,
        driftScale: scale,
        driftRotateY: rotateY,
        driftRotateX: rotateX,
        driftBlur: blurPx,
        baseOpacity: opacity,
        hoverOpacityFactor
      };
    }

    for (let i = 0; i < cards.length; i += 1) {
      const card = cards[i];
      const frame = card.frame;
      const blend = card.focusBlend;
      const hasFocus = Boolean(focusId);
      const isFocusedCard = focusId === card.id;

      const x = lerp(frame.driftX, 0, blend);
      const y = lerp(frame.driftY, config.FOCUS_Y, blend);
      const z = lerp(frame.driftZ, config.FOCUS_Z, blend);
      const rotateY = lerp(frame.driftRotateY, 0, blend);
      const rotateX = lerp(frame.driftRotateX, 0, blend);
      const scale = lerp(frame.driftScale, config.FOCUS_SCALE, blend);
      const blurPx = frame.driftBlur * (1 - blend);

      const dimOpacity =
        hasFocus && !isFocusedCard
          ? lerp(1, config.DIM_OTHER_OPACITY, maxFocusBlend)
          : 1;
      const opacityFactor = isFocusedCard
        ? config.CARD_HOVER_OPACITY
        : frame.hoverOpacityFactor;
      const opacity = clamp(
        frame.baseOpacity * opacityFactor * dimOpacity,
        0,
        1
      );

      card.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(
        2
      )}px, ${z.toFixed(2)}px) rotateY(${rotateY.toFixed(
        2
      )}deg) rotateX(${rotateX.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
      card.el.style.opacity = opacity.toFixed(3);
      card.el.style.filter = `blur(${blurPx.toFixed(2)}px)`;
    }
  };

  return { update, PLACEHOLDER_PROJECTS };
}
