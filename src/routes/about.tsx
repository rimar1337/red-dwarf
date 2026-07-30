import { createFileRoute } from "@tanstack/react-router";
import React from "react";

import {
  FORCED_LABELER_DIDS,
  HOST_ABOUT_MARKDOWN,
  HOST_ADMIN,
  HOST_DESCRIPTION,
  HOST_HERO,
  HOST_LABELMERGE,
  HOST_SIGNUP_PDS,
} from "~/../policy";
import { Header } from "~/components/Header";
import {
  defaultAppviewURL,
  defaultconstellationURL,
  defaultImgCDN,
  defaultLycanURL,
  defaultslingshotURL,
  defaultVideoCDN,
} from "~/utils/atoms";

import { HARDCODED_TEXT, ProfileSmall } from "./__root";
import { NotificationItem } from "./notifications";
//import { SettingHeading } from './settings';

declare const __INSTANCE_MODEL__: boolean

export const Route = createFileRoute("/about")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="">
      <Header
        title={`About ${__INSTANCE_MODEL__ ? window.location.host : "Red Dwarf"}`}
        backButtonCallback={() => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.assign("/");
          }
        }}
        bottomBorderDisabled={false}
      />
      <div className="flex flex-col justify-around mt-4 mx-4 gap-4">
        <img className="rounded-sm" src={HOST_HERO} />
        <span className=" text-gray-500 dark:text-gray-400 leading-tight">
          <span className=" font-bold">{__INSTANCE_MODEL__ ? window.location.host : "Red Dwarf"}</span> {HARDCODED_TEXT}
        </span>
        {/* <img className="rounded-sm" src={HOST_HERO} /> */}
        {__INSTANCE_MODEL__ && (<span className=" text-gray-500 dark:text-gray-400">
          {HOST_DESCRIPTION}
        </span>)}
        <div className="flex flex-col gap-1 p-4 border-1 border-gray-200 dark:border-gray-700 rounded-3xl">
          <span className="text-gray-500 dark:text-gray-400 font-bold">
            {__INSTANCE_MODEL__ ? "ADMINISTERED BY:" : "APP PROFILE:"}
          </span>
          <ProfileSmall did={HOST_ADMIN} />
        </div>

        <PolicyMarkdown source={HOST_ABOUT_MARKDOWN} />
      </div>
    </div>
  );
}

const REQUIRED_COMPONENTS = ["PolicyViewer"];

const COMPONENT_MAP: Record<string, React.FC> = {
  // todo replace with actual policy viewer
  PolicyViewer: () => <PolicyViewer />,
};

function PolicyViewer() {
  return (
    <>
      {/* TODO: render all of the layered overlay enforced moderation stuff here or something idk. 
  still waiting on the server-sided queryLabels proxy and layered moderation spec and also feature bounded moderation spec to finish */}
      <PolicyRenderer />
    </>
  );
}

function assertRequiredComponents(input: string) {
  for (const name of REQUIRED_COMPONENTS) {
    const pattern = new RegExp(`<${name}\\s*/>`);
    if (!pattern.test(input)) {
      throw new Error(`Missing required policy component: <${name} />`);
    }
  }
}

