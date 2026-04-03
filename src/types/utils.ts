/**
 * Stub type definitions for utility types.
 */

/**
 * Recursively makes all properties readonly.
 * Preserves Map, Set, Date, RegExp, Function, and Promise types
 * to avoid breaking their method signatures.
 */
export type DeepImmutable<T> = T extends (infer R)[]
  ? ReadonlyArray<DeepImmutable<R>>
  : T extends ReadonlyMap<infer K, infer V>
    ? ReadonlyMap<K, DeepImmutable<V>>
    : T extends Map<infer K, infer V>
      ? ReadonlyMap<K, DeepImmutable<V>>
      : T extends ReadonlySet<infer U>
        ? ReadonlySet<DeepImmutable<U>>
        : T extends Set<infer U>
          ? ReadonlySet<DeepImmutable<U>>
          : T extends Function
            ? T
            : T extends Date
              ? T
              : T extends RegExp
                ? T
                : T extends Promise<infer U>
                  ? Promise<DeepImmutable<U>>
                  : T extends object
                    ? { readonly [K in keyof T]: DeepImmutable<T[K]> }
                    : T

/**
 * Generates all permutations of a union type as a tuple type.
 * Used for exhaustive checking patterns.
 */
export type Permutations<T extends string, U extends string = T> =
  [T] extends [never]
    ? []
    : T extends any
      ? [T, ...Permutations<Exclude<U, T>>]
      : never
