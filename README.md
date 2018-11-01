For CAT UI, go to [http://139.59.89.23:8000/cat/ui](http://139.59.89.23:8000/cat/ui){:target="_blank"}
------------------------------------------------------------------------------------

For follow request notifications, go to [http://139.59.89.23:8000/cat/notifications](http://139.59.89.23:8000/cat/notifications){:target="_blank"}
--------------------------------------------------------------------------------------------------------------------------------

NOTE: The URLs above will function for a limited amount of time.

Dynamic Catalogue Server
========================

A simple dynamic catalogue server implementing:

 * A single catalogue at /cat
 * Read/insert/modify of items
 * Basic Auth for authentication (required for write operations)
 * Search of catalogue (urn:X-rbccps:search:simple)

The server is built for simplicity, not performance.
See htdocs/index.html for more information.

Prerequisites
-------------

The server relies on mongodb for persistent storage.
Also, start MongoDB service before npm start.

	sudo mongod service start for linux
	brew service start mongodb for OSX

Running
-------

    npm install
    npm start

Access http://localhost:8001


Wiping the catalogue
--------------------

For test purposes, the catalogue may be wiped with

    node dropdb.js

Replacing schema version
------------------------

To replace schema version of items with version 'from' to 'to'

	node replace_schema_version.js <from> <to>

Setting Local Password
----------------------

	node pwd_script.js <Password>

