# smart_cities_schemas
Desription: 
The project contains schemas describing meta-information for various deployed 
data sources (sensors/actuators, devices, virtual sensors etc.). The schemas
are described in json-schema format.
Resource catalog stores the information about each device (also referred to
as catalog item). The structure of information contained in each item is specified
by a json-schema (specified in this project). Apart from specifying a structure of
the catalog item, the schemas are also used to validate this item before storing
into the catalog using json-schema validator tools.

Directory structure:

Base directory contains all the schema files and the associated definition files.

Schema-list.txt: 
Contains the list of all the schema files along with the tags
to help a user choose the right schema for its device.


./example_items: 
This directory contains sample items for various devices
./skeleton_items: 
This directory contains the skeleton_item files for each json schema.
A skeleton item contains the minimum required number of fields for a given schema 
(mandatory fields). These files are provided to help a user create its own device item 
using a given skeleton file as a start point.
