"use client";

import { Suspense, useRef, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Globe from "./Globe";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";

// Zoom configuration - change this to adjust max zoom out
export const ZOOM_CONFIG = {
  minDistance: 1.5,
  maxDistance: 5,
};

interface GlobeSceneProps {
  onCountryClick: (countryId: string) => void;
  onMaxZoom?: (isAtMax: boolean) => void;
}

interface SceneContentProps {
  onCountryClick: (countryId: string) => void;
  onMaxZoom?: (isAtMax: boolean) => void;
}

function SceneContent({ onCountryClick, onMaxZoom }: SceneContentProps) {
  const controlsRef = useRef<OrbitControlsType>(null);
  const wasAtMaxRef = useRef(false);
  const { camera } = useThree();

  useFrame(() => {
    if (!onMaxZoom) return;

    // Calculate distance from camera to origin
    const distance = camera.position.length();
    const threshold = ZOOM_CONFIG.maxDistance - 0.1;
    const isAtMax = distance >= threshold;

    // Only call callback when state changes
    if (isAtMax !== wasAtMaxRef.current) {
      wasAtMaxRef.current = isAtMax;
      onMaxZoom(isAtMax);
    }
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 3, 5]} intensity={0.8} />
      <directionalLight position={[-5, -3, -5]} intensity={0.3} />

      {/* Controls */}
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={true}
        minDistance={ZOOM_CONFIG.minDistance}
        maxDistance={ZOOM_CONFIG.maxDistance}
        rotateSpeed={0.5}
        zoomSpeed={0.5}
        enableDamping={true}
        dampingFactor={0.05}
      />

      {/* Globe */}
      <Suspense fallback={<LoadingFallback />}>
        <Globe onCountryClick={onCountryClick} />
      </Suspense>
    </>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color="#fafafa" wireframe />
    </mesh>
  );
}

// Camera position to look at ~35°N latitude
const CAMERA_LAT = 35 * (Math.PI / 180);
const CAMERA_DISTANCE = 2.5;
const CAMERA_POSITION: [number, number, number] = [
  0,
  Math.sin(CAMERA_LAT) * CAMERA_DISTANCE,
  Math.cos(CAMERA_LAT) * CAMERA_DISTANCE,
];

export default function GlobeScene({ onCountryClick, onMaxZoom }: GlobeSceneProps) {
  return (
    <Canvas
      camera={{
        position: CAMERA_POSITION,
        fov: 45,
        near: 0.1,
        far: 100,
      }}
      style={{ background: "#ffffff" }}
    >
      <SceneContent onCountryClick={onCountryClick} onMaxZoom={onMaxZoom} />
    </Canvas>
  );
}
