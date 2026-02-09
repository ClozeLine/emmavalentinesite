import * as THREE from "three";
import { Earcut } from "three/src/extras/Earcut.js";

/**
 * Converts geographic coordinates (lon, lat) to 3D point on sphere
 */
function geoTo3D(lon: number, lat: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

/**
 * Spherically interpolate between two 3D points on a sphere
 */
function slerp(v1: THREE.Vector3, v2: THREE.Vector3, t: number, radius: number): THREE.Vector3 {
  const n1 = v1.clone().normalize();
  const n2 = v2.clone().normalize();

  const dot = Math.max(-1, Math.min(1, n1.dot(n2)));
  const theta = Math.acos(dot);

  if (theta < 0.0001) {
    return v1.clone().lerp(v2, t).normalize().multiplyScalar(radius);
  }

  const sinTheta = Math.sin(theta);
  const a = Math.sin((1 - t) * theta) / sinTheta;
  const b = Math.sin(t * theta) / sinTheta;

  const result = new THREE.Vector3(
    a * n1.x + b * n2.x,
    a * n1.y + b * n2.y,
    a * n1.z + b * n2.z
  );

  return result.normalize().multiplyScalar(radius);
}

/**
 * Creates a canonical key for an edge (order-independent)
 */
function edgeKey(key1: string, key2: string): string {
  return key1 < key2 ? `${key1}|${key2}` : `${key2}|${key1}`;
}

/**
 * Creates a vertex key for deduplication
 */
function vertexKey(v: THREE.Vector3): string {
  return `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;
}

/**
 * Gets or computes the midpoint for an edge, ensuring shared edges use the same midpoint
 */
function getEdgeMidpoint(
  v1: THREE.Vector3,
  v2: THREE.Vector3,
  key1: string,
  key2: string,
  radius: number,
  edgeMidpoints: Map<string, THREE.Vector3>
): THREE.Vector3 {
  const eKey = edgeKey(key1, key2);

  if (edgeMidpoints.has(eKey)) {
    return edgeMidpoints.get(eKey)!;
  }

  const midpoint = slerp(v1, v2, 0.5, radius);
  edgeMidpoints.set(eKey, midpoint);
  return midpoint;
}

/**
 * Subdivides a spherical triangle into smaller triangles that follow the sphere's curvature.
 * Uses a shared edge midpoint cache to ensure adjacent triangles share vertices.
 */
function subdivideSphericalTriangle(
  v0: THREE.Vector3,
  v1: THREE.Vector3,
  v2: THREE.Vector3,
  key0: string,
  key1: string,
  key2: string,
  radius: number,
  maxEdgeLength: number,
  vertices: number[],
  indices: number[],
  vertexMap: Map<string, number>,
  edgeMidpoints: Map<string, THREE.Vector3>
): void {
  const edge01 = v0.distanceTo(v1);
  const edge12 = v1.distanceTo(v2);
  const edge20 = v2.distanceTo(v0);
  const maxEdge = Math.max(edge01, edge12, edge20);

  if (maxEdge <= maxEdgeLength) {
    const i0 = getOrAddVertex3D(v0, key0, vertices, vertexMap);
    const i1 = getOrAddVertex3D(v1, key1, vertices, vertexMap);
    const i2 = getOrAddVertex3D(v2, key2, vertices, vertexMap);
    indices.push(i0, i1, i2);
    return;
  }

  // Get midpoints using the shared cache
  const mid01 = getEdgeMidpoint(v0, v1, key0, key1, radius, edgeMidpoints);
  const mid12 = getEdgeMidpoint(v1, v2, key1, key2, radius, edgeMidpoints);
  const mid20 = getEdgeMidpoint(v2, v0, key2, key0, radius, edgeMidpoints);

  const keyMid01 = vertexKey(mid01);
  const keyMid12 = vertexKey(mid12);
  const keyMid20 = vertexKey(mid20);

  // Recursively subdivide into 4 triangles
  subdivideSphericalTriangle(v0, mid01, mid20, key0, keyMid01, keyMid20, radius, maxEdgeLength, vertices, indices, vertexMap, edgeMidpoints);
  subdivideSphericalTriangle(mid01, v1, mid12, keyMid01, key1, keyMid12, radius, maxEdgeLength, vertices, indices, vertexMap, edgeMidpoints);
  subdivideSphericalTriangle(mid20, mid12, v2, keyMid20, keyMid12, key2, radius, maxEdgeLength, vertices, indices, vertexMap, edgeMidpoints);
  subdivideSphericalTriangle(mid01, mid12, mid20, keyMid01, keyMid12, keyMid20, radius, maxEdgeLength, vertices, indices, vertexMap, edgeMidpoints);
}

/**
 * Gets existing vertex index or adds a new vertex
 */
function getOrAddVertex3D(
  v: THREE.Vector3,
  key: string,
  vertices: number[],
  vertexMap: Map<string, number>
): number {
  if (vertexMap.has(key)) {
    return vertexMap.get(key)!;
  }

  const index = vertices.length / 3;
  vertices.push(v.x, v.y, v.z);
  vertexMap.set(key, index);

  return index;
}

/**
 * Triangulates a spherical polygon using Earcut algorithm, then subdivides
 * triangles using spherical interpolation to properly follow the sphere's curvature.
 */
export function triangulateSphericalPolygon(
  ring: number[][],
  radius: number
): { vertices: number[]; indices: number[] } | null {
  if (ring.length < 4) return null;

  let coords = [...ring];

  // Remove closing point if duplicate
  if (
    coords.length > 1 &&
    Math.abs(coords[0][0] - coords[coords.length - 1][0]) < 0.0001 &&
    Math.abs(coords[0][1] - coords[coords.length - 1][1]) < 0.0001
  ) {
    coords = coords.slice(0, -1);
  }

  if (coords.length < 3) return null;

  // Normalize for antimeridian crossing
  const normalizedCoords = normalizeForAntimeridian(coords);

  // Flatten for earcut
  const flatPoints: number[] = [];
  for (const point of normalizedCoords) {
    flatPoints.push(point[0], point[1]);
  }

  // Triangulate in 2D
  const triangleIndices = Earcut.triangulate(flatPoints, undefined, 2);
  if (triangleIndices.length === 0) return null;

  // Convert all original coords to 3D and create keys
  const coords3D: THREE.Vector3[] = coords.map(p => geoTo3D(p[0], p[1], radius));
  const coordKeys: string[] = coords3D.map(v => vertexKey(v));

  // Subdivide each triangle with spherical interpolation
  const vertices: number[] = [];
  const indices: number[] = [];
  const vertexMap = new Map<string, number>();
  const edgeMidpoints = new Map<string, THREE.Vector3>();

  // Max edge length in 3D units (on unit sphere)
  const maxEdgeLength = 0.08;

  for (let t = 0; t < triangleIndices.length; t += 3) {
    const idx0 = triangleIndices[t];
    const idx1 = triangleIndices[t + 1];
    const idx2 = triangleIndices[t + 2];

    subdivideSphericalTriangle(
      coords3D[idx0], coords3D[idx1], coords3D[idx2],
      coordKeys[idx0], coordKeys[idx1], coordKeys[idx2],
      radius, maxEdgeLength,
      vertices, indices, vertexMap, edgeMidpoints
    );
  }

  if (vertices.length === 0 || indices.length === 0) return null;

  return { vertices, indices };
}

/**
 * Normalizes coordinates for polygons crossing the antimeridian
 */
function normalizeForAntimeridian(coords: number[][]): number[][] {
  let hasLargeJump = false;
  for (let i = 1; i < coords.length; i++) {
    if (Math.abs(coords[i][0] - coords[i - 1][0]) > 180) {
      hasLargeJump = true;
      break;
    }
  }

  if (!hasLargeJump) return coords;

  return coords.map((point) => {
    let lon = point[0];
    if (lon < 0) lon += 360;
    return [lon, point[1]];
  });
}

/**
 * Creates a merged BufferGeometry from multiple polygon rings.
 */
export function createPolygonGeometry(
  polygons: number[][][][],
  radius: number
): THREE.BufferGeometry | null {
  const allVertices: number[] = [];
  const allIndices: number[] = [];
  let indexOffset = 0;

  for (const polygon of polygons) {
    const outerRing = polygon[0];
    if (!outerRing || outerRing.length < 4) continue;

    const result = triangulateSphericalPolygon(outerRing, radius);
    if (!result) continue;

    for (let i = 0; i < result.vertices.length; i++) {
      allVertices.push(result.vertices[i]);
    }

    for (let i = 0; i < result.indices.length; i++) {
      allIndices.push(result.indices[i] + indexOffset);
    }

    indexOffset += result.vertices.length / 3;
  }

  if (allVertices.length === 0 || allIndices.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(allVertices, 3)
  );
  geometry.setIndex(allIndices);
  geometry.computeVertexNormals();

  return geometry;
}
