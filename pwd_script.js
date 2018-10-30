var forge = require('node-forge');

// Encrypts the message with the password as key
var encrypt = function(message, password) {
    var salt = forge.random.getBytesSync(128);
    var key = forge.pkcs5.pbkdf2(password, salt, 4, 16);
    var iv = forge.random.getBytesSync(16);
    var cipher = forge.cipher.createCipher('AES-CBC', key);
    cipher.start({iv: iv});
    cipher.update(forge.util.createBuffer(message));
    cipher.finish();
    var cipherText = forge.util.encode64(cipher.output.getBytes());
    return {cipher_text: cipherText, salt: forge.util.encode64(salt), iv: forge.util.encode64(iv)};
}

// 'SmartCity' is the string that is being encrypted
var temp = encrypt('SmartCity', process.argv.slice(2)[0] || 'cat123');

var fs = require('fs');
fs.writeFile("pwd.txt", JSON.stringify(temp), function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("The password file was created");
});