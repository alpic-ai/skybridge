import "@/index.css";

import { mountWidget, useLayout, useOpenExternal } from "skybridge/web";
import { useToolInfo } from "../helpers.js";

const BOOK_URL = "https://docs.skybridge.tech";

function FlightBooking() {
  const { theme } = useLayout();
  const openExternal = useOpenExternal();
  const { output, isPending } = useToolInfo<"flight-booking">();

  if (isPending) {
    return (
      <div className={`${theme} container`}>
        <div className="message">Searching flights...</div>
      </div>
    );
  }

  if (!output || output.flights.length === 0) {
    return (
      <div className={`${theme} container`}>
        <div className="message">No flights found</div>
      </div>
    );
  }

  const { origin, originCity, destination, destinationCity, departureDate, returnDate, flights } = output;

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className={`${theme} container`}>
      <div className="header">
        <div className="route-title">
          {originCity} ({origin}) to {destinationCity} ({destination})
        </div>
        <div className="route-dates">
          {formatDate(departureDate)} &rarr; {formatDate(returnDate)} &middot;
          Return
        </div>
      </div>

      <div className="carousel">
        {flights.map((flight) => (
          <div key={flight.id} className="flight-card">
            <div className="card-top">
              <div className="tags">
                {flight.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`tag ${tag === "Cheapest" ? "cheapest" : ""}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="price-block">
                <div className="price">
                  &euro;{flight.price.toLocaleString()}
                </div>
                <div className="price-label">Per person</div>
              </div>
            </div>

            <div className="card-route">
              <div className="airline">
                <div className="airline-logo">SB</div>
                {flight.airline} · {flight.flightNumber}
              </div>

              <Leg
                departure={flight.outbound.departure}
                arrival={flight.outbound.arrival}
                departureAirport={flight.outbound.departureAirport}
                arrivalAirport={flight.outbound.arrivalAirport}
                duration={flight.outbound.duration}
                stops={flight.outbound.stops}
                stopCities={flight.outbound.stopCities}
              />

              <Leg
                departure={flight.inbound.departure}
                arrival={flight.inbound.arrival}
                departureAirport={flight.inbound.departureAirport}
                arrivalAirport={flight.inbound.arrivalAirport}
                duration={flight.inbound.duration}
                stops={flight.inbound.stops}
                stopCities={flight.inbound.stopCities}
              />
            </div>

            <button
              type="button"
              className="book-button"
              onClick={() => openExternal(BOOK_URL)}
            >
              Buy on Skybridge
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 10L10 2M10 2H4M10 2v6" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Leg({
  departure,
  arrival,
  departureAirport,
  arrivalAirport,
  duration,
  stops,
  stopCities,
}: {
  departure: string;
  arrival: string;
  departureAirport: string;
  arrivalAirport: string;
  duration: string;
  stops: number;
  stopCities?: string[];
}) {
  const stopsLabel =
    stops === 0
      ? "Direct"
      : `${stops} stop${stops > 1 ? "s" : ""}${stopCities ? `, ${stopCities.join(", ")}` : ""}`;

  return (
    <div className="leg">
      <div className="leg-time">{departure}</div>
      <div className="leg-airport">{departureAirport}</div>
      <div className="leg-connector">
        <div className="leg-duration">{duration}</div>
        <div className="leg-line" />
        <div className={`leg-stops ${stops === 0 ? "direct" : ""}`}>
          {stopsLabel}
        </div>
      </div>
      <div className="leg-airport">{arrivalAirport}</div>
      <div className="leg-time">{arrival}</div>
    </div>
  );
}

export default FlightBooking;

mountWidget(<FlightBooking />);
