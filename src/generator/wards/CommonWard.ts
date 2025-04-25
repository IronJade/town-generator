import { Model } from '../Model';
import { Patch } from '../Patch';
import { Ward } from './Ward';
import { Random } from '../../utils/Random';

/**
 * Base class for common residential wards
 * Used by Craftsmen, Merchant, Patriciate, etc.
 */
export class CommonWard extends Ward {
    protected minSq: number;
    protected gridChaos: number;
    protected sizeChaos: number;
    protected emptyProb: number;

    /**
     * Create a common ward with specific parameters for buildings
     * 
     * @param model The town model
     * @param patch The ward's patch
     * @param minSq Minimum square footage for buildings
     * @param gridChaos How chaotic the street grid is (0-1)
     * @param sizeChaos How varied building sizes are (0-1)
     * @param emptyProb Probability of leaving a space empty (0-1)
     */
    constructor(
        model: Model, 
        patch: Patch, 
        minSq: number, 
        gridChaos: number, 
        sizeChaos: number, 
        emptyProb: number = 0.04
    ) {
        super(model, patch);
        
        this.minSq = minSq;
        this.gridChaos = gridChaos;
        this.sizeChaos = sizeChaos;
        this.emptyProb = emptyProb;
    }

    /**
     * Create ward geometry with buildings and alleys
     */
    override createGeometry(): void {
        const block = this.getCityBlock();
        this.geometry = Ward.createAlleys(
            block, 
            this.minSq, 
            this.gridChaos, 
            this.sizeChaos, 
            this.emptyProb
        );

        // If this ward is not enclosed by other wards, filter outside buildings
        if (!this.model.isEnclosed(this.patch)) {
            this.filterOutskirts();
        }
    }
}