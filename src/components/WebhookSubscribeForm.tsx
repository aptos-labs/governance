import {useState} from "react";
import {ApiErrorAlert} from "~/components/ApiErrorAlert";
import {EventTypeFields} from "~/components/EventTypeFields";
import {subscribeWebhook} from "~/lib/notifications/server";
import type {NotificationEventType} from "~/lib/notifications/types";
import {NOTIFICATION_EVENT_TYPES} from "~/lib/notifications/types";

export function WebhookSubscribeForm({
  channel,
  placeholder,
  help,
}: {
  channel: "slack" | "discord";
  placeholder: string;
  help: string;
}) {
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<NotificationEventType[]>([
    ...NOTIFICATION_EVENT_TYPES,
  ]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={async (submitEvent) => {
        submitEvent.preventDefault();
        setPending(true);
        setError(null);
        setSuccess(null);
        try {
          const result = await subscribeWebhook({
            data: {channel, url, events},
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setUrl("");
          setSuccess(
            result.created
              ? `Subscribed. A confirmation was posted to your ${channel} channel.`
              : `Updated the events for this ${channel} webhook.`,
          );
        } catch (caught) {
          setError(caught);
        } finally {
          setPending(false);
        }
      }}
    >
      {error ? <ApiErrorAlert error={error} /> : null}
      {success ? (
        <p role="status" className="text-sm text-[var(--color-success)]">
          {success}
        </p>
      ) : null}
      <label className="block space-y-1 text-sm">
        <span>Webhook URL</span>
        <input
          type="url"
          required
          value={url}
          placeholder={placeholder}
          onChange={(event) => setUrl(event.target.value)}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-[var(--color-text-primary)]"
        />
      </label>
      <p className="text-sm text-[var(--color-text-secondary)]">{help}</p>
      <EventTypeFields name={channel} selected={events} onChange={setEvents} />
      <button
        type="submit"
        disabled={pending || events.length === 0}
        className="rounded-lg bg-[var(--color-accent)] px-5 py-2 text-[1.05rem] text-[#121615] hover:brightness-[0.98] disabled:opacity-50"
      >
        {pending ? "Subscribing…" : "Subscribe"}
      </button>
    </form>
  );
}
