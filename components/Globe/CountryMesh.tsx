"use client";

import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { geoCoordinatesToPoints } from "@/lib/geoUtils";
import { createPolygonGeometry } from "@/lib/triangulate";
import { ZOOM_CONFIG } from "./GlobeScene";

interface CountryMeshProps {
  coordinates: number[][][] | number[][][][];
  isVisited: boolean;
  countryId: string;
  countryName: string;
  onClick?: (countryId: string) => void;
}

export default function CountryMesh({
  coordinates,
  isVisited,
  countryId,
  countryName,
  onClick,
}: CountryMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [zoomFactor, setZoomFactor] = useState(0.5);
  const { camera } = useThree();

  // Track camera distance and update zoom factor
  useFrame(() => {
    const distance = camera.position.length();
    // Map distance to 0-1 range (1 = zoomed in, 0 = zoomed out)
    const factor = 1 - (distance - ZOOM_CONFIG.minDistance) / (ZOOM_CONFIG.maxDistance - ZOOM_CONFIG.minDistance);
    const clampedFactor = Math.max(0, Math.min(1, factor));

    // Only update if changed significantly to avoid re-renders
    if (Math.abs(clampedFactor - zoomFactor) > 0.01) {
      setZoomFactor(clampedFactor);
    }
  });

  // Determine if this is a MultiPolygon or Polygon
  const isMultiPolygon = Array.isArray(coordinates[0]?.[0]?.[0]);

  const polygons = useMemo(() => {
    if (isMultiPolygon) {
      return coordinates as number[][][][];
    }
    return [coordinates] as number[][][][];
  }, [coordinates, isMultiPolygon]);

  // Create outline geometries for each polygon ring
  const outlinePoints = useMemo(() => {
    const allPoints: THREE.Vector3[][] = [];

    for (const polygon of polygons) {
      for (const ring of polygon) {
        const points = geoCoordinatesToPoints(ring, 1.002, 1);
        if (points.length > 2) {
          allPoints.push(points);
        }
      }
    }

    return allPoints;
  }, [polygons]);

  // Create filled mesh geometry for ALL countries
  const filledGeometry = useMemo(() => {
    return createPolygonGeometry(polygons, 1.001);
  }, [polygons]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (isVisited && onClick) {
      e.stopPropagation();
      onClick(countryId);
    }
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    if (isVisited) {
      e.stopPropagation();
      setHovered(true);
      document.body.style.cursor = "pointer";
    }
  };

  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = "auto";
  };

  // Colors: white for unvisited, green for visited
  const outlineColor = isVisited
    ? hovered
      ? "#16a34a"
      : "#22c55e"
    : "#d4d4d4";

  const fillColor = isVisited
    ? hovered
      ? "#16a34a"
      : "#22c55e"
    : "#ffffff";

  // Line width based on zoom (thicker when zoomed in)
  const baseLineWidth = isVisited ? 2.5 : 1.5;
  const lineWidth = baseLineWidth * zoomFactor;
  const lineOpacity = zoomFactor;

  return (
    <group>
      {/* Render outlines - only if visible */}
      {zoomFactor > 0.05 && outlinePoints.map((points, idx) => (
        <Line
          key={`${countryId}-outline-${idx}`}
          points={points}
          color={outlineColor}
          lineWidth={Math.max(0.1, lineWidth)}
          transparent
          opacity={lineOpacity}
        />
      ))}

      {/* Render filled mesh for all countries */}
      {filledGeometry && (
        <mesh
          ref={meshRef}
          geometry={filledGeometry}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <meshBasicMaterial
            color={fillColor}
            side={THREE.DoubleSide}
            polygonOffset={true}
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      )}
    </group>
  );
}
