import { vec3 } from '../math';
import type { BodyTransforms, PartTransform3D } from '../types';
import { TemporalSmoother } from '../temporal-smoother';

function makePart(x: number, y: number, z: number): PartTransform3D {
  return {
    position: vec3(x, y, z),
    basis: {
      right: vec3(1, 0, 0),
      up: vec3(0, 1, 0),
      forward: vec3(0, 0, 1),
    },
    width: 0.5,
    height: 0.5,
    confidence: 0.9,
  };
}

function makeFullTransforms(
  override: Partial<BodyTransforms> = {},
): BodyTransforms {
  const base = makePart(0, 0, 0);
  return {
    torso: base,
    head: base,
    leftUpperArm: base,
    leftLowerArm: base,
    leftHand: base,
    rightUpperArm: base,
    rightLowerArm: base,
    rightHand: base,
    leftUpperLeg: base,
    leftLowerLeg: base,
    leftFoot: base,
    rightUpperLeg: base,
    rightLowerLeg: base,
    rightFoot: base,
    isFront: true,
    ...override,
  };
}

function makeNullTransforms(): BodyTransforms {
  return {
    torso: null,
    head: null,
    leftUpperArm: null,
    leftLowerArm: null,
    leftHand: null,
    rightUpperArm: null,
    rightLowerArm: null,
    rightHand: null,
    leftUpperLeg: null,
    leftLowerLeg: null,
    leftFoot: null,
    rightUpperLeg: null,
    rightLowerLeg: null,
    rightFoot: null,
    isFront: true,
  };
}

describe('TemporalSmoother', () => {
  it('passes through the first frame directly', () => {
    const smoother = new TemporalSmoother();
    const raw = makeFullTransforms({ torso: makePart(1, 2, 3) });
    const result = smoother.smooth(raw);

    expect(result.torso).not.toBeNull();
    expect(result.torso!.position.x).toBeCloseTo(1);
    expect(result.torso!.position.y).toBeCloseTo(2);
    expect(result.torso!.position.z).toBeCloseTo(3);
  });

  it('smooths between consecutive frames', () => {
    const smoother = new TemporalSmoother();

    const frame1 = makeFullTransforms({ torso: makePart(0, 0, 0) });
    smoother.smooth(frame1);

    const frame2 = makeFullTransforms({ torso: makePart(1, 0, 0) });
    const result = smoother.smooth(frame2);

    // EMA with alpha=0.4: result = 0 * 0.6 + 1 * 0.4 = 0.4
    expect(result.torso!.position.x).toBeCloseTo(0.4);
  });

  it('reuses stale transforms when current is null', () => {
    const smoother = new TemporalSmoother();

    const frame1 = makeFullTransforms({ torso: makePart(1, 2, 3) });
    smoother.smooth(frame1);

    // Next frame has null torso
    const frame2 = makeFullTransforms({ torso: null });
    const result = smoother.smooth(frame2);

    // Should reuse previous
    expect(result.torso).not.toBeNull();
    expect(result.torso!.position.x).toBeCloseTo(1);
  });

  it('hides part after MAX_STALE_FRAMES of null', () => {
    const smoother = new TemporalSmoother();

    const frame1 = makeFullTransforms({ torso: makePart(1, 0, 0) });
    smoother.smooth(frame1);

    // Feed 11 null frames (MAX_STALE_FRAMES = 10)
    const nullFrame = makeFullTransforms({ torso: null });
    for (let i = 0; i < 11; i++) {
      smoother.smooth(nullFrame);
    }

    const result = smoother.smooth(nullFrame);
    expect(result.torso).toBeNull();
  });

  it('preserves isFront from raw transforms', () => {
    const smoother = new TemporalSmoother();

    const frame1 = makeFullTransforms();
    const r1 = smoother.smooth(frame1);
    expect(r1.isFront).toBe(true);

    const frame2 = { ...makeFullTransforms(), isFront: false };
    const r2 = smoother.smooth(frame2);
    expect(r2.isFront).toBe(false);
  });

  it('handles all-null input gracefully', () => {
    const smoother = new TemporalSmoother();
    const result = smoother.smooth(makeNullTransforms());

    expect(result.torso).toBeNull();
    expect(result.head).toBeNull();
    expect(result.leftUpperArm).toBeNull();
  });

  it('reset clears all state', () => {
    const smoother = new TemporalSmoother();

    // Build up state
    smoother.smooth(makeFullTransforms({ torso: makePart(5, 5, 5) }));

    // Reset
    smoother.reset();

    // Next frame should be passed through directly (no blending)
    const result = smoother.smooth(
      makeFullTransforms({ torso: makePart(1, 1, 1) }),
    );
    expect(result.torso!.position.x).toBeCloseTo(1);
    expect(result.torso!.position.y).toBeCloseTo(1);
  });

  it('smooths width and height with lower alpha', () => {
    const smoother = new TemporalSmoother();

    const part1 = { ...makePart(0, 0, 0), width: 1.0, height: 1.0 };
    smoother.smooth(makeFullTransforms({ torso: part1 }));

    const part2 = { ...makePart(0, 0, 0), width: 2.0, height: 2.0 };
    const result = smoother.smooth(makeFullTransforms({ torso: part2 }));

    // EMA with alpha=0.2: result = 1.0 * 0.8 + 2.0 * 0.2 = 1.2
    expect(result.torso!.width).toBeCloseTo(1.2);
    expect(result.torso!.height).toBeCloseTo(1.2);
  });

  it('applies recovery ramp over multiple frames after stale gap', () => {
    const smoother = new TemporalSmoother();

    // Establish initial state
    const frame1 = makeFullTransforms({ head: makePart(0, 0, 0) });
    smoother.smooth(frame1);

    // A few null frames to trigger stale mode + recovery flag
    const nullHead = makeFullTransforms({ head: null });
    smoother.smooth(nullHead);
    smoother.smooth(nullHead);

    // Recovery: first valid frame after gap should use reduced alpha
    const frame2 = makeFullTransforms({ head: makePart(1, 0, 0) });
    const r1 = smoother.smooth(frame2);

    // With recovery alpha (0.1), position should be closer to 0 than normal alpha (0.4)
    expect(r1.head!.position.x).toBeLessThan(0.4);
    expect(r1.head!.position.x).toBeGreaterThan(0);

    // Second recovery frame should have slightly higher alpha (ramping up)
    const frame3 = makeFullTransforms({ head: makePart(1, 0, 0) });
    const r2 = smoother.smooth(frame3);

    // Should be further towards 1 than r1 but still ramping
    expect(r2.head!.position.x).toBeGreaterThan(r1.head!.position.x);
  });
});
