export function createInteractions({ rootEl }) {
  let focusId = null;

  const setFocus = (cardId) => {
    focusId = cardId;
    rootEl.dataset.focusActive = cardId ? "1" : "0";
  };

  const clearFocus = () => {
    setFocus(null);
  };

  const getFocusId = () => focusId;

  rootEl.addEventListener("click", (event) => {
    if (event.target.closest(".project-card")) return;
    clearFocus();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      clearFocus();
    }
  });

  return {
    setFocus,
    clearFocus,
    getFocusId
  };
}
