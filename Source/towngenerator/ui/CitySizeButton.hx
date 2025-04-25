package towngenerator.ui;

import coogee.Game;
import utils.Random;

import towngenerator.building.Model;

class CitySizeButton extends Button {

	private var size : Int;

	public function new( label:String, minSize:Int, maxSize:Int ) {
		super( label );

		size = minSize + Std.int( Math.random() * (maxSize - minSize) );

		click.add( onClick );
	}

	private function onClick():Void {
		StateManager.size = size;
		StateManager.seed = Random.getSeed();
		StateManager.pushParams();

		new Model( size );
		Game.switchScene( TownScene );
	}
}
