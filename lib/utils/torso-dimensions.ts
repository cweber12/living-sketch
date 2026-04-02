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
