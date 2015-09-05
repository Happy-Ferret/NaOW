// Imports
const {classes: Cc, interfaces: Ci, manager: Cm, results: Cr, utils: Cu, Constructor: CC} = Components;
// Cm.QueryInterface(Ci.nsIComponentRegistrar);

Cu.import('resource://gre/modules/devtools/Console.jsm');
Cu.import('resource:///modules/CustomizableUI.jsm');
Cu.import('resource://gre/modules/osfile.jsm');
var PromiseWorker = Cu.import('resource://gre/modules/PromiseWorker.jsm', {}).BasePromiseWorker;
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

// Globals
const core = {
	addon: {
		name: 'NaOW',
		id: 'NaOW@jetpack',
		path: {
			name: 'naow',
			content: 'chrome://naow/content/',
			images: 'chrome://naow/content/resources/images/',
			locale: 'chrome://naow/locale/',
			modules: 'chrome://naow/content/modules/',
			resources: 'chrome://naow/content/resources/',
			scripts: 'chrome://naow/content/resources/scripts/',
			styles: 'chrome://naow/content/resources/styles/',
			workers: 'chrome://naow/content/modules/workers/'
		},
		cache_key: Math.random() // set to version on release
	},
	os: {
		name: OS.Constants.Sys.Name.toLowerCase(),
		toolkit: Services.appinfo.widgetToolkit.toLowerCase(),
		xpcomabi: Services.appinfo.XPCOMABI
	},
	firefox: {
		pid: Services.appinfo.processID,
		version: Services.appinfo.version
	}
};

const JETPACK_DIR_BASENAME = 'jetpack';
const myPrefBranch = 'extensions.' + core.addon.id + '.';
var bootstrap = this;

// Lazy Imports
const myServices = {};
XPCOMUtils.defineLazyGetter(myServices, 'hph', function () { return Cc['@mozilla.org/network/protocol;1?name=http'].getService(Ci.nsIHttpProtocolHandler); });
XPCOMUtils.defineLazyGetter(myServices, 'sb', function () { return Services.strings.createBundle(core.addon.path.locale + 'bootstrap.properties?' + core.addon.cache_key); /* Randomize URI to work around bug 719376 */ });

function extendCore() {
	// adds some properties i use to core based on the current operating system, it needs a switch, thats why i couldnt put it into the core obj at top
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
			core.os.version = parseFloat(Services.sysinfo.getProperty('version'));
			// http://en.wikipedia.org/wiki/List_of_Microsoft_Windows_versions
			if (core.os.version == 6.0) {
				core.os.version_name = 'vista';
			}
			if (core.os.version >= 6.1) {
				core.os.version_name = '7+';
			}
			if (core.os.version == 5.1 || core.os.version == 5.2) { // 5.2 is 64bit xp
				core.os.version_name = 'xp';
			}
			break;
			
		case 'darwin':
			var userAgent = myServices.hph.userAgent;

			var version_osx = userAgent.match(/Mac OS X 10\.([\d\.]+)/);

			
			if (!version_osx) {
				throw new Error('Could not identify Mac OS X version.');
			} else {
				var version_osx_str = version_osx[1];
				var ints_split = version_osx[1].split('.');
				if (ints_split.length == 1) {
					core.os.version = parseInt(ints_split[0]);
				} else if (ints_split.length >= 2) {
					core.os.version = ints_split[0] + '.' + ints_split[1];
					if (ints_split.length > 2) {
						core.os.version += ints_split.slice(2).join('');
					}
					core.os.version = parseFloat(core.os.version);
				}
				// this makes it so that 10.10.0 becomes 10.100
				// 10.10.1 => 10.101
				// so can compare numerically, as 10.100 is less then 10.101
				
				//core.os.version = 6.9; // note: debug: temporarily forcing mac to be 10.6 so we can test kqueue
			}
			break;
		default:
			// nothing special
	}
	

}

