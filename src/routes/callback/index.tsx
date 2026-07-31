import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { useAuth } from "~/providers/UnifiedAuthProvider";

export const Route = createFileRoute("/callback/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { status } = useAuth();

  // bug: tanstack router after commit 8ffb94077b6bee832565fa60357be6504e1809d8
  // cant handle synchronoous navigation (url change works, actual router doesnt)
  useEffect(() => {
    if (status === "loading") return;

    // const redirectPath = sessionStorage.getItem("postLoginRedirect");
    sessionStorage.removeItem("postLoginRedirect");

    // hardcoded assumption that all logins go through the settings page
    // related bug: useAuth status initially reports signedOut on callback route auth initialization
    navigate({ to: "/settings" });

    // not needed yet
    // const [path, query] = (redirectPath ?? "/").split("?");
    // const search = query
    //   ? Object.fromEntries(new URLSearchParams(query))
    //   : undefined;
    // navigate({ to: path || "/", search });
    return
  }, [status, navigate]);

  return <div>Signing you in...</div>;
}
