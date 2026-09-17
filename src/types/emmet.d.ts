// The `emmet` package ships types, but its package.json "exports" hides them from TypeScript.
// Only the two functions we use are declared here.
declare module "emmet" {
  type AbbreviationType = "markup" | "stylesheet";

  export default function expand(
    abbreviation: string,
    config?: { type?: AbbreviationType; syntax?: string; options?: Record<string, unknown> },
  ): string;

  export function extract(
    line: string,
    position?: number,
    options?: { type?: AbbreviationType; lookAhead?: boolean; prefix?: string },
  ): { abbreviation: string; location: number; start: number; end: number } | undefined;
}
