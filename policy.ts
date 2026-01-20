export const FORCED_LABELER_DIDS = [
  "did:plc:ar7c4by46qjdydhdevvrndac" // bluesky moderation
];

export const UNAUTHED_FORCE_WARN_LABELS = new Set([
  // i dont know if some of these are even valid labels
  "porn",
  "sexual",
  "graphic-media",
  "nudity",
  "nsfl", 
  "corpse",
  "gore",
  "!no-unauthenticated"
]);

export const UNAUTHED_PREVENT_OPENING_WARNS = true;