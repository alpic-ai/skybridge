// Minimal data for list (5 fields)
type RestCountryMinimal = {
  name: { common: string };
  capital?: string[];
  capitalInfo?: { latlng?: [number, number] };
  cca2: string;
  flags: { svg: string };
};

// Full data for details (10 fields)
type RestCountryFull = {
  name: { common: string };
  capital?: string[];
  capitalInfo?: { latlng?: [number, number] };
  cca2: string;
  cca3: string;
  flags: { svg: string };
  latlng: [number, number];
  population: number;
  continents: string[];
  currencies?: Record<string, { name: string; symbol: string }>;
};

export type Capital = {
  name: string;
  country: { name: string; cca2: string; cca3: string };
  coordinates: { lat: number; lng: number };
  flag: string;
  population: number;
  continent: string;
  currencies: Array<{ code: string; name: string; symbol: string }>;
  photo: {
    url: string;
  };
  wikipedia: {
    capitalDescription?: string;
    countryDescription?: string;
  };
};

export type CapitalSummary = {
  name: string;
  countryName: string;
  cca2: string;
  coordinates: { lat: number; lng: number };
};

// Cache for minimal capitals list
let listCache: RestCountryMinimal[] | null = null;
let listCacheTime = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

async function fetchAllCountriesMinimal(): Promise<RestCountryMinimal[]> {
  const now = Date.now();
  if (listCache && now - listCacheTime < CACHE_TTL) {
    return listCache;
  }

  const fields = ["name", "capital", "capitalInfo", "cca2", "flags"].join(",");
  const response = await fetch(
    `https://restcountries.com/v3.1/all?fields=${fields}`,
  );
  if (!response.ok) {
    throw new Error(`RestCountries API error: ${response.status}`);
  }

  const data = (await response.json()) as RestCountryMinimal[];
  listCache = data.filter(
    (c) => c.capital && c.capital.length > 0 && c.capitalInfo?.latlng,
  );
  listCacheTime = now;

  return listCache;
}

async function fetchCountryByCode(cca2: string): Promise<RestCountryFull> {
  const fields = [
    "name",
    "capital",
    "capitalInfo",
    "cca2",
    "cca3",
    "flags",
    "latlng",
    "population",
    "continents",
    "currencies",
  ].join(",");

  const response = await fetch(
    `https://restcountries.com/v3.1/alpha/${cca2}?fields=${fields}`,
  );
  if (!response.ok) {
    throw new Error(`RestCountries API error: ${response.status}`);
  }

  return (await response.json()) as RestCountryFull;
}

async function fetchWikipediaSummary(title: string) {
  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    );

    if (!response.ok) {
      return undefined;
    }

    const data = (await response.json()) as {
      extract?: string;
      originalimage?: { source: string };
    };

    return data;
  } catch (error) {
    console.error("Wikipedia fetch error:", error);
    return undefined;
  }
}

export async function getAllCapitals(): Promise<CapitalSummary[]> {
  const countries = await fetchAllCountriesMinimal();

  return countries.map((c) => ({
    name: c.capital?.[0] ?? "",
    countryName: c.name.common,
    cca2: c.cca2,
    coordinates: {
      lat: c.capitalInfo?.latlng?.[0] ?? 0,
      lng: c.capitalInfo?.latlng?.[1] ?? 0,
    },
  }));
}


export async function getCapitalByCountryCode(cca2: string): Promise<Capital> {
  const country = await fetchCountryByCode(cca2);

  if (!country.capital) {
    throw new Error(`No capital found for country ${cca2}`);
  }

  const capital = country.capital[0];
  const countryName = country.name.common;

  const [capitalSummary, countrySummary] = await Promise.all([
    fetchWikipediaSummary(capital),
    fetchWikipediaSummary(countryName),
  ]);

  const coordinates = country.capitalInfo?.latlng
    ? { lat: country.capitalInfo.latlng[0], lng: country.capitalInfo.latlng[1] }
    : { lat: country.latlng[0], lng: country.latlng[1] };

  return {
    name: capital,
    country: { name: countryName, cca2: country.cca2, cca3: country.cca3 },
    coordinates,
    flag: country.flags.svg,
    population: country.population,
    continent: country.continents[0],
    currencies: country.currencies
      ? Object.entries(country.currencies).map(([code, curr]) => ({
          code,
          name: curr.name,
          symbol: curr.symbol,
        }))
      : [],
    photo: {
      url: capitalSummary?.originalimage?.source ?? "",
    },
    wikipedia: {
      capitalDescription: capitalSummary?.extract,
      countryDescription: countrySummary?.extract,
    },
  };
}

export async function getCapitalByName(capitalName: string): Promise<Capital> {
  // Find the country code from the minimal list, then fetch full details
  const allCapitals = await getAllCapitals();
  const match = allCapitals.find(
    (c) => c.name.toLowerCase() === capitalName.toLowerCase(),
  );

  if (!match) {
    throw new Error(`Capital "${capitalName}" not found`);
  }

  return getCapitalByCountryCode(match.cca2);
}

export function getCapitalSlug(capitalName: string): string {
  return capitalName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
