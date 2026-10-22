export const isNonEmptyString = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0;

// Whole number >= 1 (ids, prices, quantities)
export const isPositiveInt = (value: unknown): value is number =>
    Number.isInteger(value) && (value as number) >= 1;

// Whole number >= 0 (counts that may be zero, e.g. inventory)
export const isNonNegativeInt = (value: unknown): value is number =>
    Number.isInteger(value) && (value as number) >= 0;

export const isOneOf = <T extends string>(value: unknown, allowed: readonly T[]): value is T =>
    typeof value === "string" && (allowed as readonly string[]).includes(value);
