import { Model } from '../Model';
import { Patch } from '../Patch';
import { CommonWard } from './CommonWard';
import { Random } from '../../utils/Random';

/**
 * An administration ward with official buildings and courts
 */
export class AdministrationWard extends CommonWard {
    /**
     * Create an administration ward
     */
    constructor(model: Model, patch: Patch) {
        super(
            model, 
            patch,
            80 + 30 * Random.float() * Random.float(), // large buildings
            0.1 + Random.float() * 0.3,                // very regular grid
            0.3                                        // low size variety
        );
    }

    /**
     * Get the label for this ward type
     */
    override getLabel(): string {
        return "Administration";
    }

    /**
     * Rate how suitable a patch is for this ward type
     */
    public static rateLocation(model: Model, patch: Patch): number {
        // Ideally administration ward should overlook the plaza,
        // otherwise it should be as close to the plaza as possible
        return model.plaza !== null 
            ? (patch.shape.borders(model.plaza.shape) 
                ? 0 // Best location - next to plaza
                : patch.shape.distance(model.plaza.shape.center))
            : patch.shape.distance(model.center);
    }
}