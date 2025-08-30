import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
  component: Settings,
});

export function Settings() {
  return <div className="p-6">Settings page (coming soon)</div>;
}
