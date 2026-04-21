import { useEffect } from "react";

function getCastleIcon(castle) {
  return castle.portraitUrl || castle.villagePortraitUrl;
}

export default function CastlePicker({
  castles = [],
  open,
  selectedCastle,
  title = "Pick castle",
  description = "Choose a castle first. The next step can filter heroes, units, or other items by that castle.",
  onClose = () => {},
  onSelect = () => {},
}) {
  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-shell" role="presentation">
      <button className="modal-backdrop" type="button" aria-label="Close castle picker" onClick={onClose} />
      <section className="castle-picker" role="dialog" aria-modal="true" aria-labelledby="castle-picker-title">
        <header className="castle-picker-header">
          <div>
            <h2 id="castle-picker-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button className="icon-button" type="button" aria-label="Close castle picker" onClick={onClose}>
            x
          </button>
        </header>

        <div className="castle-grid">
          {castles.map((castle) => {
            const isSelected = selectedCastle?.name === castle.name;

            return (
              <button
                className={`castle-option ${isSelected ? "is-selected" : ""}`}
                key={castle.name}
                type="button"
                onClick={() => onSelect(castle)}
              >
                <img src={getCastleIcon(castle)} alt="" />
                <span>{castle.name}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
