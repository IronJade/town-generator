package towngenerator.building;

import openfl.geom.Point;

import geom.Polygon;
import geom.Voronoi.Region;

import towngenerator.wards.Ward;

class Patch {

	public var shape	: Polygon;
	public var ward 	: Ward;

	public var withinWalls	: Bool;
	public var withinCity	: Bool;

	public inline function new( vertices:Array<Point> ) {
		this.shape = new Polygon( vertices );

		withinCity	= false;
		withinWalls	= false;
	}

	public static function fromRegion( r:Region ):Patch
		return new Patch( [for (tr in r.vertices) tr.c] );
}

