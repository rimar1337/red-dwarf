# Red Dwarf
Red Dwarf is a Bluesky client that does not use any AppView servers, instead it gathers the data from [Constellation](https://constellation.microcosm.blue/) and each users' PDS.

![screenshot of red dwarf](/public/screenshot.png)

huge thanks to [Microcosm](https://microcosm.blue/) for making this possible

## running dev and build
in the `vite.config.ts` file you should change these values
```ts
const PROD_URL = "https://reddwarf.whey.party"
const DEV_URL = "https://local3768forumtest.whey.party"
```
the PROD_URL is what will compile your oauth client metadata so it is very important to change that. same for DEV_URL if you are using a tunnel for dev work

run dev with `npm run dev` (port 3768) and build with `npm run build` (the output is the `dist` folder)

## useQuery
Red Dwarf has been upgraded from its original bespoke caching system to Tanstack Query (react query). this migration was done to achieve a more robust and maintainable approach to data fetching and caching and state synchronization. ive seen serious performance gains from this switch! 

all core data fetching logic is now centralized in `src/utils/useQuery.ts` and exposed as a collection of custom react hooks. theres two basic types of custom hooks, the use-once, and the inifinite query ones (used for paginated requests like feed skeletons and listrecord)

## UniversalPostRenderer
its a mega component rooted in my Masonry "[TestFront](https://testfront-87q.pages.dev/)" project. its goal is simple: have one component render everything. it has several shims to normalize different post data formats into a single format the component can handle. unlike TestFront, it has no animations, though some weird component splits might linger from the old version.

to adapt TestFront's bsky-api-based `UniversalPostRenderer` to Red Dwarf's model of fetching records directly from each user's PDS and then querying constellation for backlinks, i wrap it in `UniversalPostRendererATURILoader`, which handles raw record and backlink fetching. to bridge the gap between bsky api shapes like `PostView` and the raw record, i use `UniversalPostRendererRawRecordShim`. this way, the core `UniversalPostRenderer` remains the same between TestFront and Red Dwarf (with the only difference being in the red dwarf version the framer motion animations are removed).

## Microcosm
### Constellation
the beating heart of Red Dwarf, the backlink index that provides contextual information not available from direct PDS queries. Every post's likes, replies, and reposts all come from constellation. Unfortunately i wasnt using tanstack query at the time (compared to its intensive use in the old version of ForumTest) so it is not using any caching

### Slingshot
though Red Dwarf was made before Microcosm [Slingshot](https://slingshot.microcosm.blue) existed, it now uses Slingshot to reduce load from each respective PDS server. Slignshot

## UnifiedAuthProvider
a merged auth provider with oauth and password based login. oauth makes it slightly more annoying to do development because it requires a tunnel, so so the password auth option is still here if you do prefer password login for whatever reason.

### Pass Auth
a really bad app-password auth provider, inherited from TestFront and used in all my projects from TestFront to ForumTest (im very good at naming things). 

### OAuth
taken from ForumTest [OAuthProvider](https://tangled.sh/@whey.party/forumtest/blob/main/src/providers/OAuthProvider.tsx)

## Custom Feeds
they work, but i havent implemented a simple way of viewing arbitraty feeds. currently it either loads discover (logged out) or your saved feeds (logged in) and its not a technical limitation i just havent implemented it yet

## The Following Feed and List Feeds
they wont work at all
they need an appview or any feed server
in place of a following feed you can just use any custom feed that implements the following feed, like mine ([Fresh](https://bsky.app/profile/whey.party/feed/rinds))

and for list feeds, you can just use something like graze or skyfeed to input a list of users and output a custom feed

## Tanstack Router
it does the job, nothing very specific was used here

im planning to use the loader system on select pages to prevent loss of scroll positon and state though its really complex so i havent done it yet but the migration to tanstack query is a huge first step towards this goal