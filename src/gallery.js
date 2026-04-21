import { clamp, damp, lerp, mapRange } from "./utils.js";

const THUMBNAIL_GROUPS = {
  genesis: [
    "/assets/projects/floating thumbnails/genesisthumb.png",
    "/assets/projects/floating thumbnails/genesisthumb2.png",
    "/assets/projects/floating thumbnails/genesisthumb3.png",
    "/assets/projects/floating thumbnails/genesisthumb4.png"
  ],
  brand: [
    "/assets/projects/floating thumbnails/brandthumb1.jpg",
    "/assets/projects/floating thumbnails/brandthumb2.jpeg",
    "/assets/projects/floating thumbnails/brandthumb3.jpeg",
    "/assets/projects/floating thumbnails/brandthumb4.jpeg"
  ],
  showcase: [
    "/assets/projects/floating thumbnails/eventthumb1.png",
    "/assets/projects/floating thumbnails/eventthumb2.png"
  ],
  pants: [
    "/assets/projects/floating thumbnails/pantsthumb1.png",
    "/assets/projects/floating thumbnails/pantsthumb2.JPG"
  ]
};

const PROJECT_DEFINITIONS = [
  {
    key: "showcase",
    title: "6PM Film Showcase",
    category: "Direction",
    href: "/projects/film-showcase.html",
    thumbnails: THUMBNAIL_GROUPS.showcase
  },
  {
    key: "genesis",
    title: "Genesis",
    category: "Direction",
    href: "/projects/film.html",
    thumbnails: THUMBNAIL_GROUPS.genesis
  },
  {
    key: "brand",
    title: "OUR FRIEND",
    category: "Visual Design",
    href: "/projects/brand.html",
    thumbnails: THUMBNAIL_GROUPS.brand
  },
  {
    key: "pants",
    title: "PANTS",
    category: "Visual Design",
    href: "/projects/pants.html",
    thumbnails: THUMBNAIL_GROUPS.pants
  }
];

const CLUSTER_SIZE = 3;

const PROJECT_LAYERS = [
  { x: -0.9, y: -0.14, z: -760 },
  { x: 0.02, y: -0.04, z: -1260 },
  { x: 0.9, y: -0.12, z: -1760 },
  { x: 0.08, y: 0.18, z: -2260 }
];

const CLUSTER_SLOT_OFFSETS = [
  { x: -198, y: -58, z: -84, scale: 0.98 },
  { x: 0, y: 28, z: 0, scale: 1.06 },
  { x: 202, y: -42, z: 78, scale: 0.96 }
];

function buildFloatingItems(cardCount) {
  const baseItems = [];
  const projectCount = PROJECT_DEFINITIONS.length;
  for (let projectIndex = 0; projectIndex < projectCount; projectIndex += 1) {
    const project = PROJECT_DEFINITIONS[projectIndex];
    const slotCount = Math.max(1, Math.min(CLUSTER_SIZE, project.thumbnails.length));
    for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
      const thumbIndex = slotIndex;
      const thumbSrc = project.thumbnails[thumbIndex];

      baseItems.push({
        baseId: `${project.key}-cluster-slot-${slotIndex + 1}`,
        projectKey: project.key,
        projectIndex,
        layerIndex: projectIndex,
        slotCount,
        slotIndex,
        title: project.title,
        category: project.category,
        href: project.href,
        thumbnailSrc: thumbSrc
      });
    }
  }

  return baseItems.slice(0, Math.max(CLUSTER_SIZE, Math.min(cardCount, baseItems.length)));
}

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

function getClusterAnchor(layerIndex) {
  return (
    PROJECT_LAYERS[layerIndex] || {
      x: 0,
      y: 0,
      z: -1100
    }
  );
}

function getSlotOffset(slotIndex) {
  return CLUSTER_SLOT_OFFSETS[slotIndex] || CLUSTER_SLOT_OFFSETS[1];
}

