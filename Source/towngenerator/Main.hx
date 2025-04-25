package towngenerator;

import openfl.system.Capabilities;

import coogee.Game;
import coogee.BitmapText.BitmapFont;

import towngenerator.building.Model;
import towngenerator.mapping.CityMap;

class Main extends Game {

	public static var uiFont	: BitmapFont;

	public function new () {
		StateManager.pullParams();
		StateManager.pushParams();

		stage.color = CityMap.palette.paper;

		uiFont = BitmapFont.get( "font", CityMap.palette.paper );
		uiFont.letterSpacing = 1;
		uiFont.baseLine = 8;

		new Model( StateManager.size, StateManager.seed );

		super( TownScene );
	}

	override public function getScale( w:Int, h:Int ):Float {
		return Std.int( Capabilities.screenDPI / 24 );
	}
}