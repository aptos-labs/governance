import {createFileRoute, Link} from "@tanstack/react-router";
import {z} from "zod";
import {PageHeader} from "~/components/PageHeader";
import {unsubscribeNotifications} from "~/lib/notifications/server";

const searchSchema = z.object({
  token: z.string().catch(""),
});

export const Route = createFileRoute("/notifications/unsubscribe")({
  validateSearch: searchSchema,
  loaderDeps: ({search}) => ({token: search.token}),
  loader: async ({deps}) => {
    if (!deps.token) return {ok: true as const, removed: false, missing: true};
    const result = await unsubscribeNotifications({data: {token: deps.token}});
    return {...result, missing: false};
  },
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const result = Route.useLoaderData();

  return (
    <main>
      <PageHeader title="Unsubscribe" />
      <p className="mt-4 text-[var(--color-text-secondary)]">
        {result.missing
          ? "Missing unsubscribe token."
          : result.removed
            ? "This destination will no longer receive Aptos Governance alerts."
            : "This unsubscribe link is invalid or was already used."}
      </p>
      <p className="mt-6 text-sm">
        <Link to="/notifications" className="underline">
          Manage notifications
        </Link>
      </p>
    </main>
  );
}
