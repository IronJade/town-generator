/**
 * StateManager stores and manages global state for the town generator
 */
export class StateManager {
    /**
     * The size parameter for town generation (6-40)
     * Small Town: 6-9
     * Large Town: 10-14
     * Small City: 15-23
     * Large City: 24-39
     * Metropolis: 40+
     */
    public static size: number = 15;
    
    /**
     * The random seed used for town generation
     * -1 means generate a new random seed
     */
    public static seed: number = -1;
    
    /**
     * Get a descriptive name for the current town size
     */
    public static getStateName(): string {
        if (this.size >= 6 && this.size < 10) {
            return "Small Town";
        } else if (this.size >= 10 && this.size < 15) {
            return "Large Town";
        } else if (this.size >= 15 && this.size < 24) {
            return "Small City";
        } else if (this.size >= 24 && this.size < 40) {
            return "Large City";
        } else if (this.size >= 40) {
            return "Metropolis";
        } else {
            return "Unknown State";
        }
    }
}