//
// Vantiq SDK Unit Tests
//
var Vantiq     = require('../lib/sdk');
var nock       = require('nock');
var chai       = require('chai');
chai.use(require('chai-as-promised'));
var should     = chai.should();

//
// Test configuration
//
var SERVER_URL  = 'https://mock.vantiq.com';
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
describe('Vantiq API', function() {

    describe('Initial Connection and Authentication', function() {

        var v;
        beforeEach(function() {
            v = new Vantiq(OPTS);
        });

        it('can authenticate successfully', function() {
            // Mock out response
            nock(SERVER_URL)
                .get('/authenticate')
                .reply(200, { accessToken: TOKEN });

            // Make call
            return v.authenticate(USERNAME, PASSWORD)
                .then((result) => { result.should.equal(true); });
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
                });
        });

        function authCheck(p) {
            return p
                .then((result) => { throw new Error("Unauthenticated calls should not resolve"); })
                .catch((err) => { 
                    err.message.should.equal('Not authenticated');
                });
        }

        it('Vantiq.select can prevent unauthorized tests', function() {
            return authCheck(v.select('TestType'));
        });

        it('Vantiq.selectOne can prevent unauthorized tests', function() {
            return authCheck(v.selectOne('TestType', 'abc'));
        });

        it('Vantiq.count can prevent unauthorized tests', function() {
            return authCheck(v.count('TestType'));
        });

        it('Vantiq.insert can prevent unauthorized tests', function() {
            return authCheck(v.insert('TestType'), {});
        });

        it('Vantiq.update can prevent unauthorized tests', function() {
            return authCheck(v.update('TestType', null, {}));
        });

        it('Vantiq.upsert can prevent unauthorized tests', function() {
            return authCheck(v.upsert('TestType', {}));
        });

        it('Vantiq.delete can prevent unauthorized tests', function() {
            return authCheck(v.delete('TestType'));
        });

        it('Vantiq.deleteOne can prevent unauthorized tests', function() {
            return authCheck(v.deleteOne('TestType', 'abc'));
        });

        it('Vantiq.publish can prevent unauthorized tests', function() {
            return authCheck(v.publish('topics', '/test/topic', {}));
        });

        it('Vantiq.execute can prevent unauthorized tests', function() {
            return authCheck(v.execute('testProcedure'));
        });

        it('Vantiq.query can prevent unauthorized tests', function() {
            return authCheck(v.query('testSource'), {});
        });
    });

    describe('Miscellaneous', function() {

        it('Vantiq.SYSTEM_RESOURCES', function() {
            Vantiq.SYSTEM_RESOURCES.should.include('types');
        });

    });

    describe('Request Processing', function() {

        var v;
        var n;
        beforeEach(function() {
            n = nock(SERVER_URL)
                .get('/authenticate')
                .reply(200, { accessToken: TOKEN });
            v = new Vantiq(OPTS);
            p = v.authenticate(USERNAME, PASSWORD);
        });

        it('can perform a select query', function() {
            n.get('/api/v1/resources/MyType')
                .reply(200, [
                    { a: 1, b: 'bingo' },
                    { a: 2, b: 'jenga' }
                ]);

            return p.then(function() {
                return v.select('MyType')
                    .then((result) => {
                        result.length.should.equal(2);
                        result[1].b.should.equal('jenga');
                    });
            });
        });

        it('can perform a select query with constraints', function() {
            n.get('/api/v1/resources/MyType')
                .query({
                    props: '["_id","b"]',
                    where: '{"a":1}',
                    sort:  '{"a":-1}'
                })
                .reply(200, [
                    { a: 1, b: 'bingo' }
                ]);

            return p.then(function() {
                return v.select('MyType', [ '_id', 'b' ], { a:1 }, { a: -1 })
                    .then((result) => {
                        result.length.should.equal(1);
                        result[0].b.should.equal('bingo');
                    });
            });
        });

        it('can perform a selectOne', function() {
            n.get('/api/v1/resources/MyType/abc')
                .reply(200, { 
                    a: 1, 
                    b: 'bingo'
                });

            return p.then(function() {
                return v.selectOne('MyType', 'abc')
                    .then((result) => {
                        result.should.have.property('a', 1);
                        result.should.have.property('b', 'bingo');
                    });
            });
        });

        it('can perform a count query', function() {
            n.get('/api/v1/resources/MyType')
                .query({ 
                    props: '["_id"]',
                    count: true 
                })
                .reply(200, [
                    { a: 1, b: 'bingo' },
                    { a: 2, b: 'jenga' }
                ], {
                    'x-total-count': 2
                });

            return p.then(function() {
                return v.count('MyType')
                    .then((result) => {
                        result.should.equal(2);
                    });
            });
        });

        it('can perform a count query with constraints', function() {
            n.get('/api/v1/resources/MyType')
                .query({ 
                    count: true, 
                    props: '["_id"]',
                    where: '{"a":1}'
                })
                .reply(200, [
                    { a: 1, b: 'bingo' }
                ], {
                    'x-total-count': 1
                });

            return p.then(function() {
                return v.count('MyType', { a:1 })
                    .then((result) => {
                        result.should.equal(1);
                    });
            });
        });
        

        it('can perform an insert', function() {
            n.post('/api/v1/resources/MyType')
                .reply(200, function(url, requestBody) {
                    return {
                        request: requestBody
                    };
                });

            return p.then(function() {
                return v.insert('MyType', { a: 1, b: 'foo' })
                    .then((result) => {
                        result.request.a.should.equal(1);
                        result.request.b.should.equal('foo');
                    });
            });
        });

        it('can perform an update', function() {
            n.put('/api/v1/resources/MyType/12345')
                .reply(200, function(url, requestBody) {
                    return {
                        request: requestBody
                    };
                });

            return p.then(function() {
                return v.update('MyType', 12345, { a: 1, b: 'foo' })
                    .then((result) => {
                        result.request.a.should.equal(1);
                        result.request.b.should.equal('foo');
                    });
            });
        });

        it('can perform an upsert', function() {
            n.post('/api/v1/resources/MyType')
                .query({ upsert: true })
                .reply(200, function(url, requestBody) {
                    return {
                        request: requestBody
                    };
                });

            return p.then(function() {
                return v.upsert('MyType', { a: 1, b: 'foo' })
                    .then((result) => {
                        result.request.a.should.equal(1);
                        result.request.b.should.equal('foo');
                    });
            });
        });

        it('can perform a delete', function() {
            n.delete('/api/v1/resources/MyType')
                .query({ count: true, where: '{"a":1}' })
                .reply(204);

            return p.then(function() {
                return v.delete('MyType', { a: 1 })
                    .then((result) => {
                        result.should.equal(true);
                    });
            });
        });

        it('can perform a deleteOne', function() {
            n.delete('/api/v1/resources/MyType/abc')
                .reply(204);

            return p.then(function() {
                return v.deleteOne('MyType', 'abc')
                    .then((result) => {
                        result.should.equal(true);
                    });
            });
        });        

        it('can perform a publish on topic', function() {
            n.post('/api/v1/resources/topics//foo/bar')
                .reply(200);

            return p.then(function() {
                return v.publish('topics', '/foo/bar', { a: 1 })
                    .then((result) => {
                        result.should.equal(true);
                    });
            });
        });

        it('can perform a publish on source', function() {
            n.post('/api/v1/resources/sources/foo')
                .reply(200);

            return p.then(function() {
                return v.publish('sources', 'foo', { a: 1 })
                    .then((result) => {
                        result.should.equal(true);
                    });
            });
        });

        it('can not perform publish on other types', function() {
            return p.then(function() {
                return v.publish('types', 'foo', { a: 1 })
                    .catch((err) => {
                        err.message.should.equal('Only "sources" and "topics" support publish');
                    });
            });
        });

        it('can execute a procedure', function() {
            n.post('/api/v1/resources/procedures/adder')
                .reply(200, { total: 3 });

            return p.then(function() {
                return v.execute('adder', { arg1: 1, arg2: 2 })
                    .then((result) => {
                        result.total.should.equal(3);
                    });
            });
        });

        it('can evaluate a model', function() {
            n.post('/api/v1/resources/analyticsmodels/testModel')
                .reply(200, { score: 'good' });

            return p.then(function() {
                return v.evaluate('testModel', { arg1: 1, arg2: 2 })
                    .then((result) => {
                        result.score.should.equal('good');
                    });
            });
        });
        
        it('can query a source', function() {
            n.post('/api/v1/resources/sources/adder/query')
                .reply(200, { total: 3 });

            return p.then(function() {
                return v.query('adder', { arg1: 1, arg2: 2 })
                    .then((result) => {
                        result.total.should.equal(3);
                    });
            });
        });

        it('can issue an error if the procedure is not found', function() {
            n.post('/api/v1/resources/procedures/whoops')
                .reply(404);

            return p.then(function() {
                return v.execute('whoops', { arg1: 1, arg2: 2 })
                    .then((result) => { throw new Error("Missing procedure should not resolve"); })
                    .catch((err) => {
                        err.statusCode.should.equal(404);
                    });
            });
        });

    });


});