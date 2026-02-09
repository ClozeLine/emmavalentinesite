"use client";

import { useEffect } from "react";
import Image from "next/image";
import { VisitedCountry } from "@/types/country";

interface CountryModalProps {
  country: VisitedCountry | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CountryModal({
  country,
  isOpen,
  onClose,
}: CountryModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !country) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md animate-fade-in" />

      {/* Modal content */}
      <div
        className="relative z-10 w-full max-w-md animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card with image */}
        <div className="relative overflow-hidden rounded-3xl shadow-2xl bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-sm ring-1 ring-white/20">
          {/* Image */}
          {country.image ? (
            <div className="relative aspect-[4/5] w-full">
              <Image
                src={country.image}
                alt={country.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 448px"
                priority
              />
              {/* Gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            </div>
          ) : (
            <div className="flex aspect-[4/5] items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <p className="text-gray-400 font-serif text-lg">No photo yet</p>
            </div>
          )}

          {/* Country name overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h2 className="text-3xl font-semibold text-white text-center font-serif tracking-wide drop-shadow-lg">
              {country.name}
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}
