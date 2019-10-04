//
// Vantiq SDK Class
//
var VantiqSession = require('./session');

function Vantiq(opts) {
    this.session = new VantiqSession(opts);

}

//
// Known Resources
//
Vantiq.SYSTEM_RESOURCES = [
    'users',
    'types',
    'namespaces',
    'profiles',
    'scalars',
    'documents',
    'sources',
    'topics',
    'rules',
    'nodes',
    'procedures',
    'analyticsmodels',
    'configurations',
    'images',
    'videos'
];

Vantiq.prototype.isAuthenticated = function() {
    return this.session.isAuthenticated();
};

//
// Issue an authentication request to the server and we
// expect to get an access token, if successful.
//
Vantiq.prototype.authenticate = function(username, password) {    
    return this.session.authenticate(username, password)
        .then((result) => { return true; });
};

//
// Explicitly set the access token that will be used by 
// subsequent operations.  The access token may originate 
// from a previous "authenticate" invocation or be a 
// long-lived token issued by a Vantiq server.
//
Object.defineProperty(Vantiq.prototype, "accessToken", {
    get: function()            { return this.session.accessToken; },
    set: function(accessToken) { this.session.accessToken = accessToken; }
});

Vantiq.prototype.buildPath = function(qualifiedName, id) {
    var path;
    
    if (qualifiedName.startsWith("system."))
    {
        var systemResourceName = qualifiedName.substring(7);

        path = "/resources/" + systemResourceName;
    }
    else
    {
        path = "/resources/custom/" + qualifiedName;
    }

    if (id != null)
    {
        path += "/" + id;
    }

    return path;
};

//
// Issue a query request on a specific resource
//
Vantiq.prototype.select = function(resource, props, where, sort) {
    var path = this.buildPath(resource,null);
    var join = '?';
    if(props) {
        path += join + 'props=' + encodeURIComponent(JSON.stringify(props));
        join = '&';
    }
    if(where) {
        path += join + 'where=' + encodeURIComponent(JSON.stringify(where));
        join = '&';
    }
    if(sort) {
        path += join + 'sort=' + encodeURIComponent(JSON.stringify(sort));
    }

    return this.session.get(path)
        .then((result) => {
            return result.body;
        });
};

//
// Issue a query request for a specific resource
//
Vantiq.prototype.selectOne = function(resource, id) {
    var path = this.buildPath(resource,id);
    return this.session.get(path)
        .then((result) => {
            return result.body;
        });
};

//
// Issue a query request for a given resource but returns only the count
//
Vantiq.prototype.count = function(resource, where) {
    var path = this.buildPath(resource,null) + '?count=true';
    if(where) {
        path += '&where=' + encodeURIComponent(JSON.stringify(where));
    }

    // Since we are only returning the count, we restrict
    // the query to just the IDs to minimize the data transmitted.
    path += '&props=' + encodeURIComponent(JSON.stringify([ '_id' ]));

    return this.session.get(path)
        .then((result) => {
            return result.count;
        });
};

//
// Insert a new resource record
//
Vantiq.prototype.insert = function(resource, object) {
    var path = this.buildPath(resource,null);
    return this.session.post(path, object)
        .then((result) => {
            if(Array.isArray(result.body)) {
                if(result.body.length == 0) {
                    return null;
                } else {
                    return result.body[0];
                }
            } else {
                return result.body;
            }
        });
};

//
// Update a resource that exists in the system
//
Vantiq.prototype.update = function(resource, key, object) {
    var path = this.buildPath(resource,key);
    return this.session.put(path, object)
        .then((result) => {
            if(Array.isArray(result.body)) {
                if(result.body.length == 0) {
                    return null;
                } else {
                    return result.body[0];
                }
            } else {
                return result.body;
            }
        });
};

//
// Upsert a resource.  If the resource already exists (as
// defined by a natural key), then update it.  Otherwise,
// insert a new record.
//
Vantiq.prototype.upsert = function(resource, object) {
    var path = this.buildPath(resource,null) + "?upsert=true";

    // Due to MongoDB issue, if the "_id" is present, then MongoDB
    // thinks the _id is being changed.  As such, we remove the 
    // "_id" field if found.  This works if the resource has a natural
    // key defined.  If not, then likely updates are not desired.  If
    // an update is really desired, then the 'update' method should
    // be used.
    delete object._id;

    return this.session.post(path, object)
        .then((result) => {
            if(Array.isArray(result.body)) {
                if(result.body.length == 0) {
                    return null;
                } else {
                    return result.body[0];
                }
            } else {
                return result.body;
            }
        });
};

