import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Slider, Switch } from "radix-ui";
import { useEffect, useState } from "react";

import { HOST_TITLE } from "~/../policy";
import { Header } from "~/components/Header";
import Login from "~/components/Login";
import { useAuth } from "~/providers/UnifiedAuthProvider";
import {
  appviewUrlAtom,
  constellationURLAtom,
  defaultAppviewURL,
  defaultconstellationURL,
  defaulthue,
  defaultImgCDN,
  defaultLycanURL,
  defaultslingshotURL,
  defaultVideoCDN,
  enableAppViewAtom,
  enableBitesAtom,
  enableBridgyTextAtom,
  enableWafrnTextAtom,
  hueAtom,
  imgCDNAtom,
  lycanURLAtom,
  slingshotURLAtom,
  videoCDNAtom,
} from "~/utils/atoms";

import { MaterialNavItem } from "./__root";

export const Route = createFileRoute("/settings")({
  component: Settings,
});

export function Settings() {
  const navigate = useNavigate();
  const { agent } = useAuth();
  const [isAppViewEnabled] = useAtom(enableAppViewAtom);
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
      {/* <div className="lg:hidden"> */}
      <div className="flex flex-col justify-around mt-4">
        <SettingHeading title="Account Management" top />
        <div className="mx-4">
          <Login />
        </div>
      </div>
      {/* Small viewport nav overflow */}
      <div className="sm:hidden flex flex-col justify-around mt-4">
        <SettingHeading title="Other Pages" top />
        <MaterialNavItem
          visible={!agent?.did}
          InactiveIcon={<IconMaterialSymbolsSearch className="w-6 h-6" />}
          ActiveIcon={<IconMaterialSymbolsSearch className="w-6 h-6" />}
          active={false}
          onClickCallbback={() =>
            navigate({
              to: "/search",
              //params: { did: agent.assertDid },
            })
          }
          text="Search"
        />
        <MaterialNavItem
          visible={!!agent?.did}
          InactiveIcon={<IconMaterialSymbolsTag className="w-6 h-6" />}
          ActiveIcon={<IconMaterialSymbolsTag className="w-6 h-6" />}
          active={false}
          onClickCallbback={() =>
            navigate({
              to: "/feeds",
              //params: { did: agent.assertDid },
            })
          }
          text="Feeds"
        />
        <MaterialNavItem
          visible={!!agent?.did}
          InactiveIcon={<IconMdiShieldOutline className="w-6 h-6" />}
          ActiveIcon={<IconMdiShield className="w-6 h-6" />}
          active={false}
          onClickCallbback={() =>
            navigate({
              to: "/moderation",
              //params: { did: agent.assertDid },
            })
          }
          text="Moderation"
        />
        <MaterialNavItem
          visible={true}
          InactiveIcon={<IconMaterialSymbolsInfoOutline className="w-6 h-6" />}
          ActiveIcon={<IconMaterialSymbolsInfoOutline className="w-6 h-6" />}
          active={false}
          onClickCallbback={() =>
            navigate({
              to: "/about",
              //params: { did: agent.assertDid },
            })
          }
          text="About"
        />
      </div>
      {/* <div className="lg:hidden sm:flex hidden flex-col justify-around mt-4"> */}
      {/* Large viewport nav overflow */}
      <div className=" sm:flex hidden flex-col justify-around mt-4">
        <SettingHeading title="Other Pages" top />
        <MaterialNavItem
          visible={true}
          InactiveIcon={<IconMaterialSymbolsInfoOutline className="w-6 h-6" />}
          ActiveIcon={<IconMaterialSymbolsInfoOutline className="w-6 h-6" />}
          active={false}
          onClickCallbback={() =>
            navigate({
              to: "/about",
              //params: { did: agent.assertDid },
            })
          }
          text="About"
        />
      </div>
      <div className="h-4" />

      <SettingHeading title="Personalization" top />
      <Hue />

      <SettingHeading title="Network Configuration" />
      <div className="flex flex-col px-4 pb-2">
        <span className="text-md">Service Endpoints</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Customize the servers to be used by the app
        </span>
      </div>
      <TextInputSetting
        atom={constellationURLAtom}
        title={"Constellation"}
        description={
          "Customize the Constellation instance to be used by " + HOST_TITLE
        }
        init={defaultconstellationURL}
      />
      <TextInputSetting
        atom={slingshotURLAtom}
        title={"Slingshot"}
        description={"Customize the Slingshot instance to be used by " + HOST_TITLE}
        init={defaultslingshotURL}
      />
      <TextInputSetting
        atom={imgCDNAtom}
        title={"Image CDN"}
        description={
          "Customize the Constellation instance to be used by " + HOST_TITLE
        }
        init={defaultImgCDN}
      />
      <TextInputSetting
        atom={videoCDNAtom}
        title={"Video CDN"}
        description={"Customize the Slingshot instance to be used by " + HOST_TITLE}
        init={defaultVideoCDN}
      />
      <TextInputSetting
        atom={lycanURLAtom}
        title={"Lycan Search"}
        description={"Enable text search across posts you've interacted with"}
        init={defaultLycanURL}
      />

      <SettingHeading title="Experimental" />
      <SwitchSetting
        atom={enableBitesAtom}
        title={"Bites"}
        description={"Enable Wafrn Bites to bite and be bitten by other people"}
        //init={false}
      />
      <div className="h-4" />
      <SwitchSetting
        atom={enableBridgyTextAtom}
        title={"Bridgy Text"}
        description={
          "Show the original text of posts bridged from the Fediverse"
        }
        //init={false}
      />
      <div className="h-4" />
      <SwitchSetting
        atom={enableWafrnTextAtom}
        title={"Wafrn Text"}
        description={"Show the original text of posts from Wafrn instances"}
        //init={false}
      />
      <div className="h-4" />
      <SwitchSetting
        atom={enableAppViewAtom}
        title={"AppView-First"}
        description={"Prioritize using an AppView to fetch posts before using microcosm"}
        //init={false}
      />
      <div className={`${isAppViewEnabled ? "" : "opacity-50  pointer-events-none"}`}>
        <div className="h-4" />
        <TextInputSetting
          atom={appviewUrlAtom}
          title={"AppView URL"}
          description={"Enable text search across posts you've interacted with"}
          init={defaultAppviewURL}
        />
      </div>
      <p className="text-gray-500 dark:text-gray-400 py-4 px-4 text-sm border rounded-xl mx-4 mt-8 mb-4">
        Notice: Please restart/refresh the app if changes arent applying
        correctly
      </p>
      <div className="h-60" />
    </>
  );
}

