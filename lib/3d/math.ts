/**
 * 3D Pipeline – Vector Math Utilities
 *
 * Pure functions for Vec3 operations. No mutation — every function
 * returns a new Vec3. These are the building blocks for all 3D
 * transform computations.
 */

import type { Vec3 } from './types';

const EPSILON = 1e-8;

// ── Constructors ───────────────────────────────────────────────────────────

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export const ZERO: Vec3 = vec3(0, 0, 0);
export const UNIT_X: Vec3 = vec3(1, 0, 0);
export const UNIT_Y: Vec3 = vec3(0, 1, 0);
export const UNIT_Z: Vec3 = vec3(0, 0, 1);

// ── Arithmetic ─────────────────────────────────────────────────────────────

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function mul(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function negate(v: Vec3): Vec3 {
  return { x: -v.x, y: -v.y, z: -v.z };
}

// ── Products ───────────────────────────────────────────────────────────────

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

// ── Length & Distance ──────────────────────────────────────────────────────

export function len(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function lenSq(v: Vec3): number {
  return v.x * v.x + v.y * v.y + v.z * v.z;
}

export function dist(a: Vec3, b: Vec3): number {
  return len(sub(a, b));
}

// ── Normalization ──────────────────────────────────────────────────────────

/**
 * Normalize a vector to unit length.
 * Returns ZERO if the vector length is below EPSILON.
 */
export function normalize(v: Vec3): Vec3 {
  const l = len(v);
  if (l < EPSILON) return ZERO;
  return mul(v, 1 / l);
}

// ── Interpolation ──────────────────────────────────────────────────────────

export function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

export function midpoint(a: Vec3, b: Vec3): Vec3 {
  return lerp(a, b, 0.5);
}

// ── Projection ─────────────────────────────────────────────────────────────

/**
 * Project vector `v` onto the plane defined by `normal`.
 * Removes the component of `v` along `normal`.
 * `normal` must be a unit vector.
 */
export function projectOnPlane(v: Vec3, normal: Vec3): Vec3 {
  const d = dot(v, normal);
  return sub(v, mul(normal, d));
}

// ── Utilities ──────────────────────────────────────────────────────────────

/** Scalar linear interpolation. */
export function lerpScalar(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Returns true if the vector length is below EPSILON. */
export function isNearZero(v: Vec3): boolean {
  return lenSq(v) < EPSILON * EPSILON;
}
