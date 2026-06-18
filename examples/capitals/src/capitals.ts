// The restcountries.com API was deprecated in 2026 (now requires an API key),
// so we fetch the same dataset from the original open-source project instead.
const COUNTRIES_DATA_URL =
  "https://gitlab.com/restcountries/restcountries/-/raw/master/src/main/resources/countriesV3.1.json";

type RestCountry = {
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

// Cache the dataset in memory to avoid re-downloading it on every tool call
let countriesCache: RestCountry[] | null = null;
let countriesCacheTime = 0;
const CACHE_TTL = 1000 * 60 * 60;

async function fetchAllCountries(): Promise<RestCountry[]> {
  const now = Date.now();
  if (countriesCache && now - countriesCacheTime < CACHE_TTL) {
    return countriesCache;
  }

  const response = await fetch(COUNTRIES_DATA_URL);
  if (!response.ok) {
    throw new Error(`Countries dataset error: ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("Countries dataset error: expected an array of countries");
  }

  countriesCache = (data as RestCountry[]).filter(
    (c) => c.capital && c.capital.length > 0 && c.capitalInfo?.latlng,
  );
  countriesCacheTime = now;

  return countriesCache;
}

async function getCountryByCode(cca2: string): Promise<RestCountry> {
  const countries = await fetchAllCountries();
  const country = countries.find(
    (c) => c.cca2.toLowerCase() === cca2.toLowerCase(),
  );
  if (!country) {
    throw new Error(`Country "${cca2}" not found`);
  }
  return country;
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
  const countries = await fetchAllCountries();

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
  const country = await getCountryByCode(cca2);

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
  const allCapitals = await getAllCapitals();
  const query = capitalName.toLowerCase().trim();
  let match: CapitalSummary | undefined;
  for (const c of allCapitals) {
    const capital = c.name.toLowerCase();
    if (capital === query) {
      match = c;
      break;
    }
    // when values intersect, keep the one with the closest length
    if (capital.includes(query) || query.includes(capital)) {
      if (
        !match ||
        Math.abs(capital.length - query.length) <
          Math.abs(match.name.toLowerCase().length - query.length)
      ) {
        match = c;
      }
    }
  }

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
