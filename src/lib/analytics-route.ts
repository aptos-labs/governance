/** Map a concrete pathname plus route params to a Vercel Analytics route pattern. */
export function analyticsRouteFromPath(
  pathname: string,
  params: Record<string, string | undefined>,
): string {
  let route = pathname;
  for (const [key, value] of Object.entries(params)) {
    if (!value) continue;
    route = route.replace(`/${value}`, `/[${key}]`);
  }
  return route;
}
