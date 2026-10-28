export interface Factory<T> {
  build(overrides?: Partial<T>): T;
  buildMany(count: number, overrides?: Partial<T>): T[];
  /** Restart the sequence, e.g. in `beforeEach`, so values don't depend on test order. */
  reset(): void;
}

/** Builds valid records from a sequence number; tests override only what they care about. */
export function defineFactory<T>(build: (seq: number) => T): Factory<T> {
  let seq = 0;
  return {
    build: (overrides = {}) => ({ ...build(++seq), ...overrides }),
    buildMany(count, overrides = {}) {
      return Array.from({ length: count }, () => this.build(overrides));
    },
    reset: () => {
      seq = 0;
    },
  };
}
