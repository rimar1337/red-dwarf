import { createFileRoute } from "@tanstack/react-router";

import { Header } from "~/components/Header";

import { FollowsTab } from "../notifications";

export const Route = createFileRoute("/profile/$did/followers")({
  component: RouteComponent,
});

// todo: scroll restoration
function RouteComponent() {
  const params = Route.useParams();

  return (
    <div>
      <Header
        title={"Followers"}
        backButtonCallback={() => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.assign("/");
          }
        }}
      />
      <FollowsTab did={params.did} />
    </div>
  );
}
