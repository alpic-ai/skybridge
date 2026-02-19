import "@/index.css";

import { useState } from "react";
import {
  mountWidget,
  useDisplayMode,
  useSendFollowUpMessage,
} from "skybridge/web";
import { EventCard } from "../components/ui/event-card.js";
import { EventList } from "../components/ui/event-list.js";
import type { Event } from "../components/ui/types.js";
import { useToolInfo } from "../helpers.js";

function BrowseEvents() {
  const sendFollowUpMessage = useSendFollowUpMessage();
  const [displayMode, setDisplayMode] = useDisplayMode();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const { input, isPending, responseMetadata } = useToolInfo<"browse-events">();

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Searching events in {input?.location ?? "..."}
        {input?.date ? ` for ${input.date}` : ""}...
      </div>
    );
  }

  const rawEvents = (responseMetadata?.events ?? []) as Event[];
  const images = (responseMetadata?.eventImages ?? []) as string[];
  const events = rawEvents.map((event, i) => ({
    ...event,
    image: images[i],
  }));

  if (displayMode === "pip" && selectedEvent) {
    return (
      <div
        className="flex flex-col h-full"
        data-llm={`Viewing details for "${selectedEvent.title}" (${selectedEvent.category}) at ${selectedEvent.venue}, ${selectedEvent.priceRange}.`}
      >
        <EventCard
          data={{ event: selectedEvent }}
          appearance={{
            variant: "covered",
            showSignal: true,
            showTags: true,
            showRating: true,
          }}
        />
        <button
          type="button"
          className="mt-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => {
            setSelectedEvent(null);
            setDisplayMode("inline");
          }}
        >
          ← Back to all events
        </button>
      </div>
    );
  }

  const title = `Events in ${input?.location ?? "your area"} — ${input?.date ?? "upcoming"}`;

  return (
    <div
      data-llm={`Browsing ${events.length} events in ${input?.location} for ${input?.date}.`}
    >
      <EventList
        data={{ events, title }}
        appearance={{ variant: "carousel" }}
        actions={{
          onEventSelect: (event) => {
            setSelectedEvent(event);
            setDisplayMode("pip");
            sendFollowUpMessage(
              `The user selected "${event.title}" (${event.category}) at ${event.venue}, ${event.priceRange}. Summarize this event and explain how it could be a good fit for the user's taste.`,
            );
          },
        }}
      />
    </div>
  );
}

export default BrowseEvents;

mountWidget(<BrowseEvents />);
