import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/feeds")({
  component: Feeds,
});

export function Feeds() {
  return <div className="p-6">Feeds page (coming soon)</div>;
}