//
// Deletes a number of resource records that match the
// given where clause.
//
Vantiq.prototype.delete = function(resource, where) {
    var path = this.buildPath(resource,null) + "?count=true&where=" + encodeURIComponent(JSON.stringify(where));
    return this.session.delete(path)
        .then((result) => {
            return (result.statusCode == 204);
        });
};

//
// Deletes a single resource record.
//
Vantiq.prototype.deleteOne = function(resource, id) {
    var path = this.buildPath(resource,id);
    return this.session.delete(path)
        .then((result) => {
            return (result.statusCode == 204);
        });
};

//
// Publish onto a topic or a source
//
Vantiq.prototype.publish = function(resource, id, payload) {

    // Only sources and topics support the publish operation
    if(resource != 'sources' && resource != 'topics') {
        return Promise.reject(new Error('Only "sources" and "topics" support publish'));
    }

    var path = '/resources/' + resource + '/' + id;
    return this.session.post(path, payload)
        .then((result) => {
            return (result.statusCode == 200);
        })
        .catch((err) => {
            if(err.statusCode == 404 && resource == 'topics' && !id.startsWith('/')) {
                throw new Error("Illegal topic name.  Topic names must begin with a slash '/'.");
            } else {
                throw err;
            }
        });
};

//
// Execute a specific procedure
//
Vantiq.prototype.execute = function(procedure, params) {
    var path = '/resources/procedures/' + procedure;
    return this.session.post(path, params)
        .then((result) => {
            return result.body;
        });
};

//
// Evaluate a specific analytics model
//
Vantiq.prototype.evaluate = function(modelName, params) {
    var path = '/resources/analyticsmodels/' + modelName;
    return this.session.post(path, params)
        .then((result) => {
            return result.body;
        });
};

//
// Query a specific source
//
Vantiq.prototype.query = function(source, params) {
    var path = '/resources/sources/' + source + '/query';
    return this.session.post(path, params)
        .then((result) => {
            return result.body;
        });
};

//
// Subscribe to a specific event.  The supported event types are:
//
//  topics:  Simple "PUBLISH" events.  Path is the topic (e.g. "/foo/bar")
//  sources: Source events.  Path is the source name
//  types:   Data Type events.  Path is the name and operation (e.g. "/MyType/insert")
// 
Vantiq.prototype.subscribe = function(resource, name, parameters, callback) {
    var path;
    switch(resource) {
    case 'sources':
        path = '/' + resource + '/' + name;
        if (callback === undefined) {
            callback = parameters;
            parameters = {};
        }
        break;
        case 'topics':
        if(parameters !== undefined && !parameters instanceof Object) {
            return Promise.reject(new Error('Operation only supported for "types"'));
        }
        path = '/' + resource + name;
        if (callback === undefined) {
            callback = parameters;
            parameters = {};
        }
        break;
    case 'types':
        if(parameters === undefined || !parameters instanceof  String) {
            return Promise.reject(new Error('Operation required for "types"'));
        }
        if(parameters !== 'insert' &&
            parameters !== 'update' &&
            parameters !== 'delete') {
            return Promise.reject(new Error('Operation must be "insert", "update" or "delete"'));            
        }
        path = '/types/' + name + '/' + parameters;
        parameters = {};
        break;
    default:
        return Promise.reject(new Error('Only "topics", "sources" and "types" support subscribe'));
    }
    
    return this.session.subscribe(path, parameters, callback);
};

Vantiq.prototype.acknowledge = function(subscriptionId, requestId, event) {
    var sequenceId = event["sequenceId"];
    var partitionId = event["partitionId"];
    this.session.acknowledge(requestId, subscriptionId, sequenceId, partitionId);
}


//
// Unsubscribes to all events.
// 
Vantiq.prototype.unsubscribeAll = function() {
    return this.session.unsubscribeAll();
};

//
// Upload a file
//
Vantiq.prototype.upload = function(fileName, contentType, documentPath, resourcePath) {
    //
    // Ensure that the session is valid before perfoming a potentially costly/long
    // upload
    //
    return this.session.get('_status')
        .then(() => {
            if (typeof resourcePath === "string") {
                return this.session.upload(resourcePath, fileName, contentType, documentPath);
            } else {
                return this.session.upload('/resources/documents', fileName, contentType, documentPath);
            }
        })
        .then((result) => {
            return result.body;
        });
};

//
// Download a file
//
Vantiq.prototype.download = function(path) {
    return this.session.download(path)
        .then((result) => {
            return result.body;
        });
};

module.exports = Vantiq;