function renderInline(text: string) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(text))) {
    const [full, label, url] = match;
    const start = match.index;

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    parts.push(
      <a
        key={start}
        href={url}
        className="underline"
        style={{ color: "var(--link-text-color)" }}
      >
        {label}
      </a>,
    );

    lastIndex = start + full.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
export function Heading2({ title }: { title: string }) {
  return (
    <span className="text-gray-700 dark:text-gray-300 font-medium text-xl pt-2 pb-1">
      {title}
    </span>
  );
}
export function Heading3({ title }: { title: string }) {
  return (
    <span className="text-gray-700 dark:text-gray-300 font-medium text-lg pt-2 pb-1">
      {title}
    </span>
  );
}
export function Heading4({ title }: { title: string }) {
  return (
    <span className="text-gray-600 dark:text-gray-400 font-medium text pt-0.5 pb-0">
      {title}
    </span>
  );
}
export function PolicyMarkdown({ source }: { source: string }) {
  assertRequiredComponents(source);

  const blocks = source
    .split(/\n{2,}/) // 2+ line breaks = new block
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="policy-doc flex flex-col gap-2">
      {blocks.map((block, i) => {
        // Section heading
        if (block.startsWith("## ")) {
          const title = block.slice(3).trim();
          return <Heading2 key={i} title={title} />;
        }

        // Self-closing component
        const componentMatch = block.match(/^<([A-Z][A-Za-z0-9_]*)\s*\/>$/);
        if (componentMatch) {
          const name = componentMatch[1];
          const Component = COMPONENT_MAP[name];

          if (!Component) {
            throw new Error(`Unknown policy component: <${name} />`);
          }

          return <Component key={i} />;
        }

        // Paragraph
        return (
          <p key={i} className="text-gray-500 dark:text-gray-400">
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
}

function PolicyRenderer() {
  //
  // policy.ts vars to show:

  // endorsed feeds (or should it be part of unauthed default experience?)
  // endorsed feeds (should be shown in the explore tab too in lieu of feed discovery)
  // - [ ] HOST_UNAUTHED_DEFAULT_FEEDS
  // endorsed PDS
  // - [x] HOST_SIGNUP_PDS
  // todo move the other default services into policy.ts
  // todo re- sort policy.ts according to this component
  // also the default services used like microcosm stuff and lycan and maybe the reliance of an appview for search or some other hting

  // default general host moderation policies
  // todo: layerd moderataion later pls thanks
  // show the labelmerge insstance responsible
  // - [x] HOST_LABELMERGE
  // show both the whitelisted source and labeler dids in the same spot.
  // like on hover / click it opens a dialog / popover to show what authority the labeler has
  // - [x] FORCED_LABELER_DIDS
  // - [ ] FORCE_HIDE_LABELS_WHITELISTED_SOURCE
  // - [ ] FORCE_HIDE_LABELS
  const hostmandate = FORCED_LABELER_DIDS;

  // unauthed experience
  // - [ ] UNAUTHED_FORCE_WARN_LABELS
  // - [ ] UNAUTHED_PREVENT_OPENING_WARNS

  return (
    <>
      {/* settings heading or about heading? */}
      {__INSTANCE_MODEL__ && (
        <>
          <Heading3 title={`Instance Configuration`} />
          <KeyValueGrid
            items={[
              {
                label: "PDS Signups (Account Storage):",
                value: HOST_SIGNUP_PDS || "",
              },
              {
                label: "Labelmerge (Label Cache):",
                value: HOST_LABELMERGE,
              },
            ]}
          />
        </>
      )}
      <Heading3 title={`${__INSTANCE_MODEL__ ? "Instance Defaults" : "Defaults"}`} />
      <KeyValueGrid
        items={[
          {
            label: "Constellation (Backlink Index):",
            value: defaultconstellationURL,
            //italicIfEmpty: true,
          },
          {
            label: "Slingshot (Record Cache):",
            value: defaultslingshotURL,
          },
          {
            label: "Image Provider (CDN):",
            value: defaultImgCDN,
          },
          {
            label: "Video Provider (CDN):",
            value: defaultVideoCDN,
          },
          {
            label: "Lycan (Personal Search):",
            value: defaultLycanURL,
          },
          {
            label: "AppView (Bluesky Index):",
            value: defaultAppviewURL,
          },
        ]}
      />
      {/* {hostmandate && (<Heading2 title="Host-Mandated Labelers" />)} */}
      {__INSTANCE_MODEL__ && (
        <>
          <Heading3 title="General Moderation" />
          {hostmandate && <Heading4 title="Host-Mandated Labelers" />}
          {hostmandate?.map((labeler) => {
            return (
              // todo this sucks
              <NotificationItem
                key={labeler}
                notification={labeler}
                labeler={true}
                disablefollow={true}
              />
            );
          })}
        </>
      )}
      <div className="h-[300px] w-auto" />
    </>
  );
}

type KeyValueItem = {
  label: string;
  value?: string | null;
  //italicIfEmpty?: boolean
};

interface KeyValueGridProps {
  items: KeyValueItem[];
  className?: string;
}

export function KeyValueGrid({ items, className = "" }: KeyValueGridProps) {
  return (
    <div
      className={`grid grid-cols-2 gap-x-2 gap-y-2 text-sm mr-auto ml-2 ${className}`}
    >
      {items.map((item, i) => {
        const isEmpty = !item.value;

        return (
          <React.Fragment key={i}>
            {/* Label */}
            <span className="font-medium text-gray-500 dark:text-gray-400">
              {item.label}
            </span>

            {/* Value */}
            <span
              className={
                isEmpty
                  ? "text-gray-400 dark:text-gray-500 italic"
                  : "text-gray-600 dark:text-gray-300"
              }
            >
              {item.value || "not set"}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}
