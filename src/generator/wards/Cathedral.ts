import { Model } from '../Model';
import { Patch } from '../Patch';
import { Ward } from './Ward';
import { Random } from '../../utils/Random';
import { Cutter } from '../Cutter';

/**
 * A cathedral/temple ward with prominent religious buildings
 */
export class Cathedral extends Ward {
    /**
     * Create the geometry for the cathedral
     */
    override createGeometry(): void {
        const block = this.getCityBlock();
        
        // 40% chance of circular cathedral, otherwise orthogonal layout
        if (Random.bool(0.4)) {
            // Circular layout with inner courtyard
            this.geometry = Cutter.ring(block, 2 + Random.float() * 4);
        } else {
            // Rectangular layout
            this.geometry = Ward.createOrthoBuilding(
                block, 
                50,  // large building footprint
                0.8  // high building density
            );
        }
    }

    /**
     * Get the label for this ward type
     */
    override getLabel(): string {
        return "Temple";
    }

    /**
     * Rate how suitable a patch is for this ward type
     */
    public static rateLocation(model: Model, patch: Patch): number {
        // Ideally the main temple should overlook the plaza,
        // otherwise it should be as close to the plaza as possible
        if (model.plaza !== null && patch.shape.borders(model.plaza.shape)) {
            return -1/patch.shape.square; // Negative for higher priority, scaled by size
        } else {
            // Distance from plaza or center, weighted by size
            return patch.shape.distance(
                model.plaza !== null ? model.plaza.shape.center : model.center
            ) * patch.shape.square;
        }
    }
}