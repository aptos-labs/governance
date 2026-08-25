import type {NotificationEventType} from "~/lib/notifications/types";
import {
  EVENT_TYPE_LABELS,
  NOTIFICATION_EVENT_TYPES,
} from "~/lib/notifications/types";

export function EventTypeFields({
  selected,
  onChange,
  name,
}: {
  selected: NotificationEventType[];
  onChange: (next: NotificationEventType[]) => void;
  name: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm text-[var(--color-text-secondary)]">
        Events
      </legend>
      {NOTIFICATION_EVENT_TYPES.map((type) => {
        const checked = selected.includes(type);
        return (
          <label
            key={type}
            className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]"
          >
            <input
              type="checkbox"
              name={`${name}-${type}`}
              checked={checked}
              onChange={() => {
                if (checked) {
                  onChange(selected.filter((item) => item !== type));
                } else {
                  onChange([...selected, type]);
                }
              }}
            />
            {EVENT_TYPE_LABELS[type]}
          </label>
        );
      })}
    </fieldset>
  );
}
