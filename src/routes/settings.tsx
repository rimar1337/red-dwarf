import { createFileRoute } from "@tanstack/react-router";

import { Header } from "~/components/Header";
import Login from "~/components/Login";

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
    </>
  );
}
