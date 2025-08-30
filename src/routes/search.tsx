import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/search")({
  component: Search,
});

export function Search() {
  return <div className="p-6">Search page (coming soon)</div>;
}
