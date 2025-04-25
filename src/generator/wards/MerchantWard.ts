import { Model } from '../Model';
import { Patch } from '../Patch';
import { CommonWard } from './CommonWard';
import { Random } from '../../utils/Random';

/**
 * A ward for merchants with medium to large buildings
 */
export class MerchantWard extends CommonWard {
    /**
     * Create a merchant ward
     */
    constructor(model: Model, patch: Patch) {
        super(
            model, 
            patch,
            50 + 60 * Random.float() * Random.float(), // medium to large
            0.5 + Random.float() * 0.3,                // moderately regular grid
            0.7,                                       // moderate size variety
            0.15                                       // higher chance of empty spaces
        );
    }

    /**
     * Get the label for this ward type
     */
    override getLabel(): string {
        return "Merchant";
    }

    /**
     * Rate how suitable a patch is for this ward type
     */
    public static rateLocation(model: Model, patch: Patch): number {
        // Merchant wards should be as close to the center as possible
        return patch.shape.distance(
            model.plaza !== null ? model.plaza.shape.center : model.center
        );
    }
}