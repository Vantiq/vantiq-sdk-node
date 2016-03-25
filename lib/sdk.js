//
// VantIQ SDK Class
//
var VIQSession = require('./session');

function VIQ(opts) {
    this.session = new VIQSession(opts);

}

//
// Known Types
//
VIQ.SYSTEM_TYPES = [
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
    'procedures'
];

VIQ.prototype.isAuthenticated = function() {
    return this.session.isAuthenticated();
};

//
// Issue an authentication request to the server and we
// expect to get an access token, if successful.
//
VIQ.prototype.authenticate = function(username, password) {    
    return this.session.authenticate(username, password)
        .then((result) => { return true; });
};

//
// Issue a query request on a specific type
//
VIQ.prototype.select = function(type, props, where, sort) {
    var path = '/resources/' + type;
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
// Issue a query request for a given type but returns only the count
//
VIQ.prototype.count = function(type, where) {
    var path = '/resources/' + type + '?count=true';
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
// Insert data into the system
//
VIQ.prototype.insert = function(type, object) {
    var path = '/resources/' + type;
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
// Update data into the system
//
VIQ.prototype.update = function(type, key, object) {
    var path = '/resources/' + type + "/" + key;
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
// Upsert data into the system
//
VIQ.prototype.upsert = function(type, object) {
    var path = '/resources/' + type + "?upsert=true";

    // Due to MongoDB issue, if the "_id" is present, then MongoDB
    // thinks the _id is being changed.  As such, we remove the 
    // "_id" field if found.  This works if the type has a natural
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
// Deletes data from the system
//
VIQ.prototype.delete = function(type, where) {
    var path = '/resources/' + type + "?count=true&where=" + encodeURIComponent(JSON.stringify(where));
    return this.session.delete(path)
        .then((result) => {
            return (result.statusCode == 204);
        });
};

//
// Publish message onto topic
//
VIQ.prototype.publish = function(topic, message) {
    var path = '/resources/topics/' + topic;
    return this.session.post(path, message)
        .then((result) => {
            return (result.statusCode == 200);
        })
        .catch((err) => {
            if(err.statusCode == 404 && !topic.startsWith('/')) {
                throw new Error("Illegal topic name.  Topic names must begin with a slash '/'.");
            } else {
                throw err;
            }
        });
};

//
// Execute a specific function
//
VIQ.prototype.execute = function(procedure, params) {
    var path = '/resources/procedures/' + procedure;
    return this.session.post(path, params)
        .then((result) => {
            return result.body;
        });
};

module.exports = VIQ;