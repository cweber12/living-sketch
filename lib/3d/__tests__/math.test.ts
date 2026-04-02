import { vec3, ZERO, UNIT_X, UNIT_Y, UNIT_Z } from '../math';
import {
  add,
  sub,
  mul,
  negate,
  dot,
  cross,
  len,
  lenSq,
  dist,
  normalize,
  lerp,
  midpoint,
  projectOnPlane,
  lerpScalar,
  isNearZero,
} from '../math';

describe('vec3 math utilities', () => {
  // ── Constructors ─────────────────────────────────────────────────────
  describe('vec3', () => {
    it('creates a vector', () => {
      const v = vec3(1, 2, 3);
      expect(v).toEqual({ x: 1, y: 2, z: 3 });
    });
  });

  describe('constants', () => {
    it('ZERO is (0,0,0)', () => {
      expect(ZERO).toEqual({ x: 0, y: 0, z: 0 });
    });
    it('UNIT_X is (1,0,0)', () => {
      expect(UNIT_X).toEqual({ x: 1, y: 0, z: 0 });
    });
    it('UNIT_Y is (0,1,0)', () => {
      expect(UNIT_Y).toEqual({ x: 0, y: 1, z: 0 });
    });
    it('UNIT_Z is (0,0,1)', () => {
      expect(UNIT_Z).toEqual({ x: 0, y: 0, z: 1 });
    });
  });

  // ── Arithmetic ───────────────────────────────────────────────────────
  describe('add / sub / mul / negate', () => {
    it('adds two vectors', () => {
      expect(add(vec3(1, 2, 3), vec3(4, 5, 6))).toEqual({ x: 5, y: 7, z: 9 });
    });

    it('subtracts two vectors', () => {
      expect(sub(vec3(5, 7, 9), vec3(4, 5, 6))).toEqual({ x: 1, y: 2, z: 3 });
    });

    it('multiplies by scalar', () => {
      expect(mul(vec3(1, 2, 3), 2)).toEqual({ x: 2, y: 4, z: 6 });
    });

    it('negates a vector', () => {
      expect(negate(vec3(1, -2, 3))).toEqual({ x: -1, y: 2, z: -3 });
    });
  });

  // ── Products ─────────────────────────────────────────────────────────
  describe('dot / cross', () => {
    it('computes dot product', () => {
      expect(dot(vec3(1, 2, 3), vec3(4, 5, 6))).toBe(32);
    });

    it('dot product of perpendicular vectors is 0', () => {
      expect(dot(UNIT_X, UNIT_Y)).toBe(0);
    });

    it('computes cross product', () => {
      // X × Y = Z
      expect(cross(UNIT_X, UNIT_Y)).toEqual(UNIT_Z);
    });

    it('cross product is anti-commutative', () => {
      // Y × X = -Z
      const result = cross(UNIT_Y, UNIT_X);
      expect(result.x).toBeCloseTo(0);
      expect(result.y).toBeCloseTo(0);
      expect(result.z).toBeCloseTo(-1);
    });

    it('cross product of parallel vectors is zero', () => {
      const result = cross(UNIT_X, mul(UNIT_X, 5));
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.z).toBe(0);
    });
  });

  // ── Length & Distance ────────────────────────────────────────────────
  describe('len / lenSq / dist', () => {
    it('computes length', () => {
      expect(len(vec3(3, 4, 0))).toBe(5);
    });

    it('computes squared length', () => {
      expect(lenSq(vec3(3, 4, 0))).toBe(25);
    });

    it('computes distance between points', () => {
      expect(dist(vec3(0, 0, 0), vec3(3, 4, 0))).toBe(5);
    });

    it('distance is symmetric', () => {
      const a = vec3(1, 2, 3);
      const b = vec3(4, 5, 6);
      expect(dist(a, b)).toBeCloseTo(dist(b, a));
    });
  });

  // ── Normalization ────────────────────────────────────────────────────
  describe('normalize', () => {
    it('normalizes to unit length', () => {
      const n = normalize(vec3(3, 4, 0));
      expect(len(n)).toBeCloseTo(1);
      expect(n.x).toBeCloseTo(0.6);
      expect(n.y).toBeCloseTo(0.8);
    });

    it('returns ZERO for zero-length vector', () => {
      expect(normalize(ZERO)).toEqual(ZERO);
    });

    it('returns ZERO for near-zero vector', () => {
      expect(normalize(vec3(1e-12, 0, 0))).toEqual(ZERO);
    });
  });

  // ── Interpolation ───────────────────────────────────────────────────
  describe('lerp / midpoint', () => {
    it('lerp at t=0 returns a', () => {
      expect(lerp(vec3(0, 0, 0), vec3(10, 10, 10), 0)).toEqual(vec3(0, 0, 0));
    });

    it('lerp at t=1 returns b', () => {
      expect(lerp(vec3(0, 0, 0), vec3(10, 10, 10), 1)).toEqual(
        vec3(10, 10, 10),
      );
    });

    it('lerp at t=0.5 returns midpoint', () => {
      const result = lerp(vec3(0, 0, 0), vec3(10, 20, 30), 0.5);
      expect(result).toEqual(vec3(5, 10, 15));
    });

    it('midpoint computes average', () => {
      expect(midpoint(vec3(0, 0, 0), vec3(10, 20, 30))).toEqual(
        vec3(5, 10, 15),
      );
    });
  });

  // ── Projection ──────────────────────────────────────────────────────
  describe('projectOnPlane', () => {
    it('removes component along the normal', () => {
      // Project (1, 1, 1) onto the XZ plane (normal = Y)
      const result = projectOnPlane(vec3(1, 1, 1), UNIT_Y);
      expect(result.x).toBeCloseTo(1);
      expect(result.y).toBeCloseTo(0);
      expect(result.z).toBeCloseTo(1);
    });

    it('leaves vectors already in the plane unchanged', () => {
      const v = vec3(3, 0, 4);
      const result = projectOnPlane(v, UNIT_Y);
      expect(result).toEqual(v);
    });
  });

  // ── Utilities ───────────────────────────────────────────────────────
  describe('lerpScalar / isNearZero', () => {
    it('lerpScalar interpolates numbers', () => {
      expect(lerpScalar(0, 10, 0.3)).toBeCloseTo(3);
    });

    it('isNearZero returns true for zero vector', () => {
      expect(isNearZero(ZERO)).toBe(true);
    });

    it('isNearZero returns false for non-zero vector', () => {
      expect(isNearZero(vec3(0.1, 0, 0))).toBe(false);
    });
  });
});