function getSlotOffsetForCount(slotIndex, slotCount) {
  if (slotCount <= 1) {
    return CLUSTER_SLOT_OFFSETS[1];
  }
  if (slotCount === 2) {
    return slotIndex === 0
      ? { x: -158, y: -36, z: -56, scale: 1 }
      : { x: 162, y: -12, z: 54, scale: 1 };
  }
  return getSlotOffset(slotIndex);
}

function getFrontSlotIndex(slotCount) {
  return Math.max(0, slotCount - 1);
}

function getLayerThumbnails(layerIndex) {
  const project = PROJECT_DEFINITIONS[layerIndex];
  if (!project || !Array.isArray(project.thumbnails) || !project.thumbnails.length) {
    return [];
  }
  return project.thumbnails;
}

function getThumbnailForSlot({ layerIndex, slotIndex, orderOffset }) {
  const thumbnails = getLayerThumbnails(layerIndex);
  if (!thumbnails.length) return "";
  const thumbIndex = (slotIndex + orderOffset) % thumbnails.length;
  return thumbnails[thumbIndex];
}

function getClusterBaseZ({ layerIndex }) {
  const anchor = getClusterAnchor(layerIndex);
  return anchor.z + randomIn(-18, 18);
}

function pickSpawnPoint({
  cards,
  config,
  z,
  ignoreId,
  projectKey,
  layerIndex,
  slotIndex,
  slotCount
}) {
  const [yMin, yMax] = getYBounds(config);
  const nearbyCards = getNearbyCards({ cards, z, ignoreId, config });
  let bestCandidate = null;
  let bestDistance = -Infinity;

  const anchor = getClusterAnchor(layerIndex);
  const slotOffset = getSlotOffsetForCount(slotIndex, slotCount);

  const anchorX = clamp(
    anchor.x * config.X_RANGE,
    -config.X_RANGE * 0.99,
    config.X_RANGE * 0.99
  );
  const anchorY = config.Y_CENTER + anchor.y * config.Y_RANGE * 2.1;

  const localXSpread = 18;
  const localYSpread = 16;

  for (let attempt = 0; attempt < config.SPAWN_ATTEMPTS; attempt += 1) {
    const candidate = {
      x: clamp(
        anchorX + slotOffset.x + randomIn(-localXSpread, localXSpread),
        -config.X_RANGE,
        config.X_RANGE
      ),
      y: clamp(
        anchorY + slotOffset.y + randomIn(-localYSpread, localYSpread),
        yMin,
        yMax
      )
    };

    let minDistance = Infinity;

    for (let i = 0; i < nearbyCards.length; i += 1) {
      const other = nearbyCards[i];
      const distance = Math.hypot(candidate.x - other.x, candidate.y - other.y);
      const sameCluster = other.projectKey === projectKey && other.layerIndex === layerIndex;
      const requiredDistance = config.MIN_CARD_DISTANCE * (
        sameCluster ? 0.58 : other.projectKey === projectKey ? 0.82 : 1.1
      );
      minDistance = Math.min(minDistance, distance - requiredDistance);
    }

    if (nearbyCards.length === 0 || minDistance >= 0) {
      return candidate;
    }

    if (minDistance > bestDistance) {
      bestDistance = minDistance;
      bestCandidate = candidate;
    }
  }

  return (
    bestCandidate || {
      x: clamp(
        anchorX + slotOffset.x + randomIn(-localXSpread, localXSpread),
        -config.X_RANGE,
        config.X_RANGE
      ),
      y: clamp(
        anchorY + slotOffset.y + randomIn(-localYSpread, localYSpread),
        yMin,
        yMax
      )
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
  const floatingItems = buildFloatingItems(cardCount);
  const rangeZ = Math.max(1, config.Z_NEAR - config.Z_FAR_START);
  const layerStateByIndex = new Map();

  for (let i = 0; i < floatingItems.length; i += 1) {
    const item = floatingItems[i];
    const cardId = `${item.id}-${i + 1}`;
    const cardEl = document.createElement("article");
    cardEl.className = "project-card";
    cardEl.dataset.id = cardId;

    if (!layerStateByIndex.has(item.layerIndex)) {
      layerStateByIndex.set(item.layerIndex, {
        hoverCount: 0,
        hoverBlend: 0,
        orderOffset: 0
      });
    }

    const mediaEl = document.createElement("div");
    mediaEl.className = "project-media";

    const imageEl = document.createElement("img");
    imageEl.className = "project-image";
    const layerState = layerStateByIndex.get(item.layerIndex);
    imageEl.src = getThumbnailForSlot({
      layerIndex: item.layerIndex,
      slotIndex: item.slotIndex,
      orderOffset: layerState ? layerState.orderOffset : 0
    }) || item.thumbnailSrc;
    imageEl.alt = `${item.title} thumbnail`;
    imageEl.loading = "lazy";
    imageEl.decoding = "async";

    mediaEl.appendChild(imageEl);

    const metaEl = document.createElement("div");
    metaEl.className = "project-meta";

    const categoryEl = document.createElement("p");
    categoryEl.className = "project-category";
    categoryEl.textContent = item.category;

    const titleEl = document.createElement("h2");
    titleEl.className = "project-title";
    titleEl.textContent = item.title;

    metaEl.append(categoryEl, titleEl);

    if (item.href) {
      const openLinkEl = document.createElement("a");
      openLinkEl.className = "project-open-link";
      openLinkEl.href = item.href;
      openLinkEl.textContent = "Open project";
      openLinkEl.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      metaEl.appendChild(openLinkEl);
    }

    mediaEl.appendChild(metaEl);
    cardEl.appendChild(mediaEl);
    railEl.appendChild(cardEl);

    const slotOffsetForCount = getSlotOffsetForCount(item.slotIndex, item.slotCount);
    const clusterBaseZ = getClusterBaseZ({
      layerIndex: item.layerIndex
    });
    const z = clusterBaseZ + slotOffsetForCount.z;
    const spawn = pickSpawnPoint({
      cards,
      config,
      z,
      ignoreId: cardId,
      projectKey: item.projectKey,
      layerIndex: item.layerIndex,
      slotIndex: item.slotIndex,
      slotCount: item.slotCount
    });

    const card = {
      id: cardId,
      index: i,
      el: cardEl,
      projectKey: item.projectKey,
      projectIndex: item.projectIndex,
      layerIndex: item.layerIndex,
      slotIndex: item.slotIndex,
      slotCount: item.slotCount,
      slotScale: slotOffsetForCount.scale,
      imageEl,
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
    mediaEl.addEventListener("pointerenter", () => {
      card.hovered = true;
      const layerState = layerStateByIndex.get(card.layerIndex);
      if (layerState) {
        layerState.hoverCount += 1;
      }
    });
    mediaEl.addEventListener("pointerleave", () => {
      card.hovered = false;
      const layerState = layerStateByIndex.get(card.layerIndex);
      if (layerState) {
        layerState.hoverCount = Math.max(0, layerState.hoverCount - 1);
      }
    });

    cards.push(card);
  }

  const recycleCard = (card) => {
    const layerState = layerStateByIndex.get(card.layerIndex);
    const thumbnails = getLayerThumbnails(card.layerIndex);
    if (layerState && thumbnails.length && card.slotIndex === getFrontSlotIndex(card.slotCount)) {
      layerState.orderOffset = (layerState.orderOffset + 1) % thumbnails.length;
    }
    const orderOffset = layerState ? layerState.orderOffset : 0;
    const nextThumbSrc = getThumbnailForSlot({
      layerIndex: card.layerIndex,
      slotIndex: card.slotIndex,
      orderOffset
    });
    if (nextThumbSrc) {
      card.imageEl.src = nextThumbSrc;
    }

    const slotOffset = getSlotOffsetForCount(card.slotIndex, card.slotCount);
    const clusterBaseZ = getClusterBaseZ({
      layerIndex: card.layerIndex
    });
    card.z = clusterBaseZ + slotOffset.z;
    const spawn = pickSpawnPoint({
      cards,
      config,
      z: card.z,
      ignoreId: card.id,
      projectKey: card.projectKey,
      layerIndex: card.layerIndex,
      slotIndex: card.slotIndex,
      slotCount: card.slotCount
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
    layerStateByIndex.forEach((layerState) => {
      const target = layerState.hoverCount > 0 ? 1 : 0;
      layerState.hoverBlend = damp(
        layerState.hoverBlend,
        target,
        config.HOVER_OPACITY_EASE,
        dt
      );
    });

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
        config.BOB_AMPLITUDE_PX *
        runtime.bobMultiplier;

      const x = card.x;
      const y = card.y + bob;
      const scale = mapRange(
        depthN,
        0,
        1,
        config.CARD_STYLE.scaleFar,
        config.CARD_STYLE.scaleNear
      ) * card.slotScale;
      const blurPx = isFocusedCard
        ? 0
        : getDistanceBlur(card.z, config) * runtime.blurMultiplier;
      const rotateY = card.baseRotateY;
      const rotateX = card.baseRotateX;
      const depthOpacityBlend = smoothstep(-2200, -820, card.z);
      const depthOpacityFactor = isFocusedCard
        ? 1
        : lerp(0.72, 1, depthOpacityBlend);
      const opacity = isFocusedCard ? 1 : distanceOpacity;
      const hoverOpacityFactor = lerp(
        1,
        1,
        card.hoverBlend
      );
      const layerState = layerStateByIndex.get(card.layerIndex);
      const clusterHoverBlend = layerState ? layerState.hoverBlend : 0;

      card.frame = {
        driftX: x,
        driftY: y,
        driftZ: card.z,
        driftScale: scale,
        driftRotateY: rotateY,
        driftRotateX: rotateX,
        driftBlur: blurPx,
        baseOpacity: opacity,
        hoverOpacityFactor,
        depthOpacityFactor,
        clusterHoverBlend
      };
    }

    for (let i = 0; i < cards.length; i += 1) {
      const card = cards[i];
      const frame = card.frame;
      const blend = card.focusBlend;
      const hasFocus = Boolean(focusId);
      const isFocusedCard = focusId === card.id;
      card.el.dataset.focused = isFocusedCard ? "1" : "0";

      const x = lerp(frame.driftX, 0, blend);
      const y = lerp(frame.driftY, config.FOCUS_Y, blend);
      const z = lerp(frame.driftZ, config.FOCUS_Z, blend);
      const rotateY = lerp(frame.driftRotateY, 0, blend);
      const rotateX = lerp(frame.driftRotateX, 0, blend);
      const clusterScaleBoost = lerp(1, 1.055, frame.clusterHoverBlend);
      const clusterZBoost = lerp(0, 56, frame.clusterHoverBlend);
      const scale = lerp(frame.driftScale * clusterScaleBoost, config.FOCUS_SCALE, blend);
      const blurPx = frame.driftBlur * (1 - blend);
      const zWithHover = z + clusterZBoost * (1 - blend);

      const dimOpacity =
        hasFocus && !isFocusedCard
          ? lerp(1, config.DIM_OTHER_OPACITY, maxFocusBlend)
          : 1;
      const opacityFactor = isFocusedCard
        ? config.CARD_HOVER_OPACITY
        : frame.hoverOpacityFactor;
      const opacity = clamp(
        frame.baseOpacity * frame.depthOpacityFactor * opacityFactor * dimOpacity,
        0,
        1
      );

      card.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(
        2
      )}px, ${zWithHover.toFixed(2)}px) rotateY(${rotateY.toFixed(
        2
      )}deg) rotateX(${rotateX.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
      card.el.style.opacity = opacity.toFixed(3);
      card.el.style.filter = `blur(${blurPx.toFixed(2)}px)`;
    }
  };

  return { update, PROJECT_DEFINITIONS };
}
