var exec = require('child_process').exec,
    child;
var request = require('request');

child = exec('node dropdb.js',
  function (error, stdout, stderr) {
    console.log('stdout: ' + stdout);
    console.log('stderr: ' + stderr);
    if (error !== null) {
      	console.log('exec error: ' + error);
    }

    var options = {
    	method: 'GET',
    	uri: 'https://smartcity.rbccps.org/api/0.1.0/cat',
    	json: true,
    	rejectUnauthorized: false,
    	headers: {
    		'Content-Type': 'application/json'
    	}
    }

    request(options, function(err, response, body) {
    	if (!err) {
    		var itemsArr = body.items;
    		for (var i = 0; i < itemsArr.length; i++) {
    			var options1 = {
			    	method: 'POST',
			    	uri: 'http://localhost:8001/cat',
			    	qs: {
			    		id: itemsArr[i].id,
			    	},
			    	json: itemsArr[i],
			    	rejectUnauthorized: false,
			    	headers: {
			    		'Content-Type': 'application/json',
			    		'no-check': true,
			    		'pwd': 'cat123'
			    	}
			    }

			    request(options1, function(err, response, body) {
			    	if (!err) {
			    		console.log(body);
			    	} else {
			    		console.log(err);
			    	}
			    });
    		};
    	} else {
    		console.log(err);
    	}
    });
});