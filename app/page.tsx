"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { CountryModal } from "@/components/Modal";
import {
  getVisitedCountry,
  visitedCountries,
  TOTAL_COUNTRIES,
} from "@/data/visitedCountries";
import { VisitedCountry } from "@/types/country";

// Dynamically import GlobeScene to avoid SSR issues with Three.js
const GlobeScene = dynamic(() => import("@/components/Globe/GlobeScene"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-gray-300 font-serif italic tracking-wide">Loading...</div>
    </div>
  ),
});

export default function Home() {
  const [selectedCountry, setSelectedCountry] = useState<VisitedCountry | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAtMaxZoom, setIsAtMaxZoom] = useState(false);

  const visitedCount = visitedCountries.length;

  const handleCountryClick = (countryId: string) => {
    const country = getVisitedCountry(countryId);
    if (country) {
      setSelectedCountry(country);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleMaxZoom = (isAtMax: boolean) => {
    setIsAtMaxZoom(isAtMax);
  };

  const remainingCount = TOTAL_COUNTRIES - visitedCount;

  return (
    <div className="relative h-screen w-screen bg-white overflow-hidden">
      {/* Globe container */}
      <div className="h-full w-full">
        <GlobeScene
          onCountryClick={handleCountryClick}
          onMaxZoom={handleMaxZoom}
        />
      </div>

      {/* Progress text - uses mix-blend-mode for automatic contrast */}
      <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none mix-blend-difference">
        <p className="text-gray-300 italic relative font-serif tracking-wide">
          <span
            className="transition-opacity duration-500"
            style={{
              opacity: isAtMaxZoom ? 0 : 1,
              transitionDelay: isAtMaxZoom ? "0ms" : "500ms"
            }}
          >
            {visitedCount} down, {remainingCount} more to go
          </span>
          <span
            className="absolute inset-0 transition-opacity duration-500"
            style={{
              opacity: isAtMaxZoom ? 1 : 0,
              transitionDelay: isAtMaxZoom ? "500ms" : "0ms"
            }}
          >
            Happy Valentine&apos;s Day, Emma
          </span>
        </p>
      </div>

      {/* Country modal */}
      <CountryModal
        country={selectedCountry}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
