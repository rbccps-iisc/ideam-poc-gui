/** Copyright (c) 2013 Toby Jaffey <toby@1248.io>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var config = require('./config');
var express = require('express');
var fs = require('fs');
var forge = require('node-forge');
var ldapjs = require('ldapjs');

// simple username + password check
exports.check = express.basicAuth(function(user, pass, callback) {
    var result = (user === config.auth.username && pass === config.auth.password);
    callback(null, result);
});

// Authenticates against Local Password or LDAP based on header provided
exports.authenticate = function(req, res, cb) {
	if (req.headers['no-check']) {
        // Local password auth
        fs.readFile('pwd.txt', 'utf8', function (err,data) {
            if (err) {
                return console.log(err);
            }
            var temp = JSON.parse(data);

            try {
                var decrypted = decrypt(temp.cipher_text, req.headers['pwd'], temp.salt, temp.iv);
            } catch (e) {
                // console.log(e);
            }

            if (decrypted === 'SmartCity') {
                cb(null, null);
            } else {
            	cb(403, 'Incorrect Password');
            }
        });
    } else {
        // LDAP auth
        var client = ldapjs.createClient({
            url: config.ldap.url
        });

        client.search('uid=' + req.query.id + ',' + config.ldap.baseDN, {}, function(searchErr, searchRes) {

            searchRes.on('searchEntry', function(entry) {
                //console.log(Buffer.from(req.headers['authorization'].split(':')[1], 'base64').toString('utf8').split(':')[0]);
                //console.log(req.headers['authorization']);
                //console.log(entry.object.owner);
                if (entry.object.owner === Buffer.from(req.headers['authorization'].split(':')[1], 'base64').toString('utf8').split(':')[0]) {
                    cb(null, null);
                } else {
                	cb(403, "You don't have access to post this item");
                }
            });

            searchRes.on('error', function(resErr) {
                cb(400, resErr.message)
            });

            client.destroy();
        });
	}
};

// returns the Decrypted string on providing the encrypted string, password, salt and iv
// salt and iv are randomly generated and stored in the pwd.txt file while setting the password
var decrypt = function(cipherText, password, salt, iv, options) {
    var key = forge.pkcs5.pbkdf2(password, forge.util.decode64(salt), 4, 16);
    var decipher = forge.cipher.createDecipher('AES-CBC', key);
    decipher.start({iv: forge.util.decode64(iv)});
    decipher.update(forge.util.createBuffer(forge.util.decode64(cipherText)));
    decipher.finish();
    if(options !== undefined && options.hasOwnProperty("output") && options.output === "hex") {
        return decipher.output.toHex();
    } else {
        return decipher.output.toString();
    }
};
