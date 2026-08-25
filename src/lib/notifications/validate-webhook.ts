const SLACK_HOSTS = new Set(["hooks.slack.com"]);
const DISCORD_HOSTS = new Set(["discord.com", "discordapp.com"]);

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
  if (!SLACK_HOSTS.has(url.hostname)) return false;
  return /^\/services\/[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(url.pathname);
}

export function isDiscordWebhookUrl(value: string): boolean {
  const url = parseHttpsUrl(value);
  if (!url) return false;
  if (!DISCORD_HOSTS.has(url.hostname)) return false;
  return /^\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(url.pathname);
}

export function isTelegramChatId(value: string): boolean {
  return /^-?\d{1,20}$/.test(value.trim());
}
