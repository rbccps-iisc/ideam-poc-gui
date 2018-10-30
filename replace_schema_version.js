var request = require('request');

var options = {
	method: 'GET',
	uri: 'http://localhost:8001/cat',
	qs: {
		refCatalogueSchemaRelease: process.argv.slice(2)[0],
	},
	json: true,
	rejectUnauthorized: false,
	headers: {
		'Content-Type': 'application/json'
	}
}

request(options, function(err, res, body) {
	if (err) {
		console.log(err);
	} else {
		for (var i = 0; i < body.items.length; i++) {
			body.items[i].refCatalogueSchemaRelease = process.argv.slice(3)[0];

			var options1 = {
		    	method: 'PUT',
		    	uri: 'http://localhost:8001/cat',
		    	qs: {
		    		id: body.items[i].id,
		    	},
		    	json: body.items[i],
		    	rejectUnauthorized: false,
		    	headers: {
		    		'Content-Type': 'application/json',
		    		'no-check': true,
		    		'pwd': 'cat123'
		    	}
		    }

		    request(options1, function(putErr, response, resBody) {
		    	if (putErr) {
		    		console.log(putErr);
		    	} else {
		    		console.log(resBody);
		    	}
		    });
		}
	}
});