# Initial Red Dwarf Open Source Release
i made red dwarf in three days

it isnt really that well made
(go take a look at `UniversalPostRenderer.tsx`)

further development is pending 
(especially around future plans for user-resolved constellation instances)

huge thanks to Constellation ([Microcosm](https://microcosm.blue/)) for making this possible

## UniversalPostRenderer
its a mega component rooted in my Masonry "[TestFront](https://testfront-87q.pages.dev/)" project. its goal is simple: have one component render everything. it has several shims to normalize different post data formats into a single format the component can handle. unlike TestFront, it has no animations, though some weird component splits might linger from the old version.

to adapt TestFront's bsky-api-based `UniversalPostRenderer` to Red Dwarf's model of fetching records directly from each user's PDS and then querying constellation for backlinks, i wrap it in `UniversalPostRendererATURILoader`, which handles raw record and backlink fetching. to bridge the gap between bsky api shapes like `PostView` and the raw record, i use `UniversalPostRendererRawRecordShim`. this way, the core `UniversalPostRenderer` remains the same between TestFront and Red Dwarf (with the only difference being in the red dwarf version the framer motion animations are removed).


## PassAuthProvider
a really bad app-password auth provider, inherited from TestFront and used in all my projects from TestFront to ForumTest (im very good at naming things). in ForumTest, its been superseded by the [OAuthProvider](https://tangled.sh/@whey.party/forumtest/blob/main/src/providers/OAuthProvider.tsx). i havent backported it here and maybe soon, although oauth makes it slightly more annoying to do development because it requires a tunnel so maybe someday if i managed to merge the password and oauth logins to provide both options

## Constellation
the beating heart of Red Dwarf, the backlink index that provides contextual information not available from direct PDS queries. Every post's likes, replies, and reposts all come from constellation. Unfortunately i wasnt using tanstack query at the time (compared to its intensive use in the old version of ForumTest) so it is not using any caching

Red Dwarf was made before Microcosm [Slingshot](https://slingshot.microcosm.blue) existed, and it would be a very good idea to migrate to it in the future maybe (to reduce load from individual PDS servers)

## Custom Feeds
they work, but i havent implemented a simple way of viewing arbitraty feeds. currently it either loads discover (logged out) or your saved feeds (logged in) and its not a technical limitation i just havent implemented it yet

## The Following Feed and List Feeds
they wont work at all
they need an appview or any feed server
in place of a following feed you can just use any custom feed that implements the following feed, like mine ([Fresh](https://bsky.app/profile/whey.party/feed/rinds))

and for list feeds, you can just use something like graze or skyfeed to input a list of users and output a custom feed

## Tanstack Router
it does the job, nothing very specific was used here