//
// Tests the underlying VantiqSession support
//
var VantiqSession = require('../lib/session');
var nock          = require('nock');
var chai          = require('chai');
chai.use(require('chai-as-promised'));
var should        = chai.should();

//
// Test configuration
//
var SERVER_URL  = 'https://mock.vantiq.com';
var WSS_URL     = 'wss://mock.vantiq.com/api/v1/wsock/websocket';
var API_VERISON = 1;
var OPTS        = {
    server:     SERVER_URL,
    apiVersion: API_VERISON
};

var TOKEN       = '234592dadf23412';
var USERNAME    = 'joe';
var PASSWORD    = 'no-one-will-guess';

//
// Tests
//
describe('VantiqSession API', function() {

    describe('Connection and Authentication', function() {

        var v;
        beforeEach(function() {
            v = new VantiqSession(OPTS);
        });

        it('can authenticate successfully', function() {
            // Mock out response
            nock(SERVER_URL)
                .get('/authenticate')
                .reply(200, function(uri, requestBody) {
                    return { 
                        headers: this.req.headers,
                        accessToken: TOKEN
                    }
                });

            // Make call
            return v.authenticate(USERNAME, PASSWORD)
                .then((result) => {
                    v.server.should.equal(SERVER_URL);
                    v.apiVersion.should.equal(API_VERISON);
                    v.authenticated.should.equal(true);
                    v.accessToken.should.equals(TOKEN);
                    ////result.body.headers.authorization.should.equal('Basic ' + new Buffer(USERNAME+':'+PASSWORD).toString('base64'));
                });
        });

        it('can handle authentication failure', function() {
            // Mock out response
            nock(SERVER_URL)
                .get('/authenticate')
                .reply(401, [ { 
                    code: 'io.vantiq.server.error', 
                    message: 'Some Error'
                } ]);

            // Make call
            return v.authenticate(USERNAME, PASSWORD)
                .catch((err) => {
                    err.statusCode.should.equal(401);
                    err.body[0].code.should.equal('io.vantiq.server.error');
                    v.authenticated.should.equal(false);
                    should.not.exist(v.accessToken);
                });
        });

        it('can pass the token on an authenticated session', function() {
            // Mock out first authentication, then query
            nock(SERVER_URL)
                .get('/authenticate')
                .reply(200, { accessToken: TOKEN })
                .get('/api/v1/resources/types')
                .reply(200, function(uri, requestBody) {
                    return { 
                        path: this.req.path,
                        headers: this.req.headers
                    }
                });

            // Make call
            return v.authenticate(USERNAME, PASSWORD)
                .then((result) => {
                    return v.get('/resources/types')
                        .then((result) => {
                            result.body.path.should.equal('/api/v1/resources/types')
                            ////result.body.headers.authorization.should.equal('Bearer ' + TOKEN);
                            v.authenticated.should.equal(true);
                        });
                });
        });

        function authCheck(p) {
            return p
                .then((result) => { throw new Error("Unauthenticated calls should not resolve"); })
                .catch((err) => { 
                    err.message.should.equal('Not authenticated');
                });
        }

        it('VantiqSession.get can prevent unauthorized tests', function() {
            return authCheck(v.get('/resources/types'));
        });

        it('VantiqSession.put can prevent unauthorized tests', function() {
            return authCheck(v.put('/resources/types'));
        });

        it('VantiqSession.post can prevent unauthorized tests', function() {
            return authCheck(v.post('/resources/types'));
        });

        it('VantiqSession.delete can prevent unauthorized tests', function() {
            return authCheck(v.delete('/resources/types'));
        });

        it('VantiqSession.subscribe can prevent unauthorized tests', function() {
            return authCheck(v.subscribe('/resources/types'));
        });

        it('VantiqSession.upload can prevent unauthorized tests', function() {
            return authCheck(v.upload('/resources/documents', 'somefile', 'text/plain', 'somefile'));
        });

        it('VantiqSession.download can prevent unauthorized tests', function() {
            return authCheck(v.download('somefile'));
        });

    });

    describe('Request Processing', function() {

        var v;
        var n;
        var p;
        beforeEach(function() {
            n = nock(SERVER_URL)
                .get('/authenticate')
                .reply(200, { accessToken: TOKEN });
            v = new VantiqSession(OPTS);
            p = v.authenticate(USERNAME, PASSWORD);
        });

        it('can handle response with JSON body', function() {
            n.get('/api/v1/resources/types')
                .reply(200, { a: 1, b: 2 });

            return p.then(function() {
                return v.get('/resources/types')
                    .then((result) => {
                        result.body.a.should.equal(1);
                    });
            });
        });

        it('can handle response with no body', function() {
            n.get('/api/v1/resources/types')
                .reply(200);

            return p.then(function() {
                return v.get('/resources/types')
                    .then((result) => {
                        should.not.exist(result.body);
                    });
            });
        });

        it('can handle non-JSON responses', function() {
            n.get('/api/v1/resources/types')
                .reply(200, "Hello!", {
                    'content-type': 'text/plain'
                });

            return p.then(function() {
                return v.get('/resources/types')
                    .then((result) => {
                        result.body.should.equal("Hello!");
                    });
            });
        });

        it('can extract total count header', function() {
            n.get('/api/v1/resources/types')
                .reply(200, [ {x:1}, {x:2}, {x:3} ], {
                    'x-total-count': 3
                });

            return p.then(function() {
                return v.get('/resources/types')
                    .then((result) => {
                        result.count.should.equal(3);
                    });
            });
        });

    });

});