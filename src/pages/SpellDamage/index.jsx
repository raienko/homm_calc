import { useMemo, useState } from "react";
import artifacts from "../../../data/artifacts.json";
import castles from "../../../data/castles.json";
import creatures from "../../../data/creatures.json";
import skills from "../../../data/skills.json";
import spells from "../../../data/spells.json";
import AmountStepper from "../../components/AmountStepper";
import CastlePicker from "../../components/CastlePicker";
import SpellSummaryCard from "../../components/SpellSummaryCard";
import UnitPicker from "../../components/UnitPicker";
import { resolveAssetUrl } from "../../lib/assetUrl.js";
import { Link } from "../../router.jsx";
import { applyHealthArtifacts, buildHealthArtifacts } from "../DemonFarming/demonFarmingMath";

const ARMY_SLOT_COUNT = 7;
const SKILL_SLOT_COUNT = 5;
const ARTIFACT_SLOT_COUNT = 5;
const MAGIC_SCHOOLS = ["Air", "Earth", "Fire", "Water"];
const OFFENDER_SKILL_NAMES = ["Sorcery", "Air Magic", "Earth Magic", "Fire Magic", "Water Magic"];
const DEFENDER_SKILL_NAMES = ["Resistance"];
const POWER_SKILL_ICON_URL = "game-assets/wiki/e/e0/Power_skill.png";
const PROTECTION_SPELL_NAMES = ["Anti-Magic", "Protection from Air", "Protection from Earth", "Protection from Fire", "Protection from Water"];
const healthArtifacts = buildHealthArtifacts(artifacts);
const secondarySkills = skills;
const SPELL_NAMES_BY_LENGTH = [...new Set(spells.map((spell) => spell.name))].sort((left, right) => right.length - left.length);
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
  .map((artifact) => {
    const effect = artifact.effect || "";

    return {
      id: artifact.pageUrl || artifact.name,
      name: artifact.name,
      iconUrl: artifact.iconUrl,
      effect,
      specificSpellNames: extractSpellNamesFromText(extractImmunityClauses(effect).join("; ")),
      spellLevelCap: Number((effect.match(/Immun(?:e|ity)\s+to\s+lvl\s+1-(\d+)\s+spells/i) || [])[1] || 0),
    };
  })
  .filter((artifact) => artifact.specificSpellNames.length > 0 || artifact.spellLevelCap > 0);
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

const FRIENDLY_TARGETABLE_DAMAGE_SPELLS = new Set([
  "Magic Arrow",
  "Lightning Bolt",
  "Destroy Undead",
  "Chain Lightning",
  "Titan's Lightning Bolt",
  "Death Ripple",
  "Meteor Shower",
  "Implosion",
  "Fireball",
  "Armageddon",
  "Inferno",
  "Ice Bolt",
  "Frost Ring",
]);

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
  const flatMatch = equation.match(/^(\d+)$/);

  if (flatMatch) {
    return {
      base: Number(flatMatch[1]),
      perPower: 0,
    };
  }

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

function getSpellManaCost(spell, schoolMasteryId) {
  const values = spell?.cost?.values || [];

  if (values.length === 0) {
    return 0;
  }

  if (values.length === 1) {
    return values[0];
  }

  return schoolMasteryId === "none" ? values[0] : values[1];
}

