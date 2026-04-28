import { useMemo, useState } from "react";
import artifacts from "../../../data/artifacts.json";
import castles from "../../../data/castles.json";
import creatures from "../../../data/creatures.json";
import skills from "../../../data/skills.json";
import spells from "../../../data/spells.json";
import AmountStepper from "../../components/AmountStepper";
import CastlePicker from "../../components/CastlePicker";
import UnitPicker from "../../components/UnitPicker";
import { Link } from "../../router.jsx";
import { applyHealthArtifacts, buildHealthArtifacts } from "../DemonFarming/demonFarmingMath";

const ARMY_SLOT_COUNT = 7;
const SKILL_SLOT_COUNT = 5;
const ARTIFACT_SLOT_COUNT = 5;
const MAGIC_SCHOOLS = ["Air", "Earth", "Fire", "Water"];
const OFFENDER_SKILL_NAMES = ["Sorcery", "Air Magic", "Earth Magic", "Fire Magic", "Water Magic"];
const DEFENDER_SKILL_NAMES = ["Resistance"];
const POWER_SKILL_ICON_URL = "https://heroes.thelazy.net/images/e/e0/Power_skill.png";
const PROTECTION_SPELL_NAMES = ["Anti-Magic", "Protection from Air", "Protection from Earth", "Protection from Fire", "Protection from Water"];
const healthArtifacts = buildHealthArtifacts(artifacts);
const secondarySkills = skills;
const offenderSecondarySkills = secondarySkills.filter((skill) => OFFENDER_SKILL_NAMES.includes(skill.name));
const defenderSecondarySkills = secondarySkills.filter((skill) => DEFENDER_SKILL_NAMES.includes(skill.name));
const damageSpells = spells
  .filter((spell) => spell.category === "Combat Damage Spells")
  .sort((left, right) => left.level - right.level || left.name.localeCompare(right.name));
const protectionSpells = spells
  .filter((spell) => PROTECTION_SPELL_NAMES.includes(spell.name))
  .sort((left, right) => PROTECTION_SPELL_NAMES.indexOf(left.name) - PROTECTION_SPELL_NAMES.indexOf(right.name));

