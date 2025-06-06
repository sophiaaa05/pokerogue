import { MysteryEncounterType } from "#enums/mystery-encounter-type";
import type MysteryEncounter from "#app/data/mystery-encounters/mystery-encounter";
import { MysteryEncounterBuilder } from "#app/data/mystery-encounters/mystery-encounter";
import { MysteryEncounterTier } from "#enums/mystery-encounter-tier";
import { globalScene } from "#app/global-scene";
import { getPokemonSpecies } from "#app/data/pokemon-species";
import { CustomPokemonData } from "#app/data/custom-pokemon-data";
import {
  type EnemyPartyConfig,
  generateModifierType,
  initBattleWithEnemyConfig,
  leaveEncounterWithoutBattle,
  loadCustomMovesForEncounter,
  setEncounterRewards,
  transitionMysteryEncounterIntroVisuals,
} from "../utils/encounter-phase-utils";
import { CLASSIC_MODE_MYSTERY_ENCOUNTER_WAVES } from "#app/constants";
import { MysteryEncounterOptionBuilder } from "../mystery-encounter-option";
import { MysteryEncounterOptionMode } from "#enums/mystery-encounter-option-mode";
import {
  type AttackTypeBoosterModifierType,
  modifierTypes,
  type PokemonHeldItemModifierType,
} from "#app/modifier/modifier-type";
import { applyModifierTypeToPlayerPokemon } from "../utils/encounter-pokemon-utils";
import { queueEncounterMessage } from "../utils/encounter-dialogue-utils";
import { PokemonType } from "#enums/pokemon-type";
import { MoveId } from "#enums/move-id";
import { SpeciesId } from "#enums/species-id";
import { AbilityId } from "#enums/ability-id";
/** i18n namespace for the encounter */
const namespace = "mysteryEncounters/rattattack";

/**
 * Rattattack encounter.
 * @see {@link https://github.com/pagefaultgames/pokerogue/issues/4421 | GitHub Project #4421}
 * @see For biome requirements check {@linkcode mysteryEncountersByBiome}
 */

