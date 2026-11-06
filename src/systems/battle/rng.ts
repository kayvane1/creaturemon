export interface BattleRng {
  float(): number;
  intInclusive(min: number, max: number): number;
  chance(percent: number): boolean;
  pickIndex(length: number): number;
}

export class MathBattleRng implements BattleRng {
  float(): number {
    return Math.random();
  }

  intInclusive(min: number, max: number): number {
    return clamp(Math.floor(this.float() * (max - min + 1)) + min, min, max);
  }

  chance(percent: number): boolean {
    return this.float() * 100 < percent;
  }

  pickIndex(length: number): number {
    if (length <= 0) return 0;
    return this.intInclusive(0, length - 1);
  }
}

export class ScriptedBattleRng implements BattleRng {
  readonly calls: string[] = [];
  private floats: number[];
  private ints: number[];
  private indexes: number[];

  constructor(script: { floats?: number[]; ints?: number[]; indexes?: number[] } = {}) {
    this.floats = [...(script.floats ?? [])];
    this.ints = [...(script.ints ?? [])];
    this.indexes = [...(script.indexes ?? [])];
  }

  float(): number {
    this.calls.push('float');
    return clamp(this.floats.shift() ?? 0, 0, 0.999999);
  }

  intInclusive(min: number, max: number): number {
    this.calls.push('int');
    const scripted = this.ints.shift();
    if (scripted !== undefined) return clamp(Math.floor(scripted), min, max);
    return clamp(Math.floor(this.float() * (max - min + 1)) + min, min, max);
  }

  chance(percent: number): boolean {
    this.calls.push(`chance:${percent}`);
    return this.float() * 100 < percent;
  }

  pickIndex(length: number): number {
    this.calls.push('pick');
    if (length <= 0) return 0;
    const scripted = this.indexes.shift();
    if (scripted !== undefined) return clamp(Math.floor(scripted), 0, length - 1);
    return this.intInclusive(0, length - 1);
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
