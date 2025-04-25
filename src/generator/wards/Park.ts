import { Model } from '../Model';
import { Patch } from '../Patch';
import { Ward } from './Ward';
import { Cutter } from '../Cutter';

/**
 * A park ward with green spaces
 */
export class Park extends Ward {
    /**
     * Create the geometry for the park
     */
    override createGeometry(): void {
        const block = this.getCityBlock();
        
        // Use different cutting methods based on park shape
        if (block.compactness >= 0.7) {
            // For compact parks, use radial pattern
            this.geometry = Cutter.radial(block, null, Ward.ALLEY);
        } else {
            // For irregular parks, use semi-radial pattern
            this.geometry = Cutter.semiRadial(block, null, Ward.ALLEY);
        }
    }

    /**
     * Get the label for this ward type
     */
    override getLabel(): string {
        return "Park";
    }
    
    /**
     * Rate how suitable a patch is for this ward type
     */
    public static rateLocation(model: Model, patch: Patch): number {
        // Parks are equally suitable in any location
        return 0;
    }
}