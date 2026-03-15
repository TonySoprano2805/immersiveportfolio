export function createScene({ config }) {
  const appEl = document.getElementById("app");
  const railEl = document.getElementById("rail");
  const videoEl = document.getElementById("bg-video");
  const tapOverlayEl = document.getElementById("tap-overlay");
  const posterFallbackEl = document.querySelector("[data-poster-fallback]");

  const applyOverlayStrengths = () => {
    appEl.style.setProperty(
      "--overlay-top-opacity",
      String(config.OVERLAYS.topOpacity)
    );
    appEl.style.setProperty(
      "--overlay-vignette-opacity",
      String(config.OVERLAYS.vignetteOpacity)
    );
    appEl.style.setProperty(
      "--overlay-fog-opacity",
      String(config.OVERLAYS.fogOpacity)
    );
    appEl.style.setProperty(
      "--overlay-grain-opacity",
      String(config.OVERLAYS.grainOpacity)
    );
  };

  const setVideoReadyState = (ready) => {
    appEl.dataset.videoReady = ready ? "1" : "0";
  };

  const showPoster = (show) => {
    posterFallbackEl.classList.toggle("is-visible", show);
  };

  const showTapToStartIfNeeded = () => {
    tapOverlayEl.hidden = false;
    tapOverlayEl.classList.add("is-visible");
    showPoster(true);
    setVideoReadyState(false);
  };

  const hideTapToStart = () => {
    tapOverlayEl.classList.remove("is-visible");
    tapOverlayEl.hidden = true;
    showPoster(false);
  };

  const tryPlayVideo = async () => {
    try {
      const maybePromise = videoEl.play();
      if (maybePromise && typeof maybePromise.then === "function") {
        await maybePromise;
      }
      hideTapToStart();
      setVideoReadyState(true);
    } catch (error) {
      showTapToStartIfNeeded();
    }
  };

  tapOverlayEl.addEventListener("click", () => {
    tryPlayVideo();
  });

  videoEl.addEventListener("playing", () => {
    hideTapToStart();
    setVideoReadyState(true);
  });

  videoEl.addEventListener("pause", () => {
    if (document.visibilityState === "visible") {
      setVideoReadyState(false);
    }
  });

  videoEl.addEventListener("error", () => {
    showTapToStartIfNeeded();
  });

  const boot = () => {
    applyOverlayStrengths();
    tryPlayVideo();
  };

  const setVideoPlaybackRate = (rate) => {
    const safeRate = Number.isFinite(rate) ? Math.min(3, Math.max(0.1, rate)) : 1;
    videoEl.playbackRate = safeRate;
  };

  return {
    appEl,
    railEl,
    setVideoReadyState,
    setVideoPlaybackRate,
    showTapToStartIfNeeded,
    boot
  };
}
