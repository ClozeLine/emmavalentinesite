import { VisitedCountry } from "@/types/country";

// This will be populated from the API
let visitedCountriesCache: VisitedCountry[] = [];
let visitedIdsCache: Set<string> = new Set();
let isLoaded = false;

export interface ApiCountryData {
  id: string;
  name: string;
  normalizedName: string;
  image: string;
}

export interface ApiResponse {
  countries: ApiCountryData[];
  totalCountries: number;
}

// Total number of countries in the world (UN recognized)
export const TOTAL_COUNTRIES = 195;

export async function loadVisitedCountries(): Promise<VisitedCountry[]> {
  if (isLoaded) return visitedCountriesCache;

  try {
    const response = await fetch("/api/countries");
    const data: ApiResponse = await response.json();

    visitedCountriesCache = data.countries.map((c) => ({
      id: c.id,
      name: c.name,
      image: c.image,
    }));

    visitedIdsCache = new Set(data.countries.map((c) => c.id));
    isLoaded = true;

    return visitedCountriesCache;
  } catch (error) {
    console.error("Failed to load visited countries:", error);
    return [];
  }
}

// Synchronous check - uses cache, returns false if not loaded
export function isCountryVisited(countryId: string): boolean {
  return visitedIdsCache.has(countryId);
}

// Get visited country data from cache
export function getVisitedCountry(countryId: string): VisitedCountry | undefined {
  return visitedCountriesCache.find((c) => c.id === countryId);
}

// Get count of visited countries
export function getVisitedCount(): number {
  return visitedCountriesCache.length;
}

// Get count of remaining countries
export function getRemainingCount(): number {
  return TOTAL_COUNTRIES - visitedCountriesCache.length;
}

// Reset cache (useful for refreshing)
export function resetCache(): void {
  visitedCountriesCache = [];
  visitedIdsCache = new Set();
  isLoaded = false;
}

// Update the cache with new data (called from components after API load)
export function updateCache(countries: ApiCountryData[]): void {
  visitedCountriesCache = countries.map((c) => ({
    id: c.id,
    name: c.name,
    image: c.image,
  }));
  visitedIdsCache = new Set(countries.map((c) => c.id));
  isLoaded = true;
}
