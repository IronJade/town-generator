/**
 * A seedable random number generator
 */
export class Random {
    // Constants for the linear congruential generator
    private static readonly g = 48271.0;
    private static readonly n = 2147483647;

    // Current seed value
    private static seed = 1;

    /**
     * Reset the random number generator with a new seed
     * If no seed is provided, use the current timestamp
     */
    public static reset(seed: number = -1): void {
        Random.seed = seed !== -1 
            ? seed 
            : Math.floor(Date.now() % Random.n);
    }

    /**
     * Get the current seed value
     */
    public static getSeed(): number {
        return Random.seed;
    }

    /**
     * Generate the next random number in the sequence
     */
    private static next(): number {
        return (Random.seed = Math.floor((Random.seed * Random.g) % Random.n));
    }

    /**
     * Generate a random float between 0 and 1
     */
    public static float(): number {
        return Random.next() / Random.n;
    }

    /**
     * Generate a normally distributed random number (roughly)
     * Uses the average of three random numbers for a bell curve
     */
    public static normal(): number {
        return (Random.float() + Random.float() + Random.float()) / 3;
    }

    /**
     * Generate a random integer between min (inclusive) and max (exclusive)
     */
    public static int(min: number, max: number): number {
        return Math.floor(min + Random.next() / Random.n * (max - min));
    }

    /**
     * Generate a random boolean with the given probability of being true
     */
    public static bool(chance: number = 0.5): boolean {
        return Random.float() < chance;
    }

    /**
     * Generate a fuzzy random value, with f controlling the randomness
     * f=0 means always return 0.5, f=1 means fully random
     */
    public static fuzzy(f: number = 1.0): number {
        if (f === 0) {
            return 0.5;
        } else {
            return (1 - f) / 2 + f * Random.normal();
        }
    }
}