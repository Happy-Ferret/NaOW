'use strict';

// Imports
importScripts('resource://gre/modules/osfile.jsm');
importScripts('resource://gre/modules/workers/require.js');

// Globals
var core = {
	addon: {
		path: {
			content: 'chrome://naow/content/',
		}
	},
	os: {
		name: OS.Constants.Sys.Name.toLowerCase()
	}
};

var OSStuff = {}; // global vars populated by init, based on OS

// Imports that use stuff defined in chrome
// I don't import ostypes_*.jsm yet as I want to init core first, as they use core stuff like core.os.isWinXP etc
// imported scripts have access to global vars on MainWorker.js
importScripts(core.addon.path.content + 'modules/cutils.jsm');
importScripts(core.addon.path.content + 'modules/ctypes_math.jsm');

// Setup PromiseWorker
var PromiseWorker = require('resource://gre/modules/workers/PromiseWorker.js');

var worker = new PromiseWorker.AbstractWorker();
worker.dispatch = function(method, args = []) {
	return self[method](...args);
},
worker.postMessage = function(...args) {
	self.postMessage(...args);
};
worker.close = function() {
	self.close();
};
worker.log = function(...args) {
	dump('Worker: ' + args.join(' ') + '\n');
};
self.addEventListener('message', msg => worker.handleMessage(msg));

////// end of imports and definitions

function init(objCore) {
	//console.log('in worker init');
	
	// merge objCore into core
	// core and objCore is object with main keys, the sub props
	
	core = objCore;

	// if (core.os.toolkit == 'gtk2') {
		// core.os.name = 'gtk';
	// }
	
	// I import ostypes_*.jsm in init as they may use things like core.os.isWinXp etc
	switch (core.os.toolkit.indexOf('gtk') == 0 ? 'gtk' : core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
			importScripts(core.addon.path.content + 'modules/ostypes_win.jsm');
			break
		case 'gtk':
			importScripts(core.addon.path.content + 'modules/ostypes_x11.jsm');
			break;
		case 'darwin':
			importScripts(core.addon.path.content + 'modules/ostypes_mac.jsm');
			break;
		default:
			throw new Error({
				name: 'addon-error',
				message: 'Operating system, "' + OS.Constants.Sys.Name + '" is not supported'
			});
	}
	
	// OS Specific Init
	switch (core.os.toolkit.indexOf('gtk') == 0 ? 'gtk' : core.os.name) {
		default:
			// do nothing special
	}
	
	return true;
}

// Start - Addon Functionality
function showOpenWithDialog(aPath, aOptions={}) {
	// aPath can be a url, it is a js string
	
	switch (core.os.toolkit.indexOf('gtk') == 0 ? 'gtk' : core.os.name) {
		case 'winnt':
			
					// aOptions supported:
						// arrWinCommandLineArguments: js array of js strings
						
					var sei = ostypes.TYPE.SHELLEXECUTEINFO();
					//console.info('ostypes.TYPE.SHELLEXECUTEINFO.size:', ostypes.TYPE.SHELLEXECUTEINFO.size);
					sei.cbSize = ostypes.TYPE.SHELLEXECUTEINFO.size;
					sei.lpFile = ostypes.TYPE.LPCTSTR.targetType.array()(aPath);
					if (aOptions.arrWinCommandLineArguments && aOptions.arrWinCommandLineArguments.length > 0) {
						sei.lpParameters = ostypes.TYPE.LPCTSTR.targetType.array()(aOptions.arrWinCommandLineArguments.join(' '));
					}
					//sei.lpVerb = ostypes.TYPE.LPCTSTR.targetType.array()('open');
					sei.nShow = ostypes.CONST.SW_SHOWNORMAL;
					
					var rez_ShellExecuteEx = ostypes.API('ShellExecuteEx')(sei.address());
					console.info('rez_ShellExecuteEx:', rez_ShellExecuteEx.toString(), uneval(rez_ShellExecuteEx));
					if (rez_ShellExecuteEx == false) {
						console.error('Failed rez_ShellExecuteEx, winLastError:', ctypes.winLastError);
						throw new Error('failed to launch');
					}
				
			break;
		case 'gtk':
			
				
			
			break;
		case 'darwin':
			
				try {
					var myNSStrings = new ostypes.HELPER.nsstringColl();
					

				} finally {					
					if (myNSStrings) {
						myNSStrings.releaseAll()
					}
				}
			
			break;
		default:
			console.error('os not supported');
	}
	
}

// End - Addon Functionality