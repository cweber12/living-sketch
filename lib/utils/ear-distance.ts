/** EMA tracker for the average distance between ears (for head sizing). */
export class EarDistance {
  avgEarDistance = 0;
  private earAlpha = 0.3;

  updateAvgEarDistance(newDistance: number) {
    if (this.avgEarDistance === 0) {
      this.avgEarDistance = newDistance;
    } else {
      this.avgEarDistance =
        this.earAlpha * newDistance + (1 - this.earAlpha) * this.avgEarDistance;
    }
  }

  getEarX(leftEar: { x: number }, rightEar: { x: number }): number {
    return rightEar.x - leftEar.x;
  }
}
