import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";

import { Header } from "~/components/Header";
import Login from "~/components/Login";
import {
  constellationURLAtom,
  defaultconstellationURL,
  defaultslingshotURL,
  slingshotURLAtom,
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
      <Login />
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
      <span className="text-gray-500 dark:text-gray-400 py-4 px-6">please restart/refresh the app if changes arent applying correctly</span>
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
    <div className="flex flex-col gap-2 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 ">
      <div>
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
      </div>

      <div className="flex flex-row gap-2 items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 
                     text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 
                     focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600"
          placeholder="Enter value..."
        />
        <button
          onClick={() => setValue(init ?? "")}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 
                     text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