// START - Addon Functionalities
const myWidgetId = 'cui_naow';
var myWidgetListener = {
	onWidgetRemoved: function(aWidgetId, aArea) {
		console.log('a widget REMOVED, arguments:', arguments);
		if (aWidgetId != myWidgetId) {
			return
		}
		console.log('my widget removed');
		
		var myInstances = CustomizableUI.getWidget(myWidgetId).instances;
		for (var i=0; i<myInstances.length; i++) {
			myInstances[i].node.setAttribute('image', core.addon.path.images + 'icon32.png');
		}
	},
	onWidgetAdded: function(aWidgetId, aArea) {
		console.log('a widget ADDED, arguments:', arguments);
		if (aWidgetId != myWidgetId) {
			return
		}
		console.log('my widget added');
		
		var useIcon;
		if (aArea == CustomizableUI.AREA_PANEL) {
			useIcon = core.addon.path.images + 'icon32.png';
		} else {
			useIcon = core.addon.path.images + 'icon16.png';
		}
		
		var myInstances = CustomizableUI.getWidget(myWidgetId).instances;
		for (var i=0; i<myInstances.length; i++) {
			myInstances[i].node.setAttribute('image', useIcon);
		}

	},
	onWidgetDestroyed: function(aWidgetId) {
		console.log('a widget DESTROYED, arguments:', arguments);
		if (aWidgetId != myWidgetId) {
			return
		}
		console.log('my widget destoryed');
		CustomizableUI.removeListener(myWidgetListener);
	}
};

var promptInputPath = {value:'C:\\Users\\Vayeate\\Documents\\GitHub\\NaOW\\icon.png'};

function cuiCommand(aEvent) {
	console.log('cuiCommand arguments:', arguments);
	
	var cDOMWindow = aEvent.target.ownerDocument.defaultView;
	
	var promptRezPath = Services.prompt.prompt(cDOMWindow, myServices.sb.GetStringFromName('prompt_title'), myServices.sb.GetStringFromName('prompt_text'), promptInputPath, null, {value:false});
	if (promptRezPath) {
		var cInputPath = promptInputPath.value.trim();
		if (cInputPath.length != 0) {
			var promise_showOpenWithDialog = MainWorker.post('showOpenWithDialog', [cInputPath]);
			promise_showOpenWithDialog.then(
				function(aVal) {
					console.log('Fullfilled - promise_showOpenWithDialog - ', aVal);
					// start - do stuff here - promise_showOpenWithDialog
					// end - do stuff here - promise_showOpenWithDialog
				},
				function(aReason) {
					var rejObj = {name:'promise_showOpenWithDialog', aReason:aReason};
					console.warn('Rejected - promise_showOpenWithDialog - ', rejObj);
					// deferred_createProfile.reject(rejObj);
				}
			).catch(
				function(aCaught) {
					var rejObj = {name:'promise_showOpenWithDialog', aCaught:aCaught};
					console.error('Caught - promise_showOpenWithDialog - ', rejObj);
					// deferred_createProfile.reject(rejObj);
				}
			);
		}
	}
}
// END - Addon Functionalities

function install() {}

function uninstall() {}

function startup(aData, aReason) {
	// core.addon.aData = aData;
	extendCore();
	
	var promise_getMainWorker = SIPWorker('MainWorker', core.addon.path.workers + 'MainWorker.js');
	promise_getMainWorker.then(
		function(aVal) {
			console.log('Fullfilled - promise_getMainWorker - ', aVal);
			// start - do stuff here - promise_getMainWorker
			// end - do stuff here - promise_getMainWorker
		},
		function(aReason) {
			var rejObj = {
				name: 'promise_getMainWorker',
				aReason: aReason
			};
			console.warn('Rejected - promise_getMainWorker - ', rejObj);
		}
	).catch(
		function(aCaught) {
			var rejObj = {
				name: 'promise_getMainWorker',
				aCaught: aCaught
			};
			console.error('Caught - promise_getMainWorker - ', rejObj);
		}
	);
	
	CustomizableUI.addListener(myWidgetListener);
	CustomizableUI.createWidget({
		id: myWidgetId,
		defaultArea: CustomizableUI.AREA_NAVBAR,
		label: myServices.sb.GetStringFromName('cui_naow_lbl'),
		tooltiptext: myServices.sb.GetStringFromName('cui_naow_tip'),
		onCreated: function(aNode) {
			console.info('aNode:', aNode);
			aNode.setAttribute('image', core.addon.path.images + 'icon16.png');
		},
		onCommand: cuiCommand
	});
	
}

