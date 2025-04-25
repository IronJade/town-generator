import { Model } from '../Model';
import { Patch } from '../Patch';
import { Ward } from './Ward';
import { Random } from '../../utils/Random';

/**
 * A military ward with barracks and training grounds
 */
export class MilitaryWard extends Ward {
    /**
     * Create the geometry for the military ward
     */
    override createGeometry(): void {
        const block = this.getCityBlock();
        
        // Create a regimented layout with alleys and squares
        this.geometry = Ward.createAlleys(
            block,
            Math.sqrt(block.square) * (1 + Random.float()), // base size
            0.1 + Random.float() * 0.3,                     // moderate grid regularity
            0.3,                                            // low size variability
            0.25                                            // high chance of empty squares (training grounds)
        );
    }

    /**
     * Get the label for this ward type
     */
    override getLabel(): string {
        return "Military";
    }

    /**
     * Rate how suitable a patch is for this ward type
     */
    public static rateLocation(model: Model, patch: Patch): number {
        // Military ward should border the citadel or the city walls
        if (model.citadel !== null && model.citadel.shape.borders(patch.shape)) {
            return 0; // Best location - next to citadel
        } else if (model.wall !== null && model.wall.borders(patch)) {
            return 1; // Good location - next to wall
        } else {
            // If there's no citadel or wall, any location is fine
            // Otherwise, this is a poor choice
            return (model.citadel === null && model.wall === null) ? 0 : Infinity;
        }
    }
}