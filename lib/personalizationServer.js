import { listInteractions } from './interactionStore.js';
import {
  deriveLearnedProfile,
  filterLearnedByRestrictions,
  buildPersonalizationBlock,
} from './personalization.js';
import { getHousehold } from './householdStore.js';

/**
 * Server-side personalization context — one call every AI route shares.
 *
 * Returns { household, restrictions, learnedBlock, profile }:
 *   • household    — the user's SAVED explicit profile (hard truth)
 *   • restrictions — the normalized shape restrictionCheck expects
 *   • learnedBlock — a soft-hints prompt fragment ('' when nothing learned)
 *   • profile      — the derived profile (for display / debugging)
 *
 * Learning failures must NEVER break generation: any store error degrades to
 * "no learned hints" rather than a failed request.
 */
export async function loadPersonalizationContext() {
  try {
    const [events, household] = await Promise.all([listInteractions(), getHousehold()]);
    const restrictions = {
      diet:
        household.diet === 'none' && household.customDiet
          ? household.customDiet
          : household.diet,
      allergies: household.allergies || [],
      dislikes: household.dislikes || [],
    };
    const profile = filterLearnedByRestrictions(deriveLearnedProfile(events), restrictions);
    return { household, restrictions, learnedBlock: buildPersonalizationBlock(profile), profile };
  } catch (error) {
    console.error('Personalization context unavailable:', error?.message || error);
    const household = await getHousehold().catch(() => ({}));
    return {
      household,
      restrictions: { diet: '', allergies: [], dislikes: [] },
      learnedBlock: '',
      profile: deriveLearnedProfile([]),
    };
  }
}
