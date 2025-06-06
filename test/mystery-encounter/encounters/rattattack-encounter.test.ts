import * as MysteryEncounters from "#app/data/mystery-encounters/mystery-encounters";
import { MysteryEncounterType } from "#enums/mystery-encounter-type";
import GameManager from "#test/testUtils/gameManager";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { RattattackEncounter } from "#app/data/mystery-encounters/encounters/rattattack-encounter";
import { getPokemonSpecies } from "#app/data/pokemon-species";
import * as EncounterPhaseUtils from "#app/data/mystery-encounters/utils/encounter-phase-utils";
import type BattleScene from "#app/battle-scene";
import { MysteryEncounterOptionMode } from "#enums/mystery-encounter-option-mode";
import { MysteryEncounterTier } from "#enums/mystery-encounter-tier";
import { initSceneWithoutEncounterPhase } from "#test/testUtils/gameManagerUtils";
import { CommandPhase } from "#app/phases/command-phase";
import { runMysteryEncounterToEnd, skipBattleRunMysteryEncounterRewardsPhase } from "../encounter-test-utils";
import { SelectModifierPhase } from "#app/phases/select-modifier-phase";
import { AttackTypeBoosterModifier, PokemonHeldItemModifier } from "#app/modifier/modifier";
import { SpeciesId } from "#enums/species-id";
import { BiomeId } from "#enums/biome-id";
import { MoveId } from "#enums/move-id";
const namespace = "mysteryEncounters/rattattack";

const defaultParty = [SpeciesId.RATTATA, SpeciesId.RATICATE];
const defaultBiome = BiomeId.PLAINS;
const waveUnder100 = 56;

