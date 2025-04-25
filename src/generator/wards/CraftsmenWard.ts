import { Model } from '../Model';
import { Patch } from '../Patch';
import { CommonWard } from './CommonWard';
import { Random } from '../../utils/Random';

/**
 * A ward for craftsmen with small to medium workshops
 */
export class CraftsmenWard extends CommonWard {
    /**
     * Create a craftsmen ward
     */
    constructor(model: Model, patch: Patch) {
        super(
            model, 
            patch,
            10 + 80 * Random.float() * Random.float(), // small to large
            0.5 + Random.float() * 0.2,                // moderately regular grid
            0.6                                        // moderate size variety
        );
    }

    /**
     * Get the label for this ward type
     */
    override getLabel(): string {
        return "Craftsmen";
    }

    /**
     * Rate how suitable a patch is for this ward type
     */
    public static rateLocation(model: Model, patch: Patch): number {
        // Craftsmen wards can be anywhere, so we use a neutral score
        return 0;
    }
}