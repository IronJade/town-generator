import { Model } from '../Model';
import { Patch } from '../Patch';
import { CommonWard } from './CommonWard';
import { Random } from '../../utils/Random';

/**
 * A patriciate ward with large mansions for the wealthy
 */
export class PatriciateWard extends CommonWard {
    /**
     * Create a patriciate ward
     */
    constructor(model: Model, patch: Patch) {
        super(
            model, 
            patch,
            80 + 30 * Random.float() * Random.float(), // large buildings
            0.5 + Random.float() * 0.3,                // moderately regular grid
            0.8,                                       // high size variety
            0.2                                        // many empty spaces (gardens)
        );
    }

    /**
     * Get the label for this ward type
     */
    override getLabel(): string {
        return "Patriciate";
    }

    /**
     * Rate how suitable a patch is for this ward type
     */
    public static rateLocation(model: Model, patch: Patch): number {
        // Patriciate ward prefers to border a park and not to border slums
        let rate = 0;
        
        for (const p of model.patches) {
            if (p.ward && p.shape.borders(patch.shape)) {
                if (p.ward.constructor.name === 'Park') {
                    rate--; // Better score for bordering parks
                } else if (p.ward.constructor.name === 'Slum') {
                    rate++; // Worse score for bordering slums
                }
            }
        }
        
        return rate;
    }
}