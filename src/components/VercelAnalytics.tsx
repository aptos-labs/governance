import {useParams, useRouterState} from "@tanstack/react-router";
import {Analytics} from "@vercel/analytics/react";
import {analyticsRouteFromPath} from "~/lib/analytics-route";

export function VercelAnalytics() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const params = useParams({strict: false});
  const route = analyticsRouteFromPath(pathname, params);

  return (
    <Analytics framework="tanstack-start" path={pathname} route={route} />
  );
}
