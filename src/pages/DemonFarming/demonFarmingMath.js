export const PIT_LORD_SUMMON_HEALTH = 50;

const NON_LIVING_PATTERN = /\b(undead|unliving|elemental|non-living|bloodless)\b/i;

export function getHealthArtifactEffect(artifact) {
  const effect = artifact.effect || "";
  const flatBonuses = [...effect.matchAll(/\+(\d+)\s*Unit health/g)].map((match) => Number(match[1]));
  const percentBonuses = [...effect.matchAll(/\+(\d+)%\s*Unit health/g)].map((match) => Number(match[1]) / 100);

  return {
    ...artifact,
    id: artifact.pageUrl || artifact.name,
    flatHealthBonus: flatBonuses.reduce((total, value) => total + value, 0),
    healthMultiplier: percentBonuses.reduce((total, value) => total + value, 1),
  };
}

export function buildHealthArtifacts(artifacts) {
  return artifacts.filter((artifact) => artifact.effect?.includes("Unit health")).map(getHealthArtifactEffect);
}

export function isNonLivingCreature(creature) {
  return NON_LIVING_PATTERN.test(creature?.special || "");
}

export function applyHealthArtifacts(baseHealth, selectedArtifactIds, healthArtifacts) {
  const selectedArtifacts = healthArtifacts.filter((artifact) => selectedArtifactIds.includes(artifact.id));
  const flatBonus = selectedArtifacts.reduce((total, artifact) => total + artifact.flatHealthBonus, 0);
  const multiplier = selectedArtifacts.reduce((total, artifact) => total * artifact.healthMultiplier, 1);

  return {
    flatBonus,
    multiplier,
    health: (baseHealth + flatBonus) * multiplier,
  };
}

export function calculateDemonFarming({
  demonHealth,
  healthArtifacts = [],
  pitLordsCount,
  selectedArtifactIds = [],
  selectedCreature,
  unitCount,
}) {
  const pitLords = Math.max(0, Math.floor(pitLordsCount));
  const units = Math.max(0, Math.floor(unitCount));
  const effectiveHealth = applyHealthArtifacts(selectedCreature?.health || 0, selectedArtifactIds, healthArtifacts);
  const stackHealth = units * effectiveHealth.health;
  const pitLordHealthCapacity = pitLords * PIT_LORD_SUMMON_HEALTH;
  const warning = isNonLivingCreature(selectedCreature)
    ? `${selectedCreature.name} is non-living and cannot be converted into Demons.`
    : "";

  if (warning) {
    return {
      pitLords,
      units,
      demonHealth,
      effectiveHealth,
      stackHealth,
      pitLordHealthCapacity,
      usableHealth: 0,
      demons: 0,
      usedHealth: 0,
      wastedHealth: stackHealth,
      limitingFactor: "non-living creature",
      warning,
    };
  }

  const usableHealth = Math.min(stackHealth, pitLordHealthCapacity);
  const demonsBeforeUnitCap = Math.floor(usableHealth / demonHealth);
  const demons = Math.min(demonsBeforeUnitCap, units);
  const usedHealth = demons * demonHealth;

  return {
    pitLords,
    units,
    demonHealth,
    effectiveHealth,
    stackHealth,
    pitLordHealthCapacity,
    usableHealth,
    demons,
    usedHealth,
    wastedHealth: Math.max(0, stackHealth - usedHealth),
    limitingFactor:
      demons === units ? "unit count" : pitLordHealthCapacity < stackHealth ? "Pit Lord capacity" : "stack health",
    warning,
  };
}
