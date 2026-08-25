import {createFileRoute, Link} from "@tanstack/react-router";
import {PageHeader} from "~/components/PageHeader";
import {WebhookSubscribeForm} from "~/components/WebhookSubscribeForm";
import type {NotificationPublicConfig} from "~/lib/notifications/server";
import {getNotificationPublicConfig} from "~/lib/notifications/server";

export const Route = createFileRoute("/notifications/")({
  loader: () => getNotificationPublicConfig(),
  component: NotificationsPage,
});

function ChannelCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--color-border-light)] p-5">
      <h2 className="mb-3 text-2xl font-light">{title}</h2>
      {children}
    </section>
  );
}

function operatorChannels(config: NotificationPublicConfig): string[] {
  const names: string[] = [];
  if (config.envDestinations.slack) names.push("Slack");
  if (config.envDestinations.telegram) names.push("Telegram");
  if (config.envDestinations.discord) names.push("Discord");
  return names;
}

function NotificationsPage() {
  const config = Route.useLoaderData() as NotificationPublicConfig;

  return (
    <main>
      <PageHeader subtitle="Alerts" title="Notifications" />

      <p className="mb-8 max-w-3xl font-sans text-xl font-light">
        Subscribe a Slack channel, Telegram chat, or Discord webhook to Aptos
        Governance events: new proposals, voting results (pass or fail),
        execution, and ending-soon reminders.
      </p>

      {!config.durable ? (
        <p
          role="status"
          className="mb-6 rounded border border-[var(--color-warning)] p-4 text-sm"
        >
          User subscriptions need a durable store. Set{" "}
          <code>UPSTASH_REDIS_REST_URL</code> and{" "}
          <code>UPSTASH_REDIS_REST_TOKEN</code> on this deployment, or configure
          operator webhooks with <code>NOTIFICATIONS_SLACK_WEBHOOK_URL</code> /{" "}
          <code>NOTIFICATIONS_TELEGRAM_BOT_TOKEN</code>.
        </p>
      ) : null}

      {operatorChannels(config).length > 0 ? (
        <p className="mb-6 text-sm text-[var(--color-text-secondary)]">
          This deployment already posts to {operatorChannels(config).join(", ")}{" "}
          via environment variables.
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <ChannelCard title="Slack">
          <WebhookSubscribeForm
            channel="slack"
            placeholder="https://hooks.slack.com/services/…"
            help="In Slack, create an Incoming Webhook for the channel that should receive alerts, then paste the URL here."
          />
        </ChannelCard>

        <ChannelCard title="Telegram">
          {config.telegram.configured ? (
            <div className="space-y-3 text-sm">
              <p className="text-[var(--color-text-secondary)]">
                Open the governance bot and send <code>/subscribe</code>. In a
                group, add the bot first, then run <code>/subscribe</code>{" "}
                there. <code>/unsubscribe</code> stops alerts.
              </p>
              {config.telegram.deepLink ? (
                <a
                  href={config.telegram.deepLink}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-block rounded-lg bg-[var(--color-accent)] px-5 py-2 text-[1.05rem] text-[#121615] hover:brightness-[0.98]"
                >
                  Open Telegram bot
                </a>
              ) : (
                <p>
                  Bot token is configured. Set{" "}
                  <code>NOTIFICATIONS_TELEGRAM_BOT_USERNAME</code> to show a
                  direct link.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-secondary)]">
              Telegram is not configured on this deployment. Set{" "}
              <code>NOTIFICATIONS_TELEGRAM_BOT_TOKEN</code> (and optionally{" "}
              <code>NOTIFICATIONS_TELEGRAM_BOT_USERNAME</code>) to enable the
              bot.
            </p>
          )}
        </ChannelCard>
      </div>

      <div className="mt-8">
        <ChannelCard title="Discord">
          <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
            Slack and Telegram are the primary channels. Discord is available
            via a channel webhook.
          </p>
          <WebhookSubscribeForm
            channel="discord"
            placeholder="https://discord.com/api/webhooks/…"
            help="In Discord, edit the channel → Integrations → Webhooks, copy the URL, and paste it here."
          />
        </ChannelCard>
      </div>

      <p className="mt-10 text-sm text-[var(--color-text-secondary)]">
        <Link to="/" search={{page: 0, status: "all"}} className="underline">
          Back to proposals
        </Link>
      </p>
    </main>
  );
}
