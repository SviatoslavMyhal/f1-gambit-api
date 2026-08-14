/**
 * Partial setup suggestions that mirror a reference *style* (archetype), not a real driver.
 * FE can show side-by-side vs the player’s CarSetupDto.
 */
export type ReferenceSetupPreset = {
  frontWing?: number;
  rearWing?: number;
  suspensionStiffness?: number;
  brakeBias?: number;
  rideHeight?: number;
  differentialOnThrottle?: number;
};

export type ReferenceSessionKind = 'quali' | 'race' | 'wet';

/** Product-safe archetypes — no licensed driver names. */
export type ReferenceArchetype =
  | 'quali_front_loaded'
  | 'race_tyre_saver'
  | 'wet_progressive';
