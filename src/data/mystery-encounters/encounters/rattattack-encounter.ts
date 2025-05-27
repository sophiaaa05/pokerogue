import { MysteryEncounterType } from "#enums/mystery-encounter-type";
import type MysteryEncounter from "#app/data/mystery-encounters/mystery-encounter";
import { MysteryEncounterBuilder } from "#app/data/mystery-encounters/mystery-encounter";
import { MysteryEncounterTier } from "#enums/mystery-encounter-tier";
import { globalScene } from "#app/global-scene";
import { Species } from "#enums/species";
import { getPokemonSpecies } from "#app/data/pokemon-species";
import { Moves } from "#enums/moves";
import { CustomPokemonData } from "#app/data/custom-pokemon-data";
import { Abilities } from "#enums/abilities";
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
/** i18n namespace for the encounter */
const namespace = "mysteryEncounters/rattattack";

/**
 * Rattattack encounter.
 * @see {@link https://github.com/pagefaultgames/pokerogue/issues/4421 | GitHub Project #4421}
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
      spriteKey: "joey",
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
    if (wave < 100) {
      encounter.enemyPartyConfigs.push({
        pokemonConfigs: [
          {
            species: getPokemonSpecies(Species.RATTATA),
            isBoss: true,
            moveSet: [Moves.TACKLE, Moves.QUICK_ATTACK, Moves.BITE, Moves.FOCUS_ENERGY],
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
              ability: Abilities.HUSTLE,
            }),
          },
        ],
      });
      encounter.setDialogueToken("chosenPokemon", getPokemonSpecies(Species.RATTATA).getName());
      loadCustomMovesForEncounter([Moves.HYPER_FANG, Moves.CRUNCH, Moves.AERIAL_ACE, Moves.FOCUS_ENERGY]);
    } else {
      encounter.enemyPartyConfigs.push({
        pokemonConfigs: [
          {
            species: getPokemonSpecies(Species.RATICATE),
            isBoss: true,
            moveSet: [Moves.HYPER_FANG, Moves.CRUNCH, Moves.AERIAL_ACE, Moves.FOCUS_ENERGY],
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
              ability: Abilities.HUSTLE,
            }),
          },
        ],
      });
      encounter.setDialogueToken("chosenPokemon", getPokemonSpecies(Species.RATICATE).getName());
      loadCustomMovesForEncounter([Moves.TACKLE, Moves.QUICK_ATTACK, Moves.BITE, Moves.FOCUS_ENERGY]);
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

        setEncounterRewards({ fillRemaining: true }, undefined, () => {
          // Offers player a free
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
  // Give first party pokemon attack type boost item (Normal/Silk Scarf)
  const leadPokemon = globalScene.getPlayerParty()?.[0];
  if (leadPokemon) {
    // Force booster for NORMAL type (Silk Scarf)
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
