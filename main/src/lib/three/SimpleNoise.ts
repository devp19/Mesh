export class SimpleNoise {
  private p: Uint8Array;
  private perm: Uint8Array;

  constructor() {
    this.p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) this.p[i] = i;
    for (let i = 255; i > 0; i--) {
      const r = Math.floor(Math.random() * (i + 1));
      [this.p[i], this.p[r]] = [this.p[r], this.p[i]];
    }
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = this.p[i & 255];
  }

  noise(x: number, y: number, z: number): number {
    return Math.sin(x * 5 + Math.cos(y * 4 + z * 3)) * Math.cos(z * 5);
  }

  fbm(x: number, y: number, z: number, octaves: number): number {
    let total = 0, amp = 1, freq = 1, max = 0;
    for (let i = 0; i < octaves; i++) {
      total += Math.sin(x * freq) * Math.cos(y * freq) * Math.sin(z * freq) * amp;
      max += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return total / max;
  }
}

