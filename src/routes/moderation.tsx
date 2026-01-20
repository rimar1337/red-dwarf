import * as ATPAPI from "@atproto/api";
import {
  isAdultContentPref,
  isBskyAppStatePref,
  isContentLabelPref,
  isFeedViewPref,
  isLabelersPref,
  isMutedWordsPref,
  isSavedFeedsPref,
} from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { Switch } from "radix-ui";

import { Header } from "~/components/Header";
import { useModeration } from "~/hooks/useModeration";
import { useAuth } from "~/providers/UnifiedAuthProvider";
import { quickAuthAtom } from "~/utils/atoms";
import { useQueryIdentity, useQueryPreferences } from "~/utils/useQuery";

import { renderSnack } from "./__root";
import { NotificationItem } from "./notifications";
import { SettingHeading } from "./settings";

export const Route = createFileRoute("/moderation")({
  component: RouteComponent,
});

function RouteComponent() {
  const { agent } = useAuth();

  const [quickAuth] = useAtom(quickAuthAtom);
  const isAuthRestoring = quickAuth ? status === "loading" : false;

  const identityresultmaybe = useQueryIdentity(
    !isAuthRestoring ? agent?.did : undefined,
  );
  const identity = identityresultmaybe?.data;

  const prefsresultmaybe = useQueryPreferences({
    agent: !isAuthRestoring ? (agent ?? undefined) : undefined,
    pdsUrl: !isAuthRestoring ? identity?.pds : undefined,
  });
  const rawprefs = prefsresultmaybe?.data?.preferences as
    | ATPAPI.AppBskyActorGetPreferences.OutputSchema["preferences"]
    | undefined;

  const parsedPref = parsePreferences(rawprefs);

  return (
    <div>
      <Header
        title={`Moderation`}
        backButtonCallback={() => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.assign("/");
          }
        }}
        bottomBorderDisabled={true}
      />
      {/* <SettingHeading title="Moderation Tools" />
      <p>
        todo: add all these:
        <br />
        - Interaction settings
        <br />
        - Muted words & tags
        <br />
        - Moderation lists
        <br />
        - Muted accounts
        <br />
        - Blocked accounts
        <br />
        - Verification settings
        <br />
      </p> */}
      <SettingHeading title="Content Filters" />
      <div>
        <div className="flex items-center gap-4 px-4 py-2 border-b">
          <label
            htmlFor={`switch-${"hardcoded"}`}
            className="flex flex-row flex-1"
          >
            <div className="flex flex-col">
              <span className="text-md">{"Adult Content"}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {"Enable adult content"}
              </span>
            </div>
          </label>

          <Switch.Root
            id={`switch-${"hardcoded"}`}
            checked={parsedPref?.adultContentEnabled}
            onCheckedChange={() => {
              renderSnack({
                title: "Sorry... Modifying preferences is not implemented yet",
                description: "You can use another app to change preferences",
                //button: { label: 'Try Again', onClick: () => console.log('whatever') },
              });
            }}
            className="m3switch root"
          >
            <Switch.Thumb className="m3switch thumb " />
          </Switch.Root>
        </div>

        <TestModeration subject="did:plc:q7suwaz53ztc4mbiqyygbn43" />
        <TestModeration subject="did:plc:fpruhuo22xkm5o7ttr2ktxdo" />
        <TestModeration subject="did:plc:6ayddqghxhciedbaofoxkcbs" />
        <TestModeration subject="did:plc:za2ezszbzyqer7eylvtgapd5" />
        <TestModeration subject="did:plc:ia76kvnndjutgedggx2ibrem" />
        <TestModeration subject="did:plc:w2wbinubagmo4hlxx2ik5rrp" />
        <div className="">
          {Object.entries(parsedPref?.contentLabelPrefs ?? {}).map(
            ([label, visibility]) => (
              <div
                key={label}
                className="flex justify-between border-b py-2 px-4"
              >
                <label
                  htmlFor={`switch-${"hardcoded"}`}
                  className="flex flex-row flex-1"
                >
                  <div className="flex flex-col">
                    <span className="text-md">{label}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {"uknown labeler"}
                    </span>
                  </div>
                </label>
                {/* <span className="text-md text-gray-500 dark:text-gray-400">
                  {visibility}
                </span> */}
                <TripleToggle
                  value={visibility as "ignore" | "warn" | "hide"}
                />
              </div>
            ),
          )}
        </div>
      </div>
      <SettingHeading title="Advanced" />
      {parsedPref?.labelers.map((labeler) => {
        return (
          <NotificationItem
            key={labeler}
            notification={labeler}
            labeler={true}
          />
        );
      })}
    </div>
  );
}

