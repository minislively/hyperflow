declare const process: {
  env?: Record<string, string | undefined>;
  versions?: {
    node?: string;
  };
};

declare module "node:test" {
  type TestHandler = (context?: unknown) => void | Promise<void>;
  export default function test(name: string, handler: TestHandler): void;
}

declare module "node:assert/strict" {
  interface Assert {
    equal(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    match(actual: string, expected: RegExp, message?: string): void;
    ok(value: unknown, message?: string): void;
  }

  const assert: Assert;
  export default assert;
}

declare module "node:fs/promises" {
  export function readFile(path: string | URL): Promise<Uint8Array>;
}
