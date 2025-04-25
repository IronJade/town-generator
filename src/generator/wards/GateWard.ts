import { Model } from '../Model';
import { Patch } from '../Patch';
import { CommonWard } from './CommonWard';
import { Random } from '../../utils/Random';

/**
 * A ward around city gates with inns, markets, and stables
 */
export class GateWard extends CommonWard {
    /**
     * Create a gate ward
     */
    constructor(model: Model, patch: Patch) {
        super(
            model, 
            patch,
            10 + 50 * Random.float() * Random.float(), // varied building sizes
            0.5 + Random.float() * 0.3,                // moderately regular grid
            0.7                                        // moderate size variety
        );
    }

    /**
     * Get the label for this ward type
     */
    override getLabel(): string {
        return "Gate";
    }

    /**
     * Rate how suitable a patch is for this ward type
     */
    public static rateLocation(model: Model, patch: Patch): number {
        // This is handled by the Model class directly
        // which places gate wards at gates, so no rating is needed
        return 0;
    }
}