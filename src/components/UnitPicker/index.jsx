import { useEffect } from "react";

export default function UnitPicker({
  open,
  castle,
  units = [],
  selectedUnit,
  onBack = () => {},
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
      <button className="modal-backdrop" type="button" aria-label="Close unit picker" onClick={onClose} />
      <section className="unit-picker" role="dialog" aria-modal="true" aria-labelledby="unit-picker-title">
        <header className="castle-picker-header">
          <div className="modal-actions">
            <button className="icon-button" type="button" onClick={onBack}>
              Back
            </button>
            <button className="icon-button" type="button" aria-label="Close unit picker" onClick={onClose}>
              x
            </button>
          </div>
        </header>

        <div className="unit-grid">
          {units.map((unit) => {
            const isSelected = selectedUnit?.name === unit.name;

            return (
              <button
                className={`unit-option ${isSelected ? "is-selected" : ""}`}
                key={unit.name}
                type="button"
                onClick={() => onSelect(unit)}
              >
                <img src={unit.portraitUrl} alt="" />
                <span>{unit.name}</span>
                <small>
                  Level {unit.levelDisplay} - {unit.health} HP
                </small>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
