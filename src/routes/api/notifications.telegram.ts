import {createFileRoute} from "@tanstack/react-router";
import {telegramWebhookAuthorized} from "~/lib/notifications/auth";
import {resolveNotificationConfig} from "~/lib/notifications/config";
import {getNotificationStore} from "~/lib/notifications/store";
import {
  handleTelegramCommand,
  replyTelegram,
  type TelegramUpdate,
  telegramChatIdFromUpdate,
} from "~/lib/notifications/telegram";

export const Route = createFileRoute("/api/notifications/telegram")({
  server: {
    handlers: {
      POST: async ({request}) => {
        const config = resolveNotificationConfig();
        if (!telegramWebhookAuthorized(request, config.telegramWebhookSecret)) {
          return Response.json({error: "Unauthorized"}, {status: 401});
        }
        if (!config.telegramBotToken) {
          return Response.json({ok: true, ignored: true});
        }

        let update: TelegramUpdate;
        try {
          update = (await request.json()) as TelegramUpdate;
        } catch {
          return Response.json({error: "Invalid JSON"}, {status: 400});
        }

        const chatId = telegramChatIdFromUpdate(update);
        const text = update.message?.text;
        if (!chatId || !text) {
          return Response.json({ok: true});
        }

        const store = getNotificationStore(config);
        const reply = await handleTelegramCommand({
          text,
          chatId,
          store,
          config,
        });
        await replyTelegram(config, chatId, reply.text).catch((error) => {
          console.error("[notifications] telegram reply failed", error);
        });
        return Response.json({ok: true});
      },
    },
  },
});
