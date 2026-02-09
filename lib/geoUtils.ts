import * as THREE from "three";
import { geoInterpolate } from "d3-geo";

const GLOBE_RADIUS = 1;

// Convert latitude/longitude to 3D coordinates on a sphere
export function latLngToVector3(
  lat: number,
  lng: number,
  radius: number = GLOBE_RADIUS
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

// Convert GeoJSON coordinates to 3D points for a polygon
export function geoCoordinatesToPoints(
  coordinates: number[][],
  radius: number = GLOBE_RADIUS,
  segments: number = 2
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];

  for (let i = 0; i < coordinates.length - 1; i++) {
    const start = coordinates[i];
    const end = coordinates[i + 1];

    // Use d3 interpolation for smooth curves along the sphere
    const interpolate = geoInterpolate(
      [start[0], start[1]],
      [end[0], end[1]]
    );

    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      const [lng, lat] = interpolate(t);
      points.push(latLngToVector3(lat, lng, radius));
    }
  }

  return points;
}

// Create a line geometry from GeoJSON polygon coordinates
export function createCountryOutline(
  coordinates: number[][][],
  radius: number = GLOBE_RADIUS
): THREE.BufferGeometry[] {
  const geometries: THREE.BufferGeometry[] = [];

  for (const ring of coordinates) {
    const points = geoCoordinatesToPoints(ring, radius * 1.001); // Slightly above sphere
    if (points.length > 0) {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      geometries.push(geometry);
    }
  }

  return geometries;
}

// Create a filled polygon mesh for a country
export function createCountryMesh(
  coordinates: number[][][],
  radius: number = GLOBE_RADIUS
): THREE.BufferGeometry | null {
  // For filled country shapes, we use a simpler approach:
  // Create vertices along the boundary and use earcut for triangulation
  // This is a simplified version - for complex countries we'd need proper spherical triangulation

  const vertices: number[] = [];
  const indices: number[] = [];

  // Get boundary points
  const boundaryPoints: THREE.Vector3[] = [];
  for (const point of coordinates[0]) { // Use outer ring
    const vec = latLngToVector3(point[1], point[0], radius * 1.001);
    boundaryPoints.push(vec);
  }

  if (boundaryPoints.length < 3) return null;

  // Calculate centroid
  const centroid = new THREE.Vector3();
  for (const p of boundaryPoints) {
    centroid.add(p);
  }
  centroid.divideScalar(boundaryPoints.length);
  centroid.normalize().multiplyScalar(radius * 1.001);

  // Fan triangulation from centroid
  const centroidIndex = 0;
  vertices.push(centroid.x, centroid.y, centroid.z);

  for (const p of boundaryPoints) {
    vertices.push(p.x, p.y, p.z);
  }

  // Create triangles
  for (let i = 1; i < boundaryPoints.length; i++) {
    indices.push(centroidIndex, i, i + 1);
  }
  // Close the fan
  indices.push(centroidIndex, boundaryPoints.length, 1);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}
