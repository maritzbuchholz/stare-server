export const isNonEmptyString = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0;

// Non-empty string that also fits a varchar(maxLength) column.
// Array.from counts characters the way MySQL does, so an emoji is 1 character (value.length would say 2)
export const isNonEmptyStringUpTo = (value: unknown, maxLength: number): value is string =>
    isNonEmptyString(value) && Array.from(value).length <= maxLength;

// Whole number >= 1 (ids, prices, quantities)
export const isPositiveInt = (value: unknown): value is number =>
    Number.isInteger(value) && (value as number) >= 1;

// Whole number >= 0 (counts that may be zero, e.g. inventory)
export const isNonNegativeInt = (value: unknown): value is number =>
    Number.isInteger(value) && (value as number) >= 0;

// Largest values MySQL's integer columns hold: int (prices, stock counts) and int unsigned (ids)
export const MAX_INT = 2147483647;
export const MAX_UNSIGNED_INT = 4294967295;

// The two checks above with an upper limit, for values that must fit the column they're stored in
export const isPositiveIntUpTo = (value: unknown, max: number): value is number =>
    isPositiveInt(value) && value <= max;

export const isNonNegativeIntUpTo = (value: unknown, max: number): value is number =>
    isNonNegativeInt(value) && value <= max;

export const isOneOf = <T extends string>(value: unknown, allowed: readonly T[]): value is T =>
    typeof value === "string" && (allowed as readonly string[]).includes(value);
