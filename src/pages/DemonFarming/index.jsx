import { useMemo, useState } from "react";
import artifacts from "../../../data/artifacts.json";
import castles from "../../../data/castles.json";
import creatures from "../../../data/creatures.json";
import AmountStepper from "../../components/AmountStepper";
import CastlePicker from "../../components/CastlePicker";
import UnitPicker from "../../components/UnitPicker";
import { Link } from "../../router.jsx";
import { buildHealthArtifacts, calculateDemonFarming, isNonLivingCreature } from "./demonFarmingMath";

const healthArtifacts = buildHealthArtifacts(artifacts);

const demon = creatures.find((creature) => creature.name === "Demon");
const pitLord = creatures.find((creature) => creature.name === "Pit Lord");
const defaultCastle = castles.find((castle) => castle.name === "Inferno") || castles[0];

export default function DemonFarming() {
  const [pitLordsCount, setPitLordsCount] = useState(1);
  const [selectedCastle, setSelectedCastle] = useState(defaultCastle);
  const [isCastlePickerOpen, setCastlePickerOpen] = useState(false);
  const [isUnitPickerOpen, setUnitPickerOpen] = useState(false);
  const [selectedCreatureName, setSelectedCreatureName] = useState("");
  const [unitCount, setUnitCount] = useState(1);
  const [selectedArtifactIds, setSelectedArtifactIds] = useState([]);

  const filteredCreatures = useMemo(
    () =>
      creatures
        .filter((creature) => creature.town === selectedCastle?.name)
        .sort((a, b) => a.level - b.level || Number(a.upgraded) - Number(b.upgraded) || a.name.localeCompare(b.name)),
    [selectedCastle],
  );

  const selectedCreature = useMemo(() => {
    return (
      filteredCreatures.find((creature) => creature.name === selectedCreatureName) ||
      filteredCreatures[0] ||
      creatures[0]
    );
  }, [filteredCreatures, selectedCreatureName]);

  const result = useMemo(() => {
    return calculateDemonFarming({
      demonHealth: demon?.health || 1,
      healthArtifacts,
      pitLordsCount,
      selectedArtifactIds,
      selectedCreature,
      unitCount,
    });
  }, [pitLordsCount, selectedArtifactIds, selectedCreature, unitCount]);

  function handleCastleSelect(castle) {
    setSelectedCastle(castle);
    setSelectedCreatureName("");
    setCastlePickerOpen(false);
    setUnitPickerOpen(true);
  }

  function handleUnitSelect(unit) {
    setSelectedCreatureName(unit.name);
    setUnitPickerOpen(false);
  }

  function openUnitFlow() {
    setCastlePickerOpen(true);
    setUnitPickerOpen(false);
  }

  function closeUnitFlow() {
    setCastlePickerOpen(false);
    setUnitPickerOpen(false);
  }

  function toggleArtifact(id) {
    setSelectedArtifactIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <section className="page calculator-page">
      <div className="page-header">
        <div>
          <h1>Demon Farming</h1>
        </div>
        <Link className="nav-link" to="/">
          Back
        </Link>
      </div>

      <div className="calculator-layout">
        <section className="calculator-card">
          <div className="field">
          <fieldset className="artifact-picker">
            <legend>Health artifacts</legend>
            <div className="artifact-grid">
              {healthArtifacts.map((artifact) => {
                const selected = selectedArtifactIds.includes(artifact.id);

                return (
                  <button
                    className={`artifact-option ${selected ? "is-selected" : ""}`}
                    key={artifact.id}
                    aria-pressed={selected}
                    type="button"
                    onClick={() => toggleArtifact(artifact.id)}
                  >
                    <img src={artifact.iconUrl} alt="" />
                    <span>{artifact.name}</span>
                    <small>{artifact.effect}</small>
                  </button>
                );
              })}
            </div>
          </fieldset>
          </div>

          <div className="field">
            <AmountStepper
              iconUrl={pitLord?.portraitUrl}
              label="Pit Lords"
              value={pitLordsCount}
              onChange={setPitLordsCount}
            />
          </div>

          <div className="field">
            <span>Unit to convert</span>
            <button className="select-button selected-unit-button" type="button" onClick={openUnitFlow}>
              {selectedCreature?.portraitUrl && <img src={selectedCreature.portraitUrl} alt="" />}
              <span>
                <strong>{selectedCreature?.name || "Pick unit"}</strong>
                <small>
                  {selectedCastle?.name} - {selectedCreature?.health} HP
                </small>
              </span>
            </button>
            {isNonLivingCreature(selectedCreature) && <p className="warning-message">{result.warning}</p>}
          </div>

          <div className="field">
            <AmountStepper
              iconUrl={selectedCreature?.portraitUrl}
              label="Unit amount"
              value={unitCount}
              onChange={setUnitCount}
            />
          </div>
        </section>

        <section className="calculator-card result-card">
          <div className="demon-result">
            {demon?.portraitUrl && <img src={demon.portraitUrl} alt="" />}
            <div>
              <strong>{result.demons}</strong>
              <span>Demons raised</span>
            </div>
          </div>
        </section>
      </div>

      <CastlePicker
        castles={castles}
        open={isCastlePickerOpen}
        selectedCastle={selectedCastle}
        title="Pick castle for unit filter"
        onClose={closeUnitFlow}
        onSelect={handleCastleSelect}
      />
      <UnitPicker
        castle={selectedCastle}
        units={filteredCreatures}
        open={isUnitPickerOpen}
        selectedUnit={selectedCreature}
        onBack={() => {
          setUnitPickerOpen(false);
          setCastlePickerOpen(true);
        }}
        onClose={closeUnitFlow}
        onSelect={handleUnitSelect}
      />
    </section>
  );
}
