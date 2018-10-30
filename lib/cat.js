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
var db = require('./mongo');
var _ = require('underscore');
var Ajv = require('ajv');
//Ab: Modifications to add multiple metaSchemas (draft-04, 06) and draft-07 is default
var ajv = new Ajv({schemaId: 'auto'});
var metaSchema = require('ajv/lib/refs/json-schema-draft-04.json');
ajv.addMetaSchema(metaSchema);
var metaSchema = require('ajv/lib/refs/json-schema-draft-06.json');
ajv.addMetaSchema(metaSchema);

var fs = require('fs');
var ldapjs = require('ldapjs');
var assert = require('assert');
var fs = require('fs');
var forge = require('node-forge');
var auth = require('./auth');

// Removes the MongoDB _id field from object
function sanitize(doc) {
    delete doc._id;
    return doc;
}

// Creates a new unique item entry in MongoDB
function create_item(item, cb) {
    var items = db.get().collection('items');
    items.ensureIndex({id:1}, {unique:true}, function(err, indexName) {
        if (err)
            cb("duplicate id", null);
        else {
            items.insert(item, {w:1}, function(err, rspdoc) {
                if (err)
                    cb("insert fail", null);
                else {
                    cb(null, rspdoc);
                }
            });
        }
    });
}

// Updates the item entry in MongoDB with new object
function update_item(id, item, cb) {
    var items = db.get().collection('items');
    items.update({id:id}, {$set: item}, {safe: true, upsert: true}, function(err, doc) {
        if (err)
            cb("update failed");
        else {
            cb(null);
        }
    });
}

// Validates the body object and makes a callback
function validateItem(body, res, callback) {
    var $RefParser = require('json-schema-ref-parser');
    fs.readFile('schemas/' + body.refCatalogueSchemaRelease + '/' + body.refCatalogueSchema, 'utf8', function(error, data) {
        if (error == null) {
            var fileData = JSON.parse(data);
            var traverse = require('json-schema-traverse');
            traverse(fileData, {allKeys: true}, function(schema, JSONPointer) {
                if (schema.$ref) {
                    if (schema.$ref[0] !== '#') {
                        var temp = 'schemas/' + body.refCatalogueSchemaRelease + '/' + schema.$ref;
                        schema.$ref = temp;
                    }
                }
            });
            $RefParser.dereference(fileData, function(errDeref, postSchema) {
                if (errDeref) {
                    res.send(500);
                    console.log(errDeref);
                } else {
                    var valid = ajv.validate(postSchema, body);
                    if (!valid) {
                        res.send(400, ajv.errors);  // bad request
                    } else {
                        callback();
                    }
                }
            });
        } else {
            res.send(500, error);
            console.log(error);
        }
    });
}

// Converts the queries to regular expressions
function makeFilter(query) {
    var filter = {};
    var re;
    Object.keys(query).forEach(function(key) {
        var temp = new RegExp(query[key]);
        filter[key] = temp;
    });
    return filter;
}

// The GET request is routed here
exports.get = function(req, res) {

    items = db.get().collection('items');

    var part = req.query.getOnly;

    delete req.query.getOnly;

    var SearchOnly = {};

    if (part) {
        var partArr = part.split(',');
        for (var i = 0; i < partArr.length; i++) {
            if (partArr[i] !== '') {
                SearchOnly[partArr[i]] = true;
            }
        }
    }

    // make id and tags compulsory
    if (Object.keys(SearchOnly).length !== 0) {
        SearchOnly['id'] = true;
        SearchOnly['tags'] = true;
    }

    var filter = makeFilter(req.query);
    
    Object.assign(filter, req.body);

    items.find(filter, SearchOnly, function(err, cursor) {
        if (err)
            res.send(500, err);
        else {
            cursor.toArray(function(err, docs) {
                if (docs.length == 0) {
                    res.send(200, "No docs found");
                }
                else
                {
                //console.log(docs.length)
                    // FIXME, this should be done with mongodb find() in the db, not here
                    //docs = filterSearch(docs, req.query.href, req.query.rel, req.query.val);
                    // construct a catalogue object
                    var cat = {
                        "item-metadata": [
                            {
                                rel:"urn:X-rbccps:rels:isContentType",
                                val:"application/vnd.rbccps.catalogue+json"
                            },
                            {
                                rel:"urn:X-rbccps:rels:hasDescription:en",
                                val:"Catalogue test"
                            },
                            {
                                rel:"urn:X-rbccps:rels:supportsSearch",
                                val:"urn:X-rbccps:search:simple"
                            }
                        ],
                        items: _.map(docs, sanitize)
                    };
                    res.status(200).jsonp(cat);
                }
            });
        }
    });
};

// This function is not used anywhere currently, but can be used to set fields in a doc.
// Was previously being used to update just one field in PUT which has now been disabled
var insertToDoc = function(itemData, nestArray, val) {
    var i;
    var prevRef = itemData;
    for (i = 0; i < nestArray.length; i++) {
        if (prevRef[nestArray[i]] === undefined) {
            prevRef[nestArray[i]] = {};
            if (i < nestArray.length - 1) {
                prevRef = prevRef[nestArray[i]];
            }
        } else {
            if (i < nestArray.length - 1) {
                prevRef = prevRef[nestArray[i]];
            }
        }
    }
    prevRef[nestArray[i-1]] = val;
};

// The same function as in auth.js. Used here only by DELETE. Not by any other function
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