export function TripleToggle({
  value,
  onChange,
}: {
  value: "ignore" | "warn" | "hide";
  onChange?: (newValue: "ignore" | "warn" | "hide") => void;
}) {
  const options: Array<"ignore" | "warn" | "hide"> = ["ignore", "warn", "hide"];
  return (
    <div className="flex rounded-full bg-gray-200 dark:bg-gray-800 p-1 text-sm">
      {options.map((opt) => {
        const isActive = opt === value;
        return (
          <button
            key={opt}
            onClick={() => {
              renderSnack({
                title: "Sorry... Modifying preferences is not implemented yet",
                description: "You can use another app to change preferences",
                //button: { label: 'Try Again', onClick: () => console.log('whatever') },
              });
              onChange?.(opt);
            }}
            className={`flex-1 px-3 py-1.5 rounded-full transition-colors ${isActive
              ? "bg-gray-400 dark:bg-gray-600 text-white"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
              }`}
          >
            {" "}
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </button>
        );
      })}
    </div>
  );
}

type PrefItem =
  ATPAPI.AppBskyActorGetPreferences.OutputSchema["preferences"][number];

export interface NormalizedPreferences {
  contentLabelPrefs: Record<string, string>;
  mutedWords: string[];
  feedViewPrefs: Record<string, any>;
  labelers: string[];
  adultContentEnabled: boolean;
  savedFeeds: {
    pinned: string[];
    saved: string[];
  };
  nuxs: string[];
}

export function parsePreferences(
  prefs?: PrefItem[],
): NormalizedPreferences | undefined {
  if (!prefs) return undefined;
  const normalized: NormalizedPreferences = {
    contentLabelPrefs: {},
    mutedWords: [],
    feedViewPrefs: {},
    labelers: [],
    adultContentEnabled: false,
    savedFeeds: { pinned: [], saved: [] },
    nuxs: [],
  };

  for (const pref of prefs) {
    switch (pref.$type) {
      case "app.bsky.actor.defs#contentLabelPref":
        if (!isContentLabelPref(pref)) break;
        normalized.contentLabelPrefs[pref.label] = pref.visibility;
        break;

      case "app.bsky.actor.defs#mutedWordsPref":
        if (!isMutedWordsPref(pref)) break;
        for (const item of pref.items ?? []) {
          normalized.mutedWords.push(item.value);
        }
        break;

      case "app.bsky.actor.defs#feedViewPref":
        if (!isFeedViewPref(pref)) break;
        normalized.feedViewPrefs[pref.feed] = pref;
        break;

      case "app.bsky.actor.defs#labelersPref":
        if (!isLabelersPref(pref)) break;
        normalized.labelers.push(...(pref.labelers?.map((l) => l.did) ?? []));
        break;

      case "app.bsky.actor.defs#adultContentPref":
        if (!isAdultContentPref(pref)) break;
        normalized.adultContentEnabled = !!pref.enabled;
        break;

      case "app.bsky.actor.defs#savedFeedsPref":
        if (!isSavedFeedsPref(pref)) break;
        normalized.savedFeeds.pinned.push(...(pref.pinned ?? []));
        normalized.savedFeeds.saved.push(...(pref.saved ?? []));
        break;

      case "app.bsky.actor.defs#bskyAppStatePref":
        if (!isBskyAppStatePref(pref)) break;
        normalized.nuxs.push(...(pref.nuxs?.map((n) => n.id) ?? []));
        break;

      default:
        // unknown pref type — just ignore for now
        break;
    }
  }

  return normalized;
}


export function TestModeration({ subject }: { subject: string }) {
  return (
    <>
      {/* Test the moderation system */}
      <div className="px-4 py-2 border-b">
        <div className="flex flex-col">
          <span className="text-md font-medium">Moderation System Test</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Testing useModeration hook with example content
          </span>
          <ModerationInner subject={subject} />
        </div>
      </div>
    </>
  )

}

export function ModerationInner({ subject }: { subject: string }) {
  const { isLoading: moderationLoading, labels: testLabels } = useModeration(
    subject,
  );

  return (<>{moderationLoading ? (
    <span className="text-sm text-blue-500">
      Loading moderation data...
    </span>
  ) : (
    <div className="mt-2">
      <span className="text-sm">
        Found {testLabels.length} labels for {subject}
      </span>
      {testLabels.map((label, index) => (
        <div
          key={index}
          className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1"
        >
          <span className="font-medium">{label.val}</span> -{" "}
          {label.preference} (from {label.sourceDid})
        </div>
      ))}
    </div>
  )}</>)
}