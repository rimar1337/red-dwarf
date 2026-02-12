// please change the branding if you are not it hosting on reddwarf.app
export const HOST_MAIN_TITLE = "Red Dwarf" // large text in branding
export const HOST_SUB_TITLE = " .app" // smaller text in branding
export const HOST_TITLE = HOST_MAIN_TITLE + HOST_SUB_TITLE // composite used in paragraphs
// also replace favicon files and defaultpfp.png and check LogoSvg.tsx
export const HOST_LOGO_USE_FAVICON = false; // ignores LogoSvg.tsx (recolorable svg) for a static image (the favicon)
export const HOST_DEFAULT_HUE = 28; // default is 28 for red. mod 360. 294 is a nice purple
export const HOST_HERO = "/sunset.jpg" // path to the "banner" image of the instance
export const HOST_ADMIN = "did:plc:tufumi46dykq4fzwtp2ur6kx" // did of the owner/admin, does not give special perms
export const HOST_DESCRIPTION = "The official flagship hosted Red Dwarf instance, hosted on reddwarf.app, running the latest updates and features" // short 1 sentence description
/**
 * --- RED DWARF POLICY.TS — MARKDOWN FLAVOR ---
 *
 * This file uses a deliberately minimal Markdown subset.
 *
 * Supported syntax:
 * - Two consecutive line breaks create a new paragraph
 * - `##` denotes a collapsible section heading
 * - links via [link text](link url)
 * - Self-closing predefined components (e.g. `<PolicyViewer />`)
 * 
 * REQUIRED COMPONENTS (strictly one of each):
 * - <PolicyViewer />
 *
 * NOTE:
 * If the app detects that any required custom component is missing,
 * the application will refuse to run. Treat this file as critical.
 */
export const HOST_ABOUT_MARKDOWN = `
## About this instance

reddwarf.app is the flagship hosted instance of Red Dwarf, a Bluesky application built to provide an independent social experience. 
This hosted instance mandates Bluesky Moderation to limit moderation scope and keep resources focused on developing Red Dwarf software.


## About Red Dwarf

Red Dwarf is a Bluesky client that does not depend on Bluesky’s AppView servers.

It preserves authoritative independence by fetching records directly from each user’s PDS (via Slingshot)
and reconstructing relationships through backlinks (via Constellation), 
while optionally using AppView as an optimization layer when available.

## Hosting Your Own Instance

Red Dwarf is open source. You can host your own instance specifically tailored to your community. 
Hosting your own instance gives you full control over policy, branding, and additional features. 

Repository: [https://tangled.org/whey.party/red-dwarf](https://tangled.org/whey.party/red-dwarf)

Instructions for setup, configuration, and labeler policies are included in the repository.

## RedDwarf.app Policy

<PolicyViewer />
`

export const HOST_UNAUTHED_DEFAULT_FEEDS = [
  "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot"
]

export const HOST_LOGIN_BLURB = "Experience Bluesky under a different light" //todo dont be corny
export const HOST_SIGNUP_PDS = false // false-able string

// very important. if this is empty the app will refuse to load anything
// because this powers all the labels in the app (assuming youre using the newer useAutoLabels and not useModeration)
export const HOST_LABELMERGE = "https://labelmerge.reddwarf.app"


// forced label providers
// applies to everyone
export const FORCED_LABELER_DIDS = [
  "did:plc:ar7c4by46qjdydhdevvrndac" // bluesky moderation
];



// unauthed forced label policy
// hides some content only when not logged in
// needs labelers to be set in FORCED_LABELER_DIDS
// TODO: add separate unauthed_forced_labeler_dids later

export const UNAUTHED_FORCE_WARN_LABELS = new Set([
  "porn",
  "sexual",
  "graphic-media",
  "nudity",
  "nsfl", 
  "gore",
  "!no-unauthenticated",
  "illicit",
  "self-harm",
  "sensitive",
]);

export const UNAUTHED_PREVENT_OPENING_WARNS = true;



// forced label policy
// hides content labeled with FORCE_HIDE_LABELS
// needs labelers to be set in FORCED_LABELER_DIDS and FORCE_HIDE_LABELS_WHITELISTED_SOURCE

export const FORCE_HIDE_LABELS_WHITELISTED_SOURCE = new Set([
  "did:plc:ar7c4by46qjdydhdevvrndac" // bluesky moderation
])

export const FORCE_HIDE_LABELS = new Set([
  "!takedown",
  "!hide",
]);



// todo generate manifest.json and index.html from this file 