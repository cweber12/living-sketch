/** EMA (exponential moving average) tracker for torso dimensions.
 *  Used to smooth body-part sizing across frames. */
export class TorsoDimensions {
  avgTorsoHeight = 0;
  avgTorsoWidth = 0;
  avgHipWidth = 0;
  currentTorsoWidth = 0;
  currentHipWidth = 0;

  torsoSvgWidth = 0;
  torsoSvgHeight = 0;

  scaleFactorX = 1;
  scaleFactorY = 1;

  /** Smoothed facing factor: positive = front-facing, negative = back-facing */
  facingSmoothed = 1;

  private torsoAlpha = 0.1;
  private hipAlpha = 0.05;
  private facingAlpha = 0.15;
  private initFlipFlag = false;
  private sameAfterFlipCount = 0;
  private confirmFlipFlag = false;

  private _updateScaleFactorY() {
    if (this.torsoSvgHeight > 0) {
      this.scaleFactorY = (this.avgTorsoHeight / this.torsoSvgHeight) * 1.2;
    }
  }

  private _updateScaleFactorX() {
    if (this.torsoSvgWidth > 0) {
      this.scaleFactorX = this.avgHipWidth / this.torsoSvgWidth;
    }
  }

  updateTorsoSvgDimensions(h: number, w: number) {
    this.torsoSvgHeight = h;
    this.torsoSvgWidth = w;
  }

  updateAvgTorsoHeight(newHeight: number) {
    if (this.avgTorsoHeight === 0) {
      this.avgTorsoHeight = newHeight;
    } else {
      this.avgTorsoHeight =
        this.torsoAlpha * newHeight +
        (1 - this.torsoAlpha) * this.avgTorsoHeight;
    }
    this._updateScaleFactorY();
  }

  updateAvgTorsoWidth(newWidth: number) {
    if (this.avgTorsoWidth === 0) {
      this.avgTorsoWidth = newWidth;
    } else {
      this.avgTorsoWidth =
        this.torsoAlpha * newWidth + (1 - this.torsoAlpha) * this.avgTorsoWidth;
    }
  }

  /** EMA-smoothed hypotenuse of the torso diagonal (right hip → left shoulder).
   *  Stays stable across orientation changes — use for head size scaling. */
  avgTorsoHypotenuse = 0;
  private torsoHypAlpha = 0.1;

  updateAvgTorsoHypotenuse(value: number): void {
    if (this.avgTorsoHypotenuse === 0) {
      this.avgTorsoHypotenuse = value;
    } else {
      this.avgTorsoHypotenuse =
        this.torsoHypAlpha * value +
        (1 - this.torsoHypAlpha) * this.avgTorsoHypotenuse;
    }
  }

  /** Hypotenuse of the torso SVG bounding box. */
  get torsoSvgHypotenuse(): number {
    return Math.hypot(
      Math.max(1, this.torsoSvgWidth),
      Math.max(1, this.torsoSvgHeight),
    );
  }

  updateAvgHipWidth(newWidth: number) {
    this.currentTorsoWidth = newWidth;

    // Flip detection: sign change in hip width signals body turned around
    if (this.currentHipWidth * newWidth > 0) {
      if (this.initFlipFlag) {
        this.hipAlpha = 0.3;
        this.initFlipFlag = false;
      } else if (!this.confirmFlipFlag) {
        if (this.sameAfterFlipCount > 2) {
          this.confirmFlipFlag = true;
        } else {
          this.sameAfterFlipCount++;
        }
      } else {
        this.hipAlpha = 0.1;
        this.sameAfterFlipCount = 0;
        this.confirmFlipFlag = false;
      }
    } else {
      this.hipAlpha = 0.1;
      this.sameAfterFlipCount = 0;
      this.confirmFlipFlag = false;
      if (!this.initFlipFlag) this.initFlipFlag = true;
    }

    this.currentHipWidth = newWidth;

    if (this.avgHipWidth === 0) {
      this.avgHipWidth = newWidth;
    } else {
      this.avgHipWidth =
        this.hipAlpha * newWidth + (1 - this.hipAlpha) * this.avgHipWidth;
    }
    this._updateScaleFactorX();
  }

