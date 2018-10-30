Notes: Dynamic Catalogue Server
===============================

Design Choices: 
---------------
Database: 
1. Catalog entries are schema less.
2. Requires a NoSQL type DB. 
3. The entries are not time series data. 

MongoDB is most accurate choice of Database satisfying all the above requirements.
