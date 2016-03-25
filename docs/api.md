# API Reference

The VIQ API provide an API for interacting with the VantIQ server.  Each
API returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) that provides the results or errors from the API call.

This document defines the VantIQ Client SDK.  Please refer to the [VantIQ Reference Guides](https://dev.vantiq.com/docs/api/developer.html) for details on the how to use the VantIQ system.

## VIQ API

The VIQ object provides the main API for the VantIQ NodeJS SDK.

### API

* [VIQ](#viq)
* [authenticate](#viq-authenticate)
* [select](#viq-select)
* [count](#viq-count)
* [insert](#viq-insert)
* [update](#viq-update)
* [upsert](#viq-upsert)
* [delete](#viq-delete)
* [publish](#viq-publish)
* [execute](#viq-execute)

## <a id="viq"></a> VIQ

The `VIQ` constructor creates a new instance of the `VIQ` SDK object.
The SDK expects that the first operation is to authenticate onto the
specified VantIQ server.  After successfully authenticated, the client
is free to issue any requests to the VantIQ server.

`VIQ` uses the [VantIQ RESTful API](https://dev.vantiq.com/docs/api/developer.html#api-reference-guide).

The `VIQ` class is provided by the `vantiq-sdk` NPM module.

### Signature

    var v = new VIQ(options)

### Option Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
server | String | Yes | The VantIQ server URL to connect to, e.g. `https://dev.vantiq.com`
apiVersion | Integer | No | The version of the API to use.  Defaults to the latest.

### Returns

An instance of the `VIQ` object

### Example

    var VIQ = require('vantiq-sdk');
    
    var v = new VIQ({ server: 'https://dev.vantiq.com' });

## <a id="viq-authenticate"></a> VIQ.authenticate

The `authenticate` method connects to the VantIQ server with the given 
authentication credentials used to authorize the user.  Upon success,
an access token is provided to the client for use in subsequent API 
calls to the VantIQ server.  The username and password credentials
are not stored.

### Signature

    var promise = v.authenticate(username, password)

### Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
username | String | Yes | The username to provide access to the VantIQ server
password | String | Yes | The password to provide access to the VantIQ server

### Returns

The `authenticate` method returns a promise that resolves if the authentication was successful.  Upon any failure, including invalid credentials, the promise is rejected
with the error.

### Example

    var p = v.authenticate('joe@user', 'my-secr3t-passw0rd!#!')
                .then((result) => console.log('Authenticated!'))
                .catch((err)   => console.error(err));

## <a id="viq-select"></a> VIQ.select

The `select` method issues a query to select all matching records for a given 
type.  The `select` may query both user-defined types as well as system types, 
such as `procedures` and `types` (see `VIQ.SYSTEM_TYPES`).

### Signature

    var promise = v.select(type, props, where, sort)

### Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
type | String | Yes | The data type to query
props| Array | No | Specifies the desired properties to be returned in each record.  An empty array or null value means all properties will be returned.
where | Object | No | Specifies constraints to filter the data.  Null means all records will be returned.
sort | Object | No | Specifies the desired sort for the result set.

The `props` is an array of property names indciating which properties should be returned.
    
The `where` is an object with supported operations defined in [API operations](https://dev.vantiq.com/docs/api/developer.html#api-operations).

The `sort` is an object with keys that are the properties to sort on and the 
values indicate ascending (1) or descending (-1).

### Returns

The `select` method returns a promise that resolves to the list of matching 
records.  Upon any failure, the promise is rejected with the error.

### Example

Select the `name` property for all available types.

    v.select('types', [ 'name' ])
        .then((result) => {
            result.forEach(e => console.log(e.name);
        });

Selects all properties filtering to only return types with the `TestType` name.

    v.select('types', [], { name: 'TestType' })
        .then((result) => {
            console.log(JSON.stringify(result[0], null, 2));
        });

Selects all records for the `TestType` type returning only the `key` and `value` properties and sorting the results by the `key` in descending order.

    v.select('TestType', [ 'key', 'value' ], {}, { key: -1 })
        .then((result) => {
            console.log(JSON.stringify(result[0], null, 2));
        });

## <a id="viq-count"></a> VIQ.count

The `count` method is similar to the `select` method except it returns only the
number of records rather than returning the records themselves.  The `count` may
query both user-defined types as well as system types, such as `procedures` and
`types` (see `VIQ.SYSTEM_TYPES`).

### Signature

    var promise = v.count(type, where)

### Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
type | String | Yes | The data type to query
where | Object | No | Specifies constraints to filter the data.  Null means all records will be returned.

The `where` is an object with supported operations defined in [API operations](https://dev.vantiq.com/docs/api/developer.html#api-operations).

### Returns

The `count` method returns a promise that resolves to the number of matching 
records.  Upon any failure, the promise is rejected with the error.

### Example

Counts the number of `TestType` records.

    v.count('TestType')
        .then((result) => {
            console.log("TestType has " + result + " records");
        });

Counts the number of `TestType` with a `value` greater than 10.

    v.count('TestType', { value: { $gt: 10 }})
        .then((result) => {
            console.log("TestType has " + result + " records with value > 10");
        });

## <a id="viq-insert"></a> VIQ.insert

The `insert` method creates a new record of a given type.

### Signature

    var promise = v.insert(type, object)

### Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
type | String | Yes | The data type to insert
object | Object | Yes | The object to insert

### Returns

The `insert` method returns a promise that resolves to the object just inserted.  
Upon any failure, the promise is rejected with the error.

### Example

Inserts an object of type `TestType`.

    var objToInsert = {
        key: 'SomeKey',
        value: 42
    };
    
    v.insert('TestType', objToInsert)
        .then((result) => {
            console.log(JSON.stringify(result, null, 2));
        });

## <a id="viq-update"></a> VIQ.update

The `update` method updates an existing record of a given type.  This method
supports partial updates meaning that only the properties provided are updated.
Any properties not specified are not changed in the underlying record.

### Signature

    var promise = v.update(type, id, object)

### Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
type | String | Yes | The data type to update
id   | String | Yes | The "_id" internal identifier for the record
props | Object | Yes | The properties to update in the record

### Returns

The `update` method returns a promise that resolves to the object just updated.  
Upon any failure, the promise is rejected with the error.

### Example

Updates a given `TestType` record

    var _id = '56f4c52120eb8b5dee4898fd';

    var propsToUpdate = {
        value: 13
    };
    
    v.update('TestType', _id, propsToUpdate)
        .then((result) => {
            console.log(JSON.stringify(result, null, 2));
        });

## <a id="viq-upsert"></a> VIQ.upsert

The `upsert` method either creates or updates a record in the database depending
if the record already exists.  The method tests for existence by looking at the
natural keys defined on the type.

### Signature

    var promise = v.upsert(type, object)

### Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
type | String | Yes | The data type to upsert
object | Object | Yes | The object to upsert

### Returns

The `upsert` method returns a promise that resolves to the object just inserted
or created.  Upon any failure, the promise is rejected with the error.

### Example

Inserts an object of type `TestType`.

    var objToUpsert = {
        key: 'SomeKey',
        value: 42
    };
    
    v.upsert('TestType', objToUpsert)
        .then((result) => {
            console.log(JSON.stringify(result, null, 2));
        });

## <a id="viq-delete"></a> VIQ.delete

The `delete` method removes records from the system for a given type.  Deletes always
require a constraint indicating which records to remove.

### Signature

    var promise = v.delete(type, where)

### Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
type | String | Yes | The data type to query
where | Object | Yes | Specifies which records to remove.

The `where` is an object with supported operations defined in [API operations](https://dev.vantiq.com/docs/api/developer.html#api-operations).

### Returns

The `remove` method returns a promise that resolves when the removal succeeded.  
Upon any failure, the promise is rejected with the error.

### Example

Removes the record with the given key.

    v.delete('TestType', { key: 'SomeKey' })
        .then((result) => {
            console.log("Removed record with 'SomeKey' key.");
        });

Removes all records of `TestType` with a `value` greater than 10.

    v.delete('TestType', { value: { $gt: 10 }})
        .then((result) => {
            console.log("Removed all records with value > 10");
        });

## <a id="viq-publish"></a> VIQ.publish

The `publish` method publishes a message onto a given topic.  Messages published
onto topics can trigger rules to facilitate identifying situations.

Topics are slash-delimited strings, such as '/test/topic'.  Vantiq system-defined
topics begin with `/type`, `/property`, `/system`, and `/source`.

### Signature

    var promise = v.publish(topic, message)

### Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
topic | String | Yes | The topic on which to publish.
message | Object | Yes | The message to publish

### Returns

The `publish` method returns a promise that resolves when the message
has been published successfully.  Upon any failure, the promise is rejected with 
the error.

### Example

    var message = {
        key:   'AnotherKey',
        ts:    new Date().toISOString(),
        value: 13
    };
    
    v.publish('/test/topic', message)
        .then((result) => {
            console.log("Published message successfully.");
        });

## <a id="viq-execute"></a> VIQ.execute

The `execute` method executes a procedure on the VantIQ server.  Procedures can
take parameters (i.e. arguments) and produce a result.

### Signature

    var promise = v.execute(procedure, params)

### Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
topic | String | Yes | The topic on which to publish.
params | Object | No | An object that holds the parameters.

The parameters may be provided as an array where the arguments are given in order.
Alternatively, the parameters may be provided as an object where the arguments
are named.

### Returns

The `execute` method returns a promise that resolves to the returned value from
the procedure.  Upon any failure, the promise is rejected with the error.

### Example

Executes an `sum` procedure that takes `arg1` and `arg2` arguments and returns the total using positional arguments.

    v.execute('sum', [ 1, 2 ])
        .then((result) => {
            console.log("The sum of 1 + 2 = " + result.total);
        });

Using named arguments.

    v.execute('sum', { arg1: 1, arg2: 2 })
        .then((result) => {
            console.log("The sum of 1 + 2 = " + result.total);
        });
