declare module "kiwi-schema" {
  export interface KiwiCompiledSchema {
    decodeMessage?: (buffer: Uint8Array) => Record<string, unknown>;
    [key: string]: unknown;
  }
  export function decodeBinarySchema(buffer: Uint8Array): unknown;
  export function compileSchema(schema: unknown): KiwiCompiledSchema;
}
