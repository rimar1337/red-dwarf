// please change the branding if you are not it hosting on reddwarf.app
export const HOST_TITLE = "Red Dwarf"
// also replace favicon files and defaultpfp.png and check LogoSvg.tsx
// todo generate manifest.json and index.html from this file 
// todo have the bottom left and right blurbs on the desktop (should move it to settings for mobile) also customizable

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