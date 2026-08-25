// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {useState} from "react";
import {afterEach, describe, expect, it} from "vitest";
import {EventTypeFields} from "~/components/EventTypeFields";
import type {NotificationEventType} from "~/lib/notifications/types";
import {NOTIFICATION_EVENT_TYPES} from "~/lib/notifications/types";

function Harness() {
  const [selected, setSelected] = useState<NotificationEventType[]>([
    ...NOTIFICATION_EVENT_TYPES,
  ]);
  return (
    <EventTypeFields name="slack" selected={selected} onChange={setSelected} />
  );
}

describe("EventTypeFields", () => {
  afterEach(cleanup);

  it("lists every notification event and can uncheck one", () => {
    render(<Harness />);
    expect(screen.getByLabelText("New proposal")).toBeChecked();
    expect(screen.getByLabelText("Proposal executed")).toBeChecked();
    expect(
      screen.getByLabelText("Countdown (3d / 2d / 1d / 6h left)"),
    ).toBeChecked();
    fireEvent.click(screen.getByLabelText("Proposal executed"));
    expect(screen.getByLabelText("Proposal executed")).not.toBeChecked();
    expect(screen.getByLabelText("New proposal")).toBeChecked();
  });
});
