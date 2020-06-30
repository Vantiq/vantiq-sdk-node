//
// Subscriber class used to handle real-time subscription
// events from a Vantiq server.
//
var SockJS = require('sockjs-client');

function VantiqSubscriber(session) {
    this.session   = session;
    this.sock      = null;
    this.callbacks = {};

    this.wsauthenticated = false;
}

VantiqSubscriber.prototype.isConnected = function() {
    return this.sock != null;
};

VantiqSubscriber.prototype.handleMessage = function(m) {
    //
    // Lookup callback and issue request
    //
    var msg       = JSON.parse(m);
    var requestId = msg.headers['X-Request-Id'];
    var callback  = this.callbacks[requestId];

    if(callback != null) {
        callback(msg);
    }
};

VantiqSubscriber.prototype.connect = function() {
    return new Promise((resolve, reject) => {

        if(!this.session.isAuthenticated()) {
            throw new Error("Session must be authenticated to subscribe to Vantiq events");
        }

        //
        // WebSocket URL: http[s]://host:port/api/v<apiVersion>/wsock/websocket
        // 
        var url = 
            this.session.server.replace('httpXXX', 'ws')
            + '/api/v' + this.session.apiVersion
            + '/wsock';

        this.sock = new SockJS(url, null, { server: "websocket" });

        this.sock.onopen = () => {
            // Upon connection, we send an authentication request based on the
            // provided session access token to create an authenticated WS session.
            var auth = {
                op:           'validate',
                resourceName: 'system.credentials',
                object:       this.session.accessToken
            };
            this.sock.send(JSON.stringify(auth));
        };

        this.sock.onmessage = (e) => {
            //
            // We don't start handling subscription messages, until 
            // we have established an authenticated WS session
            //
            if(this.wsauthenticated) {
                this.handleMessage(e.data);
            } else {
                var resp = JSON.parse(e.data);
                if(resp.status === 200) {
                    this.wsauthenticated = true;
                    resolve(this);
                } else {
                    throw new Error("Error establishing authenticated WebSocket session:\n" + JSON.stringify(resp, null, 2));
                }
            }
        };

        this.sock.onclose = (e) => {
            this.sock = null;
        };

    });

};

VantiqSubscriber.prototype.subscribe = function(path, parameters, cb) {
    if(!this.isConnected()) {
        throw new Error("Must be connected to subscribe to events");
    }

    // Register callback based on path
    if(this.callbacks[path] != null) {
        throw new Error("Callback already registered for event: " + path);
    } else {
        this.callbacks[path] = cb;
    }
    var params = parameters;
    params["requestId"] = path;
    // Issue request to create the subscription
    var msg = {
        accessToken: this.session.accessToken,
        op: 'subscribe',
        resourceName: 'events',
        resourceId: path,
        parameters: params
    };
    this.sock.send(JSON.stringify(msg));
};

VantiqSubscriber.prototype.acknowledge = function (params, resource) {
    if(!this.isConnected()) {
        throw new Error("Must be connected to subscribe to events");
    }
    var path = params["requestId"];
   
    params["requestId"] = path;
    // Issue request to create the subscription
    var msg = {
        accessToken: this.session.accessToken,
        op: 'acknowledge',
        resourceName: 'events',
        resourceId: path,
        parameters: params
    };
    this.sock.send(JSON.stringify(msg));
};


VantiqSubscriber.prototype.close = function() {
    if(this.isConnected()) {
        this.sock.close();
    }
    this.sock = null;
};

module.exports = VantiqSubscriber;