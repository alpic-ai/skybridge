export interface Leg {
  departure: string;
  arrival: string;
  departureAirport: string;
  arrivalAirport: string;
  duration: string;
  stops: number;
  stopCities?: string[];
}

export interface Flight {
  id: number;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  outbound: Leg;
  inbound: Leg;
  price: number;
  currency: string;
  tags: string[];
}

const HUB_CITIES = ["AMS", "IST", "FRA", "MAD", "LIS", "ZRH", "VIE", "BCN", "MUC", "CPH"];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashRoute(origin: string, destination: string, date: string): number {
  let hash = 0;
  const str = `${origin}-${destination}-${date}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}`;
}

function formatTime(totalMinutes: number): { time: string; dayOffset: number } {
  const dayOffset = Math.floor(totalMinutes / 1440);
  const mins = totalMinutes % 1440;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const time = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  return { time, dayOffset };
}

function arrivalString(totalMinutes: number): string {
  const { time, dayOffset } = formatTime(totalMinutes);
  return dayOffset > 0 ? `${time}+${dayOffset}` : time;
}

export function generateFlights(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate: string,
  directOnly: boolean,
): Flight[] {
  const rand = seededRandom(hashRoute(origin, destination, departureDate + returnDate));
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

  const hubs = HUB_CITIES.filter((c) => c !== origin && c !== destination);

  const flights: Flight[] = [];
  let id = 1;

  // Generate 1-2 direct flights
  for (let i = 0; i < 2; i++) {
    const outDuration = randInt(600, 900);
    const inDuration = randInt(600, 900);
    const depMinutes = randInt(360, 1380);
    const retDepMinutes = randInt(360, 1380);

    const { time: depTime } = formatTime(depMinutes);

    flights.push({
      id: id++,
      airline: "Skybridge Airlines",
      airlineCode: "SB",
      flightNumber: `SB ${randInt(100, 999)}`,
      outbound: {
        departure: depTime,
        arrival: arrivalString(depMinutes + outDuration),
        departureAirport: origin,
        arrivalAirport: destination,
        duration: formatDuration(outDuration),
        stops: 0,
      },
      inbound: {
        departure: formatTime(retDepMinutes).time,
        arrival: arrivalString(retDepMinutes + inDuration),
        departureAirport: destination,
        arrivalAirport: origin,
        duration: formatDuration(inDuration),
        stops: 0,
      },
      price: randInt(800, 2200),
      currency: "EUR",
      tags: [],
    });
  }

  if (!directOnly) {
    // Generate 3-4 connecting flights
    const connectingCount = randInt(3, 4);
    for (let i = 0; i < connectingCount; i++) {
      const stops = randInt(1, 2);
      const stopCitiesOut = Array.from({ length: stops }, () => pick(hubs));
      const stopCitiesIn = Array.from({ length: randInt(1, stops) }, () => pick(hubs));

      const outDuration = randInt(900, 2400);
      const inDuration = randInt(900, 2400);
      const depMinutes = randInt(360, 1380);
      const retDepMinutes = randInt(360, 1380);
      const { time: depTime } = formatTime(depMinutes);

      const discount = Math.round(rand() * 500 + 100);

      flights.push({
        id: id++,
        airline: "Skybridge Airlines",
        airlineCode: "SB",
        flightNumber: `SB ${randInt(100, 999)}`,
        outbound: {
          departure: depTime,
          arrival: arrivalString(depMinutes + outDuration),
          departureAirport: origin,
          arrivalAirport: destination,
          duration: formatDuration(outDuration),
          stops,
          stopCities: stopCitiesOut,
        },
        inbound: {
          departure: formatTime(retDepMinutes).time,
          arrival: arrivalString(retDepMinutes + inDuration),
          departureAirport: destination,
          arrivalAirport: origin,
          duration: formatDuration(inDuration),
          stops: stopCitiesIn.length,
          stopCities: stopCitiesIn,
        },
        price: Math.max(400, randInt(600, 1800) - discount),
        currency: "EUR",
        tags: [],
      });
    }
  }

  // Sort by price to find cheapest
  flights.sort((a, b) => a.price - b.price);

  // Tag cheapest
  flights[0].tags.push("Cheapest");

  // Tag quickest (shortest total outbound duration)
  let quickestIdx = 0;
  let quickestDuration = Number.MAX_SAFE_INTEGER;
  for (let i = 0; i < flights.length; i++) {
    const parts = flights[i].outbound.duration.split(/h\s*/);
    const mins = Number.parseInt(parts[0]) * 60 + Number.parseInt(parts[1]);
    if (mins < quickestDuration) {
      quickestDuration = mins;
      quickestIdx = i;
    }
  }
  if (!flights[quickestIdx].tags.includes("Cheapest")) {
    flights[quickestIdx].tags.push("Quickest");
  } else {
    flights[quickestIdx].tags.push("Quickest");
  }

  return flights;
}
