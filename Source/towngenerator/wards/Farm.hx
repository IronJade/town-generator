package towngenerator.wards;

import utils.Random;
import geom.Polygon;
import geom.GeomUtils;

using utils.ArrayExtender;

class Farm extends Ward {

	override public function createGeometry() {
		var housing = Polygon.rect( 4, 4 );
		var pos = GeomUtils.interpolate( patch.shape.random(), patch.shape.centroid, 0.3 + Random.float() * 0.4 );
		housing.rotate( Random.float() * Math.PI );
		housing.offset( pos );

		geometry = Ward.createOrthoBuilding( housing, 8, 0.5 );
	}

	override public inline function getLabel() return "Farm";
}
