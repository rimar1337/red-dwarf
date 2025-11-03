import { createFileRoute } from "@tanstack/react-router";

import { Header } from "~/components/Header";

export const Route = createFileRoute("/feeds")({
  component: Feeds,
});

export function Feeds() {
  return (
    <div className="">
      <Header
        title={`Feeds`}
        backButtonCallback={() => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.assign("/");
          }
        }}
        bottomBorderDisabled={true}
      />
      Feeds page (coming soon)
    </div>
  );
}