export function SettingHeading({
  title,
  top,
}: {
  title: string;
  top?: boolean;
}) {
  return (
    <div
      className="px-4"
      style={{ marginTop: top ? 0 : 18, paddingBottom: 12 }}
    >
      <span className=" text-sm font-medium text-gray-500 dark:text-gray-400">
        {title}
      </span>
    </div>
  );
}

export function SwitchSetting({
  atom,
  title,
  description,
}: {
  atom: typeof enableBitesAtom;
  title?: string;
  description?: string;
}) {
  const value = useAtomValue(atom);
  const setValue = useSetAtom(atom);

  const [hydrated, setHydrated] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setHydrated(true), []);

  if (!hydrated) {
    // Avoid rendering Switch until we know storage is loaded
    return null;
  }

  return (
    <div className="flex items-center gap-4 px-4 ">
      <label htmlFor={`switch-${title}`} className="flex flex-row flex-1">
        <div className="flex flex-col">
          <span className="text-md">{title}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </span>
        </div>
      </label>

      <Switch.Root
        id={`switch-${title}`}
        checked={value}
        onCheckedChange={(v) => setValue(v)}
        className="m3switch root"
      >
        <Switch.Thumb className="m3switch thumb " />
      </Switch.Root>
    </div>
  );
}

function Hue() {
  const [hue, setHue] = useAtom(hueAtom);
  return (
    <div className="flex flex-col px-4">
      <span className="z-[2] text-md">Hue</span>
      <span className="z-[2] text-sm text-gray-500 dark:text-gray-400">
        Change the colors of the app
      </span>
      <div className="z-[1] flex flex-row items-center gap-4">
        <SliderComponent atom={hueAtom} max={360} />
        <button
          onClick={() => setHue(defaulthue ?? 28)}
          className="px-6 py-2 h-12 rounded-full bg-gray-100 dark:bg-gray-800 
                     text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          Reset
        </button>
      </div>
    </div>
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
          <input
            type="text"
            placeholder=" "
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
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

interface SliderProps {
  atom: typeof hueAtom;
  min?: number;
  max?: number;
  step?: number;
}

export const SliderComponent: React.FC<SliderProps> = ({
  atom,
  min = 0,
  max = 100,
  step = 1,
}) => {
  const [value, setValue] = useAtom(atom);

  return (
    <Slider.Root
      className="relative flex items-center w-full h-4"
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={(v: number[]) => setValue(v[0])}
    >
      <Slider.Track className="relative flex-grow h-4 bg-gray-300 dark:bg-gray-700 rounded-full">
        <Slider.Range className="absolute h-full bg-gray-500 dark:bg-gray-400 rounded-l-full rounded-r-none" />
      </Slider.Track>
      <Slider.Thumb className="shadow-[0_0_0_8px_var(--color-white)] dark:shadow-[0_0_0_8px_var(--color-gray-950)] block w-[3px] h-12 bg-gray-500 dark:bg-gray-400 rounded-md focus:outline-none" />
    </Slider.Root>
  );
};


interface SliderPProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
}


export const SliderPrimitive: React.FC<SliderPProps> = ({
  value,
  min = 0,
  max = 100,
  step = 1,
}) => {

  return (
    <Slider.Root
      className="relative flex items-center w-full h-4"
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={(v: number[]) => {}}
    >
      <Slider.Track className="relative flex-grow h-4 bg-gray-300 dark:bg-gray-700 rounded-full">
        <Slider.Range className="absolute h-full bg-gray-500 dark:bg-gray-400 rounded-l-full rounded-r-none" />
      </Slider.Track>
      <Slider.Thumb className=" hidden shadow-[0_0_0_8px_var(--color-white)] dark:shadow-[0_0_0_8px_var(--color-gray-950)] block w-[3px] h-12 bg-gray-500 dark:bg-gray-400 rounded-md focus:outline-none" />
    </Slider.Root>
  );
};
