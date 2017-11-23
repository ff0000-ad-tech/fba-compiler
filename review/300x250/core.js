/* ################################################################################################
 * #
 * #		RED Interactive - Digital Advertising
 * #		RED | Dev | fbaPngNode | kenny | 1.7
 * #
 * ################################################################################################ */
trace("----------------------------------------------------------------------------------------------------------------------------");
trace(" core.js[RED | Dev | fbaPngNode | kenny | 300x250 | 1.7]");
trace("  ");
trace("----------------------------------------------------------------------------------------------------------------------------");









/* -- CORE: js/control/PrepareCore.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
var PrepareCore = new function() {

	var self = this;
	var assetLoader = undefined;
	var jsonPending = false;

	var async;
	self.init = function( completeCallback, fbaLoader ) {
		trace( 'PrepareCore.init()' );
		if( typeof global.async == 'undefined' ) {
			throw new Error( 'Index migration required. To avoid migration, rollback core/js/control/PrepareCore.js' );
		}
		async = new Async();
		async.onComplete( completeCallback );
		async.wait();
		if( fbaLoader )
			prepareFbaPayload( fbaLoader );
		prepareViews();
		queueRequestedImages();	
		loadFonts();
		Device.init();
		Device.trace();
		CssManager.init();

		async.done();
	}
	function prepareFbaPayload( fbaLoader ) {
		trace( 'PrepareCore.prepareFbaPayload()' );
		ImageManager.addFbaImages( fbaLoader );
	}
	function prepareViews() {
		trace( 'PrepareCore.prepareViews()' );
		if( typeof views !== 'undefined' ) {
			var viewRequests = views.call();
			if( viewRequests.length ) {
				async.wait();
				
				global.Views = {};
				global.ViewStyles = {};

				new ViewLoader( viewRequests, {
					name: 'viewLoader',
					onComplete: function() {
						async.done();
					}
				}).load();
			}
		}
	}
	function queueRequestedImages() {
		ImageManager.addLoader( new Loader( 
			assets.images, { 
				name: 'indexImages', 
				prepend: adParams.imagesPath 
		}));
		ImageManager.addLoader( new Loader( 
			assets.edgeImages, { 
				name: 'edgeImages', 
				prepend: adParams.edgePath 
		}));
	}
	function loadFonts() {
		trace( 'PrepareCore.loadFonts()' );

		async.wait();
		fontLoader = new Loader({ 
			name: 'fontLoader', 
			onComplete: loadFontsComplete,
			onFail: global.failAd, 
			scope: self
		});
		fontLoader.add( new Loader( assets.fonts, { name: 'fontSubLoader', prepend: adParams.fontsPath, fileType: 'ttf' }));
		fontLoader.add( new Loader( assets.edgeFonts, { name: 'fontEdgeSubLoader', prepend: adParams.fontsPath, fileType: 'ttf' }));
		fontLoader.load();
	}
	function loadFontsComplete() {
		async.done();
	}


}




















/* -- CORE: js/external/Device.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
var Device = new function() {

	var D = this;
	D.pixelRatio = window.devicePixelRatio || 'unknown';
	Object.defineProperties(D, {
		orientation: {
			get: function() {
				return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
			}
		},
		dimensions: {
			get: function() {
				return {
					width: window.innerWidth,
					height: window.innerHeight
				}
			}
		}
	})
	D.init = function() {
		trace('Device.init()');

		D.agentString = navigator.userAgent;
		for (var m in D) {
			if (m != 'init' && m != 'trace' && typeof D[m] == 'function') {
				D[m].call();
			}
		}
		if (D.type !== 'desktop' && D.os === 'windows' && D.osVersion <= 8 && D.browser === 'ie' && D.browserVersion < 12) {
			trace("You appear to be on Windows 7 or 8 using Internet Explorer 11 or under. You also appear to be on a touchscreen device. We will assume you're actually on a desktop, since it's extremely unlikely you're on a tablet or mobile device using this specific operating system and browser.");
			D.type = 'desktop';
		}
	}
	D.trace = function() {
		var line = Array(70).join('-')
		var str = '\n' + line;
		str += '\n AGENT:\n\n\t' + D.agentString + '\n';
		str += '\n  Brand:\t\t\t' + D.brand;
		str += '\n  Product:\t\t\t' + D.product;
		str += '\n  Type:\t\t\t\t' + D.type;
		str += '\n  Os:\t\t\t\t' + D.os + ' - ' + D.osVersion;
		str += '\n  Browser:\t\t\t' + D.browser + ' - ' + D.browserVersion;
		str += '\n  Dimensions: \t\t' + D.dimensions.width + 'x' + D.dimensions.height;
		str += '\n  Orientation:\t\t' + D.orientation;
		str += '\n  Pixel Ratio:\t\t' + D.pixelRatio;
		str += '\n' + line;
		trace(str)
	}
	D._getType = function() {
		var hasMobile = /(android|mobile)/gi.exec(D.agentString);
		var hasTablet = /(tablet|touch)/gi.exec(D.agentString);
		var hasIPad = /(ipad)/gi.exec(D.agentString);
		D.type = 'desktop';
		if (hasMobile) D.type = 'mobile';
		if (hasTablet) D.type = 'tablet';
		if (hasIPad) D.type = 'tablet';
	}

	D._getBrandAndOS = function() {
		var apple = D.agentString.match(/ip(hone|od|ad)|mac/gi);
		if (apple) {
			D.brand = 'apple';
			D.product = apple[0].toLowerCase();
			var appleOS = /(OS\s)(\X\s|)([\d\.\_]+)/gi.exec(D.agentString);
			D.os = appleOS[2] == '' ? 'ios' : 'osx';
			D.osVersion = appleOS[3].replace(/\_/g, '.');
			return;
		}

		var android = /(android)\/?\s*([0-9\.]+)/gi.exec(D.agentString);
		if (android) {
			D.brand = D.product = D.os = android[1].toLowerCase();
			D.osVersion = android[2];
			return;
		}

		var microsoft = /(windows\snt\s|windows\sphone)\/?\s*([0-9\.]+)/gi.exec(D.agentString)
		if (microsoft) {
			D.brand = 'microsoft';
			D.os = 'windows';

			switch (microsoft[2]) {
				case '5.2':
					D.osVersion = 'xp';
					break;
				case '6.0':
					D.osVersion = 'vista';
					break;
				case '6.1':
					D.osVersion = '7';
					break;
				case '6.2':
					D.osVersion = '8';
					break;
				case '6.3':
					D.osVersion = '8.1';
					break;
				case '10.0':
					D.osVersion = '10';
					break;
				default:
					D.osVersion = microsoft[2];
			}

			D.product = microsoft[1].toLowerCase();
			if (D.product.match(/\snt/i)) {
				D.product = 'pc';
			}
			return;
		}
		var blackberry = D.agentString.match(/(blackberry|bb10|playbook)/i);
		if (blackberry) {
			D.brand = D.product = D.os = 'blackberry';
			D.osVersion = /(version)\/?\s*([0-9\.]+)/gi.exec(D.agentString)[2];
		}
	}

	D._getBrowser = function() {
		var browserMatches = /(edge(?=\/))\/?\s*([0-9\.]+)/i.exec(D.agentString); // check for edge first
		if (!browserMatches) {
			browserMatches = D.agentString.match(/(fban|fbav|opera|chrome|crios|safari|firefox|msie|trident(?=\/))\/?\s*([0-9\.]+)/i);
		}
		if (!browserMatches || browserMatches.length < 3) {
			trace("we received no browser data, so we are setting it to the default of the device");
			switch (D.os) {
				case 'ios':
					D.browser = 'safari';
					break;
				case 'windows':
					D.browser = 'trident';
					break;
				default:
					D.browser = 'chrome';
					break;
			}
			D.browserVersion = 'os-default';
			return;
		}

		trace('we received browser data');
		D.browser = browserMatches[1].toLowerCase();
		D.browserVersion = browserMatches[2];

		switch (D.browser) {
			case 'trident':
				var versionMatch = /\brv:+(\d+)/g.exec(D.agentString);
				if (versionMatch)
					D.browserVersion = versionMatch[1];
			case 'msie':
				D.browser = 'ie';
				break;
			case 'crios':
				D.browser = 'chrome';
				break;
			case 'safari':
				var versionMatch = D.agentString.match(/\sversion\/([0-9\.]+)\s/i);
				if (versionMatch)
					D.browserVersion = versionMatch[1];
				break;
			case 'chrome':
				var versionMatch = D.agentString.match(/\b(OPR)\/([0-9\.]+)/i);
				if (versionMatch) {
					D.browser = 'opera';
					D.browserVersion = versionMatch[2];
				}
				break;
		}
	}

};



















/* -- CORE: js/control/CssManager.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
var CssManager = new function() {

	var C = this;
	C.init = function() {
		trace( 'CssManager.init()' );
		C.generateBrowserKeyDictionary();
	}
	C.debug_level1 = false;
	C.debug_level2 = false;
	C.filter;
	C.debug_element;
	C.debug_css_list;
	C.setDebugLevel = function( _level ) { 
		switch( parseInt( _level  )) {
			case 1:
				C.debug_level1 = true;
				C.debug_level2 = false;
				break;
			case 2:
				C.debug_level1 = true;
				C.debug_level2 = true;
				break;
			default:
				C.debug_level1 = false;
				C.debug_level2 = false;
				break;
		}
	}
	C.setDebugFilter = function( _filter ) {
		trace( 'CssManager.setDebugFilter(),', _filter );
		C.filter = _filter;
		C.debug_level1 = true;
	}
	C.ifDebug = function( _debugLevel ) {
		if( !C.filter )
			return C[ _debugLevel ];
		else if( C.passDebugFilter() && C[ _debugLevel ] )
			return true;
	}
	C.passDebugFilter = function() {
		if( C.debug_element )
			if( C.debug_element.id.indexOf( C.filter ) > -1 ) 
				return true;
		if( C.debug_css_list )
			for( var i in C.debug_css_list ) {
				if( i.indexOf( C.filter ) > -1 )
					return true;
				else if( String( C.debug_css_list[ i ] ).indexOf( C.filter ) > -1 )
					return true; 
			}
		return false;
	}
	C.deviceKeyDict;

	C.generateBrowserKeyDictionary = function() {
		trace( 'CssManager.generateBrowserKeyDictionary()' );
		C.deviceKeyDict = {};

		var styles = document.createElement( 'div' ).style;

		for( var key in styles ) {
			var prefix = C.getPrefix( key );
			var standardKey = C.standardizeKey( key );
			switch( Device.browser ) {
				case 'safari':
					if( prefix == 'webkit' ) {
						C.deviceKeyDict[ standardKey ] = C.prependPrefix( 'webkit', standardKey );
					}
					else {
						if( !( C.prependPrefix( 'webkit', standardKey ) in styles ) ) {
							C.deviceKeyDict[ standardKey ] = standardKey;
						}
					}
					break;

				case 'firefox':
					var mozKey = C.prependPrefix( 'Moz', standardKey );
					var webkitKey = C.prependPrefix( 'Webkit', standardKey );
					if( standardKey in styles ) {
						C.deviceKeyDict[ standardKey ] = standardKey
					}
					else if( prefix == 'moz' ) {
						if( C.camelateKey( 'webkit-' + standardKey ) in styles ) {
							C.deviceKeyDict[ standardKey ] = mozKey;
						}
					}
					else if( prefix == 'webkit' ) {
						if( !( mozKey in styles ) ) {
							C.deviceKeyDict[ standardKey ] = webkitKey;
						}
					}
					break;

				case 'chrome':
				case 'ie':
				default:
					if( standardKey in styles ) {
						C.deviceKeyDict[ standardKey ] = standardKey
					}
					else if( prefix ) {
						C.deviceKeyDict[ standardKey ] = C.prependPrefix( prefix, standardKey );
					}
					break;


			}
		}
		trace( ' KEY DICTIONARY:', C.deviceKeyDict );
	}
	C.apply = function( _element, _cssList ) {
		C.debug_element = _element;
		C.debug_css_list = _cssList;
		if( C.ifDebug( 'debug_level1' )) trace( '  CssManager.apply()', _element.id );
		var _transformList = {}

		for( var key in _cssList ) {
			if( key.match( /^transform\(/ ) )
				_transformList [ key ] = _cssList [ key ]
			else {
				if( C.ifDebug( 'debug_level1' )) trace( '   ' + key + ': ' + _cssList[ key ] + ';' );
				_element.style[ C.getDeviceKey( key ) ] = _cssList[ key ];
			}
		}
		C.applyTransforms ( _element, _transformList );


		if( C.ifDebug( 'debug_level1' )) trace( '\n\n' );
		C.debug_element = null;
		C.debug_css_list = null;
	}
	C.conformCssObject = function( _cssObject, _debugElement ) {
		C.debug_element = _debugElement;
		if( C.ifDebug( 'debug_level1' )) trace( 'CssManager.conformCssObject()', _cssObject );
		var cssList = {};
		if( _cssObject ) {
			for( var key in _cssObject ) {
				if( C.ifDebug( 'debug_level2' )) trace( '  PARSE( key: ' + key + ', value: ' + _cssObject[ key ] + ' )' );
				var declarations = C.conformKeyValue( key, _cssObject[ key ] );
				for( var i in declarations ) {
					if( C.ifDebug( 'debug_level2' )) trace( '    CONFORMED DECLARATION:', declarations[ i ] );
					cssList[ declarations[ i ][ 0 ]] = declarations[ i ][ 1 ];
				}
			}
		}
		C.debug_element = null;
		return cssList;
	}
	C.conformCssString = function( _cssString, _debugElement ) {
		C.debug_element = _debugElement;
		if( C.ifDebug( 'debug_level1' )) trace( ' CssManager.conformCssString()' );
		var cssList = {};
		if( _cssString ) {
			var declarations = _cssString.split( /\s*;\s*/ );
			for( var key in declarations ) {
				if( declarations[ key ] ) {
					var declarationParts = declarations[ key ].split( /:(.+)?/ );
					if( C.ifDebug( 'debug_level2' )) trace( '  PARSE( key: ' + declarationParts[ 0 ] + ', value: ' + declarationParts[ 1 ] + ' )' );
					var conformedDeclarations = C.conformKeyValue( declarationParts[ 0 ], declarationParts[ 1 ] );
					for( var i in conformedDeclarations ) {
						if( C.ifDebug( 'debug_level2' )) trace( '    CONFORMED DECLARATION:', conformedDeclarations[ i ] );
						cssList[ conformedDeclarations[ i ][ 0 ] ] = conformedDeclarations[ i ][ 1 ];
					}
				}
			}
		}
		C.debug_element = null;
		return cssList;
	}
	C.conformCssKeyValue = function( _key, _value ) {
		if( C.ifDebug( 'debug_level1' )) trace( ' CssManager.conformCssKeyValue()' );
		var cssObject = {};
		cssObject[ _key ] = _value;
		return C.conformCssObject( cssObject );
	}
	C.applyTransforms = function( _element, _value ) {
		if( C.ifDebug( 'debug_level1' )) 
			trace( '    - CssManager.applyTransforms(), ', _value );
		var matrix2D = new Matrix2D();
		var existingTransform = _element.style[ C.getDeviceKey( 'transform' )];
		var matrixMatch = existingTransform.match( /matrix[^\)]+\)/ );
		if( matrixMatch ) {
			matrix2D.setFromCss( matrixMatch[ 0 ]);
			if( C.ifDebug( 'debug_level2' ))
				trace( '       existing matrix:', matrix2D.data );
		}

		if( 'transforms' in _element )
			var transforms = _element.transforms;
		else {
			var transforms = {
				'tx': 0,
				'ty': 0,
				'rz': 0,
				'sx': 1,
				'sy': 1
			};
		}

		var changed = {}
		for ( var key in _value ){
			var transformMethod = key.match( /\(\s([^\s]+)/ )[ 1 ];
			changed [ transformMethod ] = _value [ key ];
		}
		if ( changed.tx != undefined ){
			matrix2D.data[2] = 0;
		}
		if ( changed.ty != undefined ){
			matrix2D.data[5] = 0;
		}
		if ( changed.rz != undefined ){
			var reverse = -transforms.rz;  
			matrix2D.rotate( reverse * (Math.PI / 180) );
			matrix2D.rotate( changed.rz * (Math.PI / 180) ); 
			transforms.rz = changed.rz;
		}	
		if ( changed.sx != undefined ){
			var reverse = ( 1 / transforms.sx );  
			matrix2D.scale( reverse, 1 );
			matrix2D.scale( changed.sx, 1 );
			transforms.sx = changed.sx;
		}
		if ( changed.sy != undefined ){
			var reverse = ( 1 / transforms.sy );  
			matrix2D.scale( 1, reverse );
			matrix2D.scale( 1, changed.sy );
			transforms.sy = changed.sy;
		}
		
		if ( changed.tx != undefined ){
			matrix2D.translate( changed.tx, 0 ); 
			transforms.tx = changed.tx;
		}
		if ( changed.ty != undefined ){
			matrix2D.translate( 0, changed.ty ); 
			transforms.ty = changed.ty;
		}
		_element.transforms = transforms;
		if( C.ifDebug( 'debug_level2' ))
			trace( '       updated matrix:', matrix2D.data );
		_element.style[ C.getDeviceKey( 'transform' )] = matrix2D.getCss();
		
	}
	C.conformKeyValue = function( _key, _value ) {
		_key = String( _key ).trim();
		_value = String( _value ).trim();
		var keyAsStandard = C.standardizeKey( _key );
		return C.conformValue( keyAsStandard, _value )
	}
	C.hasPrefix = function( _key ) {
		return _key.search( matchPrefixRegex() ) > -1;
	}
	C.getPrefix = function( _key ) {
		var match = _key.match( matchPrefixRegex() );
		return match ? match[ 1 ].replace( /-/g, '' ).toLowerCase() : null;
	}
	C.stripPrefix = function( _key ) {
		var keyless = _key.replace( matchPrefixRegex(), '' );
		return keyless.charAt( 0 ).toLowerCase() + keyless.slice( 1 );
	}
	C.getDeviceKey = function( _key ) {
		return _key in C.deviceKeyDict ? C.deviceKeyDict[ _key ] : _key;
	}
	C.prependPrefix = function( prefix, key ) {
		return prefix + key.replace( /^(.)/, function( $1 ) { return ( $1 ).charAt( 0 ).toUpperCase(); });
	}
	C.standardizeKey = function( _key ) {
		_key = C.stripPrefix( _key );
		if( _key in C.keyFormatExceptions() ) 
			_key = C.keyFormatExceptions()[ _key ];
		else _key = C.camelateKey( _key );

		if( C.ifDebug( 'debug_level2' )) trace( '    - result: "' + _key + '"' );
		return _key;
	}
	C.camelateKey = function( _key ) {
		_key = _key.replace( /-(.)/g, function( $1 ) { return ( $1 ).charAt( 1 ).toUpperCase(); });
		return _key;
	}
	C.keyFormatExceptions = function() {
		return {
			'x': 			'transform( tx )',
			'translateX': 		'transform( tx )',
			'y': 			'transform( ty )',
			'translateY': 		'transform( ty )',

			'rotate': 		'transform( rz )',
			'rotation': 		'transform( rz )',

			'scaleX': 		'transform( sx )',
			'scaleY': 		'transform( sy )',
			'scale': 		'transform( sx ),transform( sy )'
		};
	}
	C.conformValue = function( _key, _value ) {
		var conformedValues = [];
		var conformedValue;
		var hasMultipleValues = _value.match( /\s/ );
		var numericValue = _value.match( matchNumberRegex() );
		if( !hasMultipleValues && numericValue ) {
			if( C.ifDebug( 'debug_level2' )) trace( '   conform value as number' );
			conformedValue = Number( numericValue[ 0 ] );
			var unitMatch = _value.match( /[^0-9\.]+$/ );
			if( unitMatch ) 
				conformedValue += unitMatch[ 0 ];
			else 
				switch( _key ) {
					case 'top': case 'right': case 'bottom': case 'left':
					case 'width': case 'height':
					case 'fontSize':
					case 'lineHeight':
					case 'padding' : 
					case 'margin' : 
					case 'marginRight': case 'marginLeft': case 'marginTop': case 'marginBottom':
					case 'borderRadius':
					case 'borderWidth':
					case 'letterSpacing':
						conformedValue += 'px';
						break;
				}
		}
		else if( _key == 'backgroundImage' ) {
			if( C.ifDebug( 'debug_level2' )) trace( '   conform value as background image' );
			_value = _value.replace( /^url\(\s*['"]*/, '' ).replace( /['"]*\s*\)$/, '' );
			conformedValue = 'url( "' + _value + '" )'
		}
		else if( _key == 'transform' ) { // && Device.browser == 'ie' ) {
			if( C.ifDebug( 'debug_level2' )) trace( '   convert "transform" functions to individual transforms' );
			var functionRegex = /([a-z0-9]+)\(([^\)]+)\)/ig;
			while( params = functionRegex.exec( _value )) {
				var args = params[ 2 ].replace( /\s/g, '' ).split( ',' ).map( function( value, index, array ) {
					return Number( value.match( matchNumberRegex() )[ 0 ] );
				});
				switch( params[ 1 ] ) {
					case 'translate':
						conformedValues.push([ 'transform( tx )', args[ 0 ] ]);
						conformedValues.push([ 'transform( ty )', args[ 1 ] ]);
						break;
					case 'translateX':
						conformedValues.push([ 'transform( tx )', args[ 0 ] ]);
						break;
					case 'translateY':
						conformedValues.push([ 'transform( ty )', args[ 0 ] ]);
						break;

					case 'rotate':
						conformedValues.push([ 'transform( rz )', args[ 0 ] ]);
						break;

					case 'scale':
						conformedValues.push([ 'transform( sx )', args[ 0 ] ]);
						conformedValues.push([ 'transform( sy )', args[ 1 ] ]);
						break;
					case 'scaleX':
						conformedValues.push([ 'transform( sx )', args[ 0 ] ]);
						break;
					case 'scaleY':
						conformedValues.push([ 'transform( sy )', args[ 0 ] ]);
						break;
				}
			}
		}
		else {
			if( C.ifDebug( 'debug_level2' )) trace( '   conform value as string' );
			conformedValue = _value;
		}
		if( conformedValue != undefined ) {
			if( C.ifDebug( 'debug_level2' )) trace( '    - result: "' + conformedValue + '"' );
			var splitKeys = _key.split(/\,/);

			for ( var i = 0; i < splitKeys.length; i++ ){
				conformedValues.push([ 
					splitKeys[i],
					conformedValue
				]);
			}
		}

		return conformedValues;
	}

	function matchNumberRegex() {
		return /^[+-]?[0-9]*\.?[0-9]+/;
	}
	function matchPrefixRegex() {
		return /^-*(moz-*|webkit-*|ms-*|o-)/i;
	}
}





















/* -- CORE: js/control/ImageManager.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
var ImageManager = new function(){
	var I = this;

	var _pendingImages = [];
	var _pendingCanvasImages = [];
	var _pendingLoaders = [];
	var _nextLoadCallback = [];
	var _imageManagerLoader;
	var _dict = {};
	var _isLoading = false;
	var _loaderCount = 0;
	var _onComplete = function(){};
	var _onFail;
	I.addToLoad = function( file, arg ) {
		var id = LoaderUtils.getFileName( file );

		if ( !I.available(id, true) ){
			var forCanvas = arg && arg.forCanvas == true;
			forCanvas ? _pendingCanvasImages.push( file ) : _pendingImages.push( file );   
		}

		return id;
	}
	I.addLoader = function( loader ) {
		_pendingLoaders.push( loader );
	}
	I.get = function ( imageId ){
		if( _dict[ imageId ] ) 
			return _dict[ imageId ];
		else
			throw new Error ( "ImageManager : No image named '" + imageId + "' has been loaded" );
	}
	I.available = function(imageId, internal) {
		var exists = _dict[imageId] != undefined;
		if (exists) {
			if (internal) trace('ImageManager.available() -->', true, ': Duplicate Image Id "' + imageId + '". One or more images loading in have the same name. Each Image needs a unique file name.');
		} else {
			if (!internal) trace("ImageManager.available() -->", false, ": No image named '" + imageId + "' has been loaded");
		}

		return exists;
	}
	I.load = function ( callback, onFail ){
		_onFail = onFail || global.failAd;

		if ( _isLoading ){
			_nextLoadCallback.push( callback );
		} else {
			_imageManagerLoader = new Loader({ name: 'imageManagerLoader', onComplete: handleLoadComplete, onFail: handleFail });
			
			_onComplete = [].concat(callback);
			_nextLoadCallback = [];
			var currentPendingImages = _pendingImages.slice();
			_pendingImages = [];
			_imageManagerLoader.add( new Loader( currentPendingImages, { name: 'dynamicImages-' + _loaderCount++, fileType: 'jpg' }) );	

			var currentPendingCanvasImages = _pendingCanvasImages.slice();
			_pendingCanvasImages = [];
			_imageManagerLoader.add( new Loader( currentPendingCanvasImages, { name: 'dynamicCanvasImages-' + _loaderCount++, fileType: 'jpg', crossOrigin:'anonymous' }) );	

			var currentPendingLoaders = _pendingLoaders.slice();
			_pendingLoaders = [];
			for ( var i = 0; i < currentPendingLoaders.length; i++ ){
				_imageManagerLoader.add( currentPendingLoaders[i] );
			}

			_isLoading = true;
			_imageManagerLoader.load();
		}		
	}

	I.addFbaImages = function ( target ){
		if ( target )
			addToDictionary ( target.getAllContentRaw() );
	}
	function addToDictionary ( content ){
		for ( var i = 0; i < content.length; i++ ){
			if ( content[i] instanceof Image || content[i] instanceof SVGElement ){
				var img = content[i];
				if (!I.available(content[i].id, true)) _dict[img.id] = img;
			}
		}

		trace ( 'ImageManager:', _dict );
		
		for ( var i = 0; i < _onComplete.length; i++ )
			_onComplete[i].call();	

		if ( _nextLoadCallback.length > 0 ){
			I.load ( _nextLoadCallback )
		}
	}
	function handleLoadComplete ( target ){
		_isLoading = false;

		addToDictionary ( target.getAllContentRaw() );
	}

	function handleFail() {
		_isLoading = false;
		_onFail.call();
	}


}




















/* -- CORE: js/view/Styles.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
var Styles = new function() {
	var self = this;
	self.setCss = function( _element, _args ) { 
		_element = Markup.get( _element );
		var cssList = {}
		if( arguments.length > 2 ) {
			for( var i=1; i < arguments.length; i+=2 ) {
				cssList = CssManager.conformCssKeyValue( arguments[i], arguments[i+1] );
			}
		}
		else if( typeof arguments[1] == 'string' ) {
			cssList = CssManager.conformCssString( arguments[1], _element );
		}
		else {
			cssList = CssManager.conformCssObject( arguments[1], _element );
		}
		CssManager.apply( _element, cssList );
	}
	self.getCss = function( _element, _key ) {
		_element = Markup.get( _element );
		
		var cssValue;

		if ( _key == 'x' || _key == 'y' ){
			var existingTransform = _element.style[ CssManager.getDeviceKey( 'transform' )];
			var matrix = existingTransform.replace(/[\s\(\)matrix]/g, '').split(',');
			cssValue = (matrix.length < 6) ? 0 : +matrix[ _key == 'x' ? 4 : 5 ] ;
		} else {
			var style = window.getComputedStyle( _element, null );
			cssValue = style.getPropertyValue( _key ).replace( /px/, '' );
			if( !isNaN( cssValue )) cssValue = parseInt( cssValue, 10 );
		}

		return cssValue;
	}
	self.injectStylesheet = function( nodeId, styles ) {
		if ( document.getElementById( nodeId )) {
			return;
		}

		var style = document.createElement( 'style' );
		style.type = 'text/css';
		style.id = nodeId;
		var str = ( arguments.length === 2 ) ? styles : '';

		if( arguments.length > 2 ) {

			for ( var i = 0; i < arguments.length - 1; i += 2 ) {
				var names = arguments[ i + 1 ].replace( /\,\s+/g, ',' );
				
				str += names;
				str += ' { ' + ( arguments[ i + 2 ] || '' ) + ' }\n';
			}
		}
		style.innerHTML = str;
		document.getElementsByTagName( 'head' )[ 0 ].appendChild( style );
	}
	self.addClass = function( target, className ) {
		var element = Markup.get( target );
		for ( var i = 0; i < arguments.length - 1; i++ ){
			element.classList.add( arguments [ i + 1 ])
		}
	}
	self.removeClass = function( target, className ) {
		var element = Markup.get( target );
		element.classList.remove( className );
	}
}




















/* -- CORE: js/view/Markup.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
var Markup = new function() {
	
	var self = this;
	self.get = function( selector, parent ) {
		if( typeof selector !== 'string' ) {
			return selector;
		}
		
		parent = parent || document;
		selector = selector.trim();

		switch( selector[ 0 ]) {
			case '#':
				return parent.getElementById( selector.slice( 1 ));
			break;
			case '.':
				return parent.getElementsByClassName( selector.slice( 1 ));
			break;
			case '<':
				return parent.getElementsByTagName( selector.slice( 1, selector.length - 1 ));
			break
			default:
				return parent.getElementById( selector );
		}
	}
	self.getElement = function( selector, parent ) {
		return self.get( selector, parent );
	}
	self.removeChildren = function( _target ) {
		var element = Markup.get ( _target );
		trace ( 'removeChildren (' + _target + ')' );
		while ( element.firstChild ) {
			element.removeChild ( element.firstChild );
		}
	}
	self.applyContainerCss = function( _element, _containerData ) {
		if( !_containerData.css ) _containerData.css = {};
		if( !_containerData.css.position )
			_containerData.css.position = 'absolute';
		Styles.setCss( _element, _containerData.css );
		Styles.setCss( _element, _containerData.styles );
	}
	self.addiFrame = function( _containerData ) {
		var element = document.createElement( 'iFrame' );
		element.id = _containerData.id;
		element.width = _containerData.css.width;
		element.height = _containerData.css.height;
		
		delete _containerData.css.width;
		delete _containerData.css.height;
		element.setAttribute( 'src', _containerData.source );
		element.setAttribute( 'frameborder', '0' );
		element.setAttribute( 'scrolling', 'no' );
		element.setAttribute( 'allowfullscreen', '' );

		Markup.applyContainerCss( element, _containerData );

		_containerData.target.appendChild( element );
		return element;
	}
	self.addSvg = function( _containerData ) {
		var nameSpace = 'http://www.w3.org/2000/svg';
		var element = document.createElementNS( nameSpace, 'svg' );
		element.setAttribute( 'height', _containerData.height );
		element.setAttribute( 'width', _containerData.width) ;

		var path = document.createElementNS( nameSpace, 'path' );
		path.setAttribute( 'd', _containerData.d );
		path.setAttribute( 'fill', _containerData.fill );

		if( _containerData.stroke != undefined ) {
			path.setAttribute( 'stroke', _containerData.stroke );
		}	
		if( _containerData.strokeWidth != undefined ) {
			path.setAttribute( 'stroke-width', _containerData.strokeWidth );
		}
		element.appendChild( path );

		Markup.applyContainerCss( element, _containerData );

		_containerData.target.appendChild( element );
		return element;
	}
	self.applyToElements = function( arg ) {
		if( arg.elements.length === undefined ) {
	        arg.method.call( arg.scope, arg.elements, arg.methodArg );
		} else {
			var i;
			for( i=0; i<arg.elements.length; i++ ) {
		       var el = arg.elements[ i ];
		       arg.method.call( arg.scope, el, arg.methodArg );
		   }
		}	
	}

}



















/* -- CORE: js/view/Align.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
var Align = function() {

	var _rect = [{
		x: 'offsetWidth',
		y: 'offsetHeight',
		parent: 'parentNode'
	}, {
		x: 'width',
		y: 'height',
		parent: 'stage'
	}];
	function get( source, arg ) {
		var elem = source.canvas || Markup.get( source );
		var obj = {};
		var snap = arg.snap !== false;
		var sourceRect = isDomElement( source ) ? 0 : 1;

		if ( typeof arg == 'string' ) arg = calculate( arg );

		for ( var xy in arg ) {
			if ( xy == 'x' || xy == 'y' ) {

				var params = arg[xy];
				if ( !params ) continue;

				if ( typeof params == 'string' ) params = {
					type: params
				}

				var against;
				var againstDimension;
				var againstX = 0;
				var againstNumber = false;
				var offset = params.offset || 0;

				var _givenAgainst;
				if ( params.against !== undefined ) {
					_givenAgainst = true;
					against = params.against;
					var againstRect = 0;

					if ( isDomElement( against ) ) {
						if ( against.canvas ) againstRect = 1;
						else againstX = Styles.getCss( against, xy );
					} else if ( typeof against === 'number' ) {
						againstNumber = true;
						againstX = against;
					} else {
						againstX = against[xy];
						againstRect = 1;
					}

					againstDimension = _rect[againstRect][xy];

					if ( params.type === Align.CENTER ) arg[xy].outer = false;

				} else {
					against = elem[_rect[sourceRect].parent];
					againstDimension = _rect[sourceRect][xy];
				}

				var widthOrHeight = elem[_rect[sourceRect][xy]];

				switch ( source._type ) {
					case 'arc':
					case 'path':
						switch ( params.type ) {
							case Align.CENTER:
								widthOrHeight = 0;
								break;
							default:
								offset += widthOrHeight / 2;
								break;
						}
						break;
					case 'text':
						if ( xy === 'x' ) {
							switch ( source.alignText ) {
								case 'center':
									widthOrHeight = 0;
								case 'right':
									widthOrHeight *= -1;
							}
						}
						break;
				}
				widthOrHeight /= source.qualityScale || 1;

				var pos = calculate( params.type, widthOrHeight, againstNumber ? 0 : against[againstDimension] / (against.qualityScale || 1), !againstNumber && !!arg[xy].outer );

				if ( pos != null ) {
					pos += ( againstX + offset );
					obj[xy] = snap ? Math.round( pos ) : pos;
				}
			}
		}

		return obj;
	}

	function set( source, arg ) {
		var obj = get( source, arg );

		if ( isDomElement( source ) ) {
			var elem = source.canvas || Markup.get( source );
			Styles.setCss( elem, obj );
		} else {
			for ( var prop in obj ) source[prop] = obj[prop]
		}

		return obj;
	}
	function calculate( mode, source, target, outer ) {
		var isConvert = arguments.length == 1;
		switch ( mode ) {
			case 'alignBottom':
				if ( outer ) source = 0
				if ( !isConvert ) return target - source;

			case 'alignTop':
				return isConvert ? {
					y: mode
				} : outer ? -source : 0;


			case 'alignRight':
				if ( outer ) target += source
				if ( !isConvert ) return target - source;

			case 'alignLeft':
				return isConvert ? {
					x: mode
				} : outer ? -source : 0;

			case 'alignCenter':
				if ( outer )
					target = 0
				return isConvert ? {
					x: mode,
					y: mode
				} : ( target - source ) / 2;

			default:
				return null;
		}
	}
	function isDomElement( elem ) {
		return elem instanceof HTMLElement || elem.canvas != undefined
	}
	return {
		BOTTOM: 'alignBottom',
		CENTER: 'alignCenter',
		LEFT: 'alignLeft',
		RIGHT: 'alignRight',
		TOP: 'alignTop',
		BOTTOM_LEFT: 'alignBottomLeft',
		BOTTOM_RIGHT: 'alignBottomRight',
		TOP_LEFT: 'alignTopLeft',
		TOP_RIGHT: 'alignTopRight',
		get: get,
		set: set,
		calculate: calculate
	}

}()



















/* -- CORE: js/ui/UIDiv.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
function UIDiv ( arg, type ){
	Styles.injectStylesheet ( 'RED_uiElement', 
		'.ui-elem', 'position:absolute;'
	)
	type = type || 'div';
	var U = document.createElement( type );
	Styles.addClass ( U, 'ui-elem' );

	arg = arg || {}
	if ( arg.id ) 
		U.id = arg.id;
	Styles.setCss( U, arg.css );
	if ( arg.target ){
		var target = Markup.get ( arg.target )
		target.appendChild( U );
	}
	Object.defineProperty ( U, 'parent', {
		get : function(){
			return U.parentNode
		}
	})
	U.toString = function(){
		return '[object UIDiv]';
	}

	return U;
}




















/* -- CORE: js/ui/UIComponent.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
function UIComponent ( arg, type ){
		
	var _enabled = true;
	var _showing = true;
	var _typeDef = type || 'div';
	arg = arg || {};
	type = _typeDef == 'svg' ? 'div' : type;
	var U = new UIDiv ( arg, type );
	U._align = arg.align;
	
	Object.defineProperties ( U, {
		x: {
			get: function() {
				return Styles.getCss ( U, 'x' )
			},
			set: function ( value ) {
				Styles.setCss ( U, { x : value })
			}
		},
		y: {
			get: function() {
				return Styles.getCss ( U, 'y' )
			},
			set: function ( value ) {
				Styles.setCss ( U, { y : value })
			}
		},
		enabled: {
			get: function() {
				return _enabled;
			},
			set: function ( state ) {
				_enabled = state;
				U.dispatchEvent ( UIEvent.componentEnabled )
			}
		},
		showing: {
			get: function() {
				return _showing;
			},
			set: function(){
				trace ( ':: WARNING ::\n\n\tUIComponent.showing cannot be set.\n\n' )
			}
		}
	});

	if ( _typeDef != 'canvas' && _typeDef != 'svg' ){
		Object.defineProperties ( U, {
			width: {
				get: function() {
					return U.offsetWidth;
				},
				set: function ( value ) {
					Styles.setCss ( U, { width : value });
					
					var evt = new CustomEvent ( UIEvent.RESIZE )
					evt.direction = 'width';
					U.dispatchEvent ( evt );
				}
			},
			height: {
				get: function() {
					return U.offsetHeight;
				},
				set: function ( value ) {
					Styles.setCss ( U, { height : value })
					
					var evt = new CustomEvent ( UIEvent.RESIZE )
					evt.direction = 'height';
					U.dispatchEvent ( evt );
				}
			}
		});
	}
	U.hide = function (){
		U.style.display = 'none';
		_showing = false;
	}
	U.show = function (){
		try {
			U.style.removeProperty ( 'display' );
		} catch (e) {
			U.style.display = null;
		}
		_showing = true;
	}
	U.setCss = function( args ) {
		Styles.setCss ( U, args )
	}
	U.addChild = function( elem ){
		var child = Markup.get ( elem )
		U.appendChild ( child );
		
		if ( elem._align )
			Align.set( elem, elem._align )
	}
	U.inspect = function(){
		var o = {}
		var props = Object.getOwnPropertyNames(U);
		for ( var i = 0; i < props.length; i++ ){
			var val = U[props[i]];
			o [ props[i] ] = val;
		}
		trace ( '\n\t', U.toString(), '\t', U.id, '\n\t', o );
	}
	U.toString = function(){
		return '[object UIComponent]';
	}
	U._initAlign = function( parentTriggered ){
		var fire = parentTriggered ? parentTriggered == true : arg.target != undefined;

		if ( arg.align && fire ){ 
			Align.set( U, arg.align )
		}
	}
	U.enabled = true;
	
	U._initAlign();

	return U;
}




















/* -- CORE: js/ui/UIImage.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
function UIImage ( arg ){
	Styles.injectStylesheet ( 'RED_uiImage', 
		'.ui-image', 'background-repeat:no-repeat; background-size:contain;'
	)
	var _init = true;
	var _source = null;
	var _retina = false;
	var _ratio = 'contain';
	var _aspectRatio = !!arg.aspectRatio;
	var _css = arg.css || {}
	if ( !arg.source ) throw new Error ( "UIImage : No image source set on '" + arg.id + "'" );
		
	arg.css = arg.css || {};

	var U = new UIComponent ( arg );
	Styles.addClass ( U, 'ui-image' );
	Object.defineProperties ( U, {
		source : {
			get : function() {
				return _source;
			},
			set : function ( value ) {
				_source = ImageManager.get ( value );
				U.style.backgroundImage = 'url(' + _source.src + ')';
			}
		},
		retina : {
			get : function() {
				return _retina;
			},
			set : function ( value ) {
				_retina = value
				resize();
			}
		},
		ratio : {
			get : function() {
				return _ratio;
			},
			set : function ( value ){
				_ratio = value;
				U.style.backgroundSize = value;
			}
		},
		aspectRatio : {
			get : function(){
				return _aspectRatio;
			},
			set : function ( value ){
				_aspectRatio = value;
				resize();
			}
		}
	});
	U.toString = function(){
		return '[object UIImage]';
	}
	function resize ( direction ) {

		var denominator = _retina ? 2 : 1 ;			
		var ratio = _source.width / _source.height;

		var sourceWidth = arg.css.width || _source.width;
		var sourceHeight = arg.css.height || _source.height;

		var updateWidth = arg.css.width == undefined;
		var updateHeight = arg.css.height == undefined;	

		if ( !_init ){ 
			updateWidth = direction == 'height';
			updateHeight = direction == 'width';
			sourceWidth = U.width;
			sourceHeight = U.height;
		}

		if ( updateWidth ) {
			var width;
			if ( _aspectRatio && !updateHeight ){
				width = sourceHeight * ratio;
			} else {
				width = sourceWidth / denominator;
			}
			U.style.width = Math.round( width ) + 'px';
		}
		
		if ( updateHeight ) {
			var height;

			if ( _aspectRatio && !updateWidth ){
				height = sourceWidth / ratio;
			} else {
				height = sourceHeight / denominator;
			}
			U.style.height = Math.round( height ) + 'px';
		}
	}
	function handleResize ( event ){
		trace ( 'handleResize()', event, event.direction )
		resize( event.direction );
	}
	U.addEventListener ( UIEvent.RESIZE, handleResize );

	U.source = arg.source;
	U.retina = !!arg.retina;

	if ( arg.ratio ) 
		U.ratio = arg.ratio;

	U._initAlign();
	_init = false;
	
	return U;
}



















/* -- CORE: js/ui/UITextField.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
function UITextField ( arg ){
	Styles.injectStylesheet ( 'RED_uiTextfield', 
		'.ui-textfield', 'position:absolute; white-space:nowrap;',
		'.smooth-text', '-webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale;',
		'.ui-textfield .content', 'position:relative; display:table-cell; cursor:default; pointer-events:none; line-height:100%; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;'
	)
	var _alignText;
	var _fontSize = 0;
	var _fontFamily;
	var _format = '';
	var _leading;
	var _spacing;
	var _bufferText = {
		top : 0,
		bottom : 0,
		left : 0,
		right : 0
	};
	var _text = '';
	var _init = true;
	
	var _verticalAlign;
	var _smoothing;

	var _defaults = {}
	arg = arg || {};
	var U = new UIComponent ( arg );
	Styles.addClass ( U, 'ui-textfield' );

	var _content = document.createElement('span');
	Styles.addClass ( _content, 'content' );
	U.appendChild( _content );
	
	Object.defineProperties ( U, {
		alignText: {
			get: function() {
				return _alignText;
			},
			set: function ( value ) {
				if ( value && _alignText != value ){
					_alignText = value;

					var ta = (_alignText.match(/(left|right)/gi) || ['center'])[0].toLowerCase();
					Styles.setCss ( U, { lineHeight: U.height, textAlign: ta });

					_verticalAlign = (_alignText.match(/(bottom|top)/gi) || ['middle'])[0].toLowerCase();
					Styles.setCss ( _content, { verticalAlign: _verticalAlign })		
				}
			}
		},
		fontSize: {
			get: function() {
				return _fontSize;
			},
			set: function ( value ) {
				if ( !isNaN(value) && value > 0 ){
					_fontSize = value;
					U.style.fontSize = ~~value + 'px';
					
					update();
				}			
			}
		},
		fontFamily : {
			get: function() {
				return _fontFamily;
			},
			set: function ( value ) {
				_fontFamily = value;
				U.style.fontFamily = value;
				update();
			}
		},
		format: {
			get: function() {
				return _format;
			},
			set: function ( value ) {
				if ( _format != value ){
					_format = value;
					Styles.setCss( U, { whiteSpace: (/inline/g.exec(_format) != null) ? 'nowrap' : 'normal' });
					update();			
				}
			}
		},
		leading: {
			get: function() {
				return _leading;
			},
			set: function ( value ) {
				if ( value && _leading != value ){
					_leading = value;

					Styles.setCss ( _content, { lineHeight:(_leading * 100) + '%' });

					update();
				}
			}
		},
		spacing: {
			get: function(){
				return Styles.getCss ( U, 'letter-spacing' ) || _spacing;
			},
			set: function ( value ) {
				if ( value && _spacing != value ){
					_spacing = value;

					Styles.setCss ( U, { letterSpacing : value });

					update();
				}
			}
		},
		bufferText: {
			get: function() {
				return _bufferText;
			},
			set: function ( value ) {
				if ( value && _bufferText != value ){
					
					var style = '';
					var order = [ 'top', 'right', 'bottom', 'left' ]
					
					for ( var i = 0; i < 4; i++ ){
						var prop = order[i];
						var propValue = isNaN(value) ? (value[prop] || 0) : value;
						_bufferText [ prop ] = propValue;
						style += propValue + 'px ';
					}
					
					Styles.setCss ( _content, { padding:style });

					update();
				}
			}
		},
		text: {
			get: function() {
				return _text;
			},
			set: function ( value ) {
				if ( value != undefined && value != '' ){
					_text = value;
					U.setDefault( 'text', value )
					_content.innerHTML = value;
					update();				
				}
			}
		},
		smoothing: {
			get: function() {
				return _smoothing;
			},
			set: function ( value ){
				_smoothing = value;
				Styles [ _smoothing ? 'addClass' : 'removeClass' ]( _content, 'smooth-text' );
			}
		}
	});
	U.resetToDefault = function(){
		_init = true;
		if ( arguments.length > 0 ){
			for ( var i = 0; i < arguments.length; i++ ){
				U [ arguments[i] ] = _defaults [ arguments[i] ];
			}

		} else {
			for ( var param in _defaults ){
				if ( U [ param ] != undefined ){
					U [ param ] = _defaults [ param ];
				}
			}
		}
		_init = false;
		update()
	}
	U.setDefault = function( key, value ){
		_defaults [ key ] = value;
	}

	U.toString = function(){
		return '[object UITextfield]';
	}
	function initDefaults(){
		for ( var a in arg ){
			if ( a == 'css' ){
				for ( var b in arg.css ){
					switch ( b ){
						case 'x' :
						case 'y' :
						case 'width' :
						case 'height' :
							_defaults [ b ] = arg.css [ b ]
							break;
					}
				}
			} else if ( a == 'bufferText' ){
				_defaults [ a ] = {}
				for ( var prop in _bufferText ){
					_defaults [ a ][ prop ] = arg [ a ][ prop ] || 0
				}
			} else {
				_defaults [ a ] = arg [ a ]
			}
		}
		delete _defaults.target;
		delete _defaults.id;
	}

	function update(){
		if ( _init ) return;

		switch ( _format ) {
			case 'paragraphClamp' :
			case 'inlineClamp' :
				resizeToContent();
				break;
			case 'inlineFitClamp' :
				_format = 'inlineFit';
				autoSizeContent();
				_format = 'inlineClamp';
				resizeToContent();
				_format = 'inlineFitClamp';
				break;
			case 'paragraphFitClamp' :
				_format = 'paragraphFit';
				autoSizeContent();
				_format = 'paragraphClamp';
				resizeToContent();
				_format = 'paragraphFitClamp';
				
			default : 
				autoSizeContent();
		}
	}

	function autoSizeContent(){		
		Styles.setCss( _content, { verticalAlign: 'auto', height: 'auto', width: 'auto' });

		if ( _format == 'paragraphFit' ){
			var tempFontSize = _fontSize;		
			while ( U.scrollHeight > U.offsetHeight ) {
				if ( tempFontSize <= 0 ) break;
				tempFontSize--;
				U.style.fontSize = tempFontSize + 'px';
			}	
			while ( U.scrollWidth > U.offsetWidth ) {
				if ( tempFontSize <= 0 ) break;
				tempFontSize--;
				U.style.fontSize = tempFontSize + 'px';
			}	
			
			_fontSize = tempFontSize;
			U.style.fontSize = _fontSize + 'px';

		} else if ( _format == 'inlineFit' ){
			var parentWidth = U.offsetWidth;
			var parentHeight = U.offsetHeight;

			U.style.fontSize = '243px';
			var largeWidth = _content.offsetWidth;
			var largeHeight = _content.offsetHeight;

			U.style.fontSize = '182px';
			var smallWidth = _content.offsetWidth;
			var smallHeight = _content.offsetHeight;

			var fontSizeWidth = MathUtils.rel ( 243, 182, largeWidth, smallWidth, parentWidth );
			var fontSizeHeight = MathUtils.rel ( 243, 182, largeHeight, smallHeight, parentHeight );
			
			_fontSize = ~~Math.min( _fontSize, Math.min(fontSizeWidth, fontSizeHeight) );

			U.style.fontSize = _fontSize + 'px';
		} 

		if ( _verticalAlign ) {
			Styles.setCss( _content, { 
				verticalAlign : _verticalAlign, 
				height : U.offsetHeight - _bufferText.top - _bufferText.bottom, 
				width : U.offsetWidth - _bufferText.left - _bufferText.right 
			});
		}
	}

	function resizeToContent(){
		Styles.setCss( _content, { height: 'auto', width: 'auto' });
		
		U.width = _content.offsetWidth;
		U.height = _content.offsetHeight; 
	}
	U.enabled = true;

	initDefaults();

	U.format = arg.format;
	U.fontSize = arg.fontSize;
	U.fontFamily = arg.fontFamily || 'Arial';
	U.alignText = arg.alignText;
	U.bufferText = arg.bufferText;
	U.leading = arg.leading;
	U.spacing = arg.spacing;
	U.smoothing = arg.smoothing != false;
	
	_init = false;
	U.text = arg.text;
	
	U._initAlign();

	return U;
}




















/* -- CORE: js/ui/UIGroup.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
function UIGroup(arg) {
	var U = new UIComponent(arg);
	var _children = arg.children;
	while (_children.length > 0) U.appendChild(_children.shift());
	Clamp.set(U, Clamp.XY);
	
	if (arg.align) Align.set(U, arg.align);

	return U;
}



















/* -- CORE: js/ui/TextFormat.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
var TextFormat = function() {
	return {
		INLINE					: 	'inline',
		INLINE_CLAMP			: 	'inlineClamp',
		INLINE_FIT				: 	'inlineFit',
		INLINE_FIT_CLAMP		: 	'inlineFitClamp',
		PARAGRAPH				: 	'paragraph',
		PARAGRAPH_CLAMP			: 	'paragraphClamp',
		PARAGRAPH_FIT			: 	'paragraphFit',
		PARAGRAPH_FIT_CLAMP 	: 	'paragraphFitClamp'

	}
}();



















/* -- CORE: js/events/UIEvent.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
var UIEvent = function(){
 	
	var _componentEnabled = new CustomEvent ( 'uiComponentEnabled' );
	var _sliderUpdate = new CustomEvent ( 'uiSliderUpdate' );
		
	return {
		ENABLED				: 	'uiComponentEnabled',
		RESIZE				: 	'uiResize',
		SLIDER_UPDATE		: 	'uiSliderUpdate',

		componentEnabled	: 	_componentEnabled,
		sliderUpdate		: 	_sliderUpdate
	}
}()




















/* -- CORE: js/events/FrameRate.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
var FrameRate = new function(){
	var F = this;

	var _isPaused = true;
	var _isActive = true;
	var _sets = {};
	var _RAF;
	var _isiOS6 = /iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent);

	var _prefix = ['webkit', 'moz'];
	for ( var i = 0; !window.requestAnimationFrame && i < _prefix.length; i++ ) {
		window.requestAnimationFrame = window [ _prefix[i] + 'RequestAnimationFrame' ];
		window.cancelAnimationFrame = ( window [ _prefix[i] + 'CancelAnimationFrame'] || window [ _prefix[i] + 'CancelRequestAnimationFrame' ]);
	}
   
	if ( !window.requestAnimationFrame || !window.cancelAnimationFrame || _isiOS6 ) {
		trace ( 'PolyFill -> FrameRate' )
		window.requestAnimationFrame = function(callback) { return setTimeout( callback, 17 ) };
		window.cancelAnimationFrame = clearTimeout;
	}
	F.register = function ( from, handler, fps ){
		fps = fps || 30;
		if ( !_sets[fps] ){
			_sets[fps] = new FrameRateBase(fps);
		}

		var pool = _sets[fps].pool;
		for ( var i = 0; i < pool.length; i++ ){
			if ( pool[i].from === from && pool[i].handler === handler ){
				return;
			}
		}
		pool.push({
			handler : handler,
			from : from
		});

		if ( _isActive ) F.resume();
	}
	F.unregister = function ( from, handler, fps ){

		for ( var key in _sets ){
			if ( fps && key != fps ){
				continue;
			}
			
			var pool = _sets[key].pool;
			for ( var i = 0; i < pool.length; i++ ){
				if ( pool[i].from === from && pool[i].handler === handler ){
					pool.splice( i, 1 );
					break;
				}
			}
			if ( pool.length == 0 ){
				delete _sets[key];
			}
		}

		if ( Object.keys(_sets).length === 0 ){
			F.pause();
			_isActive = true;
		}
	}
	F.pause = function () {
		if ( arguments.length > 0 ){
			for ( var i = 0; i < arguments.length; i++ ){
				var fpsTarget = arguments[i];
				if ( _sets[fpsTarget] ){
					_sets[fpsTarget]._paused = true;
					_isPaused = true;
				}
			}
			for ( var d in _sets ){
				if ( !_sets[d]._paused ){
					_isPaused = false;
					break;
				}
			}
		} else {
			for ( var d in _sets )
				_sets[d]._paused = true;
			_isPaused = true;
		}

		if ( _isPaused ) {
			_isActive = false;
			window.cancelAnimationFrame ( _RAF );
		}
	}
	F.resume = function () {
		var _currentlyRunning = !_isPaused;
		if ( arguments.length > 0 ){
			for ( var i = 0; i < arguments.length; i++ ){
				var fpsTarget = arguments[i];
				if ( _sets[fpsTarget] ){
					_sets[fpsTarget]._paused = false;
					_isPaused = false;
				}
			}
		} else {
			for ( var d in _sets )
				_sets[d]._paused = false;
			_isPaused = false;
		}
		
		if ( !_currentlyRunning ) {
			_isActive = true;
			_RAF = window.requestAnimationFrame ( tick );
		}
	}
	F.secondsAsFrames = function ( sec ){
		return 1 / sec;
	}
	function tick () {
		if ( !_isPaused ){      
			for ( var h in _sets ){
				_sets[h].tick();
			}
			window.requestAnimationFrame ( tick );            
		}
	} 

}




















/* -- CORE: js/events/FrameRateBase.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
/* ----------------------------------------------------------------------------------------------------------------------------------------------------------
	Description:
		-- INTERNAL MODULE --
		This module is used exclusively by FrameRate.  When a method is registered, it instantiaties an instance of this module to hold all methods at a 
		specified frames per second.  Every fps gets a new FrameRateBase instance.
	
	---------------------------------------------------------------------------------------------------------------------------------------------------------- */
function FrameRateBase ( fps ){
	var F = this;
	F.pool = [];
	F.fps = fps;

	F._frameTime = Math.floor(1000 / F.fps);
	F._prevTime = 0;
	F._startTime = 0;
	F._nextTime = 0;
	F._maxLag = 400;
	F._shiftLag = 30;
	F._paused = false;
	F._prevCallTime = Date.now();

	F.diffTime = 0;
}

FrameRateBase.prototype = {
	resume : function(){
		var F = this;
		if ( F._isPaused ){
			F._startTime = Date.now();
			F._prevCallTime = F._startTime;
			F._prevTime = F._startTime;
			F._nextTime = 0;
			F._isPaused = false;
		}
	},

	tick : function(){
		var F = this;
		if ( !F._paused ){
			var call = false;
			var now = Date.now();
			var diffTime = now - F._prevTime;

			if ( diffTime > F._maxLag ){
				trace ( "...lag" );
				F._startTime += diffTime - F._shiftLag;
			}
			F._prevTime = now;//+= F.diffTime;

			var elapsedTime = F._prevTime - F._startTime;
			var future = elapsedTime - F._nextTime;  

			if ( future > 0 ){
				F._nextTime += ( future >= F._frameTime ) ? future : F._frameTime ;
				call = true;
				F.diffTime = now - F._prevCallTime;
				F._prevCallTime = now;
			}
			if ( call ) F.dispatch();
		}
	},

	dispatch : function(){
		var F = this;
		for ( var i = 0; i < F.pool.length; i++ ){
			var obj = F.pool[i];
			obj.handler.call(obj.from, this);
		}
	}
}




















/* -- CORE: js/events/Gesture.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
var Gesture = new function(){
	var G = this;

	var _targets = [];
	var _disableList = [];
	var _eventPass = (document.createEventObject != undefined);
	var _eventLooping = false

	G._kills = {}
	G.add = G.addEventListener = function ( target, name, handler ){
		var _gestureBase = getGestureBase ( target );
		_gestureBase.register ( name, handler );
		Styles.setCss( target, 'cursor', 'pointer' );
		Styles.setCss( target, 'pointer-events', 'auto' );
	}
	G.remove = G.removeEventListener = function ( target, name, handler ){
		var _gestureBase = getGestureBase ( target );
		if ( _gestureBase ) {
			_gestureBase.unregister ( name, handler );
			if ( _gestureBase.eventList.length <= 0 ){
				Styles.setCss( target, 'cursor', 'auto' );
			}
		}
	}
	G.disable = function ( target ){		
		var gestureBase = getGestureBase ( target );
		_disableList.push(gestureBase);

		if ( _eventPass ) {
			gestureBase.register ( GestureEvent.CLICK, handlePassThroughClick );
			Styles.setCss( target, 'cursor', 'auto' );
		} else {
			Styles.setCss( target, 'pointer-events', 'none' );
		}	
	}
	G.disableChildren = function ( target ){
		setActiveChildren ( target, false );
	}
	G.enable = function ( target ){
		var gestureBase = getGestureBase ( target );

		for ( var i = 0; i < _disableList.length; i++ ){
			if ( gestureBase == _disableList[i] ){
				if ( _eventPass ) {
					gestureBase.unregister ( GestureEvent.CLICK, handlePassThroughClick );
				} else {
					Styles.setCss( target, 'pointer-events', 'auto' );
					Styles.setCss( target, 'cursor', 'pointer' );
				}
				break;
			}
		}
	}
	G.enableChildren = function ( target ){
		setActiveChildren ( target, true );
	}
	function getGestureBase ( target ){
		var _gestureBase = null;
		for ( var i = 0; i < _targets.length; i++ ){
			if ( _targets[i].elem === target ){
				_gestureBase = _targets[i]
				break;
			}
		}	
		if ( !_gestureBase ){
			_gestureBase = createGestureBase ( target );
		}	
		return _gestureBase;
	}

	function createGestureBase ( target ){
		var _gestureBase = new GestureBase ( target );
		_targets.push( _gestureBase );
		return _gestureBase;
	}

	function setActiveChildren ( target, active ){
		var gestureBase = getGestureBase ( target );
		if ( gestureBase.hasActiveChildren != active ){
			gestureBase.hasActiveChildren = active;
			var children = gestureBase.elem.getElementsByTagName('*');
			for( var i = 0; i < children.length; i++ ){
				if ( children[i].parentNode == target ){
					active ? G.enable(children[i]) : G.disable(children[i]);
				} 
			}
		}
	}

	function getNextLayerElement ( target, x, y, list ){
		target.style.visibility = 'hidden';
		list.push(target);

		var elem = document.elementFromPoint( x, y );

		for ( var i = 0; i < _disableList.length; i++ ){
			if ( _disableList[i].elem == elem ){
				return getNextLayerElement(elem,x,y,list)
			}
		}
		
		return elem;
	}

	function getForwardedTarget ( event ){
		var hiddenList = [];		
		
		var el = getNextLayerElement( event.target, event.clientX, event.clientY, hiddenList );
		for ( var i = 0; i < hiddenList.length; i++ ){
			hiddenList[i].style.visibility = 'visible';
		}
		hiddenList = [];

		event.stopImmediatePropagation();

		return el;
	}
	function handlePassThroughClick ( event ){	
		var el = getForwardedTarget ( event );
		var evt = document.createEvent("HTMLEvents");
		evt.initEvent(event.type,true,false);
		el.dispatchEvent ( evt );				
	}

}




















/* -- CORE: js/events/GestureBase.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
function GestureBase ( elem ){
	var G = this;
	G.elem = elem;
	G.hasActiveChildren = true;
	G.debug = false;
	G.eventList = [];

	G._isDragEnabled = false;
	G._isDragging = false;
	G._give = 2;
	G._oX = 0;
	G._oY = 0;
	G._p1X = 0;
	G._p1Y = 0;
	G._p2X = 0;
	G._p2Y = 0;
	G._sX = 0;
	G._sY = 0;
	G._vX = 0;
	G._vY = 0;
		
	G._cursor = 'mouse';
	G._start = 'down';
	G._end = 'up';
	
	G.init();
}

GestureBase.prototype = {

	init : function (){		
		var G = this;
		if( G.debug ) trace( 'GestureBase.init()' );

		G._handleTouchStart = G._handleTouchStart.bind ( G );
		G._handleDown = G._handleDown.bind ( G );
		G._handleDrag = G._handleDrag.bind ( G );
		G._handleUp = G._handleUp.bind ( G );				
		
		G._elemAdd = G.elem.addEventListener.bind ( G.elem );
		G._elemRemove = G.elem.removeEventListener.bind ( G.elem );
	
		G._reset();
	},
	register : function ( name, handler ){
		var G = this;
		if( G.debug ) trace ( 'GestureBase.register(', name, ')' )
		
		G.eventList.push( name );
		G._checkDragEnabled();
		G._elemAdd ( name, handler );
	},

	unregister : function ( name, handler ){
		var G = this;
		if( G.debug ) trace ( 'GestureBase.unregister(', name, ')' )
		
		var index = G.eventList.indexOf( name );
		if ( index >= 0 ){
			G.eventList.splice( index, 1 )
		}
		G._checkDragEnabled();

		G._elemRemove ( name, handler )
	},
	_reset : function(){
		var G = this;
		G._cursor = 'mouse';
		G._start = 'down';
		G._end = 'up';
		G.elem.addEventListener ( 'touchstart', G._handleTouchStart );
		if ( Device.os != 'ios' )
			G.elem.addEventListener ( 'mousedown', G._handleDown );
	},

	_checkDragEnabled : function(){
		var G = this;
		var hasDragEventIndex = G.eventList.join('').indexOf('onDrag');
		G._isDragEnabled = hasDragEventIndex > -1;
	},
	_getEventScope : function ( event ){
		return event.changedTouches ? event.changedTouches[0] : event ;
	},
	_add : function ( type, handler ){
		window.addEventListener ( this._cursor + type, handler );
	},

	_remove : function ( type, handler ){
		window.removeEventListener ( this._cursor + type, handler );
	},
	_handleDown : function ( event ){
		var G = this;
		if( G.debug ) trace( 'GestureBase._handleDown()' );

		GestureEvent.startPoint();

		G.elem.removeEventListener ( 'touchstart', G._handleTouchStart );
		if ( Device.os != 'ios' )
			G.elem.removeEventListener ( 'mousedown', G._handleDown );	

		G._isDragging = false;

		G._add ( G._end, G._handleUp );
		G._add ( 'move', G._handleDrag );	
				
		var touch = G._getEventScope ( event );	
		var mouseX = touch.pageX
		var mouseY = touch.pageY

		var elemRect = G.elem.getBoundingClientRect();
		var localOffsetX = mouseX - elemRect.left;
		var localOffsetY = mouseY - elemRect.top;

		var localX = G.elem.x || Styles.getCss ( G.elem, 'x' );
		var localY = G.elem.y || Styles.getCss ( G.elem, 'y' );
		var globalOffsetX = elemRect.left - localX;
		var globalOffsetY = elemRect.top - localY;

		G._oX = globalOffsetX + localOffsetX;
		G._oY = globalOffsetY + localOffsetY;

		var elemPositionX = mouseX - G._oX;
		var elemPositionY = mouseY - G._oY;
		G._sX = G._p1X = G._p2X = mouseX;
		G._sY = G._p1Y = G._p2Y = mouseY;

		localCreateEvent ( 'onPress' )

		function localCreateEvent ( name ){
			if ( GestureEvent.stopped(name) ) return
			var newEvent = new GestureEvent.Event ( name, 
				mouseX, 
				mouseY, 
				localOffsetX,
				localOffsetY,
				elemPositionX, 
				elemPositionY
			)
			if( G.debug ) trace( ' -> dispatch', name )
			G.elem.dispatchEvent ( newEvent );
		}
	},

	_handleUp : function ( event, bypass ){
		var G = this;
		if( G.debug ) trace( 'GestureBase._handleUp()' );

		G._remove ( G._end, G._handleUp );
		G._remove ( 'move', G._handleDrag );

		var touch = G._getEventScope ( event );	
		var mouseX = touch.pageX;
		var mouseY = touch.pageY;
		
		var elemRect = G.elem.getBoundingClientRect();
		var localOffsetX = mouseX - elemRect.left;
		var localOffsetY = mouseY - elemRect.top;
		
		var elemPositionX = mouseX - G._oX;
		var elemPositionY = mouseY - G._oY;	
		
		var eventName;

		if ( bypass !== true ){
			localCreateEvent ( 'onRelease' );
		}

    	var offsetTop = elemRect.top + window.pageYOffset;
    	var offsetBottom = offsetTop + elemRect.height;
    	var offsetLeft = elemRect.left + window.pageXOffset;
    	var offsetRight = offsetLeft + elemRect.width;

		if ( G._isDragging ){
			if ( G._isDragEnabled ){
				G._dragEndOrSwipe ( 'onDragStop' );
			}
			trace ( '  -> No CLICK Fired, was dragging' )
		} else {
			if ( mouseX > offsetLeft && mouseX < offsetRight && mouseY > offsetTop && mouseY < offsetBottom ){			
				localCreateEvent ( 'onSelect' );
			}
		}
				
		function localCreateEvent ( name ){
			if ( GestureEvent.stopped(name) ) return
			var newEvent = new GestureEvent.Event ( name, 
				mouseX, 
				mouseY, 
				localOffsetX,
				localOffsetY,  
				elemPositionX, 
				elemPositionY,
				0,
				0,
				G._vX,
				G._vY 
			)
			if( G.debug ) trace( ' -> dispatch', name )
			G.elem.dispatchEvent ( newEvent );
		}
		
		if ( G._isDragging ){
			G._dragEndOrSwipe ( 'onSwipe' );
		}
		
		G._reset();
		event.preventDefault();

		GestureEvent.endPoint();	
	},
	_handleTouchStart : function ( event ){	
		var G = this;
		if( G.debug ) trace( 'GestureBase._handleTouchStart()' );
		G._cursor = 'touch';
		G._start = 'start';
		G._end = 'end';

		G._handleDown(event);
	},
	_handleDrag : function ( event ){
		var G = this;
		if( G.debug ) trace( 'GestureBase._handleDrag()' );

		var touch = G._getEventScope ( event );
		var mouseX = touch.pageX;
		var mouseY = touch.pageY;
		
		var diffx1 = mouseX - G._p1X;
		var diffx2 = mouseX - G._p2X;
		G._vX = ( diffx2 - diffx1 ) / 2 + diffx1;

		var diffy1 = mouseY - G._p1Y;
		var diffy2 = mouseY - G._p2Y;
		G._vY = ( diffy2 - diffy1 ) / 2 + diffy1;

		var elemPositionX = mouseX - G._oX;
		var elemPositionY = mouseY - G._oY;

		var elemRect = G.elem.getBoundingClientRect();
		var localOffsetX = mouseX - elemRect.left;
		var localOffsetY = mouseY - elemRect.top;

		var eventName;

		if ( G._isDragging ) {
			if ( G._isDragEnabled ){
				localCreateEvent ( 'onDrag' );
			}
		} else {		
			if ( Math.abs(G._sX - mouseX) > G._give || Math.abs(G._sY - mouseY) > G._give ){
				G._isDragging = true;
				
				if ( G._isDragEnabled ){
					localCreateEvent ( 'onDragStart' );
				}
			}
		}

		function localCreateEvent ( name ){
			if ( GestureEvent.stopped(name) ) return
			var newEvent = new GestureEvent.Event ( name, 
				mouseX, 
				mouseY, 
				localOffsetX,
				localOffsetY,
				elemPositionX, 
				elemPositionY, 
				G._p1X - G._sX, 
				G._p1Y - G._sY,
				G._vX,
				G._vY 
			)
			if( G.debug ) trace( ' -> dispatch', name )
			G.elem.dispatchEvent ( newEvent );
		}
		
		G._p2X = G._p1X;
		G._p1X = mouseX;

		G._p2Y = G._p1Y;
		G._p1Y = mouseY;
	},
	_dragEndOrSwipe : function ( type ){
		var G = this;
		if( G.debug ) trace( 'GestureBase._dragEndOrSwipe()', type );
		
		if ( GestureEvent.stopped(name) ) return

		var elemRect = G.elem.getBoundingClientRect();
		var evt = new GestureEvent.Event ( type, 
			G._p1X, 
			G._p1Y, 
			G._p1X - elemRect.left,
			G._p1Y - elemRect.top,
			G._p1X - G._oX, 
			G._p1Y - G._oY, 
			G._p2X - G._sX, 
			G._p2Y - G._sY,
			G._vX,
			G._vY  
		);
		if( G.debug ) trace( ' -> dispatch', type )
		G.elem.dispatchEvent ( evt );
	}

}




















/* -- CORE: js/events/GestureEvent.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
var GestureEvent = new function(){
 
 	var _kills = {}
 	var _eventLooping = false;

	function createEvent ( name, mouseGlobalX, mouseGlobalY, mouseLocalX, mouseLocalY, elementX, elementY, distanceX, distanceY, velocityX, velocityY ) {
		var E = new CustomEvent ( name );
	 	E.mouse = {
			global : {
				x : mouseGlobalX,
				y : mouseGlobalY
			},
			local : {
				x : mouseLocalX,
				y : mouseLocalY
			}
		}
		E.element = {
			x : elementX || 0,
			y : elementY || 0
		}
		E.distance = {
			x : distanceX || 0,
			y : distanceY || 0
		}
		E.velocity = {
			x : velocityX || 0,
			y : velocityY || 0
		}
		E.direction = {
			x : velocityX > 0 ? 'right' : velocityX < 0 ? 'left' : null,
			y : velocityY > 0 ? 'down' : velocityY < 0 ? 'up' : null 
		}

	 	return E;
	}

	function stopBubble ( event ){
		if ( event ){
			event.stopImmediatePropagation()
			_kills [ event.type ] = true;
		}
	}

	function isStopped ( type ){
		return _kills [ type ] != undefined;
	}
	function startPoint(){
		if ( !_eventLooping ){
			_eventLooping = true;
			_kills = {}
		}
	}
	function  endPoint(){
		_eventLooping = false
	}
 
	return {
		OVER		: 	'mouseover',
		OUT			: 	'mouseout',
		MOVE 		: 	'mousemove',
		PRESS		: 	'onPress',
		RELEASE		: 	'onRelease',
		CLICK		: 	'onSelect',
		DRAG 		: 	'onDrag',
		DRAG_START 	: 	'onDragStart',
		DRAG_STOP 	: 	'onDragStop',
		SWIPE 		: 	'onSwipe',
		stop 		: 	stopBubble,
		Event 		: 	createEvent,
		
		stopped 	: 	isStopped,
		startPoint 	: 	startPoint,
		endPoint 	: 	endPoint
	}
}




















/* -- CORE IMPLEMENTED: js/geom/Matrix2D.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
var Matrix2D = function() {
	var M = this;
	M.identity = new Float32Array([ 1, 0, 0, 0, 1, 0 ]);
	M.data = new Float32Array( M.identity );
};

Matrix2D.prototype = {
	clear : function() {
		var M = this;
		M.data = new Float32Array( M.identity );
	},

	rotate : function(radians) {
		var M = this;
		var _m = new Float32Array ( M.identity );
		
		var c = Math.cos(radians).toFixed(15);
		var s = Math.sin(radians).toFixed(15);
			
		_m[0] = c;
		_m[1] = s;
		_m[3] = -s;
		_m[4] = c;

		M.multiply ( _m, false );
		return M;
	},

	scale : function(x, y) {
		var M = this;
		var _m = new Float32Array ( M.identity );

		_m[0] = x;
		_m[4] = y;

		M.multiply ( _m, false );
		return M;
	},

	skew : function(ax, ay) {
		var M = this;
		var _m = new Float32Array ( M.identity );

		_m[1] = Math.tan(ax);
		_m[3] = Math.tan(ay);

		M.multiply ( _m );
		return M;
	},

	translate : function(x, y) {
		var M = this;
		var _m = new Float32Array ( M.identity );

		_m[2] = x || 0;
		_m[5] = y || 0;

		M.multiply ( _m, true );
		return M;
	},

	multiply : function(m, invert) {	
		var M = this;
		var _copy = new Float32Array ( M.data );
		var a = invert ? m : _copy;
		var b = invert ? _copy : m;
		
		for ( var i = 0; i < 6; i++ ){
			var k = Math.floor ( i / 3 ) * 3;
			var q = i % 3;
			M.data[i] = a[k] * b[q] + a[k+1] * b[q+3];
		}
		M.data[2] += a[2];
		M.data[5] += a[5];
	},

	setFromCss : function( matrixString ) {
		var cssMatrix = matrixString.match( /\(([^\)]+)\)/ )[ 1 ].replace( /\s/g, '' ).split( ',' ).map( Number );
		this.data = [
			cssMatrix[ 0 ],
			cssMatrix[ 1 ],
			cssMatrix[ 4 ],
			cssMatrix[ 2 ],
			cssMatrix[ 3 ],
			cssMatrix[ 5 ]
		];
	},

	getCss : function() {
		var M = this;
		return 'matrix(' + M.data[0] + ',' + M.data[1] + ',' + M.data[3] + ',' + M.data[4] + ',' + M.data[2] + ',' + M.data[5] + ')';
	}
}





















/* -- CORE IMPLEMENTED: js/utils/MathUtils.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
var MathUtils = new function() {

	var M = this;
	M.toRadians = function( degree ) {
		return (Math.PI / 180.0) * degree;
	}
	M.toDegrees = function( radian ) {
		return (180.0 / Math.PI) * radian;
	}
	M.random = function( a, b, increment ) {
		b = b || 0;
		increment = (increment != undefined && increment > 0) ? increment : 1;
		
		var min = Math.min(a, b);
		var max = Math.max(a, b);

		min = Math.ceil( min / increment ) * increment;
		max = Math.floor( max / increment ) * increment;
		
		var _num = min + (Math.floor(Math.random() * ((max - min + increment) / increment)) / (1 / increment));
		return _num;
	}
	M.randomBoolean = function( weight ) {
		weight = weight || .5;
		return Math.random() < weight;
	}


	M.randomWeightedKey = function( obj ){
		var keys = []
		var vals = [0]
		for ( var param in obj ){
			keys.push( param );
			vals.push( obj[param] + (vals[vals.length - 1] || 0) )
		}

		var rand = Math.random().toFixed(2) * 100
		for ( var k = 0; k < vals.length - 1; k++ ){
			var isIn = M.inRange ( rand, vals[k], vals[k+1] );
			if ( isIn ){
				return keys[k]
			}
		}
	}
	M.rel = function( a0, a1, b0, b1, bX ) {
		return ( (bX - b0) / (b1 - b0) ) * (a1 - a0) + a0;
	}
	M.inRange = function( val, a, b ) {
		var min = Math.min( a, b );
		var max = Math.max( a, b );
		return ( val <= max ) && ( val >= min );
	}
	M.isNumber = function( num ) {
		return !isNaN( num );
	}
	M.toNumber = function( str ) {
		return +str;
	}
	M.restrict = function( num, min, max ) {
		return Math.max ( min, Math.min ( max, num ));
	}
	M.getAnglePoint = function( x, y, distance, angle ) {
		var x = x + ( Math.cos ( angle ) * distance );
		var y = y + ( Math.sin ( angle ) * distance );
		
		return [ x, y ];
	}
	M.getAngle = function(x1, y1, x2, y2) {
		x2 = x2 || 0;
		y2 = y2 || 0;
		return Math.atan2((y2 - y1), (x2 - x1));
	}
	M.getDistance = function(x1, y1, x2, y2) {
		x2 = x2 || 0;
		y2 = y2 || 0;
		return Math.sqrt((y2 - y1) * (y2 - y1) + (x2 - x1) * (x2 - x1));
	}


}




















/* -- CORE IMPLEMENTED: js/view/Clamp.js -----------------------------------------------------------------------------------------
 *
 *
 *
 */
var Clamp = function() {

	var _rect = {
		x : [ 'offsetWidth', 'width', 'left', 'right' ],
		y : [ 'offsetHeight', 'height', 'top', 'bottom' ]
	}
	function set ( source, type, buffer, move ){
		var elem = Markup.get( source );
		move = move !== false		
		
		var children = elem.childNodes;
		var childCoordinates = [];	
		
		var direction = {};
		if ( /(x)/gi.exec( type ) ) direction.x = {};
		if ( /(y)/gi.exec( type ) ) direction.y = {};

		for ( var i = 0; i < children.length; i++ ){
			var child = children[i];
			
			childCoordinates[i] = {};

			for ( var xy in direction ){
				
				var xyValue = Styles.getCss ( child, xy );
				var whValue = child [ _rect[xy][0] ];

				var add = xyValue + whValue;

				var xyDirection = direction[xy]
				
				if ( i == 0 ){
					xyDirection.min = xyValue;
					xyDirection.max = add;
				}
				
				if ( xyValue < xyDirection.min ) 
					xyDirection.min = xyValue;
				
				if ( xyDirection.max < add ) 
					xyDirection.max = add;
				
				childCoordinates[i][xy] = xyValue;
			}
		}
		var _buffer = {
			top : 0,
			bottom : 0,
			left : 0,
			right : 0
		}

		if ( buffer ){
			for ( var prop in _buffer ){
				_buffer [ prop ] = isNaN(buffer) ? ( buffer [ prop ] || 0 ) : buffer;
			}
		}		
		var css = {};
		for ( var xy in direction ){
			var d = direction[xy]
			
			if ( move ) css [ xy ] = d.min + Styles.getCss ( elem, xy ) - _buffer [ _rect[xy][2] ]
			
			css [ _rect[xy][1] ] = d.max - d.min + _buffer [ _rect[xy][2] ] + _buffer [ _rect[xy][3] ];
		}
		
		Styles.setCss( elem, css )
		for ( i = 0; i < children.length; i++ ){
			var child = children[i];
			var css = {}

			for ( var xy in direction ){
				css [ xy ] = childCoordinates[i][xy] - direction[xy].min + _buffer [ _rect[xy][2] ]
			}

			Styles.setCss( child, css )
		}
		
	}
	return {
		X 	: 	'clampX',
		Y 	: 	'clampY',
		XY 	: 	'clampXY',
		set 	: 	set
	}

}()




















