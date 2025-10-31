import * as TabsPrimitive from "@radix-ui/react-tabs";
import { useAtom } from "jotai";
import { useEffect, useLayoutEffect } from "react";

import { isAtTopAtom, reusableTabRouteScrollAtom } from "~/utils/atoms";

/**
 * Please wrap your Route in a div, do not return a top-level fragment,
 * it will break navigation scroll restoration
 */
export function ReusableTabRoute({
  route,
  tabs,
}: {
  route: string;
  tabs: Record<string, React.ReactNode>;
}) {
  const [reusableTabState, setReusableTabState] = useAtom(
    reusableTabRouteScrollAtom
  );
  const [isAtTop] = useAtom(isAtTopAtom);

  const routeState = reusableTabState?.[route] ?? {
    activeTab: Object.keys(tabs)[0],
    scrollPositions: {},
  };
  const activeTab = routeState.activeTab;

  const handleValueChange = (newTab: string) => {
    setReusableTabState((prev) => {
      const current = prev?.[route] ?? routeState;
      return {
        ...prev,
        [route]: {
          ...current,
          scrollPositions: {
            ...current.scrollPositions,
            [current.activeTab]: window.scrollY,
          },
          activeTab: newTab,
        },
      };
    });
  };

  // // todo, warning experimental, usually this doesnt work,
  // // like at all, and i usually do this for each tab
  // useLayoutEffect(() => {
  //   const savedScroll = routeState.scrollPositions[activeTab] ?? 0;
  //   window.scrollTo({ top: savedScroll });
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [activeTab, route]);

  useLayoutEffect(() => {
    return () => {
      setReusableTabState((prev) => {
        const current = prev?.[route] ?? routeState;
        return {
          ...prev,
          [route]: {
            ...current,
            scrollPositions: {
              ...current.scrollPositions,
              [current.activeTab]: window.scrollY,
            },
          },
        };
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TabsPrimitive.Root
      value={activeTab}
      onValueChange={handleValueChange}
      className={`w-full`}
    >
      <TabsPrimitive.List
        className={`flex sticky top-[52px] bg-[var(--header-bg-light)] dark:bg-[var(--header-bg-dark)] z-[9] border-0 sm:border-b ${!isAtTop && "shadow-sm"} sm:shadow-none sm:dark:bg-gray-950 sm:bg-white border-gray-200 dark:border-gray-700`}
      >
        {Object.entries(tabs).map(([key]) => (
          <TabsPrimitive.Trigger key={key} value={key} className="m3tab">
            {key}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>

      {Object.entries(tabs).map(([key, node]) => (
        <TabsPrimitive.Content key={key} value={key} className="flex-1 min-h-[80dvh]">
          {activeTab === key && node}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}

export function useReusableTabScrollRestore(route: string) {
  const [reusableTabState] = useAtom(
    reusableTabRouteScrollAtom
  );

  const routeState = reusableTabState?.[route];
  const activeTab = routeState?.activeTab;

  useEffect(() => {
    const savedScroll = activeTab ? routeState?.scrollPositions[activeTab] ?? 0 : 0;
    //window.scrollTo(0, savedScroll);
    window.scrollTo({ top: savedScroll });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}


/*

  const [notifState] = useAtom(notificationsScrollAtom);
  const activeTab = notifState.activeTab;
  useEffect(() => {
    const savedY = notifState.scrollPositions[activeTab] ?? 0;
    window.scrollTo(0, savedY);
  }, [activeTab, notifState.scrollPositions]);

 */