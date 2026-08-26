function parseHttpsUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

export function isSlackWebhookUrl(value: string): boolean {
  const url = parseHttpsUrl(value);
  if (!url) return false;
  if (url.hostname !== "hooks.slack.com") return false;
  return /^\/services\/[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(url.pathname);
}