function shutdown(aData, aReason) {
	if (aReason == APP_SHUTDOWN) { return }
	
	CustomizableUI.destroyWidget(myWidgetId);
}

// start - common helper functions
function aReasonMax(aReason) {
	var deepestReason = aReason;
	while (deepestReason.hasOwnProperty('aReason') || deepestReason.hasOwnProperty()) {
		if (deepestReason.hasOwnProperty('aReason')) {
			deepestReason = deepestReason.aReason;
		} else if (deepestReason.hasOwnProperty('aCaught')) {
			deepestReason = deepestReason.aCaught;
		}
	}
	return deepestReason;
}
function Deferred() {
	// update 062115 for typeof
	if (typeof(Promise) != 'undefined' && Promise.defer) {
		//need import of Promise.jsm for example: Cu.import('resource:/gree/modules/Promise.jsm');
		return Promise.defer();
	} else if (typeof(PromiseUtils) != 'undefined'  && PromiseUtils.defer) {
		//need import of PromiseUtils.jsm for example: Cu.import('resource:/gree/modules/PromiseUtils.jsm');
		return PromiseUtils.defer();
	} else {
		/* A method to resolve the associated Promise with the value passed.
		 * If the promise is already settled it does nothing.
		 *
		 * @param {anything} value : This value is used to resolve the promise
		 * If the value is a Promise then the associated promise assumes the state
		 * of Promise passed as value.
		 */
		this.resolve = null;

		/* A method to reject the assocaited Promise with the value passed.
		 * If the promise is already settled it does nothing.
		 *
		 * @param {anything} reason: The reason for the rejection of the Promise.
		 * Generally its an Error object. If however a Promise is passed, then the Promise
		 * itself will be the reason for rejection no matter the state of the Promise.
		 */
		this.reject = null;

		/* A newly created Pomise object.
		 * Initially in pending state.
		 */
		this.promise = new Promise(function(resolve, reject) {
			this.resolve = resolve;
			this.reject = reject;
		}.bind(this));
		Object.freeze(this);
	}
}
function SIPWorker(workerScopeName, aPath, aCore=core) {
	// "Start and Initialize PromiseWorker"
	// returns promise
		// resolve value: jsBool true
	// aCore is what you want aCore to be populated with
	// aPath is something like `core.addon.path.content + 'modules/workers/blah-blah.js'`
	
	// :todo: add support and detection for regular ChromeWorker // maybe? cuz if i do then ill need to do ChromeWorker with callback
	
	var deferredMain_SIPWorker = new Deferred();

	if (!(workerScopeName in bootstrap)) {
		bootstrap[workerScopeName] = new PromiseWorker(aPath);
		
		if ('addon' in aCore && 'aData' in aCore.addon) {
			delete aCore.addon.aData; // we delete this because it has nsIFile and other crap it, but maybe in future if I need this I can try JSON.stringify'ing it
		}
		
		var promise_initWorker = bootstrap[workerScopeName].post('init', [aCore]);
		promise_initWorker.then(
			function(aVal) {
				console.log('Fullfilled - promise_initWorker - ', aVal);
				// start - do stuff here - promise_initWorker
				deferredMain_SIPWorker.resolve(true);
				// end - do stuff here - promise_initWorker
			},
			function(aReason) {
				var rejObj = {name:'promise_initWorker', aReason:aReason};
				console.warn('Rejected - promise_initWorker - ', rejObj);
				deferredMain_SIPWorker.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promise_initWorker', aCaught:aCaught};
				console.error('Caught - promise_initWorker - ', rejObj);
				deferredMain_SIPWorker.reject(rejObj);
			}
		);
		
	} else {
		deferredMain_SIPWorker.reject('Something is loaded into bootstrap[workerScopeName] already');
	}
	
	return deferredMain_SIPWorker.promise;
	
}
// end - common helper functions