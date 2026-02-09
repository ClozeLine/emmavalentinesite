import { VisitedCountry } from "@/types/country";
import { countryNameToId, getDisplayName } from "@/lib/countryMapping";

// Static list of visited countries
const visitedCountryNames = [
  "france",
  "italy",
  "indonesia",
  "belgium",
  "netherlands",
  "hungary",
  "poland",
  "germany",
];

// Map of country names to their images (in public/images/)
const countryImages: Record<string, string> = {
  france: "/images/france.jpg",
  italy: "/images/italy.jpg",
  indonesia: "/images/indonesia.jpg",
  belgium: "/images/belgium.jpg",
  netherlands: "/images/netherlands.jpg",
  hungary: "/images/hungary.jpg",
  poland: "/images/poland.jpg",
  germany: "/images/germany.jpg",
};

// Build the static visited countries data
export const visitedCountries: VisitedCountry[] = visitedCountryNames
  .map((name) => {
    const id = countryNameToId[name];
    if (!id) return null;
    return {
      id,
      name: getDisplayName(name),
      image: countryImages[name] || "",
    };
  })
  .filter((c): c is VisitedCountry => c !== null);

// Set of visited country IDs for quick lookup
const visitedIds = new Set(visitedCountries.map((c) => c.id));

// Total number of countries in the world (UN recognized)
export const TOTAL_COUNTRIES = 195;

// Check if a country is visited
export function isCountryVisited(countryId: string): boolean {
  return visitedIds.has(countryId);
}

// Get visited country data
export function getVisitedCountry(countryId: string): VisitedCountry | undefined {
  return visitedCountries.find((c) => c.id === countryId);
}

// Get count of visited countries
export function getVisitedCount(): number {
  return visitedCountries.length;
}

// Get count of remaining countries
export function getRemainingCount(): number {
  return TOTAL_COUNTRIES - visitedCountries.length;
}
