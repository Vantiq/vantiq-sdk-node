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
    'analyticsmodels'
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
// Issue a query request on a specific resource
//
Vantiq.prototype.select = function(resource, props, where, sort) {
    var path = '/resources/' + resource;
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
    var path = '/resources/' + resource + '/' + id;
    return this.session.get(path)
        .then((result) => {
            return result.body;
        });
};

//
// Issue a query request for a given resource but returns only the count
//
Vantiq.prototype.count = function(resource, where) {
    var path = '/resources/' + resource + '?count=true';
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
    var path = '/resources/' + resource;
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
    var path = '/resources/' + resource + "/" + key;
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
    var path = '/resources/' + resource + "?upsert=true";

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
    var path = '/resources/' + resource + "?count=true&where=" + encodeURIComponent(JSON.stringify(where));
    return this.session.delete(path)
        .then((result) => {
            return (result.statusCode == 204);
        });
};

//
// Deletes a single resource record.
//
Vantiq.prototype.deleteOne = function(resource, id) {
    var path = '/resources/' + resource + '/' + id
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

module.exports = Vantiq;