const damageArtifacts = artifacts
  .filter((artifact) => /\+50% (Air|Earth|Fire|Water) spell damage/.test(artifact.effect || "") || /Negate creatures' spell immunity/i.test(artifact.effect || ""))
  .map((artifact) => ({
    id: artifact.pageUrl || artifact.name,
    name: artifact.name,
    iconUrl: artifact.iconUrl,
    school: (artifact.effect.match(/\+50% (Air|Earth|Fire|Water) spell damage/) || [])[1] || "",
    effect: artifact.effect || "",
  }));

const damageArtifactIds = new Set(damageArtifacts.map((artifact) => artifact.id));
const orbOfVulnerability = damageArtifacts.find((artifact) => artifact.name === "Orb of Vulnerability");

const resistanceArtifacts = artifacts
  .filter((artifact) => /Magic Resistance/i.test(artifact.effect || ""))
  .map((artifact) => ({
    id: artifact.pageUrl || artifact.name,
    name: artifact.name,
    iconUrl: artifact.iconUrl,
    chance: Number((artifact.effect.match(/\+(\d+)% Magic Resistance/) || [])[1] || 0) / 100,
    effect: artifact.effect || "",
  }));

const resistanceArtifactIds = new Set(resistanceArtifacts.map((artifact) => artifact.id));
const healthArtifactIds = new Set(healthArtifacts.map((artifact) => artifact.id));
const spellImmunityArtifacts = artifacts
  .filter((artifact) => /Immune to (.+)/.test(artifact.effect || ""))
  .map((artifact) => ({
    id: artifact.pageUrl || artifact.name,
    name: artifact.name,
    iconUrl: artifact.iconUrl,
    effect: artifact.effect || "",
  }));
const spellImmunityArtifactIds = new Set(spellImmunityArtifacts.map((artifact) => artifact.id));

const neutralCreature = creatures.find((creature) => creature.town === "Neutral");
const castleOptions = [
  ...castles,
  {
    name: "Neutral",
    portraitUrl: neutralCreature?.portraitUrl,
  },
];

const schoolLevels = [
  { id: "none", label: "None", value: 0 },
  { id: "basic", label: "Basic", value: 0 },
  { id: "advanced", label: "Advanced", value: 1 },
  { id: "expert", label: "Expert", value: 2 },
];

const sorceryLevels = [
  { id: "none", label: "No Sorcery", bonus: 0 },
  { id: "basic", label: "Basic Sorcery", bonus: 0.05 },
  { id: "advanced", label: "Advanced Sorcery", bonus: 0.1 },
  { id: "expert", label: "Expert Sorcery", bonus: 0.15 },
];

const resistanceLevels = [
  { id: "none", label: "No Resistance", chance: 0 },
  { id: "basic", label: "Basic Resistance", chance: 0.05 },
  { id: "advanced", label: "Advanced Resistance", chance: 0.1 },
  { id: "expert", label: "Expert Resistance", chance: 0.2 },
];

const skillLevels = [
  { id: "basic", label: "Basic", short: "B" },
  { id: "advanced", label: "Advanced", short: "A" },
  { id: "expert", label: "Expert", short: "E" },
];

const protectionLevels = [
  { id: "none", label: "None", reduction: 0, short: "-" },
  { id: "minor", label: "30%", reduction: 0.3, short: "30" },
  { id: "major", label: "50%", reduction: 0.5, short: "50" },
  { id: "max", label: "75%", reduction: 0.75, short: "75" },
];

const antiMagicLevels = [
  { id: "none", label: "Off", short: "-", level: 0 },
  { id: "basic", label: "L1-3", short: "3", level: 3 },
  { id: "advanced", label: "L1-4", short: "4", level: 4 },
  { id: "expert", label: "L1-5", short: "5", level: 5 },
];

let nextStackId = 1;
let nextSkillSlotId = 1;
let nextArtifactSlotId = 1;
let nextProtectionSlotId = 1;

function createEmptyArmy(side) {
  return Array.from({ length: ARMY_SLOT_COUNT }, () => ({
    id: `${side}-${nextStackId++}`,
    castleName: "",
    creatureName: "",
  }));
}

function createSkillSlots(side, presets = []) {
  return Array.from({ length: SKILL_SLOT_COUNT }, (_, index) => ({
    id: `${side}-skill-${nextSkillSlotId++}`,
    skillName: presets[index]?.skillName || "",
    levelId: presets[index]?.levelId || "",
  }));
}

function createArtifactSlots(side, presets = []) {
  return Array.from({ length: ARTIFACT_SLOT_COUNT }, (_, index) => ({
    id: `${side}-artifact-${nextArtifactSlotId++}`,
    artifactId: presets[index]?.artifactId || "",
  }));
}

function createProtectionSlots(side, presets = []) {
  return Array.from({ length: SKILL_SLOT_COUNT }, (_, index) => ({
    id: `${side}-protection-${nextProtectionSlotId++}`,
    spellName: presets[index]?.spellName || "",
    levelId: presets[index]?.levelId || "",
  }));
}

function getCreaturesForCastle(castleName) {
  return creatures
    .filter((creature) => creature.town === castleName)
    .sort((left, right) => left.level - right.level || Number(left.upgraded) - Number(right.upgraded) || left.name.localeCompare(right.name));
}

function getSpellTierValue(spell, masteryValue) {
  const equation = spell?.damage?.equation || "";
  const match = equation.match(/(\d+)\/(\d+)\/(\d+)\s+\+\s+\(power × (\d+)\)/);

  if (!match) {
    return { base: 0, perPower: 0 };
  }

  const [, first, second, third, perPower] = match;
  const tiers = [Number(first), Number(second), Number(third)];
  const tierIndex = Math.max(0, Math.min(2, masteryValue));

  return {
    base: tiers[tierIndex],
    perPower: Number(perPower),
  };
}

function getSpellDamage({ spell, power, schoolMasteryId, sorceryId, damageArtifactId }) {
  if (!spell) {
    return 0;
  }

  const mastery = schoolLevels.find((level) => level.id === schoolMasteryId) || schoolLevels[0];
  const sorcery = sorceryLevels.find((level) => level.id === sorceryId) || sorceryLevels[0];
  const spellTier = getSpellTierValue(spell, mastery.value);
  const orb = damageArtifacts.find((artifact) => artifact.id === damageArtifactId);
  const orbMultiplier = orb && orb.school === spell.school?.name ? 1.5 : 1;

  return Math.floor((spellTier.base + power * spellTier.perPower) * (1 + sorcery.bonus) * orbMultiplier);
}

function cycleOption(currentId, options) {
  const currentIndex = Math.max(
    0,
    options.findIndex((option) => option.id === currentId),
  );

  return options[(currentIndex + 1) % options.length]?.id || options[0]?.id;
}

function getImmunityArtifactsForSpell(spell) {
  const spellName = spell?.name || "";
  return artifacts
    .filter((artifact) => (artifact.effect || "").includes(`Immune to ${spellName}`))
    .map((artifact) => ({
      id: artifact.pageUrl || artifact.name,
      name: artifact.name,
      iconUrl: artifact.iconUrl,
    }));
}

function getStackCreature(stack) {
  if (!stack?.creatureName) {
    return null;
  }

  return creatures.find((creature) => creature.name === stack.creatureName && creature.town === stack.castleName) || creatures.find((creature) => creature.name === stack.creatureName);
}

function getCreatureSpellMitigation(creature, spell, ignoreImmunity = false) {
  if (!creature || !spell) {
    return { immune: false, multiplier: 1, badge: "" };
  }

  const special = creature.special || "";
  const specialLower = special.toLowerCase();
  const spellNameLower = spell.name.toLowerCase();
  const spellLevel = Number(spell.level || 0);

  if (!ignoreImmunity && specialLower.includes("magic immunity")) {
    return { immune: true, multiplier: 0, badge: "Immune" };
  }

  const tier3Immune = /1-3 lvl spells immunity/i.test(special);
  if (!ignoreImmunity && tier3Immune && spellLevel <= 3) {
    return { immune: true, multiplier: 0, badge: "Immune" };
  }

  const tier4Immune = /1-4 lvl spells immunity/i.test(special);
  if (!ignoreImmunity && tier4Immune && spellLevel <= 4) {
    return { immune: true, multiplier: 0, badge: "Immune" };
  }

  const immuneSegments = Array.from(special.matchAll(/Immune to ([^.]+)/gi)).map((match) => match[1].toLowerCase());
  if (!ignoreImmunity && immuneSegments.some((segment) => segment.includes(spellNameLower))) {
    return { immune: true, multiplier: 0, badge: "Immune" };
  }

  const spellResistanceMatch = special.match(/Spell damage resistance\s*\(?\+?(\d+)%\)?/i);
  if (spellResistanceMatch) {
    const reduction = Number(spellResistanceMatch[1]) / 100;
    return {
      immune: false,
      multiplier: Math.max(0, 1 - reduction),
      badge: `Resists ${Math.round(reduction * 100)}%`,
    };
  }

  return { immune: false, multiplier: 1, badge: "" };
}

function calculateMaxKills(damage, health) {
  if (health <= 0) {
    return 0;
  }

  return Math.max(0, Math.floor(damage / health));
}

function formatDamage(value) {
  return Number.isInteger(value) ? value : value.toFixed(1);
}

function spellHitsOwnArmy(spell) {
  return spell?.name === "Armageddon";
}

function getSkillByName(skillName) {
  return skills.find((skill) => skill.name === skillName) || null;
}

function getArtifactById(artifactId, artifactOptions) {
  return artifactOptions.find((artifact) => artifact.id === artifactId) || null;
}

function getHighestSkillLevelId(slots, skillName) {
  const ranked = slots
    .filter((slot) => slot.skillName === skillName && slot.levelId)
    .map((slot) => skillLevels.findIndex((level) => level.id === slot.levelId))
    .filter((index) => index >= 0)
    .sort((left, right) => right - left);

  return ranked.length > 0 ? skillLevels[ranked[0]].id : "none";
}

function getHighestProtectionLevelId(slots, spellName, levels = skillLevels) {
  const ranked = slots
    .filter((slot) => slot.spellName === spellName && slot.levelId)
    .map((slot) => levels.findIndex((level) => level.id === slot.levelId))
    .filter((index) => index >= 0)
    .sort((left, right) => right - left);

  return ranked.length > 0 ? levels[ranked[0]].id : "none";
}

function ArmyRow({ label, stacks, onPickUnit, onClearSlot }) {
  return (
    <div className="army-row-field">
      <span>{label}</span>
      <div className="army-slot-row">
        {stacks.map((stack, index) => {
          const creature = getStackCreature(stack);
          const isFilled = Boolean(creature);

          return (
            <div className={`army-slot ${isFilled ? "is-filled" : ""}`} key={stack.id}>
              <button className="army-slot-button" type="button" onClick={() => onPickUnit(stack.id)}>
                {creature?.portraitUrl ? <img src={creature.portraitUrl} alt="" /> : <span className="army-slot-plus">+</span>}
                <span>{creature?.name || `Slot ${index + 1}`}</span>
              </button>
              {isFilled && (
                <button className="army-slot-clear" type="button" aria-label={`Clear ${creature.name}`} onClick={() => onClearSlot(stack.id)}>
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SecondarySkillRow({ label, slots, onPickSlot, onClearSlot }) {
  return (
    <div className="army-row-field">
      <span>{label}</span>
      <div className="secondary-skill-slot-row">
        {slots.map((slot, index) => {
          const skill = getSkillByName(slot.skillName);
          const level = skillLevels.find((entry) => entry.id === slot.levelId) || null;
          const iconUrl = level && skill ? skill.iconUrls[level.id] : "";
          const isFilled = Boolean(skill && level);

          return (
            <div className={`secondary-skill-slot ${isFilled ? "is-filled" : ""}`} key={slot.id}>
              <button className="secondary-skill-slot-button" type="button" onClick={() => onPickSlot(slot.id)}>
                {iconUrl ? <img src={iconUrl} alt="" /> : <span className="army-slot-plus">+</span>}
                <span>{skill?.name || `Skill ${index + 1}`}</span>
                <small>{level?.label || "Pick level"}</small>
              </button>
              {isFilled && (
                <button className="army-slot-clear" type="button" aria-label={`Clear ${skill.name}`} onClick={() => onClearSlot(slot.id)}>
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ArtifactSlotRow({ label, slots, artifactOptions, onPickSlot, onClearSlot }) {
  return (
    <div className="army-row-field">
      <span>{label}</span>
      <div className="secondary-skill-slot-row">
        {slots.map((slot, index) => {
          const artifact = getArtifactById(slot.artifactId, artifactOptions);
          const isFilled = Boolean(artifact);

          return (
            <div className={`secondary-skill-slot ${isFilled ? "is-filled" : ""}`} key={slot.id}>
              <button className="secondary-skill-slot-button" type="button" onClick={() => onPickSlot(slot.id)}>
                {artifact?.iconUrl ? <img src={artifact.iconUrl} alt="" /> : <span className="army-slot-plus">+</span>}
                <span>{artifact?.name || `Artifact ${index + 1}`}</span>
                <small>{artifact?.effect || "Pick artifact"}</small>
              </button>
              {isFilled && (
                <button className="army-slot-clear" type="button" aria-label={`Clear ${artifact.name}`} onClick={() => onClearSlot(slot.id)}>
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProtectionSpellRow({ label, slots, onPickSlot, onClearSlot, className = "" }) {
  return (
    <div className={`army-row-field ${className}`.trim()}>
      <span>{label}</span>
      <div className="secondary-skill-slot-row">
        {slots.map((slot, index) => {
          const spell = protectionSpells.find((entry) => entry.name === slot.spellName) || null;
          const level = skillLevels.find((entry) => entry.id === slot.levelId) || null;
          const isFilled = Boolean(spell && level);

          return (
            <div className={`secondary-skill-slot ${isFilled ? "is-filled" : ""}`} key={slot.id}>
              <button className="secondary-skill-slot-button" type="button" onClick={() => onPickSlot(slot.id)}>
                {spell?.iconUrl ? <img src={spell.iconUrl} alt="" /> : <span className="army-slot-plus">+</span>}
                <span>{spell?.name || `Spell ${index + 1}`}</span>
                <small>{level?.label || "Pick level"}</small>
              </button>
              {isFilled && (
                <button className="army-slot-clear" type="button" aria-label={`Clear ${spell.name}`} onClick={() => onClearSlot(slot.id)}>
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompactStateRow({ label, slots, onCycle }) {
  return (
    <div className="army-row-field">
      <span>{label}</span>
      <div className="skill-slot-row">
        {slots.map((slot) => (
          <button className={`skill-slot ${slot.active ? "is-active" : ""}`} key={slot.id} type="button" onClick={() => onCycle(slot.id)}>
            <strong>{slot.valueShort}</strong>
            <span>{slot.label}</span>
            <small>{slot.valueLabel}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultList({ entries, title, emptyText }) {
  const visibleEntries = entries.filter((entry) => entry.creature);

  if (visibleEntries.length === 0) {
    return null;
  }

  return (
    <section className="result-group">
      <h3>{title}</h3>
      <div className="result-chip-list">
        {visibleEntries.map((entry) => (
          <article className="result-chip" key={entry.stack.id}>
            {entry.creature?.portraitUrl && <img src={entry.creature.portraitUrl} alt="" />}
            <div>
              <strong>{entry.creature?.name}</strong>
              <span>x{entry.kills}</span>
              {entry.badge && <small className="result-chip-badge">{entry.badge}</small>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SkillPickerModal({ open, onClose, onClear, onSelect, selectedSlot, availableSkills }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-shell" role="dialog" aria-modal="true">
      <button className="modal-backdrop" type="button" aria-label="Close" onClick={onClose} />
      <section className="skill-picker">
        <div className="castle-picker-header">
          <div>
            <h2>Pick skill</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="skill-picker-grid">
          {availableSkills.map((skill) => (
            skillLevels.map((level) => {
              const selected = selectedSlot?.skillName === skill.name && selectedSlot?.levelId === level.id;

              return (
                <button
                  className={`skill-picker-cell ${selected ? "is-selected" : ""}`}
                  key={`${skill.name}-${level.id}`}
                  type="button"
                  title={`${level.label} ${skill.name}`}
                  aria-label={`${level.label} ${skill.name}`}
                  onClick={() => onSelect(skill.name, level.id)}
                >
                  {skill.iconUrls[level.id] && <img src={skill.iconUrls[level.id]} alt="" />}
                </button>
              );
            })
          ))}
        </div>
      </section>
    </div>
  );
}

function SpellPickerModal({ open, spells, selectedSpellName, onClose, onSelect }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-shell" role="dialog" aria-modal="true">
      <button className="modal-backdrop" type="button" aria-label="Close" onClick={onClose} />
      <section className="spell-picker">
        <div className="castle-picker-header">
          <div>
            <h2>Pick spell</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="spell-picker-list">
          {spells.length === 0 ? (
            <p className="result-empty">No matching spells.</p>
          ) : (
            spells.map((spell) => {
              const selected = spell.name === selectedSpellName;

              return (
                <button
                  className={`spell-picker-option ${selected ? "is-selected" : ""}`}
                  key={spell.name}
                  type="button"
                  onClick={() => onSelect(spell.name)}
                >
                  {spell.iconUrl && <img src={spell.iconUrl} alt="" />}
                  <span>
                    <strong>{spell.name}</strong>
                    <small>
                      {spell.school?.name} - Level {spell.level}
                    </small>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function ArtifactPickerModal({ open, onClose, onClear, onSelect, selectedSlot, availableArtifacts, title }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-shell" role="dialog" aria-modal="true">
      <button className="modal-backdrop" type="button" aria-label="Close" onClick={onClose} />
      <section className="spell-picker">
        <div className="castle-picker-header">
          <div>
            <h2>{title}</h2>
          </div>
          <div className="skill-picker-actions">
            {selectedSlot?.artifactId && <button className="icon-button" type="button" onClick={onClear}>×</button>}
            <button className="icon-button" type="button" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <div className="artifact-picker-grid">
          {availableArtifacts.map((artifact) => {
            const selected = selectedSlot?.artifactId === artifact.id;

            return (
              <button
                className={`artifact-picker-card ${selected ? "is-selected" : ""}`}
                key={artifact.id}
                type="button"
                title={artifact.name}
                aria-label={artifact.name}
                onClick={() => onSelect(artifact.id)}
              >
                <img src={artifact.iconUrl} alt="" />
                <span>{artifact.name}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ProtectionPickerModal({ open, onClose, onClear, onSelect, selectedSlot }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-shell" role="dialog" aria-modal="true">
      <button className="modal-backdrop" type="button" aria-label="Close" onClick={onClose} />
      <section className="skill-picker">
        <div className="castle-picker-header">
          <div>
            <h2>Pick protection</h2>
          </div>
          <div className="skill-picker-actions">
            {selectedSlot?.spellName && <button className="icon-button" type="button" onClick={onClear}>×</button>}
            <button className="icon-button" type="button" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <div className="skill-picker-grid">
          {protectionSpells.map((spell) => (
            skillLevels.map((level) => {
              const selected = selectedSlot?.spellName === spell.name && selectedSlot?.levelId === level.id;

              return (
                <button
                  className={`skill-picker-cell ${selected ? "is-selected" : ""}`}
                  key={`${spell.name}-${level.id}`}
                  type="button"
                  title={`${level.label} ${spell.name}`}
                  aria-label={`${level.label} ${spell.name}`}
                  onClick={() => onSelect(spell.name, level.id)}
                >
                  {spell.iconUrl && <img src={spell.iconUrl} alt="" />}
                </button>
              );
            })
          ))}
        </div>
      </section>
    </div>
  );
}

export default function SpellDamage() {
  const [selectedSpellName, setSelectedSpellName] = useState("Armageddon");
  const [isSpellPickerOpen, setSpellPickerOpen] = useState(false);
  const [power, setPower] = useState(10);
  const [offenderArtifactSlots, setOffenderArtifactSlots] = useState(() => createArtifactSlots("offender"));

  const [offenderSkills, setOffenderSkills] = useState(() => createSkillSlots("offender"));
  const [defenderSkills, setDefenderSkills] = useState(() => createSkillSlots("defender"));
  const [defenderArtifactSlots, setDefenderArtifactSlots] = useState(() => createArtifactSlots("defender"));
  const [defenderProtectionSlots, setDefenderProtectionSlots] = useState(() => createProtectionSlots("defender"));

  const [offenderStacks, setOffenderStacks] = useState(() => createEmptyArmy("offender"));
  const [defenderStacks, setDefenderStacks] = useState(() => createEmptyArmy("defender"));
  const [pickerState, setPickerState] = useState(null);
  const [skillPickerState, setSkillPickerState] = useState(null);
  const [artifactPickerState, setArtifactPickerState] = useState(null);
  const [protectionPickerState, setProtectionPickerState] = useState(null);

  const filteredDamageSpells = damageSpells;
  const selectedSpell = damageSpells.find((spell) => spell.name === selectedSpellName) || damageSpells[0];
  const spellSchoolName = selectedSpell?.school?.name;
  const schoolSkillName = MAGIC_SCHOOLS.includes(spellSchoolName) ? `${spellSchoolName} Magic` : "";
  const schoolMasteryId = schoolSkillName ? getHighestSkillLevelId(offenderSkills, schoolSkillName) : "none";
  const sorceryId = getHighestSkillLevelId(offenderSkills, "Sorcery");
  const resistanceLevelId = getHighestSkillLevelId(defenderSkills, "Resistance");
  const immunityArtifacts = useMemo(() => getImmunityArtifactsForSpell(selectedSpell), [selectedSpell]);
  const selectedProtectionSpellName = spellSchoolName && MAGIC_SCHOOLS.includes(spellSchoolName) ? `Protection from ${spellSchoolName}` : "";
  const selectedProtectionLevelId = selectedProtectionSpellName ? getHighestProtectionLevelId(defenderProtectionSlots, selectedProtectionSpellName) : "none";
  const selectedProtection = protectionLevels.find((level) => {
    if (selectedProtectionLevelId === "basic") {
      return level.id === "minor";
    }
    if (selectedProtectionLevelId === "advanced") {
      return level.id === "major";
    }
    if (selectedProtectionLevelId === "expert") {
      return level.id === "max";
    }
    return level.id === "none";
  }) || protectionLevels[0];
  const selectedResistance = resistanceLevels.find((level) => level.id === resistanceLevelId) || resistanceLevels[0];
  const antiMagicLevelId = getHighestProtectionLevelId(defenderProtectionSlots, "Anti-Magic");
  const selectedAntiMagic = antiMagicLevels.find((level) => level.id === antiMagicLevelId) || antiMagicLevels[0];
  const offenderArtifactIds = offenderArtifactSlots.map((slot) => slot.artifactId).filter(Boolean);
  const defenderArtifactIds = defenderArtifactSlots.map((slot) => slot.artifactId).filter(Boolean);
  const damageArtifactId = damageArtifacts.find((artifact) => offenderArtifactIds.includes(artifact.id) && artifact.school === selectedSpell?.school?.name)?.id || "";
  const defenderHealthArtifactIds = defenderArtifactIds.filter((artifactId) => healthArtifactIds.has(artifactId));
  const defenderResistanceArtifactIds = defenderArtifactIds.filter((artifactId) => resistanceArtifactIds.has(artifactId));
  const defenderImmunityArtifactIds = defenderArtifactIds.filter((artifactId) => spellImmunityArtifactIds.has(artifactId));
  const ignoresCreatureSpellImmunity = Boolean(orbOfVulnerability && offenderArtifactIds.includes(orbOfVulnerability.id));
  const baseDamage = getSpellDamage({
    spell: selectedSpell,
    power,
    schoolMasteryId,
    sorceryId,
    damageArtifactId,
  });

  const totalResistanceChance = Math.min(
    0.9,
    selectedResistance.chance +
      resistanceArtifacts
        .filter((artifact) => defenderResistanceArtifactIds.includes(artifact.id))
        .reduce((total, artifact) => total + artifact.chance, 0),
  );

  const ownArmyAffected = spellHitsOwnArmy(selectedSpell);

  const offenderResults = offenderStacks.map((stack) => {
    const creature = getStackCreature(stack);
    const mitigation = getCreatureSpellMitigation(creature, selectedSpell, ignoresCreatureSpellImmunity);
    const effectiveDamage = creature && ownArmyAffected ? baseDamage * mitigation.multiplier : 0;
    const kills = creature && ownArmyAffected && !mitigation.immune ? calculateMaxKills(effectiveDamage, creature.health || 0) : 0;

    return {
      stack,
      creature,
      kills,
      badge: mitigation.badge,
    };
  });

  const defenderResults = defenderStacks.map((stack) => {
    const creature = getStackCreature(stack);
    const effectiveHealth = applyHealthArtifacts(creature?.health || 0, defenderHealthArtifactIds, healthArtifacts);
    const hasImmunityArtifact = immunityArtifacts.some((artifact) => defenderImmunityArtifactIds.includes(artifact.id));
    const creatureMitigation = getCreatureSpellMitigation(creature, selectedSpell, ignoresCreatureSpellImmunity);
    const isFullyProtected = (selectedSpell.level || 0) <= selectedAntiMagic.level || hasImmunityArtifact || creatureMitigation.immune;
    const afterProtection = isFullyProtected ? 0 : baseDamage * (1 - selectedProtection.reduction);
    const effectiveDamage = afterProtection * (1 - totalResistanceChance) * creatureMitigation.multiplier;
    const badge = hasImmunityArtifact ? "Immune" : isFullyProtected ? "Immune" : creatureMitigation.badge;

    return {
      stack,
      creature,
      kills: creature ? calculateMaxKills(effectiveDamage, effectiveHealth.health) : 0,
      badge,
    };
  });

  const pickerCastle = useMemo(() => {
    if (!pickerState) {
      return null;
    }

    return castleOptions.find((castle) => castle.name === pickerState.castleName) || null;
  }, [pickerState]);

  const pickerUnits = useMemo(() => {
    if (!pickerState) {
      return [];
    }

    return getCreaturesForCastle(pickerState.castleName);
  }, [pickerState]);

  const selectedSkillSlots = skillPickerState?.side === "offender" ? offenderSkills : defenderSkills;
  const selectedSkillSlot = skillPickerState ? selectedSkillSlots.find((slot) => slot.id === skillPickerState.slotId) || null : null;
  const availableSkillChoices = skillPickerState?.side === "offender" ? offenderSecondarySkills : defenderSecondarySkills;
  const defenderArtifactOptions = useMemo(() => {
    const seen = new Set();
    return [...healthArtifacts, ...resistanceArtifacts, ...immunityArtifacts].filter((artifact) => {
      if (seen.has(artifact.id)) {
        return false;
      }
      seen.add(artifact.id);
      return true;
    });
  }, [immunityArtifacts]);
  const availableArtifactChoices = artifactPickerState?.side === "offender" ? damageArtifacts : defenderArtifactOptions;
  const selectedArtifactSlots = artifactPickerState?.side === "offender" ? offenderArtifactSlots : defenderArtifactSlots;
  const selectedArtifactSlot = artifactPickerState ? selectedArtifactSlots.find((slot) => slot.id === artifactPickerState.slotId) || null : null;
  const selectedProtectionSlot = protectionPickerState ? defenderProtectionSlots.find((slot) => slot.id === protectionPickerState.slotId) || null : null;

  function updateStacks(side, updater) {
    const setState = side === "offender" ? setOffenderStacks : setDefenderStacks;
    setState((current) => updater(current));
  }

  function updateSkillSlots(side, updater) {
    const setState = side === "offender" ? setOffenderSkills : setDefenderSkills;
    setState((current) => updater(current));
  }

  function updateArtifactSlots(side, updater) {
    const setState = side === "offender" ? setOffenderArtifactSlots : setDefenderArtifactSlots;
    setState((current) => updater(current));
  }

  function updateProtectionSlots(updater) {
    setDefenderProtectionSlots((current) => updater(current));
  }

  function openPicker(side, stackId) {
    const stacks = side === "offender" ? offenderStacks : defenderStacks;
    const stack = stacks.find((item) => item.id === stackId);

    setPickerState({
      side,
      stackId,
      stage: "castle",
      castleName: stack?.castleName || "Inferno",
    });
  }

  function closePicker() {
    setPickerState(null);
  }

  function openSkillPicker(side, slotId) {
    setSkillPickerState({ side, slotId });
  }

  function closeSkillPicker() {
    setSkillPickerState(null);
  }

  function openArtifactPicker(side, slotId) {
    setArtifactPickerState({ side, slotId });
  }

  function closeArtifactPicker() {
    setArtifactPickerState(null);
  }

  function openProtectionPicker(slotId) {
    setProtectionPickerState({ slotId });
  }

  function closeProtectionPicker() {
    setProtectionPickerState(null);
  }

  function handleCastleSelect(castle) {
    setPickerState((current) =>
      current
        ? {
            ...current,
            stage: "unit",
            castleName: castle.name,
          }
        : current,
    );
  }

  function handleUnitSelect(unit) {
    if (!pickerState) {
      return;
    }

    updateStacks(pickerState.side, (current) =>
      current.map((stack) =>
        stack.id === pickerState.stackId
          ? {
              ...stack,
              castleName: pickerState.castleName,
              creatureName: unit.name,
            }
          : stack,
      ),
    );

    closePicker();
  }

  function clearArmySlot(side, stackId) {
    updateStacks(side, (current) =>
      current.map((stack) =>
        stack.id === stackId
          ? {
              ...stack,
              castleName: "",
              creatureName: "",
            }
          : stack,
      ),
    );
  }

  function clearSkillSlot(side, slotId) {
    updateSkillSlots(side, (current) =>
      current.map((slot) =>
        slot.id === slotId
          ? {
              ...slot,
              skillName: "",
              levelId: "",
            }
          : slot,
      ),
    );
  }

  function clearArtifactSlot(side, slotId) {
    updateArtifactSlots(side, (current) =>
      current.map((slot) =>
        slot.id === slotId
          ? {
              ...slot,
              artifactId: "",
            }
          : slot,
      ),
    );
  }

  function clearProtectionSlot(slotId) {
    updateProtectionSlots((current) =>
      current.map((slot) =>
        slot.id === slotId
          ? {
              ...slot,
              spellName: "",
              levelId: "",
            }
          : slot,
      ),
    );
  }

  function assignSkillToSlot(side, slotId, skillName, levelId) {
    updateSkillSlots(side, (current) =>
      current.map((slot) => {
        if (slot.id === slotId) {
          return { ...slot, skillName, levelId };
        }

        if (slot.skillName === skillName) {
          return { ...slot, skillName: "", levelId: "" };
        }

        return slot;
      }),
    );
    closeSkillPicker();
  }

  function assignArtifactToSlot(side, slotId, artifactId) {
    updateArtifactSlots(side, (current) =>
      current.map((slot) => {
        if (slot.id === slotId) {
          return { ...slot, artifactId };
        }

        if (slot.artifactId === artifactId) {
          return { ...slot, artifactId: "" };
        }

        return slot;
      }),
    );
    closeArtifactPicker();
  }

  function assignProtectionToSlot(slotId, spellName, levelId) {
    updateProtectionSlots((current) =>
      current.map((slot) => {
        if (slot.id === slotId) {
          return { ...slot, spellName, levelId };
        }

        if (slot.spellName === spellName) {
          return { ...slot, spellName: "", levelId: "" };
        }

        return slot;
      }),
    );
    closeProtectionPicker();
  }

  return (
    <section className="page calculator-page">
      <div className="page-header">
        <div>
          <h1>Spell Damage</h1>
        </div>
        <Link className="nav-link" to="/">
          Back
        </Link>
      </div>

      <div className="spell-layout">
        <section className="spell-panel">
          <div className="section-heading">
            <h2>Offender</h2>
          </div>
          <div className="modifier-grid">
            <div className="field">
              <span>Power</span>
              <AmountStepper iconUrl={POWER_SKILL_ICON_URL} label="Power" value={power} onChange={setPower} />
            </div>
          </div>

          <SecondarySkillRow
            label="Skills"
            slots={offenderSkills}
            onPickSlot={(slotId) => openSkillPicker("offender", slotId)}
            onClearSlot={(slotId) => clearSkillSlot("offender", slotId)}
          />

          <ArtifactSlotRow
            label="Artifacts"
            slots={offenderArtifactSlots}
            artifactOptions={damageArtifacts}
            onPickSlot={(slotId) => openArtifactPicker("offender", slotId)}
            onClearSlot={(slotId) => clearArtifactSlot("offender", slotId)}
          />

          <ArmyRow
            label="Army"
            stacks={offenderStacks}
            onPickUnit={(stackId) => openPicker("offender", stackId)}
            onClearSlot={(stackId) => clearArmySlot("offender", stackId)}
          />
        </section>

        <section className="spell-panel">
          <div className="section-heading">
            <h2>Defender</h2>
          </div>

          <SecondarySkillRow
            label="Skills"
            slots={defenderSkills}
            onPickSlot={(slotId) => openSkillPicker("defender", slotId)}
            onClearSlot={(slotId) => clearSkillSlot("defender", slotId)}
          />

          <ArtifactSlotRow
            label="Artifacts"
            slots={defenderArtifactSlots}
            artifactOptions={defenderArtifactOptions}
            onPickSlot={(slotId) => openArtifactPicker("defender", slotId)}
            onClearSlot={(slotId) => clearArtifactSlot("defender", slotId)}
          />

          <ArmyRow
            label="Army"
            stacks={defenderStacks}
            onPickUnit={(stackId) => openPicker("defender", stackId)}
            onClearSlot={(stackId) => clearArmySlot("defender", stackId)}
          />

          <ProtectionSpellRow
            className="protection-row"
            label="Protection"
            slots={defenderProtectionSlots}
            onPickSlot={openProtectionPicker}
            onClearSlot={clearProtectionSlot}
          />
        </section>

        <section className="spell-panel spell-panel-wide">
          <div className="section-heading">
            <h2>Spell</h2>
          </div>
          <button className="spell-meta spell-picker-button" type="button" onClick={() => setSpellPickerOpen(true)}>
            {selectedSpell?.iconUrl && <img src={selectedSpell.iconUrl} alt="" />}
            <div>
              <strong>{selectedSpell?.name}</strong>
              <small>
                {selectedSpell?.school?.name} - Level {selectedSpell?.level}
              </small>
            </div>
          </button>
        </section>

        <section className="spell-panel spell-panel-result">
          <div className="section-heading">
            <h2>Result</h2>
          </div>
          <div className="demon-result spell-result">
            {selectedSpell?.iconUrl && <img src={selectedSpell.iconUrl} alt="" />}
            <div>
              <strong>{formatDamage(baseDamage)}</strong>
              <span>{selectedSpell?.name} damage</span>
            </div>
          </div>

          <ResultList
            entries={offenderResults}
            title="Our army"
            emptyText="Pick offender units to see self-damage."
          />
          <ResultList
            entries={defenderResults}
            title="Enemy army"
            emptyText="Pick defender units to see max kills."
          />
        </section>
      </div>

      <CastlePicker
        castles={castleOptions}
        open={pickerState?.stage === "castle"}
        selectedCastle={pickerCastle}
        title="Pick castle"
        onClose={closePicker}
        onSelect={handleCastleSelect}
      />
      <UnitPicker
        castle={pickerCastle}
        units={pickerUnits}
        open={pickerState?.stage === "unit"}
        selectedUnit={
          pickerState
            ? getStackCreature((pickerState.side === "offender" ? offenderStacks : defenderStacks).find((stack) => stack.id === pickerState.stackId) || {})
            : null
        }
        onBack={() => setPickerState((current) => (current ? { ...current, stage: "castle" } : current))}
        onClose={closePicker}
        onSelect={handleUnitSelect}
      />
      <SkillPickerModal
        open={Boolean(skillPickerState)}
        availableSkills={availableSkillChoices}
        selectedSlot={selectedSkillSlot}
        onClose={closeSkillPicker}
        onClear={() => {
          if (!skillPickerState) {
            return;
          }

          clearSkillSlot(skillPickerState.side, skillPickerState.slotId);
          closeSkillPicker();
        }}
        onSelect={(skillName, levelId) => {
          if (!skillPickerState) {
            return;
          }

          assignSkillToSlot(skillPickerState.side, skillPickerState.slotId, skillName, levelId);
        }}
      />
      <SpellPickerModal
        open={isSpellPickerOpen}
        spells={filteredDamageSpells}
        selectedSpellName={selectedSpellName}
        onClose={() => setSpellPickerOpen(false)}
        onSelect={(spellName) => {
          setSelectedSpellName(spellName);
          setSpellPickerOpen(false);
        }}
      />
      <ArtifactPickerModal
        open={Boolean(artifactPickerState)}
        title="Pick artifact"
        availableArtifacts={availableArtifactChoices}
        selectedSlot={selectedArtifactSlot}
        onClose={closeArtifactPicker}
        onClear={() => {
          if (!artifactPickerState) {
            return;
          }

          clearArtifactSlot(artifactPickerState.side, artifactPickerState.slotId);
          closeArtifactPicker();
        }}
        onSelect={(artifactId) => {
          if (!artifactPickerState) {
            return;
          }

          assignArtifactToSlot(artifactPickerState.side, artifactPickerState.slotId, artifactId);
        }}
      />
      <ProtectionPickerModal
        open={Boolean(protectionPickerState)}
        selectedSlot={selectedProtectionSlot}
        onClose={closeProtectionPicker}
        onClear={() => {
          if (!protectionPickerState) {
            return;
          }

          clearProtectionSlot(protectionPickerState.slotId);
          closeProtectionPicker();
        }}
        onSelect={(spellName, levelId) => {
          if (!protectionPickerState) {
            return;
          }

          assignProtectionToSlot(protectionPickerState.slotId, spellName, levelId);
        }}
      />
    </section>
  );
}
