/* ################################################################################################
 * #
 * #		RED Interactive - Digital Advertising
 * #		RED | Dev | fbaPngNode | kenny | 1.7
 * #
 * ################################################################################################ */
trace("----------------------------------------------------------------------------------------------------------------------------");
trace(" ad.js[RED | Dev | fbaPngNode | kenny | 300x250 | 1.7]");
trace("  ");
trace("  VERSION - template.txt[BUILD SOURCE: Standard - Base / OPTIONS:  / AdApp: 1.5.56 / AdHtml: v2.8.2 / Created: 10/20/17 03:40pm]");
trace("----------------------------------------------------------------------------------------------------------------------------");









/* -- COMMON: js/control/PrepareCommon.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
var PrepareCommon = new function() {
	var id = 'PrepareCommon';
	var self = this;
	
	var async;
	self.completeCallback;
	self.init = function( completeCallback ) {
		trace( id + '.init()' );

		self.completeCallback = completeCallback;
		async = new Async();
		async.onComplete( self.initComplete );
		async.wait();

		async.done();
	}
	self.initComplete = function() {
		trace( id + '.initComplete()' );
		async = new Async();
		async.onComplete( self.completeCallback );
		async.wait();

		self.prepareAdData();
		self.loadImageQueue();

		async.done();
	}
	self.prepareAdData = function() {
		trace( id + '.prepareAdData()' );
		global.adData = new AdData();
	}
	self.loadImageQueue = function() {
		trace( id + '.loadImageQueue()' );
		async.wait();
		ImageManager.load( 
			self.loadImageQueueComplete,
			self.loadImageQueueFail
		);
	}
	self.loadImageQueueFail = function() {
		global.failAd();
	}
	self.loadImageQueueComplete = function() {
		trace( id + '.loadImageQueueComplete()');
		async.done();	
	}

}




















/* -- COMMON: js/data/AdData.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
function AdData(){
	var self = this;
	
	self.elements = {};
	self.elements.redAdContainer = Markup.get( 'redAdContainer' );
	
	self.edgeData = new EdgeData();
	
	self.fonts = {
		primary : 'template_font'
	}

	self.colors = {
	}
	self.svg = {
	}
}
























/* -- COMMON: js/data/EdgeData.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
var EdgeData = ( function( arg ) {

	var self = this;
	arg = arg || {};
	self.getMaskCssFor = function( instanceId ) {
		return '-webkit-clip-path: ' + self.convertMaskShapeToMaskCss( self.getMaskShapeBy( instanceId ).update() );
	}
	self.getMaskShapeBy = function( instanceId ) {
		for( var key in maskShapes ) {
			if( key == instanceId )
				return maskShapes[key];
		}
	}
	self.convertMaskShapeToMaskCss = function( maskPoints ) {
		var maskCss = 'polygon( '
		for( var i=0; i < maskPoints.length; i++ ) {
			maskCss += String( maskPoints[i][0] ) + 'px ' + String( maskPoints[i][1] ) + 'px, '
		}
		return maskCss.slice( 0, maskCss.length-2 ) + ' )'		
	}
	
});



















/* -- VIEWS(300x250): ViewStyles -----------------------------------------------------------------------------------------
 *
 *
 *
 */
var ViewStyles = {};









/* -- VIEWS(300x250): Views -----------------------------------------------------------------------------------------
 *
 *
 *
 */
var Views = {};









/* -- BUILD SIZE(300x250): build.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
/* BUILD SOURCE: Standard - Base / OPTIONS:  / AdApp: 1.5.56 / AdHtml: v2.8.2 / Created: 10/20/17 03:40pm */
var Control = new function() {
	this.prepareBuild = function() {
		trace( 'Control.prepareBuild()' );
		Control.preMarkup();
		View.main = new Main();
		Control.postMarkup();
		Animation.startAd();
	}

	this.preMarkup = function() {
		trace( 'Control.preMarkup()' );
	}

	this.postMarkup = function() {
		trace( 'Control.postMarkup()' );
		Gesture.add( View.main, GestureEvent.CLICK, Control.handleClick );
	}
	this.handleClick = function ( event ) {
		Network.exit( clickTag ); 
	}
}
function Main(){
	var T = Markup.get( 'main' );
	Styles.setCss( T, { backgroundColor:'#cccccc' })
	var pool = ['rgba','dog','img0']
	var col = []
	for ( var i = 0; i < pool.length; i++ ){
		col[i] = new UIImage({
			source : pool[i],
			target : T,
			align : {
				x : i > 0 ? {
					type : Align.RIGHT,
					against : col[i-1], 
					outer : true
				} : null
			}
		})
	}

	new UIImage({
		target : T,
		source : 'btnPlay',
		css : {
			width : 50
		},
		aspectRatio : true,
		align : {
			x : Align.RIGHT,
			y : Align.BOTTOM
		}
	})

	new UITextField({
		target : T,
		text : 'I AM SOME TEXT',
		fontFamily : 'Gotham-Bold_Subset',
		fontSize : 20,
		bufferText : {
			left : 5,
			bottom : 5
		},
		align : Align.BOTTOM
	})

	return T;
}
var Animation = new function() {
	this.startAd = function() {
		trace( 'Animation.startAd()' );
		global.removePreloader();
		Styles.setCss( View.main, { opacity:1 });
	}
}






















/* -- BUILD SIZE(300x250): build.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
/* BUILD SOURCE: Standard - Base / OPTIONS:  / AdApp: 1.5.56 / AdHtml: v2.8.2 / Created: 10/20/17 03:40pm */
var Control = new function() {
	this.prepareBuild = function() {
		trace( 'Control.prepareBuild()' );
		Control.preMarkup();
		View.main = new Main();
		Control.postMarkup();
		Animation.startAd();
	}

	this.preMarkup = function() {
		trace( 'Control.preMarkup()' );
	}

	this.postMarkup = function() {
		trace( 'Control.postMarkup()' );
		Gesture.add( View.main, GestureEvent.CLICK, Control.handleClick );
	}
	this.handleClick = function ( event ) {
		Network.exit( clickTag ); 
	}
}
function Main(){
	var T = Markup.get( 'main' );
	Styles.setCss( T, { backgroundColor:'#cccccc' })
	var pool = ['rgba','dog','img0']
	var col = []
	for ( var i = 0; i < pool.length; i++ ){
		col[i] = new UIImage({
			source : pool[i],
			target : T,
			align : {
				x : i > 0 ? {
					type : Align.RIGHT,
					against : col[i-1], 
					outer : true
				} : null
			}
		})
	}

	new UIImage({
		target : T,
		source : 'btnPlay',
		css : {
			width : 50
		},
		aspectRatio : true,
		align : {
			x : Align.RIGHT,
			y : Align.BOTTOM
		}
	})

	new UITextField({
		target : T,
		text : 'I AM SOME TEXT',
		fontFamily : 'Gotham-Bold_Subset',
		fontSize : 20,
		bufferText : {
			left : 5,
			bottom : 5
		},
		align : Align.BOTTOM
	})

	return T;
}
var Animation = new function() {
	this.startAd = function() {
		trace( 'Animation.startAd()' );
		global.removePreloader();
		Styles.setCss( View.main, { opacity:1 });
	}
}






















