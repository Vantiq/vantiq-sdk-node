const express = require('express');
const bodyParser = require('body-parser');
const uuidv4 = require('uuid/v4');
var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);
var Vantiq = require('vantiq-sdk');

// Holder to contain all the different vantiq sdk instances
// This is necessary to support multiple simultaneous users
var vantiqSessions = {};
var openSocketsBySession = {};
var openSessionsBySocket = {};

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs');

/**
 * Assuming the user has already authenticated or provided an access token,
 * fetch the list of existing manager nodes in the current namespace and
 * render the list of connected catalogs
 * @param res - The response handler
 */
var getManagers = function(vantiq, sessionId, res) {
    var results = {authenticated: true, error: null, managers: [], manager: [], sessionId: sessionId};
    vantiq.select("system.nodes", [], {"ars_properties.manager": "true"}).then((nodes) => {
        results.managers = nodes;
        res.render('index', results);
    }).catch((err) => {
        // Failed to fetch manager nodes from current namespace
        console.error("Failed to select " + JSON.stringify(err));
        results.error = JSON.stringify(err);
        res.render('index', results);
    });
};

/**
 * Given a manager, get all events in that managers catalog and render the catalog view
 * This process also requires looking up all ArsEventSubscriber and ArsEventPublisher records
 * to figure out if the current namespace is already a publisher or subscriber for any existing
 * events
 * @param res
 */
var renderCatalogForManager = function(vantiq, sessionId, manager, res, error) {
    // Use SDK to fetch a list of all known event types for a manager
    // We can utilize the built-in procedure Broker.getAllEvents
    vantiq.execute("Broker.getAllEvents", {managerNode: manager.name}).then((events) => {

        // Now get all known subcriptions
        vantiq.select("ArsEventSubscriber", [], {}).then((subscribers) => {

            // Lastly get all publishers
            vantiq.select("ArsEventPublisher", [], {}).then((publishers) => {

                // Now merge the subscriber and publisher information into the event types
                for (var i = 0; i < events.length; i++) {

                    // search publishers for any that match this event
                    for (var j = 0; j < publishers.length; j++) {
                        // Match the event type name to the publisher name
                        if (publishers[j].name === events[i].name) {
                            events[i].publisher = publishers[j];
                        }
                    }

                    // do the same for subscribers
                    for (var j = 0; j < subscribers.length; j++) {
                        // Match the event type name to the subscriber name
                        if (subscribers[j].name === events[i].name) {
                            events[i].subscriber = subscribers[j];
                        }
                    }
                }

                // The results are a list of ArsEventType object representing events defined in the catalog
                res.render('catalog', {manager: manager, events: events, sessionId: sessionId, error: error});
            }).catch((err) => {
                console.log("Failed to fetch all publishers: " + JSON.stringify(err));
                res.render('catalog', {manager: manager, events: events, sessionId: sessionId, error: err});
            });
        }).catch((err) => {
            console.log("Failed to fetch all subscribers: " + JSON.stringify(err));
            res.render('catalog', {manager: manager, events: events, sessionId: sessionId, error: err});
        });
    }).catch((err) => {
        console.log("Failed to fetch all events: " + JSON.stringify(err));
        res.render('catalog', {manager: manager, events: [], sessionId: sessionId, error: err});
    });
};

var getSessionAndRedirectIfMissing = function(req, res) {
    var vantiq = vantiqSessions[req.body.sessionId];
    if (!vantiq) {
        vantiq = new Vantiq({
            server:     'http://localhost:8080',
            apiVersion: 1
        });

        vantiqSessions[req.body.sessionId] = vantiq;
        res.render('index', {authenticated: false, error: "Session was lost, please sign in again", managers: [], manager: [], sessionId: req.body.sessionId});
    } else {
        return vantiq;
    }
};

var handleEventForSession = function(sessionId) {
    // need to return a function that can be called everytime a new event arrives
    return function(event) {
        // Check if there is already an established socket
        var socket = openSocketsBySession[sessionId];
        // Only proceed if there is an open socket
        if (socket && event.status === 100) {
            console.log("OPEN SESSION!");
            socket.emit('event', event.body.value);
        }
    }
};

/**
 * Route for home page where user is not connected to VANTIQ
 */
app.get('/', function (req, res) {
    // Create a new vantiq sdk instance for this session
    // TODO: we should manage this in session/ cookie data instead of passing it back and forth in each request
    var vantiq = new Vantiq({
        server:     'http://localhost:8080',
        apiVersion: 1
    });
    // Generate a unique identifier for this session
    var sessionId = uuidv4();
    vantiqSessions[sessionId] = vantiq;
    res.render('index', {authenticated: false, error: null, managers: [], manager: [], sessionId: sessionId});
});

/**
 * Authenticate the SDK using username/ password and then get the known catalogs
 */
