//
// Subscriber class used to handle real-time subscription
// events from a Vantiq server.
//
var WebSocketClient = require('websocket').client;

function VantiqSubscriber(session) {
    this.session   = session;
    this.wsclient  = new WebSocketClient();
    this.wsconn    = null;
    this.callbacks = {};

    this.wsauthenticated = false;
}

VantiqSubscriber.prototype.isConnected = function() {
    return (this.wsconn != null && this.wsconn.connected);
};

VantiqSubscriber.prototype.handleMessage = function(m) {

    //
    // Parse message to determine which callback to call.
    //
    var msg = null;
    if(m.type === 'binary') {
        msg = JSON.parse(m.binaryData.toString('utf8'));
    } else if(m.type === 'utf8') {
        msg = JSON.parse(m.utf8Data);
    }

    //
    // Lookup callback and issue request
    //
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
        // WebSocket URL: ws[s]://host:port/api/v<apiVersion>/wsock/websocket
        // 
        var url = 
            this.session.server.replace('http', 'ws')
            + '/api/v' + this.session.apiVersion
            + '/wsock/websocket';

        this.wsclient.connect(url);

        this.wsclient.on('connectFailed', (err) => {
            reject(err);
        });

        this.wsclient.on('connect', (conn) => {
            this.wsconn = conn;

            this.wsconn.on('error', (err) => {
                throw new Error("Error in WebSocket connection: " + err);
            });

            //
            // We don't start handling subscription messages, until 
            // we have established an authenticated WS session
            //
            this.wsconn.on('message', (m) => {
                if(this.wsauthenticated) {
                    this.handleMessage(m);
                } else {
                    var resp = null;
                    if(m.type === 'utf8') {
                        resp = JSON.parse(m.utf8Data);
                    } else {
                        resp = JSON.parse(m.binaryData.toString('utf8'));
                    }
                    if(resp.status === 200) {
                        this.wsauthenticated = true;
                        resolve(this);
                    } else {
                        throw new Error("Error establishing authenticated WebSocket session:\n" + JSON.stringify(resp, null, 2));
                    }
                }
            });

            this.wsconn.on('close', () => {
                // Nothing to do
            });

            // Upon connection, we send an authentication request based on the
            // provided session access token to create an authenticated WS session.
            var auth = {
                op:           'validate',
                resourceName: 'users',
                object:       this.session.accessToken
            };
            this.wsconn.sendUTF(JSON.stringify(auth));
        });

    });

};

VantiqSubscriber.prototype.subscribe = function(path, cb) {
    if(!this.isConnected()) {
        throw new Error("Must be connected to subscribe to events");
    }

    // Register callback based on path
    if(this.callbacks[path] != null) {
        throw new Error("Callback already registered for event: " + path);
    } else {
        this.callbacks[path] = cb;
    }

    // Issue request to create the subscription
    var msg = {
        accessToken: this.session.accessToken,
        op: 'subscribe',
        resourceName: 'events',
        resourceId: path,
        parameters: {
            requestId: path
        }
    };
    this.wsconn.sendUTF(JSON.stringify(msg));
};

VantiqSubscriber.prototype.close = function() {
    if(this.isConnected()) {
        this.wsconn.close();
    }
    this.wsconn = null;
};

module.exports = VantiqSubscriber;