import { Particle, ParticleContainer, type Texture } from 'pixi.js';

/**
 * A fixed set of particles drawn in one batch. Nothing is allocated per frame:
 * free particles are parked at zero scale and handed out again.
 */
export class DropPool {
  readonly container: ParticleContainer;
  readonly particles: Particle[] = [];
  readonly active: Uint8Array;
  private free: Int32Array;
  private freeTop: number;

  constructor(tex: Texture, readonly capacity: number) {
    this.container = new ParticleContainer({
      dynamicProperties: { position: true, vertex: true, color: true, rotation: false, uvs: false },
      texture: tex,
    });
    this.active = new Uint8Array(capacity);
    this.free = new Int32Array(capacity);
    for (let i = 0; i < capacity; i++) {
      const p = new Particle({ texture: tex, anchorX: 0.5, anchorY: 0.5, x: -50, y: -50, scaleX: 0, scaleY: 0, alpha: 0 });
      this.particles.push(p);
      this.container.addParticle(p);
      this.free[i] = capacity - 1 - i;
    }
    this.freeTop = capacity;
  }

  alloc(): number {
    if (this.freeTop === 0) return -1;
    const i = this.free[--this.freeTop];
    this.active[i] = 1;
    return i;
  }

  release(i: number): void {
    if (!this.active[i]) return;
    this.active[i] = 0;
    const p = this.particles[i];
    p.alpha = 0;
    p.scaleX = 0;
    p.scaleY = 0;
    this.free[this.freeTop++] = i;
  }

  releaseAll(): void {
    for (let i = 0; i < this.capacity; i++) this.release(i);
  }
}
