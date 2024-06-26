# API Reference

The Vantiq API provide an API for interacting with the Vantiq server.  Each
API returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) that provides the results or errors from the API call.

This document defines the Vantiq Client SDK.  Please refer to the [Vantiq Reference Guides](https://dev.vantiq.com/docs/system/index.html) for details on the how to use the Vantiq system.

## Vantiq API

The Vantiq object provides the main API for the Vantiq NodeJS SDK.  This SDK follows the Vantiq REST API resources
model.

### Resources

Each of the SDK API methods corresponds to a specific REST API operation on a specific resource.  For example,
`select` performs a query against a given resource.  `select('system.types', ...)` queries against defined data types.
`select('procedures', ...)` queries against defined procedures.

The available system resources are listed in `Vantiq.SYSTEM_RESOURCES` and include the following:

Resource Name  | Type Name    | Description
-------------- | ------------ | -----------
analyticsmodels| system.analyticsmodels | Analytical models that can be imported and executed in Vantiq
configurations | system.configurations | Configurations of Vantiq resources
documents      | system.documents  | Unstructured documents stored in the Vantiq system
namespaces     | system.namespaces | Namespaces defined in the Vantiq system
nodes          | system.nodes      | Node defined in the Vantiq system to support federation
profiles       | system.profiles   | Vantiq user permission profiles
procedures     | system.procedures | Procedures defined in the Vantiq system
rules          | system.rules      | Rules defined in the Vantiq system
scalars        | ArsScalar         | User-defined property type definitions
services       | system.services   | Services defined in the Vantiq system
sources        | system.sources    | Data sources defined in the Vantiq system
topics         | system.topics     | User-defined topics in the Vantiq system
types          | system.types      | Data types defined in the Vantiq system
users          | system.users      | Vantiq user accounts
images         | system.images     | Images stored in the Vantiq system
videos         | system.videos     | Videos stored in the Vantiq system

Data types defined in the Vantiq system can also be used as resources.  For example, if you define data
type `MyNewType`, then `MyNewType` is now a legal resource name that can be used in the API methods.

### API

* [Vantiq](#vantiq)
* [Vantiq.authenticate](#-vantiqauthenticate)
* [Vantiq.accessToken](#-vantiqaccesstoken)
* [Vantiq.select](#-vantiqselect)
* [Vantiq.selectOne](#-vantiqselectone)
* [Vantiq.count](#-vantiqcount)
* [Vantiq.insert](#-vantiqinsert)
* [Vantiq.update](#-vantiqupdate)
* [Vantiq.upsert](#-vantiqupsert)
* [Vantiq.delete](#-vantiqdelete)
* [Vantiq.deleteOne](#-vantiqdeleteone)
* [Vantiq.publish](#-vantiqpublish)
* [Vantiq.execute](#-vantiqexecute)
* [Vantiq.query](#-vantiqquery)
* [Vantiq.subscribe](#-vantiqsubscribe)
* [Vantiq.upload](#-vantiqupload)
* [Vantiq.download](#-vantiqdownload)
* [Vantiq.unsubscribeAll](#-vantiqunsubscribeall)
* [Vantiq.acknowledge](#-vantiqacknowledge)

### Error

* [Error](#error)

## <a id="vantiq"></a> Vantiq

The `Vantiq` constructor creates a new instance of the `Vantiq` SDK object.
The SDK expects that the first operation is to authenticate onto the
specified Vantiq server.  After successfully authenticated, the client
is free to issue any requests to the Vantiq server.

This class exposes the [Vantiq REST API](https://dev.vantiq.com/docs/system/api/index.html).  The `Vantiq` class is provided by the `vantiq-sdk` NPM module.

### Signature

    var vantiq = new Vantiq(options)

### Option Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
server | String | Yes | The Vantiq server URL to connect to, e.g. `https://dev.vantiq.com`
apiVersion | Integer | No | The version of the API to use.  Defaults to the latest.

### Returns

An instance of the `Vantiq` object

### Example

    var Vantiq = require('vantiq-sdk');
    
    var vantiq = new Vantiq({ server: 'https://dev.vantiq.com' });

## <a id="vantiq-authenticate"></a> Vantiq.authenticate

The `authenticate` method connects to the Vantiq server with the given 
authentication credentials used to authorize the user.  Upon success,
an access token is provided to the client for use in subsequent API 
calls to the Vantiq server.  The username and password credentials
are not stored.

### Signature

    var promise = vantiq.authenticate(username, password)

### Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
username | String | Yes | The username to provide access to the Vantiq server
password | String | Yes | The password to provide access to the Vantiq server

### Returns

The `authenticate` method returns a promise that resolves if the authentication was successful.  Upon any failure, including invalid credentials, the promise is rejected with an [error](#error).  If the credentials are not valid, the promise rejects with an error that has a HTTP status code of *401*.

### Example

    var promise = vantiq.authenticate('joe@user', 'my-secr3t-passw0rd!#!')
                .then((result) => console.log('Authenticated!'))
                .catch((err)   => console.error(err));

## <a id="vantiq-accessToken"></a> Vantiq.accessToken

The Vantiq `accessToken` is the token returned during an `authenticate` call used
to maintain authenticated access during the subsequent invocations using this SDK.
Typically, the access token is resolved through the `authenticate` method.  However,
the token can be explicitly set if the token is already available, such as a long-lived
token issued by the Vantiq server.

### Signature

    // To retrieve the current access token
    var accessToken = vantiq.accessToken;

    // To set a new access token
    vantiq.accessToken = tokenFromServer;


## <a id="vantiq-select"></a> Vantiq.select

The `select` method issues a query to select all matching records for a given 
resource.

### Signature

    var promise = vantiq.select(resource, props, where, sort)

### Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
resource | String | Yes | The name of the resource type to query.
props| Array | No | Specifies the desired properties to be returned in each record.  An empty array or null value means all properties will be returned.
where | Object | No | Specifies constraints to filter the data.  Null means all records will be returned.
sort | Object | No | Specifies the desired sort for the result set.

The `props` is an array of property names indciating which properties should be returned.
    
The `where` is an object with supported operations defined in [API operations](https://dev.vantiq.com/docs/system/api/index.html#where-parameter).

The `sort` is an object with keys that are the properties to sort on and the 
values indicate ascending (1) or descending (-1).

### Returns

The `select` method returns a promise that resolves to the list of matching 
records.  Upon any failure, the promise is rejected with an [error](#error).

### Example

Select the `name` property for all available types.

    vantiq.select('system.types', [ 'name' ])
        .then((result) => {
            result.forEach(e => console.log(e.name);
        });

Selects all properties filtering to only return types with the `TestType` name.

    vantiq.select('system.types', [], { name: 'TestType' })
        .then((result) => {
            console.log(JSON.stringify(result[0], null, 2));
        });

Selects all records for the `TestType` type returning only the `key` and `value` properties and sorting the results by the `key` in descending order.

    vantiq.select('TestType', [ 'key', 'value' ], {}, { key: -1 })
        .then((result) => {
            console.log(JSON.stringify(result[0], null, 2));
        });

## <a id="vantiq-selectOne"></a> Vantiq.selectOne

The `selectOne` method issues a query to return the single record identified 
by the given identifier.

### Signature

    var promise = vantiq.selectOne(resouce, id)

### Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
resource | String | Yes | The resource to query
id   | String | Yes | The unique identifier for the record ("_id" for user defined Types)

### Returns

The `selectOne` method returns a promise that resolves to the matching
record or null if the record does not exist.  Upon any failure, the
promise is rejected with an [error](#error).

### Example

Select the `TestType` definition from the `types` resource.

    vantiq.selectOne('system.types', 'TestType')
        .then((result) => {
            console.log(JSON.stringify(result, null, 2));
        });

Selects a `TestType` record with `_id` equal to `23425231ad31f`.

    vantiq.selectOne('TestType', '23425231ad31f')
        .then((result) => {
            console.log(JSON.stringify(result, null, 2));
        });

## <a id="vantiq-count"></a> Vantiq.count

The `count` method is similar to the `select` method except it returns only the
number of records rather than returning the records themselves.

### Signature

    var promise = vantiq.count(resource, where)

### Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
resource | String | Yes | The name of the resource to query
where | Object | No | Specifies constraints to filter the data.  Null means all records will be returned.

The `where` is an object with supported operations defined in [API operations](https://dev.vantiq.com/docs/system/api/index.html#where-parameter).

### Returns

The `count` method returns a promise that resolves to the number of matching 
records.  Upon any failure, the promise is rejected with an [error](#error).

### Example

Counts the number of `TestType` records.

    vantiq.count('TestType')
        .then((result) => {
            console.log("TestType has " + result + " records");
        });

Counts the number of `TestType` with a `value` greater than 10.

    vantiq.count('TestType', { value: { $gt: 10 }})
        .then((result) => {
            console.log("TestType has " + result + " records with value > 10");
        });

## <a id="vantiq-insert"></a> Vantiq.insert

The `insert` method creates a new record of a given resource.

### Signature

    var promise = vantiq.insert(resource, object)

### Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
resource | String | Yes | The name of the resource to insert
object | Object | Yes | The object to insert

### Returns

The `insert` method returns a promise that resolves to the object just inserted.  
Upon any failure, the promise is rejected with an [error](#error).

### Example

Inserts an object of type `TestType`.

    var objToInsert = {
        key: 'SomeKey',
        value: 42
    };
    
    vantiq.insert('TestType', objToInsert)
        .then((result) => {
            console.log(JSON.stringify(result, null, 2));
        });

## <a id="vantiq-update"></a> Vantiq.update

The `update` method updates an existing record of a given resource.  This method
supports partial updates meaning that only the properties provided are updated.
Any properties not specified are not changed in the underlying record.

### Signature

    var promise = vantiq.update(resource, id, object)

### Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
resource | String | Yes | The name of the resource to update
id   | String | Yes | The unique identifier for the record ("_id" for user defined Types)
props | Object | Yes | The properties to update in the record

### Returns

The `update` method returns a promise that resolves to the object just updated.  
Upon any failure, the promise is rejected with an [error](#error).

### Example

Updates a given `TestType` record

    var _id = '56f4c52120eb8b5dee4898fd';

    var propsToUpdate = {
        value: 13
    };
    
    vantiq.update('TestType', _id, propsToUpdate)
        .then((result) => {
            console.log(JSON.stringify(result, null, 2));
        });

## <a id="vantiq-upsert"></a> Vantiq.upsert

The `upsert` method either creates or updates a record in the database depending
if the record already exists.  The method tests for existence by looking at the
natural keys defined on the resource.

### Signature

    var promise = vantiq.upsert(resource, object)

### Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
resource | String | Yes | The name of the resource to upsert
object | Object | Yes | The object to upsert

### Returns

The `upsert` method returns a promise that resolves to the object just inserted
or created.  Upon any failure, the promise is rejected with an [error](#error).

### Example

Inserts an object of type `TestType`.

    var objToUpsert = {
        key: 'SomeKey',
        value: 42
    };
    
    vantiq.upsert('TestType', objToUpsert)
        .then((result) => {
            console.log(JSON.stringify(result, null, 2));
        });

## <a id="vantiq-delete"></a> Vantiq.delete

The `delete` method removes records from the system for a given resource.  Deletes always
require a constraint indicating which records to remove.

### Signature

    var promise = vantiq.delete(resource, where)

### Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
resource | String | Yes | The name of the resource to remove
where | Object | Yes | Specifies which records to remove

The `where` is an object with supported operations defined in [API operations](https://dev.vantiq.com/docs/system/api/index.html#where-parameter).

### Returns

The `remove` method returns a promise that resolves when the removal succeeded.  
Upon any failure, the promise is rejected with an [error](#error).

### Example

Removes the record with the given key.

    vantiq.delete('TestType', { key: 'SomeKey' })
        .then((result) => {
            console.log("Removed record with 'SomeKey' key.");
        });

Removes all records of `TestType` with a `value` greater than 10.

    vantiq.delete('TestType', { value: { $gt: 10 }})
        .then((result) => {
            console.log("Removed all records with value > 10");
        });

## <a id="vantiq-selectOne"></a> Vantiq.deleteOne

The `deleteOne` method removes a single record specified by the given identifier.

### Signature

    var promise = vantiq.deleteOne(resource, id)

### Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
resource | String | Yes | The name of the resource to remove
id   | String | Yes | The id for the given record

### Returns

The `deleteOne` method returns a promise that resolves to `true` if the record was removed
or `false` if no record was found.  Upon any failure, the promise is rejected with an 
[error](#error).

### Example

Removes the `TestType` definition from the `types` resource.

    vantiq.deleteOne('system.types', 'TestType')
        .then((result) => {
            if(result) {
                console.log("Delete succeeded.");
            }
        });

Removes the `TestType` record with `_id` equal to `23425231ad31f`.

    vantiq.deleteOne('TestType', '23425231ad31f')
        .then((result) => {
            if(result) {
                console.log("Delete succeeded.");
            }
        });

## <a id="vantiq-publish"></a> Vantiq.publish

The `publish` method supports publishing to a topic or a source.

Publishing a message to a given topic allows for rules to be defined
that trigger based on the publish event.  Topics are slash-delimited strings, 
such as '/test/topic'.  Vantiq reserves  `/type`, `/property`, `/system`, and 
`/source` as system topic namespaces and should not be published to.  The 
`payload` is the message to be sent.

Calling `publish` on a source performs a publish (asynchronous call) on the
specified source.  The `payload` is the parameters required to issue the
publish operation on the source.

### Signature

    var promise = vantiq.publish(resource, id, payload)

### Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
resource | String | Yes | The resource to publish.  Must be 'services', 'topics', or 'sources'.
id       | String | Yes | The id for the specific resource to use.  An example topic is '/test/topic'.  An example source is 'mqttChannel'. An example service event type is '/testService/inboundTestEvent' (the service and event name in the form '<serviceName>/<eventName>').
payload  | Object | Yes | For topics, the payload is the message to send.  For sources, this is the parameters for the source.

For sources, the parameters required are source specific and are the same as those required
when performing a `PUBLISH ... TO SOURCE ... USING params`.  Please refer to the specific source definition
documentation in the [Vantiq API Documentation](https://dev.vantiq.com/docs/system/api/index.html).

### Returns

Since the `publish` operation is an asynchronous action, the returned value is a boolean indicating if the 
`publish` occurred successfully.  Upon any failure, the promise is rejected with 
an [error](#error).

### Example

Send a message onto the `/test/topic` topic.

    var message = {
        key:   'AnotherKey',
        ts:    new Date().toISOString(),
        value: 13
    };
    
    vantiq.publish('topics', '/test/topic', message)
        .then((result) => {
            console.log("Published message successfully.");
        });

Send a message to a SMS source `mySMSSource`.

    var params = {
        body: "Nice message to the user",
        to: "+16505551212"
    };

    vantiq.publish('sources', 'mySMSSource', params)
        .then((result) => {
            console.log("Published message successfully.");
        });


## <a id="vantiq-execute"></a> Vantiq.execute

The `execute` method executes a procedure on the Vantiq server.  Procedures can
take parameters (i.e. arguments) and produce a result.

### Signature

    var promise = vantiq.execute(procedure, params)

### Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
procedure | String | Yes | The name of the procedure to execute
params | Object | No | An object that holds the parameters

The parameters may be provided as an array where the arguments are given in order.
Alternatively, the parameters may be provided as an object where the arguments
are named.

### Returns

The `execute` method returns a promise that resolves to the returned value from
the procedure.  Upon any failure, the promise is rejected with an [error](#error).

### Example

Executes an `sum` procedure that takes `arg1` and `arg2` arguments and returns the total using positional arguments.

    vantiq.execute('sum', [ 1, 2 ])
        .then((result) => {
            console.log("The sum of 1 + 2 = " + result.total);
        });

Using named arguments.

    vantiq.execute('sum', { arg1: 1, arg2: 2 })
        .then((result) => {
            console.log("The sum of 1 + 2 = " + result.total);
        });


## <a id="vantiq-query"></a> Vantiq.query

The `query` method performs a query (synchronous call) on the specified source.  The query can
take parameters (i.e. arguments) and produce a result.

### Signature

    var promise = vantiq.query(source, params)

### Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
source | String | Yes | The source to perform the query
params | Object | No | An object that holds the parameters

The parameters required are source specific and are the same as those required
when performing a `SELECT ... FROM SOURCE ... WITH params`.  Please refer to the specific source definition
documentation in the [Vantiq API Documentation](https://dev.vantiq.com/docs/system/api/index.html).

### Returns

The `query` method returns a promise that resolves to the returned value from the source.  
Upon any failure, the promise is rejected with an [error](#error).

### Example

Query a REST source `adder` that returns the total of the given parameters.

    var params = {
        path: '/api/adder',
        method: 'POST',
        contentType: 'application/json',
        body: {
            arg1: 1,
            arg2: 2
        }
    };

    vantiq.query('sum', params)
        .then((result) => {
            console.log("The sum of 1 + 2 = " + result.total);
        });

## <a id="vantiq-subscribe"></a> Vantiq.subscribe

The `subscribe` method creates a WebSocket to the Vantiq server and listens for specified events.  The provided
callback is executed whenever a matching event occurs.

### Signature

    var promise = vantiq.subscribe(resource, name, [operation,] callback)

### Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
resource | String | Yes | The resource event to subscribe.  Must be one of 'services' or 'topics' or 'sources' or 'types'.
name     | String | Yes | The resource name that identifies the specific resource event.  For services, this is the service and event name in the form '<serviceName>/<eventName>' (e.g. '/testService/testEvent'). For topics, this is the topic name (e.g. '/my/topic/').  For sources, this is the source name.  For types, this is the data type name.
operation| String | No  | This only applies for 'types' and specifies the operation to listen to (e.g. 'insert', 'update', or 'delete')
callback | Function| Yes | This is the callback that executes whenever a matching event occurs.  The signiature is: `callback(message)`.
params   | Map | No | Map specifying extra details about the subscription to the server. (eg: {persistent:true} to create a persistent subscription, {persistent:true: subscriptionName: 'mySub', requestId: requestId} to reconnect to a broken persistent subscription)

The `message` that is provided when an event occurs contains the following:

Name | Type | Description
:--: | :--: | -----------
status | int | The HTTP status code associated with the message, usually 100.
contentType | String | The content type for the body of the message.  Typically, this is `application/json`.
headers | Object | The headers associated with the event.  The `X-Request-Id` header will be based on the resource path for the event.
body | Object | The content of the event.

The structure of the body of the event is:

Name | Type | Description
:--: | :--: | -----------
path | String | The full event path
value | Object | The payload of the event.

### Returns

The `subscribe` method returns a promise that resolves when the subscription has successfully connected.
Upon any failure, the promise is rejected with an [error](#error).

### Example

Create a subscription to the `/test/topic` topic that prints out when events are published to the topic.

    function callback(message) {
        console.log("Received message at " + new Date());
        console.log("Event Payload = " + JSON.stringify(message.body.value, null, 2));
    }

    vantiq.subscribe('topics', '/test/topic', callback)
        .then(() => {
            console.log("Subscription succeeded.");
        });

Create a subscription to the `MySource` source that prints out when messages arrive at the source.

    function callback(message) {
        console.log("Received message at " + new Date());
        console.log("Source Message = " + JSON.stringify(message.body.value, null, 2));
    }

    vantiq.subscribe('sources', 'MySource', callback)
        .then(() => {
            console.log("Subscription succeeded.");
        });

Create a subscription to the `MyDataType` type for that prints out when that type has been updated.

    function callback(message) {
        console.log("Received message at " + new Date());
        console.log("Updated Value = " + JSON.stringify(message.body.value, null, 2));
    }

    vantiq.subscribe('types', 'MyDataType', 'update', callback)
        .then(() => {
            console.log("Subscription succeeded.");
        });
See [Vantiq.acknowledge](#vantiq-acknowledge) section for how to make a persistent subscription to a reliable resource
## <a id="vantiq-unsubscribeAll"></a> Vantiq.unsubscribeAll

The `unsubscribeAll` method removes all active subscriptions to the Vantiq server by
closing the WebSocket.

### Signature

    void vantiq.unsubscribeAll()

### Parameters

N/A

### Returns

N/A

### Example

    vantiq.unsubscribeAll();


## <a id="vantiq-upload"></a> Vantiq.upload

The `upload` method performs a upload of a file into an `ArsDocument` resource.

### Signature

    var promise = vantiq.upload(file, contentType, documentPath)

### Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
file | File | Yes | The full path to the file to be uploaded
contentType | String | Yes | The MIME type of the uploaded file (e.g. "image/jpeg")
String | documentPath | Yes | The "path" of the ArsDocument in Vantiq (e.g. "assets/myDocument.txt")
String | resourcePath | No | The "path" of the Vantiq resource that the file will be uploaded to (e.g. "/resources/documents", "/resources/images/", or "/resources/videos")

### Returns

The `upload` method returns a promiise that resolves to the `ArsDocument` object containing 
information about the uploaded file.  In particular, the response will contain:

Name | Type | Description
:--: | :--: | -----------
name | String | The document path (e.g. "assets/myDocument.txt")
fileType | String | The MIME type of the uploaded file (e.g. "image/jpeg")
content | String | This provides the URI path to download the content.  This is used in the [download](#vantiq-download) method.

### Example

The following uploads a text file and prints out the resulting `ArsDocument`:

    var file = '/path/to/file/myFile.txt';
    vantiq.upload(file, 'text/plain', 'assets/myFile.txt')
        .then((result) => {
            console.log(JSON.stringify(result, null, 2));
        });
        
The following example uploads an image and prints out the resulting `ArsImage`:
    
    var file = '/path/to/file/myImage.png';
    vantiq.upload(file, 'image/png', 'assets/myImage.png', '/resources/images')
        .then((result) => {
            console.log(JSON.stringify(result, null, 2));
        });

## <a id="vantiq-download"></a> Vantiq.download

The `download` method pulls down the content of the specified file that was previously 
uploaded.  The result is streamed to the client.

### Signature

    var promise = vantiq.download(path)

### Parameters

Name | Type | Required | Description
:--: | :--: | :------:| -----------
path | String | Yes | This is the path of the file and is specified in the `content` field in the `ArsDocument` associated with the file in Vantiq.

### Returns

The `download` returns a promise that resolves to the HTTP response object that implements
the `Readable` stream API.

### Example

Downloads the file and prints the contents to the console:

    vantiq.download('/docs/assets/myFile.txt')
        .then((resp) => {
            console.log('Content-Type: ' + resp.headers['content-type']);
            resp.on('data', (chunk) => { console.log(chunk.toString()); });
            resp.on('error',  (err) => { console.error(err); });
        });

Downloads the file and streams the contents to a newly created file:

    vantiq.download('/docs/assets/myFile.txt')
        .then((resp) => {
            var writer = fs.createWriteStream('myFile.txt');
            resp.pipe(writer);
        });


# <a id="error"></a> Error

The REST API provides both an HTTP status code and an error object which is returned through the SDK when an error is encountered.  The SDK returns errors in the following form:

    {
        statusCode: <HTTPStatusCode>,
        body: [
            {
                code: <ErrorIdentifier>,
                message: <ErrorMessage>,
                params: [ <ErrorParameter>, ... ]
            },
            ...
        ]
    }

### Parameters

Name | Type | Description
:--: | :--: | -----------
statusCode | Number | The [HTTP status code](http://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml) in the response.
body | Array\<Object\> | The array of all errors that occurred during the SDK REST call.
body.code | String | The Vantiq error id (e.g. _"io.vantiq.authentication.failed"_)
body.message | String | The human readable message associated with the error
body.params | Array\<Object\> | An array of arguments associated with the error

### Example

To catch if the user was not authorized using the HTTP status code.

    vantiq.authenticate('joe@user', 'my-secr3t-passw0rd!#!')
            .catch((err)   => {
                if(err.statusCode == 401) {
                    console.log('User not authorized');
                } else {
                    console.error(err)
                }
            });

To catch if a select against an unknown type.

    vantiq.select('BadType')
            .catch((err)   => {
                if(err.code === 'com.accessg2.ag2rs.type.not.found') {
                    console.log('Invalid type: ' + err.params[0]);
                } else {
                    console.error(err)
                }
            });

## <a id="vantiq-acknowledge"></a> Vantiq.acknowledge

The `acknowledge` method is used to acknowledge the receipt of messages from reliable resources after creating a persistent subscription.
 The provided callback is executed whenever a matching event occurs.

### Signature

```java
void vantiq.acknowledge(subscriptionName, requestId, msg)
```

### Parameters
Name | Type | Required | Description
:--: | :--: |:--: | -----------
subscriptionName | String | Yes | The name of the subscription that uniquely identifies the persistent subscription. This was returned by the server on creation of the persistent subscription. 
requestId | String | Yes |  The id of the requestId that that uniquely identifies the websocket requests made by this subscription. This was returned by the server on creation of the persistent subscription. 
msg | Object | Yes |   The message in the event being acknowledged. This is the body of the SubscriptionMessage
  

### Returns

N/A

### Example



Create a persistent subscription  to the `/test/topic` reliable topic that acknowledges when events are published to the topic.
```
v.subscribe('topics', '/reliableTopic',  {persistent: true}, (r) => {
                //Server response with subscription information (not a topic event)
                if (r.body.subscriptionName !== undefined) {
                    subscriptionName = r.body.subscriptionName;
                } else {
                    //message.body is an event on the subscribed topic. Acknowledge that we received the event
                    vantiq.acknowledge(subscriptionName, "/topics/reliableTopic", resp.body);
                }
  
```
Create a subscription to the `MySource` reliable source that prints out when messages arrive at the source.
```
v.subscribe('sources', 'myReliableSource',  {persistent: true}, (r) => {
                //Server response with subscription information (not a topic event)
                if (r.body.subscriptionName !== undefined) {
                    subscriptionName = r.body.subscriptionName;
                } else {
                    //message.body is an event on the subscribed topic. Acknowledge that we received the event
                    vantiq.acknowledge(subscriptionName, "/topics/reliableTopic/ack", resp.body);
                }
```
To reconnect to a severed persistent subscription.
```
v.subscribe('topics', '/reliableTopic',  {persistent: true, subscriptionName: subscriptionName, requestId: '/topics/reliableTopic'}, (r) => {
    //Server response with subscription information (not a topic event)
    if (r.body.subscriptionName !== undefined) {
        subscriptionName = r.body.subscriptionName;
    } else {
        //message.body is an event on the subscribed topic. Acknowledge that we received the event
        vantiq.acknowledge(subscriptionName, "/topics/reliableTopic/ack", resp.body);
    }
```