function cycleOption(currentId, options) {
  const currentIndex = Math.max(
    0,
    options.findIndex((option) => option.id === currentId),
  );

  return options[(currentIndex + 1) % options.length]?.id || options[0]?.id;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractImmunityClauses(text) {
  return Array.from(
    String(text || "").matchAll(
      /Immun(?:e|ity)\s+to\s+(.+?)(?=;\s*|•|\.\s*|,\s*Vulnerable to|,\s*Adjacent enemies|,\s*Spellcaster|,\s*\+\d+%|$)/gi,
    ),
  ).map((match) => match[1].trim());
}

function extractSpellNamesFromText(text) {
  let remaining = String(text || "");
  const foundSpellNames = [];

  for (const spellName of SPELL_NAMES_BY_LENGTH) {
    const spellPattern = new RegExp(escapeRegExp(spellName), "gi");

    if (!spellPattern.test(remaining)) {
      continue;
    }

    foundSpellNames.push(spellName);
    remaining = remaining.replace(spellPattern, " ");
  }

  return foundSpellNames;
}

function getImmunityArtifactsForSpell(spell) {
  if (!spell) {
    return [];
  }

  const spellLevel = Number(spell.level || 0);

  return spellImmunityArtifacts.filter(
    (artifact) => artifact.specificSpellNames.includes(spell.name) || (artifact.spellLevelCap > 0 && spellLevel <= artifact.spellLevelCap),
  );
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

  const immuneSpellNames = extractSpellNamesFromText(extractImmunityClauses(special).join("; "));
  if (!ignoreImmunity && immuneSpellNames.includes(spell.name)) {
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

function spellCanHitFriendlyUnits(spell) {
  return FRIENDLY_TARGETABLE_DAMAGE_SPELLS.has(spell?.name);
}

function getAppliedProtection(levelId) {
  return protectionLevels.find((level) => {
    if (levelId === "basic") {
      return level.id === "minor";
    }
    if (levelId === "advanced") {
      return level.id === "major";
    }
    if (levelId === "expert") {
      return level.id === "max";
    }
    return level.id === "none";
  }) || protectionLevels[0];
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
                {creature?.portraitUrl ? <img src={resolveAssetUrl(creature.portraitUrl)} alt="" /> : <span className="army-slot-plus">+</span>}
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
                {iconUrl ? <img src={resolveAssetUrl(iconUrl)} alt="" /> : <span className="army-slot-plus">+</span>}
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
                {artifact?.iconUrl ? <img src={resolveAssetUrl(artifact.iconUrl)} alt="" /> : <span className="army-slot-plus">+</span>}
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
                {spell?.iconUrl ? <img src={resolveAssetUrl(spell.iconUrl)} alt="" /> : <span className="army-slot-plus">+</span>}
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

function ResultList({ entries, title, sideClassName = "" }) {
  const visibleEntries = entries.filter((entry) => entry.creature);

  if (visibleEntries.length === 0) {
    return null;
  }

  return (
    <section className={`result-group ${sideClassName}`.trim()}>
      <h3>{title}</h3>
      <div className="result-chip-list">
        {visibleEntries.map((entry) => (
          <article className="result-chip" key={entry.stack.id}>
            {entry.creature?.portraitUrl && <img src={resolveAssetUrl(entry.creature.portraitUrl)} alt="" />}
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

function SkillPickerModal({ open, onClose, onSelect, selectedSlot, availableSkills }) {
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

        <div className="picker-level-header" aria-hidden="true">
          {skillLevels.map((level) => (
            <span key={level.id}>{level.label}</span>
          ))}
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
                  {skill.iconUrls[level.id] && <img src={resolveAssetUrl(skill.iconUrls[level.id])} alt="" />}
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
                  {spell.iconUrl && <img src={resolveAssetUrl(spell.iconUrl)} alt="" />}
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

function ArtifactPickerModal({ open, onClose, onSelect, selectedSlot, availableArtifacts, title }) {
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
          <button className="icon-button" type="button" onClick={onClose}>
            ×
          </button>
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
                <img src={resolveAssetUrl(artifact.iconUrl)} alt="" />
                <span>{artifact.name}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ProtectionPickerModal({ open, onClose, onSelect, selectedSlot }) {
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
          <button className="icon-button" type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="picker-level-header" aria-hidden="true">
          {skillLevels.map((level) => (
            <span key={level.id}>{level.label}</span>
          ))}
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
                  {spell.iconUrl && <img src={resolveAssetUrl(spell.iconUrl)} alt="" />}
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
  const [power, setPower] = useState(1);
  const [offenderArtifactSlots, setOffenderArtifactSlots] = useState(() => createArtifactSlots("offender"));

  const [offenderSkills, setOffenderSkills] = useState(() => createSkillSlots("offender"));
  const [defenderSkills, setDefenderSkills] = useState(() => createSkillSlots("defender"));
  const [defenderArtifactSlots, setDefenderArtifactSlots] = useState(() => createArtifactSlots("defender"));
  const [offenderProtectionSlots, setOffenderProtectionSlots] = useState(() => createProtectionSlots("offender"));
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
  const attackerProtectionLevelId = selectedProtectionSpellName ? getHighestProtectionLevelId(offenderProtectionSlots, selectedProtectionSpellName) : "none";
  const defenderProtectionLevelId = selectedProtectionSpellName ? getHighestProtectionLevelId(defenderProtectionSlots, selectedProtectionSpellName) : "none";
  const attackerProtection = getAppliedProtection(attackerProtectionLevelId);
  const defenderProtection = getAppliedProtection(defenderProtectionLevelId);
  const selectedResistance = resistanceLevels.find((level) => level.id === resistanceLevelId) || resistanceLevels[0];
  const attackerAntiMagicLevelId = getHighestProtectionLevelId(offenderProtectionSlots, "Anti-Magic");
  const defenderAntiMagicLevelId = getHighestProtectionLevelId(defenderProtectionSlots, "Anti-Magic");
  const attackerAntiMagic = antiMagicLevels.find((level) => level.id === attackerAntiMagicLevelId) || antiMagicLevels[0];
  const defenderAntiMagic = antiMagicLevels.find((level) => level.id === defenderAntiMagicLevelId) || antiMagicLevels[0];
  const offenderArtifactIds = offenderArtifactSlots.map((slot) => slot.artifactId).filter(Boolean);
  const defenderArtifactIds = defenderArtifactSlots.map((slot) => slot.artifactId).filter(Boolean);
  const damageArtifactId = damageArtifacts.find((artifact) => offenderArtifactIds.includes(artifact.id) && artifact.school === selectedSpell?.school?.name)?.id || "";
  const attackerHealthArtifactIds = offenderArtifactIds.filter((artifactId) => healthArtifactIds.has(artifactId));
  const attackerResistanceArtifactIds = offenderArtifactIds.filter((artifactId) => resistanceArtifactIds.has(artifactId));
  const attackerImmunityArtifactIds = offenderArtifactIds.filter((artifactId) => spellImmunityArtifactIds.has(artifactId));
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
  const manaCost = getSpellManaCost(selectedSpell, schoolMasteryId);

  const attackerResistanceChance = Math.min(
    0.9,
    resistanceArtifacts
      .filter((artifact) => attackerResistanceArtifactIds.includes(artifact.id))
      .reduce((total, artifact) => total + artifact.chance, 0),
  );

  const defenderResistanceChance = Math.min(
    0.9,
    selectedResistance.chance +
      resistanceArtifacts
        .filter((artifact) => defenderResistanceArtifactIds.includes(artifact.id))
        .reduce((total, artifact) => total + artifact.chance, 0),
  );

  const ownArmyAffected = spellHitsOwnArmy(selectedSpell) || spellCanHitFriendlyUnits(selectedSpell);

  const offenderResults = offenderStacks.map((stack) => {
    const creature = getStackCreature(stack);
    const effectiveHealth = applyHealthArtifacts(creature?.health || 0, attackerHealthArtifactIds, healthArtifacts);
    const hasImmunityArtifact = immunityArtifacts.some((artifact) => attackerImmunityArtifactIds.includes(artifact.id));
    const creatureMitigation = getCreatureSpellMitigation(creature, selectedSpell, ignoresCreatureSpellImmunity);
    const isFullyProtected = (selectedSpell.level || 0) <= attackerAntiMagic.level || hasImmunityArtifact || creatureMitigation.immune;
    const afterProtection = creature && ownArmyAffected && !isFullyProtected ? baseDamage * (1 - attackerProtection.reduction) : 0;
    const effectiveDamage = afterProtection * (1 - attackerResistanceChance) * creatureMitigation.multiplier;
    const kills = creature && ownArmyAffected && !isFullyProtected ? calculateMaxKills(effectiveDamage, effectiveHealth.health) : 0;

    return {
      stack,
      creature,
      kills,
      badge: hasImmunityArtifact ? "Immune" : isFullyProtected ? "Immune" : creatureMitigation.badge,
    };
  });

  const defenderResults = defenderStacks.map((stack) => {
    const creature = getStackCreature(stack);
    const effectiveHealth = applyHealthArtifacts(creature?.health || 0, defenderHealthArtifactIds, healthArtifacts);
    const hasImmunityArtifact = immunityArtifacts.some((artifact) => defenderImmunityArtifactIds.includes(artifact.id));
    const creatureMitigation = getCreatureSpellMitigation(creature, selectedSpell, ignoresCreatureSpellImmunity);
    const isFullyProtected = (selectedSpell.level || 0) <= defenderAntiMagic.level || hasImmunityArtifact || creatureMitigation.immune;
    const afterProtection = isFullyProtected ? 0 : baseDamage * (1 - defenderProtection.reduction);
    const effectiveDamage = afterProtection * (1 - defenderResistanceChance) * creatureMitigation.multiplier;
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
  const attackerArtifactOptions = useMemo(() => {
    const seen = new Set();
    return [...damageArtifacts, ...healthArtifacts, ...resistanceArtifacts, ...immunityArtifacts].filter((artifact) => {
      if (seen.has(artifact.id)) {
        return false;
      }
      seen.add(artifact.id);
      return true;
    });
  }, [immunityArtifacts]);
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
  const availableArtifactChoices = artifactPickerState?.side === "offender" ? attackerArtifactOptions : defenderArtifactOptions;
  const selectedArtifactSlots = artifactPickerState?.side === "offender" ? offenderArtifactSlots : defenderArtifactSlots;
  const selectedArtifactSlot = artifactPickerState ? selectedArtifactSlots.find((slot) => slot.id === artifactPickerState.slotId) || null : null;
  const selectedProtectionSlots = protectionPickerState?.side === "offender" ? offenderProtectionSlots : defenderProtectionSlots;
  const selectedProtectionSlot = protectionPickerState ? selectedProtectionSlots.find((slot) => slot.id === protectionPickerState.slotId) || null : null;

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

  function updateProtectionSlots(side, updater) {
    const setState = side === "offender" ? setOffenderProtectionSlots : setDefenderProtectionSlots;
    setState((current) => updater(current));
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

  function openProtectionPicker(side, slotId) {
    setProtectionPickerState({ side, slotId });
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

  function clearProtectionSlot(side, slotId) {
    updateProtectionSlots(side, (current) =>
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

  function assignProtectionToSlot(side, slotId, spellName, levelId) {
    updateProtectionSlots(side, (current) =>
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
        <section className="spell-panel spell-panel-main spell-panel-offender">
          <div className="section-heading section-heading-with-control">
            <h2>Attacker</h2>
            <div className="section-heading-control">
              <span>Power</span>
              <AmountStepper iconUrl={POWER_SKILL_ICON_URL} label="Power" value={power} onChange={setPower} prefix="" />
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
            artifactOptions={attackerArtifactOptions}
            onPickSlot={(slotId) => openArtifactPicker("offender", slotId)}
            onClearSlot={(slotId) => clearArtifactSlot("offender", slotId)}
          />

          <ArmyRow
            label="Army"
            stacks={offenderStacks}
            onPickUnit={(stackId) => openPicker("offender", stackId)}
            onClearSlot={(stackId) => clearArmySlot("offender", stackId)}
          />

          <ProtectionSpellRow
            className="protection-row"
            label="Protection"
            slots={offenderProtectionSlots}
            onPickSlot={(slotId) => openProtectionPicker("offender", slotId)}
            onClearSlot={(slotId) => clearProtectionSlot("offender", slotId)}
          />
        </section>

        <section className="spell-panel spell-panel-main spell-panel-defender">
          <div className="section-heading section-heading-with-control">
            <h2>Defender</h2>
            <div className="section-heading-control section-heading-control-placeholder" aria-hidden="true" />
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
            onPickSlot={(slotId) => openProtectionPicker("defender", slotId)}
            onClearSlot={(slotId) => clearProtectionSlot("defender", slotId)}
          />
        </section>

        <section className="spell-panel spell-panel-wide">
          <SpellSummaryCard
            damage={formatDamage(baseDamage)}
            manaCost={manaCost}
            spell={selectedSpell}
            onClick={() => setSpellPickerOpen(true)}
          />
        </section>

        <section className="spell-panel spell-panel-wide spell-panel-result">
          <div className="result-layout">
            <ResultList
              entries={offenderResults}
              title="Attacker losses"
              sideClassName="result-group-offender"
            />
            <ResultList
              entries={defenderResults}
              title="Defender losses"
              sideClassName="result-group-defender"
            />
          </div>
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
        onSelect={(spellName, levelId) => {
          if (!protectionPickerState) {
            return;
          }

          assignProtectionToSlot(protectionPickerState.side, protectionPickerState.slotId, spellName, levelId);
        }}
      />
    </section>
  );
}
