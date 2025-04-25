import { Model } from '../Model';
import { Patch } from '../Patch';
import { CommonWard } from './CommonWard';
import { Random } from '../../utils/Random';

/**
 * A ward for the poor with small chaotic buildings
 */
export class Slum extends CommonWard {
    /**
     * Create a slum ward
     */
    constructor(model: Model, patch: Patch) {
        super(
            model, 
            patch,
            10 + 30 * Random.float() * Random.float(), // small to medium
            0.6 + Random.float() * 0.4,                // chaotic grid
            0.8,                                       // high size variety
            0.03                                       // low chance of empty spaces
        );
    }

    /**
     * Get the label for this ward type
     */
    override getLabel(): string {
        return "Slum";
    }

    /**
     * Rate how suitable a patch is for this ward type
     */
    public static rateLocation(model: Model, patch: Patch): number {
        // Slums should be as far from the center as possible
        // Negative because we want to minimize the rating
        return -patch.shape.distance(
            model.plaza !== null ? model.plaza.shape.center : model.center
        );
    }
}