app.post('/credentials', function (req, res) {
    var vantiq = getSessionAndRedirectIfMissing(req,res);
    // Use sdk to authenticate
    var promise = vantiq.authenticate(req.body.username, req.body.password);
    promise.then((result) => {
        // Successfully authenticated
        getManagers(vantiq, req.body.sessionId, res);
    }).catch((err) => {
        console.log(err);
        // Authentication failed for some reason
        res.render('index', {authenticated: false, error: "Failed to authenticate with VANTIQ server", managers: [], sessionId: req.body.sessionId})
    });
});

/**
 * Update the access token used by the SDK then get the known catalogs
 */
app.post('/token', function(req, res) {
    var vantiq = getSessionAndRedirectIfMissing(req,res);
    var token = req.body.token;
    vantiq.accessToken = token;
    getManagers(vantiq, req.body.sessionId, res);
});

/**
 * After the user is authenticated and has seen a list of known catalogs, fetch the event types
 * from a single catatlog (identified by the manager namespace name)
 */
app.post('/catalog', function(req, res) {
    var vantiq = getSessionAndRedirectIfMissing(req,res);
    // The manager returned from authenticate was string encoded in the post, so parse it back into JSON
    var manager = JSON.parse(req.body.manager);
    renderCatalogForManager(vantiq, req.body.sessionId, manager, res, null);
});

/**
 * Opens a form which the user can use to register as a subscriber of the event
 */
app.post('/subscribeForm', function(req, res) {
    var vantiq = getSessionAndRedirectIfMissing(req,res);
    var event = JSON.parse(req.body.event);
    var manager = JSON.parse(req.body.manager);
    // Render the subscribe page, which includes a form to register as a subscriber
    res.render('subscribe', {event: event, manager: manager, error: null, sessionId: req.body.sessionId});
});

app.post('/subscribe', function(req, res) {
    var vantiq = getSessionAndRedirectIfMissing(req,res);
    var event = JSON.parse(req.body.event);
    var manager = JSON.parse(req.body.manager);
    var localName = req.body.localName;
    var subscriber = {
        localName: localName,
        name: event.name,
        managerNode: manager.name
    };

    // Either way, we want to go back to the catalog
    vantiq.execute("Subscriber.subscribe", subscriber).then((result) => {
        renderCatalogForManager(vantiq, req.body.sessionId, manager, res, null);
    }).catch((err) => {
        console.log(err);
        renderCatalogForManager(vantiq, req.body.sessionId, manager, res, err);
    });
});

/**
 * Similar to /subscribeForm, but for publish
 */
app.post('/publishForm', function(req, res) {
    var vantiq = getSessionAndRedirectIfMissing(req,res);
    var event = JSON.parse(req.body.event);
    var manager = JSON.parse(req.body.manager);
    // Render the subscribe page, which includes a form to register as a subscriber
    res.render('publish', {event: event, manager: manager, error: null, sessionId: req.body.sessionId});
});

app.post('/publish', function(req, res) {
    var vantiq = getSessionAndRedirectIfMissing(req,res);
    var event = JSON.parse(req.body.event);
    var manager = JSON.parse(req.body.manager);
    var localEvent = req.body.localEvent;
    var publisher = {
        localEvent: localEvent,
        name: event.name,
        managerNode: manager.name
    };

    // Either way, we want to go back to the catalog
    vantiq.execute("Publisher.addPublisher", publisher).then((result) => {
        renderCatalogForManager(vantiq, req.body.sessionId, manager, res, null);
    }).catch((err) => {
        console.log(err);
        renderCatalogForManager(vantiq, req.body.sessionId, manager, res, err);
    });
});

app.post('/liveView', function(req, res) {
    var vantiq = getSessionAndRedirectIfMissing(req,res);
    var event = JSON.parse(req.body.event);
    var manager = JSON.parse(req.body.manager);
    var subscription = event.subscriber;
    var eventPath = subscription.localName;
    // first unsubscribe, then subcribe
    vantiq.unsubscribeAll();
    vantiq.subscribe('topics', eventPath, handleEventForSession(req.body.sessionId));
    // Render the subscribe page, which includes a form to register as a subscriber
    res.render('liveView', {event: event, manager: manager, error: null, sessionId: req.body.sessionId});
});

io.on('connection', function(socket){
    console.log('Socket opened for socket: ' + socket.id);

    socket.on('register', function(msg) {
        console.log("Session registered: " + socket.id);
        console.log(msg);
        openSocketsBySession[msg.sessionId] = socket;
        openSessionsBySocket[socket.id] = msg.sessionId;
    });

    socket.on('disconnect', function() {
        var sessionId = openSessionsBySocket[socket.id];
        delete openSessionsBySocket[sessionId];
    });
});

/**
 * Boilerplate to start up the node server and have it listen on 3001
 */
// app.listen(3001, function () {
//     console.log('Example app listening on port 3001!')
// });

http.listen(3001, function(){
    console.log('listening on *:3001');
});