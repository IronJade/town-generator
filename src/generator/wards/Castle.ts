import { Point } from '../../geom/Point';
import { Model } from '../Model';
import { Patch } from '../Patch';
import { Ward } from './Ward';
import { CurtainWall } from '../CurtainWall';

export class Castle extends Ward {
    public wall: CurtainWall;

    constructor(model: Model, patch: Patch) {
        super(model, patch);

        // Create castle walls
        // Find the outer edges of the castle (those bordering non-city patches)
        const outerEdges = patch.shape.filter(v => 
            model.patchByVertex(v).some(p => !p.withinCity)
        );

        // Create a curtain wall for the castle
        this.wall = new CurtainWall(
            true,   // is a real wall
            model,  // model reference
            [patch], // patches contained by wall
            outerEdges // reserved edges
        );
    }

    override createGeometry(): void {
        // Create the castle interior buildings
        const block = this.patch.shape.shrinkEq(Ward.MAIN_STREET * 2);
        this.geometry = Ward.createOrthoBuilding(
            block, 
            Math.sqrt(block.square) * 4, 
            0.6
        );
    }

    override getLabel(): string {
        return "Castle";
    }
}