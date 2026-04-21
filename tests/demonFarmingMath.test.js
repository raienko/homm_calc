import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildHealthArtifacts,
  calculateDemonFarming,
  isNonLivingCreature,
  PIT_LORD_SUMMON_HEALTH,
} from "../src/pages/DemonFarming/demonFarmingMath.js";

const creatures = JSON.parse(readFileSync(new URL("../data/creatures.json", import.meta.url)));
const artifacts = JSON.parse(readFileSync(new URL("../data/artifacts.json", import.meta.url)));
const demon = creatures.find((creature) => creature.name === "Demon");
const healthArtifacts = buildHealthArtifacts(artifacts);

function calculate({ health, pitLordsCount, special = "", unitCount }) {
  return calculateDemonFarming({
    demonHealth: demon.health,
    healthArtifacts: [],
    pitLordsCount,
    selectedCreature: {
      name: `Test ${health} HP creature`,
      health,
      special,
    },
    unitCount,
  });
}

test("uses Demon creature health from data", () => {
  assert.equal(demon.health, 35);
});

test("matches Summon demons paragraph examples", () => {
  assert.equal(calculate({ health: 10, pitLordsCount: 1, unitCount: 1 }).demons, 0);
  assert.equal(calculate({ health: 10, pitLordsCount: 1, unitCount: 4 }).demons, 1);
  assert.equal(calculate({ health: demon.health, pitLordsCount: 7, unitCount: 10 }).demons, 10);
});

test("matches the Summon demons table for HP 4-33 and targets 1-10", () => {
  for (let targetDemons = 1; targetDemons <= 10; targetDemons += 1) {
    const pitLordsCount = Math.ceil((targetDemons * demon.health) / PIT_LORD_SUMMON_HEALTH);

    for (let health = 4; health <= 33; health += 1) {
      const tableCreatureRequirement = Math.max(targetDemons, Math.ceil((targetDemons * demon.health) / health));

      assert.equal(
        calculate({ health, pitLordsCount, unitCount: tableCreatureRequirement }).demons,
        targetDemons,
        `${pitLordsCount} Pit Lords, ${targetDemons} Demons, ${health} HP should require ${tableCreatureRequirement} creatures`,
      );

      assert.ok(
        calculate({ health, pitLordsCount, unitCount: tableCreatureRequirement - 1 }).demons < targetDemons,
        `${tableCreatureRequirement - 1} creatures with ${health} HP should not raise ${targetDemons} Demons`,
      );
    }
  }
});

test("Pit Lord capacity caps raised Demons", () => {
  assert.equal(calculate({ health: 4, pitLordsCount: 7, unitCount: 88 }).demons, 10);
  assert.equal(calculate({ health: 4, pitLordsCount: 6, unitCount: 88 }).demons, 8);
});

test("health artifacts alter source unit health", () => {
  const elixir = healthArtifacts.find((artifact) => artifact.name === "Elixir of Life");

  const withoutArtifact = calculateDemonFarming({
    demonHealth: demon.health,
    healthArtifacts,
    pitLordsCount: 1,
    selectedArtifactIds: [],
    selectedCreature: { name: "Imp", health: 4, special: "" },
    unitCount: 4,
  });
  const withElixir = calculateDemonFarming({
    demonHealth: demon.health,
    healthArtifacts,
    pitLordsCount: 1,
    selectedArtifactIds: [elixir.id],
    selectedCreature: { name: "Imp", health: 4, special: "" },
    unitCount: 4,
  });

  assert.equal(withoutArtifact.demons, 0);
  assert.equal(withElixir.effectiveHealth.health, 10);
  assert.equal(withElixir.demons, 1);
});

test("non-living creatures cannot be converted into Demons", () => {
  for (const special of ["Undead", "Unliving", "Bloodless Unliving, Flying", "Elemental"]) {
    const creature = { name: special, health: 100, special };
    const result = calculateDemonFarming({
      demonHealth: demon.health,
      pitLordsCount: 20,
      selectedCreature: creature,
      unitCount: 20,
    });

    assert.equal(isNonLivingCreature(creature), true);
    assert.equal(result.demons, 0);
    assert.match(result.warning, /cannot be converted into Demons/);
  }

  assert.equal(isNonLivingCreature({ name: "Imp", health: 4, special: "" }), false);
});
