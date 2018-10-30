const request = require('request');
//const elcita_cat_url = 'https://api.myjson.com/bins/k2xes'
const elcita_cat_url = 'https://electroniccity.rbccps.org:8443/api/1.0.0/cat'

exports.get = function(req, res) {
  request({'url':elcita_cat_url, 'json':true},function (error, response, body) {
            if(error) {
              res.json({'status':'ERROR','value':error, 'url':elcita_cat_url})
            } else {
              res.json({'status':'OK','value':body, 'url':elcita_cat_url})
          }
        });
};
