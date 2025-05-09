package towngenerator.wards;

import openfl.geom.Point;
import towngenerator.building.Patch;
import towngenerator.building.Model;
import towngenerator.building.CurtainWall;

using utils.ArrayExtender;

class Castle extends Ward {

	public var wall	: CurtainWall;

	public function new( model:Model, patch:Patch ) {
		super( model, patch );

		wall = new CurtainWall( true, model, [patch], patch.shape.filter(
			function( v:Point ) return model.patchByVertex( v ).some(
				function( p:Patch ) return !p.withinCity
			)
		) );
	}

	override public function createGeometry() {
		var block = patch.shape.shrinkEq( Ward.MAIN_STREET * 2 );
		geometry = Ward.createOrthoBuilding( block, Math.sqrt( block.square ) * 4, 0.6 );
	}

	override public inline function getLabel() return "Castle";
}
