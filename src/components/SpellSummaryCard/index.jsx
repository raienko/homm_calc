import { resolveAssetUrl } from "../../lib/assetUrl.js";

export default function SpellSummaryCard({ spell, damage, manaCost, onClick = () => {} }) {
  return (
    <button className="spell-summary-card" type="button" onClick={onClick}>
      <div className="spell-summary-primary">
        {spell?.iconUrl && <img src={resolveAssetUrl(spell.iconUrl)} alt="" />}
        <div>
          <strong>{spell?.name}</strong>
          <small>
            {spell?.school?.name} - Level {spell?.level}
          </small>
        </div>
      </div>

      <div className="spell-summary-secondary">
        <strong>
          <small className="spell-summary-value-label">Damage:</small>
          <span className="spell-summary-value">{damage}</span>
        </strong>
        <small>Mana cost: {manaCost}</small>
      </div>
    </button>
  );
}
