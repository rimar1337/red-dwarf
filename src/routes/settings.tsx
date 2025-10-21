import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";

import { Header } from "~/components/Header";
import Login from "~/components/Login";
import {
  constellationURLAtom,
  defaultconstellationURL,
  defaultImgCDN,
  defaultslingshotURL,
  defaultVideoCDN,
  imgCDNAtom,
  slingshotURLAtom,
  videoCDNAtom,
} from "~/utils/atoms";

export const Route = createFileRoute("/settings")({
  component: Settings,
});

export function Settings() {
  return (
    <>
      <Header
        title="Settings"
        backButtonCallback={() => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.assign("/");
          }
        }}
      />
      <div className="lg:hidden"><Login /></div>
      <div className="h-4" />
      <TextInputSetting
        atom={constellationURLAtom}
        title={"Constellation"}
        description={
          "Customize the Constellation instance to be used by Red Dwarf"
        }
        init={defaultconstellationURL}
      />
      <TextInputSetting
        atom={slingshotURLAtom}
        title={"Slingshot"}
        description={"Customize the Slingshot instance to be used by Red Dwarf"}
        init={defaultslingshotURL}
      />
      <TextInputSetting
        atom={imgCDNAtom}
        title={"Image CDN"}
        description={
          "Customize the Constellation instance to be used by Red Dwarf"
        }
        init={defaultImgCDN}
      />
      <TextInputSetting
        atom={videoCDNAtom}
        title={"Video CDN"}
        description={"Customize the Slingshot instance to be used by Red Dwarf"}
        init={defaultVideoCDN}
      />
      <p className="text-gray-500 dark:text-gray-400 py-4 px-6 text-sm">please restart/refresh the app if changes arent applying correctly</p>
    </>
  );
}

export function TextInputSetting({
  atom,
  title,
  description,
  init,
}: {
  atom: typeof constellationURLAtom;
  title?: string;
  description?: string;
  init?: string;
}) {
  const [value, setValue] = useAtom(atom);
  return (
    <div className="flex flex-col gap-2 px-4 py-2">
      {/* <div>
        {title && (
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {title}
          </h3>
        )}
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div> */}

      <div className="flex flex-row gap-2 items-center">
        <div className="m3input-field m3input-label m3input-border size-md flex-1">
          <input type="text" placeholder=" " value={value} onChange={(e) => setValue(e.target.value)}/>
          <label>{title}</label>
        </div>
        {/* <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 
                     text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 
                     focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600"
          placeholder="Enter value..."
        /> */}
        <button
          onClick={() => setValue(init ?? "")}
          className="px-6 py-2 h-12 rounded-full bg-gray-100 dark:bg-gray-800 
                     text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          Reset
        </button>
      </div>
    </div>
  );
}