import {isProductionRuntime} from "~/lib/notifications/config";

export function cronAuthorized(
  request: Request,
  cronSecret: string | undefined,
): boolean {
  const header = request.headers.get("authorization");
  const bearer = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  const querySecret = new URL(request.url).searchParams.get("secret");
  const provided = bearer || querySecret || undefined;

  if (cronSecret) {
    return provided === cronSecret;
  }
  return !isProductionRuntime();
}
