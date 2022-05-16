//
// Vantiq SDK Unit Tests
//
var Vantiq     = require('../lib/sdk');
var path       = require('path');
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

        it('Vantiq.subscribe can prevent unauthorized tests', function() {
            return authCheck(v.subscribe('topics', '/test/topic', () => {}));
        });

        it('Vantiq.upload can prevent unauthorized tests', function() {
            return authCheck(v.upload('file', 'text/plain', 'docPath'));
        });

        it("Vantiq.upload (images) can prevent unauthorized tests", function() {
            return authCheck((v.upload('file', 'image/jpeg', 'docPath', '/resources/images')))
        });

        it("Vantiq.upload (videos) can prevent unauthorized tests", function() {
            return authCheck((v.upload('file', 'video/mp4', 'docPath', '/resources/videos')))
        });

        it('Vantiq.download can prevent unauthorized tests', function() {
            return authCheck(v.download('path'));
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
            n.get('/api/v1/resources/custom/MyType')
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
            n.get('/api/v1/resources/custom/MyType')
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
            n.get('/api/v1/resources/custom/MyType/abc')
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
            n.get('/api/v1/resources/custom/MyType')
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
            n.get('/api/v1/resources/custom/MyType')
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
            n.post('/api/v1/resources/custom/MyType')
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
            n.put('/api/v1/resources/custom/MyType/12345')
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
            n.post('/api/v1/resources/custom/MyType')
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
            n.delete('/api/v1/resources/custom/MyType')
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
            n.delete('/api/v1/resources/custom/MyType/abc')
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
                        err.message.should.equal("Only 'sources', 'services' and 'topics' support publish");
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

        it('can not perform subscribe on other resources', function() {
            return p.then(function() {
                return v.subscribe('procedures', 'foo', () => {})
                    .catch((err) => {
                        err.message.should.equal('Only "topics", "sources" and "types" support subscribe');
                    });
            });
        });

        it('can ensure subscribe on sources do not have operations', function() {
            return p.then(function() {
                return v.subscribe('sources', 'foo', 'dummyop', () => {})
                    .catch((err) => {
                        err.message.should.equal('Operation only supported for "types"');
                    });
            });
        });

        it('can ensure subscribe on topics do not have operations', function() {
            return p.then(function() {
                return v.subscribe('topics', 'foo', 'dummyop', () => {})
                    .catch((err) => {
                        err.message.should.equal('Operation only supported for "types"');
                    });
            });
        });

        it('can ensure subscribe on types have operations', function() {
            return p.then(function() {
                return v.subscribe('types', 'foo', () => {})
                    .catch((err) => {
                        err.message.should.equal('Operation required for "types"');
                    });
            });
        });
        it('can ensure subscribe on types have valid operations', function() {
            return p.then(function() {
                return v.subscribe('types', 'foo', 'dummyOp2', () => {})
                    .catch((err) => {
                        err.message.should.equal('Operation must be "insert", "update" or "delete"');
                    });
            });
        });
        it('can detect an invalid session on upload', function() {
            n.get('/api/v1/_status').reply(401);

            return p.then(function() {
                return v.upload('testFile.txt', 'text/plain', 'assets/testFile.txt')
                    .catch((err) => {
                        err.statusCode.should.equal(401);
                    });
            });
        });

        it('can detect an invalid session on upload image', function() {
            n.get('/api/v1/_status').reply(401);

            return p.then(function() {
                return v.upload('testImage.jpg', 'image/jpeg', 'assets/testImage.jpg', '/resources/images')
                    .catch((err) => {
                        err.statusCode.should.equal(401);
                    });
            });
        });

        it('can detect an invalid session on upload video', function() {
            n.get('/api/v1/_status').reply(401);

            return p.then(function() {
                return v.upload('testVideo.mp4', 'video/mp4', 'assets/testVideo.mp4',  '/resources/videos')
                    .catch((err) => {
                        err.statusCode.should.equal(401);
                    });
            });
        });

        it('can upload a file', function() {
            var uploadRequest;
            n.get('/api/v1/_status').reply(200)
                .post('/api/v1/resources/documents')
                    .reply(200, function(uri, body) {
                        uploadRequest = this.req;
                        return {
                            name: 'assets/testFile.txt',
                            contentType: 'text/plain',
                            content: '/docs/assets/testFile.txt'
                        };
                    });

            var testPath = path.dirname(this.test.file) + '/resources/testFile.txt';
            var testFile = path.basename(testPath);
            var testDocPath = 'assets/' + testFile;

            return p.then(function() {
                return v.upload(testPath, 'text/plain', testDocPath)
                    .then((result) => {
                        // Verify request
                        uploadRequest.path.should.equal('/api/v1/resources/documents');
                        ////uploadRequest.headers['content-type'].should.match(/^multipart\/form-data; boundary=/);

                        // Verify result
                        result.name.should.equal('assets/testFile.txt');
                        result.contentType.should.equal('text/plain');
                        result.content.should.equal('/docs/assets/testFile.txt');
                    });
            });
        });

        it('can upload a jpeg image', function() {
            var uploadRequest;
            n.get('/api/v1/_status').reply(200)
                .post('/api/v1/resources/images')
                .reply(200, function(uri, body) {
                    uploadRequest = this.req;
                    return {
                        name: 'assets/testImage.jpg',
                        contentType: 'image/jpeg',
                        content: '/pics/assets/testImage.jpg'
                    };
                });

            var testPath = path.dirname(this.test.file) + '/resources/testImage.jpg';
            var testFile = path.basename(testPath);
            var testDocPath = 'assets/' + testFile;

            return p.then(function() {
                return v.upload(testPath, 'image/jpeg', testDocPath, "/resources/images")
                    .then((result) => {
                        // Verify request
                        uploadRequest.path.should.equal('/api/v1/resources/images');

                        // Verify result
                        result.name.should.equal('assets/testImage.jpg');
                        result.contentType.should.equal('image/jpeg');
                        result.content.should.equal('/pics/assets/testImage.jpg');
                    });
            });
        });

        it('can upload a png image', function() {
            var uploadRequest;
            n.get('/api/v1/_status').reply(200)
                .post('/api/v1/resources/images')
                .reply(200, function(uri, body) {
                    uploadRequest = this.req;
                    return {
                        name: 'assets/testImage.png',
                        contentType: 'image/png',
                        content: '/pics/assets/testImage.png'
                    };
                });

            var testPath = path.dirname(this.test.file) + '/resources/testImage.png';
            var testFile = path.basename(testPath);
            var testDocPath = 'assets/' + testFile;

            return p.then(function() {
                return v.upload(testPath, 'image/png', testDocPath, "/resources/images")
                    .then((result) => {
                        // Verify request
                        uploadRequest.path.should.equal('/api/v1/resources/images');

                        // Verify result
                        result.name.should.equal('assets/testImage.png');
                        result.contentType.should.equal('image/png');
                        result.content.should.equal('/pics/assets/testImage.png');
                    });
            });
        });

        it('can upload a video', function() {
            var uploadRequest;
            n.get('/api/v1/_status').reply(200)
                .post('/api/v1/resources/videos')
                .reply(200, function(uri, body) {
                    uploadRequest = this.req;
                    return {
                        name: 'assets/testVideo.mp4',
                        contentType: 'video/mp4',
                        content: '/vids/assets/testVideo.mp4'
                    };
                });

            var testPath = path.dirname(this.test.file) + '/resources/testVideo.mp4';
            var testFile = path.basename(testPath);
            var testDocPath = 'assets/' + testFile;

            return p.then(function() {
                return v.upload(testPath, 'video/mp4', testDocPath, "/resources/videos")
                    .then((result) => {
                        // Verify request
                        uploadRequest.path.should.equal('/api/v1/resources/videos');

                        // Verify result
                        result.name.should.equal('assets/testVideo.mp4');
                        result.contentType.should.equal('video/mp4');
                        result.content.should.equal('/vids/assets/testVideo.mp4');
                    });
            });
        });

    });

});