// Simply updates an item entry in the catalogue
var putItem = function(req, res) {
    var items = db.get().collection('items');
    items.findOne({id:req.query.id}, function(findErr, doc) {
        if (findErr !== null) {
            res.send(400, findErr);
        } else if (doc !== null) {
            var updateDoc = req.body;
            updateDoc.id = doc.id;
            updateDoc.accessMechanism = doc.accessMechanism;
            validateItem(updateDoc, res, function() {
                update_item(req.query.id, updateDoc, function(err) {
                    if (err) {
                        res.send(400);  // problem
                    } else {
                        res.send(200, 'updated');
                    }
                });
            });
        } else {
            res.send(404);  // not found
        }
    });
};

// User provides the entire object to be updated instead of just a particular field. This is done
// so that if a user wants to remove a particular field, they can remove it in an object and pass
// the entire object to get

// The PUT request is routed here. Authenticates the request and calls putItem()
exports.put = function(req, res) {

    auth.authenticate(req, res, function(errCode, authErr) {
        if (authErr) {
            res.send(errCode, authErr);
        } else {
            putItem(req, res);
        }
    });

};

// Calls the create_item() function to create a unique entry in the Database
var postItem = function(req, res) {
    validateItem(req.body, res, function() {
        items = db.get().collection('items');
        items.findOne({id:req.query.id}, function(err, doc) {
            if (err !== null){
                res.send(400);
            }else if (doc !== null) {
                res.send(400, "Cannot update an already existing item. Use put to update item");
            } else {
                if (req.query.id != req.body.id) {
                    // console.log('query id not equal to id!');
                    res.send(409,'query id: ' + req.query.id + ' is not equal to body id: ' + req.body.id.toString() + '!');  // conflict
                    return;
                }
                create_item(req.body, function(err) {
                    if (err) {
                        res.send(409, err);  // conflict
                        // console.log(err);
                    } else {
                        res.location('/cat');
                        res.send(201);  // created
                    }
                });
            }
        });
    });
};

// The POST request gets routed here. Authenticates the request and calls postItem()
exports.post = function(req, res) {

    auth.authenticate(req, res, function(errCode, authErr) {
        if (authErr) {
            res.send(errCode, authErr);
        } else {
            postItem(req, res);
        }
    });

};

// Delete request routed here. No LDAP authentication. Hence the repeated authentication code
exports.delete = function(req, res) {
    if (req.headers['pwd']) {
        fs.readFile('pwd.txt', 'utf8', function (err,data) {
            if (err) {
                return console.log(err);
            }
            var temp = JSON.parse(data);

            try {
                var decrypted = decrypt(temp.cipher_text, req.headers['pwd'], temp.salt, temp.iv);
            } catch (e) {
            }

            if (decrypted === 'SmartCity') {
                // console.log('Password is correct');
                var items = db.get().collection('items');
                var filter = {id:req.query.id};
                items.remove(filter, function(err, doc) {
                    if (err)
                        res.send(500);  // not found
                    else
                        if (doc == 1) {
                            res.send(200, 'item deleted');
                        } else {
                            res.send(404, 'item not found');
                        }
                });
            } else {
                res.send(403, 'Incorrect Password');
            }
        });
    } else {
        res.send(403, 'You are not authorized to delete');
    }
};

//*****************************************************************************
//ABHAY : Aug 21, 2018; ELCITA integration
//The following code gives a error although we are not calling it explicitly
//Commenting it out currently.
//*****************************************************************************
//// The response object that is sent when graph data is requested
//var graphRes = {
//    chartData: [],
//    ownersData: [],
//    providersData: [],
//};
//
//// Populates the graphRes object
//var findItems = function() {
//    var items = db.get().collection('items');
//    items.find({}, function(err, cursor) {
//        if (err)
//            console.log(error);
//        else {
//            cursor.toArray(function(err, docs) {
//                var itemsArr = _.map(docs, sanitize);
//
//                var providers = {};
//                var owners = {};
//                var resources = {};
//                for (var i = 0; i < itemsArr.length; i++) {
//                    var currItem = itemsArr[i];
//
//                    if (resources[currItem.resourceType]) {
//                        resources[currItem.resourceType]++;
//                    } else {
//                        resources[currItem.resourceType] = 1;
//                    }
//
//                    if (providers[currItem.provider.name]) {
//                        providers[currItem.provider.name]++;
//                    } else {
//                        providers[currItem.provider.name] = 1;
//                    }
//
//                    if (owners[currItem.owner.name]) {
//                        owners[currItem.owner.name]++;
//                    } else {
//                        owners[currItem.owner.name] = 1;
//                    }
//                }
//
//                graphRes.chartData = [];
//                graphRes.ownersData = [];
//                graphRes.providersData = [];
//
//                var keysArr = Object.keys(resources);
//
//                for (var i = 0; i < keysArr.length; i++) {
//                    var temp = {};
//                    temp.key = keysArr[i];
//                    temp.y = resources[keysArr[i]];
//                    graphRes.chartData.push(temp);
//                }
//
//                keysArr = Object.keys(owners);
//
//                for (var i = 0; i < keysArr.length; i++) {
//                    var temp = {};
//                    temp.name = keysArr[i];
//                    temp.num = owners[keysArr[i]];
//                    graphRes.ownersData.push(temp);
//                }
//
//                keysArr = Object.keys(providers);
//
//                for (var i = 0; i < keysArr.length; i++) {
//                    var temp = {};
//                    temp.name = keysArr[i];
//                    temp.num = providers[keysArr[i]];
//                    graphRes.providersData.push(temp);
//                }
//            });
//        }
//    });
//}
//
//setTimeout(function() {
//    findItems();
//}, 1 * 1000);
//
//// Every six hours, updates the graphRes object
//setInterval(function() {
//    findItems();
//}, 6 * 60 * 60 * 1000);
//
//// The /catGraph GET request is routed here
//exports.getGraphData = function(req, res) {
//    res.status(200).jsonp(graphRes);
//};
//*****************************************************************************
//ABHAY : Aug 21, 2018; ELCITA integration
//*****************************************************************************
