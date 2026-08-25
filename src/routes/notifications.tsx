import {createFileRoute, Outlet} from "@tanstack/react-router";

export const Route = createFileRoute("/notifications")({
  component: NotificationsLayout,
});

function NotificationsLayout() {
  return <Outlet />;
}
