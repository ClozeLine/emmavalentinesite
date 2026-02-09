"use client";

import { useEffect, useState } from "react";
import * as topojson from "topojson-client";
import { Topology, GeometryCollection } from "topojson-specification";
import CountryMesh from "./CountryMesh";
import { isCountryVisited } from "@/data/visitedCountries";

interface GlobeProps {
  onCountryClick: (countryId: string) => void;
}

interface CountryFeature {
  type: "Feature";
  id: string;
  properties: { name: string };
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
}

export default function Globe({ onCountryClick }: GlobeProps) {
  const [countries, setCountries] = useState<CountryFeature[]>([]);

  useEffect(() => {
    async function loadCountries() {
      try {
        const response = await fetch("/data/world-110m.json");
        const topology = (await response.json()) as Topology<{
          countries: GeometryCollection<{ name: string }>;
        }>;

        const geojson = topojson.feature(
          topology,
          topology.objects.countries
        ) as unknown as { features: CountryFeature[] };

        setCountries(geojson.features);
      } catch (error) {
        console.error("Failed to load world data:", error);
      }
    }

    loadCountries();
  }, []);

  // Rotate globe to center on Belgium's longitude (4.5°E), no tilt
  const belgiumLon = 4.5 * (Math.PI / 180);

  return (
    <group rotation={[0, -Math.PI / 2 - belgiumLon, 0]}>
      {/* Ocean sphere (grey) */}
      <mesh>
        <sphereGeometry args={[0.998, 64, 64]} />
        <meshStandardMaterial
          color="#e5e5e5"
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Country meshes - all countries get filled (white or green) */}
      {countries.map((country, index) => (
        <CountryMesh
          key={country.id ?? `country-${index}`}
          countryId={country.id ?? ""}
          countryName={country.properties?.name || "Unknown"}
          coordinates={country.geometry.coordinates}
          isVisited={isCountryVisited(country.id)}
          onClick={onCountryClick}
        />
      ))}
    </group>
  );
}