  /** Update facing direction from cross product of torso vectors.
   *  Positive cross = front-facing, negative = back-facing. */
  updateFacing(crossProduct: number) {
    const target = crossProduct >= 0 ? 1 : -1;
    this.facingSmoothed =
      this.facingAlpha * target + (1 - this.facingAlpha) * this.facingSmoothed;
  }

  /** Whether the subject is currently front-facing. */
  get isFront(): boolean {
    return this.facingSmoothed >= 0;
  }

  // ── Per-section facing: upper body (shoulders) and lower body (hips) ──

  /** Smoothed upper-body facing (shoulders). Positive = front-facing. */
  upperBodyFacingSmoothed = 1;
  /** Smoothed lower-body facing (hips). Positive = front-facing. */
  lowerBodyFacingSmoothed = 1;

  private upperFacingAlpha = 0.15;
  private lowerFacingAlpha = 0.15;

  /**
   * Update upper-body facing from shoulder x-positions.
   * Mirror view convention: left shoulder x > right shoulder x = front.
   */
  updateUpperBodyFacing(lsX: number, rsX: number): void {
    const target = lsX > rsX ? 1 : -1;
    this.upperBodyFacingSmoothed =
      this.upperFacingAlpha * target +
      (1 - this.upperFacingAlpha) * this.upperBodyFacingSmoothed;
  }

  /**
   * Update lower-body facing from hip x-positions.
   * Mirror view convention: left hip x > right hip x = front.
   */
  updateLowerBodyFacing(lhX: number, rhX: number): void {
    const target = lhX > rhX ? 1 : -1;
    this.lowerBodyFacingSmoothed =
      this.lowerFacingAlpha * target +
      (1 - this.lowerFacingAlpha) * this.lowerBodyFacingSmoothed;
  }

  /** Whether the upper body (torso, arms, head) is currently front-facing. */
  get isUpperBodyFront(): boolean {
    return this.upperBodyFacingSmoothed >= 0;
  }

  /** Whether the lower body (legs, feet) is currently front-facing. */
  get isLowerBodyFront(): boolean {
    return this.lowerBodyFacingSmoothed >= 0;
  }

  // ── Arm same-direction tracking (smoothed) ──

  /** Smoothed same-direction coefficient for left arm. Positive = same dir. */
  leftArmSameDirSmoothed = -0.5;
  /** Smoothed same-direction coefficient for right arm. Positive = same dir. */
  rightArmSameDirSmoothed = -0.5;

  private armDirAlpha = 0.2;

  /**
   * Update left-arm same-direction tracking.
   * @param upperDx - x component of upper-arm vector (shoulder→elbow)
   * @param lowerDx - x component of lower-arm vector (elbow→wrist)
   */
  updateLeftArmSameDir(upperDx: number, lowerDx: number): void {
    const target = upperDx * lowerDx > 0 ? 1 : -1;
    this.leftArmSameDirSmoothed =
      this.armDirAlpha * target +
      (1 - this.armDirAlpha) * this.leftArmSameDirSmoothed;
  }

  /**
   * Update right-arm same-direction tracking.
   * @param upperDx - x component of upper-arm vector (shoulder→elbow)
   * @param lowerDx - x component of lower-arm vector (elbow→wrist)
   */
  updateRightArmSameDir(upperDx: number, lowerDx: number): void {
    const target = upperDx * lowerDx > 0 ? 1 : -1;
    this.rightArmSameDirSmoothed =
      this.armDirAlpha * target +
      (1 - this.armDirAlpha) * this.rightArmSameDirSmoothed;
  }

  /** Whether left upper arm and lower arm point in the same horizontal direction. */
  get isLeftArmSameDir(): boolean {
    return this.leftArmSameDirSmoothed >= 0;
  }

  /** Whether right upper arm and lower arm point in the same horizontal direction. */
  get isRightArmSameDir(): boolean {
    return this.rightArmSameDirSmoothed >= 0;
  }

  /**
   * Uniform cross-section scale factor (averaged from width + height ratios).
   * Used by segment-based drawing functions to scale SVG cross-widths.
   */
  get crossSectionScale(): number {
    return (
      ((Math.abs(this.avgTorsoHeight) * 0.5) /
        Math.max(1, this.torsoSvgHeight) +
        (Math.abs(this.avgTorsoWidth) * 0.5) /
          Math.max(1, this.torsoSvgWidth)) /
      2
    );
  }
}