describe("Rattattack - Mystery Encounter", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;
  let scene: BattleScene;

  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });

  beforeEach(async () => {
    game = new GameManager(phaserGame);
    scene = game.scene;
    game.override
      .mysteryEncounterChance(100)
      .startingWave(waveUnder100)
      .startingBiome(defaultBiome)
      .disableTrainerWaves()
      .moveset([
        MoveId.TACKLE,
        MoveId.QUICK_ATTACK,
        MoveId.BITE,
        MoveId.FOCUS_ENERGY,
        MoveId.HYPER_FANG,
        MoveId.CRUNCH,
        MoveId.AERIAL_ACE,
      ]);

    vi.spyOn(MysteryEncounters, "mysteryEncountersByBiome", "get").mockReturnValue(
      new Map<BiomeId, MysteryEncounterType[]>([[BiomeId.PLAINS, [MysteryEncounterType.RATTATTACK]]]),
    );
  });

  afterEach(() => {
    game.phaseInterceptor.restoreOg();
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  it("should have the correct properties", async () => {
    await game.runToMysteryEncounter(MysteryEncounterType.RATTATTACK, defaultParty);

    expect(RattattackEncounter.encounterType).toBe(MysteryEncounterType.RATTATTACK);
    expect(RattattackEncounter.encounterTier).toBe(MysteryEncounterTier.COMMON);
    expect(RattattackEncounter.dialogue).toBeDefined();
    expect(RattattackEncounter.dialogue.intro).toStrictEqual([
      { text: `${namespace}:intro` },
      {
        speaker: `${namespace}:speaker`,
        text: `${namespace}:intro_dialogue`,
      },
    ]);
    expect(RattattackEncounter.dialogue.encounterOptionsDialogue?.title).toBe(`${namespace}:title`);
    expect(RattattackEncounter.dialogue.encounterOptionsDialogue?.description).toBe(`${namespace}:description`);
    expect(RattattackEncounter.dialogue.encounterOptionsDialogue?.query).toBe(`${namespace}:query`);
    expect(RattattackEncounter.options.length).toBe(2);
  });

  it("should not run below wave 30", async () => {
    game.override.startingWave(27);

    await game.runToMysteryEncounter();

    expect(scene.currentBattle?.mysteryEncounter?.encounterType).not.toBe(MysteryEncounterType.RATTATTACK);
  });

  it("should initialize fully ", async () => {
    initSceneWithoutEncounterPhase(scene, defaultParty);
    scene.currentBattle.mysteryEncounter = RattattackEncounter;

    const { onInit } = RattattackEncounter;

    expect(RattattackEncounter.onInit).toBeDefined();

    RattattackEncounter.populateDialogueTokensFromRequirements();
    const onInitResult = onInit!();

    expect(RattattackEncounter.enemyPartyConfigs).toEqual([
      {
        pokemonConfigs: [
          {
            species: getPokemonSpecies(SpeciesId.RATTATA),
            isBoss: true,
            moveSet: [MoveId.TACKLE, MoveId.QUICK_ATTACK, MoveId.BITE, MoveId.FOCUS_ENERGY],
            modifierConfigs: expect.anything(),
            customPokemonData: expect.anything(),
          },
        ],
      },
    ]);
    expect(onInitResult).toBe(true);
  });

  describe("Option 1 - Battle Joey", () => {
    it("should have the correct properties", () => {
      const option = RattattackEncounter.options[0];
      expect(option.optionMode).toBe(MysteryEncounterOptionMode.DEFAULT);
      expect(option.dialogue).toBeDefined();
      expect(option.dialogue).toStrictEqual({
        buttonLabel: `${namespace}:option.1.label`,
        buttonTooltip: `${namespace}:option.1.tooltip`,
        selected: [
          {
            text: `${namespace}:option.1.selected`,
            speaker: `${namespace}:speaker`,
          },
          {
            text: `${namespace}:option.1.selected_2`,
            speaker: `${namespace}:speaker`,
          },
        ],
      });
    });

    it("should start battle against Joey", async () => {
      await game.runToMysteryEncounter(MysteryEncounterType.RATTATTACK, defaultParty);
      await runMysteryEncounterToEnd(game, 1, undefined, true);

      const enemyField = scene.getEnemyField();
      expect(scene.getCurrentPhase()?.constructor.name).toBe(CommandPhase.name);
      expect(enemyField.length).toBe(1);
      expect(enemyField[0].species.speciesId).toBe(SpeciesId.RATTATA);
    });

    it("should give attack type boosting item to lead pokemon", async () => {
      await game.runToMysteryEncounter(MysteryEncounterType.RATTATTACK, defaultParty);
      await runMysteryEncounterToEnd(game, 1, undefined, true);
      await skipBattleRunMysteryEncounterRewardsPhase(game);
      await game.phaseInterceptor.to(SelectModifierPhase, false);
      expect(scene.getCurrentPhase()?.constructor.name).toBe(SelectModifierPhase.name);

      const leadPokemonId = scene.getPlayerParty()?.[0].id;
      const leadPokemonItems = scene.findModifiers(
        m => m instanceof PokemonHeldItemModifier && (m as PokemonHeldItemModifier).pokemonId === leadPokemonId,
        true,
      ) as PokemonHeldItemModifier[];
      const item = leadPokemonItems.find(i => i instanceof AttackTypeBoosterModifier);
      expect(item).toBeDefined;
    });
  });

  describe("Option 2 - Remain Unprovoked", () => {
    it("should have the correct properties", () => {
      const option = RattattackEncounter.options[1];
      expect(option.optionMode).toBe(MysteryEncounterOptionMode.DEFAULT);
      expect(option.dialogue).toBeDefined();
      expect(option.dialogue).toStrictEqual({
        buttonLabel: `${namespace}:option.2.label`,
        buttonTooltip: `${namespace}:option.2.tooltip`,
        selected: [
          {
            text: `${namespace}:option.2.selected`,
          },
        ],
      });
    });

    it("should leave encounter without battle", async () => {
      const leaveEncounterWithoutBattleSpy = vi.spyOn(EncounterPhaseUtils, "leaveEncounterWithoutBattle");

      await game.runToMysteryEncounter(MysteryEncounterType.RATTATTACK, defaultParty);
      await runMysteryEncounterToEnd(game, 2);

      expect(leaveEncounterWithoutBattleSpy).toBeCalled();
    });
  });
});