export const RattattackEncounter: MysteryEncounter = MysteryEncounterBuilder.withEncounterType(
  MysteryEncounterType.RATTATTACK,
)
  .withEncounterTier(MysteryEncounterTier.COMMON)
  .withSceneWaveRangeRequirement(31, CLASSIC_MODE_MYSTERY_ENCOUNTER_WAVES[1])
  .withAutoHideIntroVisuals(false)
  .withFleeAllowed(true)
  .withIntroSpriteConfigs([
    {
      spriteKey: "youngster_m",
      fileRoot: "trainer",
      hasShadow: true,
      x: 0,
      y: 2,
      yShadow: 2,
      repeat: true,
    },
  ])
  .withIntroDialogue([
    {
      text: `${namespace}:intro`,
    },
    {
      text: `${namespace}:intro_dialogue`,
      speaker: `${namespace}:speaker`,
    },
  ])
  .withOnInit(() => {
    const encounter = globalScene.currentBattle.mysteryEncounter!;

    // Choose between Rattata and Raticate as a boss depending on the current wave
    const wave = globalScene.currentBattle.waveIndex;
    //under wave 100 - Rattata
    if (wave < 100) {
      encounter.enemyPartyConfigs.push({
        pokemonConfigs: [
          {
            species: getPokemonSpecies(SpeciesId.RATTATA),
            isBoss: true,
            moveSet: [MoveId.TACKLE, MoveId.QUICK_ATTACK, MoveId.BITE, MoveId.FOCUS_ENERGY],
            modifierConfigs: [
              {
                modifier: generateModifierType(modifierTypes.ATTACK_TYPE_BOOSTER, [
                  PokemonType.NORMAL,
                ]) as PokemonHeldItemModifierType,
              },
              {
                modifier: generateModifierType(modifierTypes.ATTACK_TYPE_BOOSTER, [
                  PokemonType.DARK,
                ]) as PokemonHeldItemModifierType,
              },
            ],
            customPokemonData: new CustomPokemonData({
              ability: AbilityId.HUSTLE,
            }),
          },
        ],
      });
      encounter.setDialogueToken("chosenPokemon", getPokemonSpecies(SpeciesId.RATTATA).getName());
      loadCustomMovesForEncounter([MoveId.TACKLE, MoveId.QUICK_ATTACK, MoveId.BITE, MoveId.FOCUS_ENERGY]);
    } else {
      // above wave 100 - Raticate
      encounter.enemyPartyConfigs.push({
        pokemonConfigs: [
          {
            species: getPokemonSpecies(SpeciesId.RATICATE),
            isBoss: true,
            moveSet: [MoveId.HYPER_FANG, MoveId.CRUNCH, MoveId.AERIAL_ACE, MoveId.FOCUS_ENERGY],
            modifierConfigs: [
              {
                modifier: generateModifierType(modifierTypes.ATTACK_TYPE_BOOSTER, [
                  PokemonType.NORMAL,
                ]) as PokemonHeldItemModifierType,
              },
              {
                modifier: generateModifierType(modifierTypes.ATTACK_TYPE_BOOSTER, [
                  PokemonType.DARK,
                ]) as PokemonHeldItemModifierType,
              },
            ],
            customPokemonData: new CustomPokemonData({
              ability: AbilityId.HUSTLE,
            }),
          },
        ],
      });
      encounter.setDialogueToken("chosenPokemon", getPokemonSpecies(SpeciesId.RATICATE).getName());
      loadCustomMovesForEncounter([MoveId.HYPER_FANG, MoveId.CRUNCH, MoveId.AERIAL_ACE, MoveId.FOCUS_ENERGY]);
    }
    return true;
  })

  .setLocalizationKey(`${namespace}`)
  .withTitle(`${namespace}:title`)
  .withDescription(`${namespace}:description`)
  .withQuery(`${namespace}:query`)
  .withOption(
    MysteryEncounterOptionBuilder.newOptionWithMode(MysteryEncounterOptionMode.DEFAULT)
      .withDialogue({
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
      })
      .withOptionPhase(async () => {
        const encounter = globalScene.currentBattle.mysteryEncounter!;
        // Spawn battle
        const config: EnemyPartyConfig = encounter.enemyPartyConfigs[0];

        // Offers player a free Scarf and normal rewards
        setEncounterRewards({ fillRemaining: true }, undefined, () => {
          givePlayerSilkScarf();
        });

        await transitionMysteryEncounterIntroVisuals();
        await initBattleWithEnemyConfig(config);
      })
      .build(),
  )

  .withSimpleOption(
    {
      buttonLabel: `${namespace}:option.2.label`,
      buttonTooltip: `${namespace}:option.2.tooltip`,
      selected: [
        {
          text: `${namespace}:option.2.selected`,
        },
      ],
    },
    async () => {
      leaveEncounterWithoutBattle();
      return true;
    },
  )

  .build();

function givePlayerSilkScarf() {
  // Give first party pokemon attack type boost item (Silk Scarf)
  const leadPokemon = globalScene.getPlayerParty()?.[0];

  if (leadPokemon) {
    // Defines booster as Silk Scarf - Normal Pokemon Type
    const boosterModifierType = generateModifierType(modifierTypes.ATTACK_TYPE_BOOSTER, [
      PokemonType.NORMAL,
    ]) as AttackTypeBoosterModifierType;

    applyModifierTypeToPlayerPokemon(leadPokemon, boosterModifierType);
    const encounter = globalScene.currentBattle.mysteryEncounter!;

    encounter.setDialogueToken("itemName", boosterModifierType.name);
    encounter.setDialogueToken("leadPokemon", leadPokemon.getNameToRender());
    queueEncounterMessage(`${namespace}:found_item`);
  }
}
