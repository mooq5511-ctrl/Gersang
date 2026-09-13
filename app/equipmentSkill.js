/**
 * The character id used by hero-only equipment skills.
 */
export const HERO_MAIN_ID = "hero_main";

/**
 * Return whether an equipment skill can affect the supplied character.
 *
 * Supported equipment shapes:
 *   { exclusiveTo: "hero_main" }
 *   { skill: { exclusiveTo: "hero_main" } }
 *
 * Equipment without an explicit `exclusiveTo` value is not treated as a
 * hero-only skill. This keeps ordinary equipment skills available to other
 * characters and makes the rule explicit in the data.
 *
 * @param {{ id?: string } | null | undefined} character
 * @param {{ exclusiveTo?: string, skill?: { exclusiveTo?: string } } | null | undefined} equipment
 * @returns {boolean}
 */
export function isHeroExclusiveSkillEffective(character, equipment) {
  if (!character || !equipment || character.id !== HERO_MAIN_ID) {
    return false;
  }

  const exclusiveTo = equipment.exclusiveTo ?? equipment.skill?.exclusiveTo;
  return exclusiveTo === HERO_MAIN_ID;
}

export default isHeroExclusiveSkillEffective;
