/**
 * Adaptive quality: if frames stay slow, carry the same data in fewer drops.
 * The threshold sits below 30 fps so an iPhone in Low Power Mode is left alone.
 */
export class Quality {
  private readonly levels = [1, 0.6, 0.35];
  private level = 0;
  private ema = 16.7;
  private slowMs = 0;
  private fastMs = 0;
  onChange: () => void = () => {};

  get factor(): number {
    return this.levels[this.level];
  }

  sample(ms: number): void {
    const m = Math.min(ms, 100);
    this.ema += (m - this.ema) * 0.05;
    if (this.ema > 36) {
      this.slowMs += m;
      this.fastMs = 0;
      if (this.slowMs > 1500 && this.level < this.levels.length - 1) {
        this.level++;
        this.slowMs = 0;
        this.onChange();
      }
    } else if (this.ema < 20) {
      this.fastMs += m;
      this.slowMs = 0;
      if (this.fastMs > 8000 && this.level > 0) {
        this.level--;
        this.fastMs = 0;
        this.onChange();
      }
    } else {
      this.slowMs = 0;
      this.fastMs = 0;
    }
  }
}
