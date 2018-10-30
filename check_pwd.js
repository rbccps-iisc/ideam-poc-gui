var forge = require('node-forge');
var fs = require('fs');

// returns the Decrypted string on providing the encrypted string, password, salt and iv
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
}

fs.readFile('pwd.txt', 'utf8', function (err,data) {
	if (err) {
		return console.log(err);
	}
	var temp = JSON.parse(data);

	try {
		var decrypted = decrypt(temp.cipher_text, process.argv.slice(2)[0], temp.salt, temp.iv);
	} catch (e) {
		// console.log(e);
	}

	// Check if the decrypted string matches the reference string
	if (decrypted === 'SmartCity') {
		console.log('Password is correct');
	} else {
		console.log('Incorrect Password');
	}
});