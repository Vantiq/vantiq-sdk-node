//
// Request class used to handle all the requests to the Vantiq
// server.
//
var fs       = require('fs');
var http     = require('http');
var https    = require('https');
var url      = require('url');

var VantiqMultipart  = require('./multipart');
var VantiqSubscriber = require('./subscriber');

function VantiqSession(opts) {
    this.server        = opts.server;
    this.apiVersion    = 1;

    if(opts.apiVersion) {
        this.apiVersion = opts.apiVersion;
    }
    
    this.authenticated = false;
    this._accessToken   = null;

    // Vantiq Subscriber used to listen to events
    this.subscriber = null;
}

VantiqSession.DEFAULT_API_VERSION = 1;

VantiqSession.prototype.isAuthenticated = function() {
    return this.authenticated;
};

VantiqSession.prototype.authenticate = function(username, password) {
    var credentials =  { username: username, password: password };
    return request(this, credentials, 'GET', '/authenticate')
        .then((resp) => {

            //
            // If access token is available, then we're authenticated
            //
            if(resp.body && resp.body.accessToken) {
                this.accessToken   = resp.body.accessToken;
                this.authenticated = true;
                return resp;
            } else {
                this.accessToken   = null;
                this.authenticated = false;
                throw new Error("Authentication failed");
            }
        });
};

Object.defineProperty(VantiqSession.prototype, "accessToken", {
    get: function() { 
        return this._accessToken; 
    },

    set: function(accessToken) { 
        this._accessToken = accessToken; 

        // If the access token is explicitly set, we assume that we are 
        // authenticated.  If not, then subsequent operations will fail.
        if(this._accessToken != null) {
            this.authenticated = true;
        }
    }
});

VantiqSession.prototype.get = function(path) {
    return request(this, null, 'GET', fullpath(this, path));
};

VantiqSession.prototype.post = function(path, body) {
    return request(this, null, 'POST', fullpath(this, path), body);
};

VantiqSession.prototype.put = function(path, body) {
    return request(this, null, 'PUT', fullpath(this, path), body);
};

VantiqSession.prototype.delete = function(path) {
    return request(this, null, 'DELETE', fullpath(this, path));
};

VantiqSession.prototype.subscribe = function(path, parameters, callback) {
    if(!this.isAuthenticated()) {
        return Promise.reject(new Error("Not authenticated"));
    }

    if(this.subscriber == null) {
        this.subscriber = new VantiqSubscriber(this);
        return this.subscriber.connect()
            .then(() => { 
                this.subscriber.subscribe(path, parameters, callback); 
            });
    } else {
        this.subscriber.subscribe(path, parameters, callback);
        return Promise.resolve();
    }
};

VantiqSession.prototype.unsubscribeAll = function() {
    if(this.subscriber != null) {
        this.subscriber.close();
        this.subscriber = null;
    }
};

VantiqSession.prototype.acknowledge = function(requestId, subscriptionName, sequenceId, partitionId) {
    var params = {};
    params["subscriptionName"] = subscriptionName;
    params["sequenceId"] = sequenceId;
    params["partitionId"] = partitionId;
    params["requestId"] = requestId;
    this.subscriber.acknowledge(params);
}

VantiqSession.prototype.upload = function(path, fileName, contentType, documentPath) {
    if(!this.isAuthenticated()) {
        return Promise.reject(new Error("Not authenticated"));
    }

    //
    // Create a multipart object to support streaming the data from the file
    //
    var mp = new VantiqMultipart(fileName, contentType, documentPath);
    return request(this, null, 'POST', fullpath(this, path), mp);
};

VantiqSession.prototype.download = function(path) {
    return request(this, null, 'GET', path, null, true);
};

//
// Private methods
//
function fullpath(session, path) {
    if(path.startsWith('/')) {
        path = path.substring(1);
    }
    return '/api/v' + session.apiVersion + '/' + path;
};

function authValue(session, credentials) {
    if(credentials) {
        session.accessToken = null;
        return 'Basic ' + (new Buffer(credentials.username + ':' + credentials.password)).toString('base64');
    } else if(session.accessToken) {
        return 'Bearer ' + session.accessToken;
    } else {
        throw new Error("Not authenticated");
    }
}

//
// Issues a request to the Vantiq server and provides
// a promise as the result.
//
function request(session, credentials, method, path, body, isRespStreaming) {
    var p = new Promise((resolve, reject) => {

        // Determine if this is streaming the body or not
        var isReqStreaming = (body instanceof VantiqMultipart);
        var contentType    = (isReqStreaming ? body.getMultipartContentType() : 'application/json');


        // Setup headers
        var urlParts = url.parse(session.server);
        var httpOpts = {
            hostname: urlParts.hostname,
            port:     urlParts.port,
            path:     path,
            method:   method,
            headers: {
                'Content-Type': contentType,
                'Authorization': authValue(session, credentials)
            }
        };

        // Based on URL, decide if HTTP or HTTPS is required
        var h;
        if(urlParts.protocol === 'http:') {
            h = http;
        } else if(urlParts.protocol === 'https:') {
            h = https;
        } else {
            throw new Error("Request protocol '" + urlParts.protocol + "' not supported");
        }

        // Issue HTTP request
        var req = h.request(httpOpts, (resp) => {

            // Prepare the result
            var result = {
                statusCode: resp.statusCode
            };

            // Look for header information (note that NodeJS downcases all header names)
            var isJSON = (resp.headers['content-type'] === 'application/json');
            if(resp.headers['x-total-count'] != null) {
                result.count = parseInt(resp.headers['x-total-count']);
            }

            // If the response is streamed (e.g. downloading file), then we
            // leave the response to the caller.  Otherwise, we pull the data
            // from the response and returned the parsed response.
            if(isRespStreaming) {
                result.body = resp;
                if(result.statusCode >= 400) {
                    reject(result);
                } else {
                    resolve(result);
                }
            } else {
                // Aggregate response chunks into single response string
                var respStr = '';
                resp.on('data', (chunk) => { respStr += chunk; });

                // At the end of the response, we process it
                resp.on('end', () => { 
                    if(respStr.length > 0) {
                        if(isJSON) {
                            result.body = JSON.parse(respStr);
                        } else {
                            result.body = respStr;
                        }
                    }

                    // If the status code is above 400 (i.e. 400 or 500 errors) then 
                    // trigger an error
                    if(result.statusCode >= 400) {
                        reject(result);
                    } else {
                        resolve(result);
                    }
                });

                // On an error, then simply end the processing
                resp.on('error', (e) => { reject(e); });
            }

        });

        // Send body if one was specified.
        if(body) {

            //
            // If this is streaming, then we use the FormData to
            // stream the data
            //
            if(isReqStreaming) {                
                body.upload(req)
                    .then(() => { 
                        req.end(); 
                    })
                    .catch((err) => { 
                        req.end();
                        reject(err); 
                    });
            } else {
                req.end(JSON.stringify(body));
            }
        } else {
            req.end();
        }

    })
    .then((result) => { return result; });

    return p;
};

module.exports = VantiqSession;