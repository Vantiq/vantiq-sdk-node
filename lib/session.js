//
// Request class used to handle all the requests to the VantIQ
// server.
//
var http  = require('http');
var https = require('https');
var url   = require('url');

function VIQSession(opts) {
    this.server        = opts.server;
    this.apiVersion    = 1;

    if(opts.apiVersion) {
        this.apiVersion = opts.apiVersion;
    }
    
    this.authenticated = false;
    this.accessToken   = null;
}

VIQSession.DEFAULT_API_VERSION = 1;

VIQSession.prototype.isAuthenticated = function() {
    return this.authenticated;
};

VIQSession.prototype.authenticate = function(username, password) {
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

VIQSession.prototype.get = function(path) {
    return request(this, null, 'GET', fullpath(this, path));
};

VIQSession.prototype.post = function(path, body) {
    return request(this, null, 'POST', fullpath(this, path), body);
};

VIQSession.prototype.put = function(path, body) {
    return request(this, null, 'PUT', fullpath(this, path), body);
};

VIQSession.prototype.delete = function(path) {
    return request(this, null, 'DELETE', fullpath(this, path));
};

//
// Private methods
//
function fullpath(session, path) {
    return '/api/v' + session.apiVersion + path;
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
// Issues a request to the VantIQ server and provides
// a promise as the result.
//
function request(session, credentials, method, path, body) {
    var p = new Promise((resolve, reject) => {

        // Setup headers
        var urlParts = url.parse(session.server);
        var httpOpts = {
            hostname: urlParts.hostname,
            port:     urlParts.port,
            path:     path,
            method:   method,
            headers: {
                'Content-Type': 'application/json',
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

        });

        // Send body if one was specified.
        if(body) {
            req.write(JSON.stringify(body));
        }

        req.end();
    })
    .then((result) => { return result; });

    return p;
};

module.exports = VIQSession;