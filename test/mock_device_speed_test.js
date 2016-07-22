
/**
	This test aims to show how the io_manager library should be used.  It
	shows the initialization, some basic usage steps, and destruction of the
	library.
**/

var utils = require('./utils/utils');
var qRunner = utils.qRunner;
var qExec = utils.qExec;
var pResults = utils.pResults;
var q = require('q');

var io_manager;
var io_interface;

// Managers
var driver_controller;
var device_controller;
var file_io_controller;
var logger_controller;

var device;

var getPerformTest = function(functionName, testArguments, numReads) {
	// var numReads = numReads;
	// var functionName = functionName;
	// var testArguments = testArguments;
	var testingFunc = function(test) {
		var promises = [];
		var i;
		var startTime = new Date();
		var endTime;

		for(i = 0; i < numReads; i++) {
			promises.push(device[functionName](testArguments));
		}

		q.allSettled(promises)
		.then(function() {
			endTime = new Date();

			var totalTime = (endTime - startTime)/1000;
			var timePerRead = totalTime/numReads;
			var rate = 1/timePerRead;
			var stats = {
				'functionName': functionName,
				'arguments': testArguments,
				'totalTime': totalTime,
				'timePerRead': timePerRead,
				'rate': rate,
			};
			console.log('Finished Reading, Stats:');
			console.log(JSON.stringify(stats, null, 2));
			test.done();
		});
	};
	return testingFunc;
};
exports.tests = {
	'initialization': function(test) {
		// Require the io_manager library
		io_manager = require('../lib/io_manager');

		// Require the io_interface that gives access to the ljm driver,
		// device controller, logger, and file_io_controller objects.
		io_interface = io_manager.io_interface();

		// Initialize the io_interface
		io_interface.initialize()
		.then(function(res) {
			// io_interface has initialized and is ready for use

			// Save local pointers to the created objects
			driver_controller = io_interface.getDriverCotroller();
			device_controller = io_interface.getDeviceController();

			test.ok(true);
			test.done();
		}, function(err) {
			test.ok(false, 'error initializing io_interface' + JSON.stringify(err));
			test.done();
		});
	},
	'open mock device': function(test) {
		var params = {
			'deviceType': 'LJM_dtT7',
			'connectionType': 'LJM_ctUSB',
			'identifier': 'LJM_idANY',
			'mockDevice': true
		};

		console.log('opening mock device');
		device_controller.openDevice(params)
		.then(function(newDevice) {
			// save device reference
			device = newDevice;
			device_controller.getNumDevices()
			.then(function(res) {
				test.strictEqual(res, 1, 'wrong number of devices are open');
				test.done();
			});
		}, function(err) {
			console.log("Error opening device", err);
			test.ok(false, 'failed to create new device object');
			test.done();
		});
	},
	'read single AIN0': function(test) {
		device.read('AIN0')
		.then(function(res) {
			var isOk = true;
			if((res > 11) || (res < -11)) {
				isOk = false;
			}
			test.ok(isOk, 'AIN0 read result is out of range');
			test.done();
		}, function(err) {
			test.ok(false, 'AIN0 read result returned an error');
			test.done();
		});
	},
	'read x2000, AIN0': getPerformTest('read', 'AIN0', 2000),
	'iRead x2000, AIN0': getPerformTest('iRead', 'AIN0', 2000),
	'sRead x2000, AIN0': getPerformTest('sRead', 'AIN0', 2000),
	// 'update firmware': function(test) {
	// 	var fwLocation = '';
	// 	var numPercentUpdates = 0;
	// 	var percentListener = function(percent) {
	// 		numPercentUpdates += 1;
	// 	};
	// 	var numStepUpdates = 0;
	// 	var stepListener = function(step) {
	// 		numStepUpdates += 1;
	// 	};
	// 	device.updateFirmware(
	// 		fwLocation,
	// 		percentListener,
	// 		stepListener
	// 	)
	// 	.then(function(res) {
	// 		test.ok(true);
	// 		if(numPercentUpdates > 0) {
	// 			test.ok(true);
	// 		} else {
	// 			test.ok(false, 'did not receive any percent updates');
	// 		}
	// 		if(numPercentUpdates > 0) {
	// 			test.ok(true);
	// 		} else {
	// 			test.ok(false, 'did not receive any step updates');
	// 		}
	// 		test.done();
	// 	}, function(err) {
	// 		console.log('Update Failed', err);
	// 		test.ok(false, 'Update failed to complete');
	// 		test.done();
	// 	});
	// },
	'close mock device': function(test) {
		device.close()
		.then(function(res) {
			test.strictEqual(res.comKey, 0, 'expected to receive a different comKey');
			test.done();
		}, function(err) {
			console.log('Failed to close mock device', err);
			test.ok(false, 'Failed to close mock device');
			test.done();
		});
	},
	'destruction': function(test) {
		io_interface.destroy()
		.then(function(res) {
			// io_interface process has been shut down
			test.ok(true);
			test.done();
		}, function(err) {
			test.ok(false, 'io_interface failed to shut down' + JSON.stringify(err));
			test.done();
		});
	}
};