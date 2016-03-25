//
// Integration Tests for NodeJS VantIQ SDK
//
// Note: Please read README.md to understand project pre-requisites
//       for this test.
//
// Assumes the following are set as environment variables for 
// this test:
//
//   SERVER:   VantIQ server URL (e.g. http://localhost:8080)
//   USERNAME: VantIQ username for the namespace with project artifacts
//   PASSWORD: VantIQ password
//
// E.g.
//
// % env SERVER=... USERNAME=... PASSWORD=... mocha intgSpec.js
//

var VIQ        = require('../lib/sdk');
var chai       = require('chai');
chai.use(require('chai-as-promised'));
chai.use(require('chai-things'));
var should     = chai.should();

var SERVER   = process.env.SERVER;
var USERNAME = process.env.USERNAME;
var PASSWORD = process.env.PASSWORD;

if(!SERVER || !USERNAME || !PASSWORD) {
    if(!SERVER)   console.error("VantIQ server URL not specified in SERVER environment variable");
    if(!USERNAME) console.error("VantIQ username not specified in USERNAME environment variable");
    if(!PASSWORD) console.error("VantIQ password not specified in PASSWORD environment variable");
    process.exit(1);
}

//
// Tests
//
describe('VantIQ SDK Integration Tests', function() {

    var v;
    before(function() {
        v = new VIQ({ server: SERVER, apiVersion: 1 });
        return v.authenticate(USERNAME, PASSWORD);
    });

    it('can select data with no constraints', function() {
        return v.select('types')
            .then((result) => {
                result.should.include.one.with.property('name', 'TestType');
            });
    });

    it('can select data with constraints', function() {
        return v.select('types', [ '_id', 'name' ], { name: 'TestType' })
            .then((result) => {
                result.length.should.equal(1);
                result[0].should.have.property('name', 'TestType');
            });
    });

    it('can select data with sorting', function() {
        return v.select('types', [ '_id', 'name' ], {}, { name: -1 })
            .then((result) => {
                result[0].name.localeCompare(result[1].name).should.equal(1);
            });
    });

    it('can count data with no constraints', function() {
        var count = 0;
        // Select types
        return v.select('types', [ '_id' ])
            .then((result) => {
                // Remember size of data set and run count
                count = result.length;
                return v.count('types');
            })
            .then((result) => {
                // Ensure count matches initial select
                result.should.equal(count);
            });
    });

    it('can count data with constraints', function() {
        return v.count('types', { name: 'TestType' })
            .then((result) => {
                result.should.equal(1);
            });
    });

    it('can insert and update a record', function() {
        var id = 'IU-' + (new Date()).getTime().toString();
        var record = {
            id: id,
            ts: (new Date()).toISOString(),
            x: 3.14159,
            k: 42,
            o: { a:1, b:2 }
        };

        // Insert record
        return v.insert('TestType', record)
            .then((result) => {
                // Select record back
                return v.select('TestType', [], { id: id });
            })
            .then((result) => {
                // Ensure record was inserted
                result.length.should.equal(1)
                result[0].should.have.property('k', 42);

                // Pull internal id
                var _id = result[0]._id;

                // Update record
                return v.update('TestType', _id, { k: 13 });
            })
            .then((result) => {
                // Select record again
                return v.select('TestType', [], { id: id });
            })
            .then((result) => {
                // Ensure data was updated property
                result[0].should.have.property('k', 13);
                result[0].o.should.have.property('a', 1);
            });
    });

    it('can upsert a record (insert) then upsert (update) a record', function() {
        var id = 'UP-' + (new Date()).getTime().toString();
        var record = {
            id: id,
            ts: (new Date()).toISOString(),
            x: 3.14159,
            k: 42,
            o: { a:1, b:2 }
        };

        // Insert record
        return v.upsert('TestType', record)
            .then((result) => {
                // Select record back
                return v.select('TestType', [], { id: id });
            })
            .then((result) => {
                // Ensure record was inserted
                result.length.should.equal(1)
                result[0].should.have.property('k', 42);

                // Modify object to upsert
                var modified = result[0];
                modified.k = 13;

                // Update record
                return v.upsert('TestType', modified);
            })
            .then((result) => {
                // Select record again
                return v.select('TestType', [], { id: id });
            })
            .then((result) => {
                // Ensure data was updated property
                result[0].should.have.property('k', 13);
                result[0].o.should.have.property('a', 1);
            });
    });

    it('can delete a record', function() {
        var id = 'DL-' + (new Date()).getTime().toString();
        var record = {
            id: id,
            ts: (new Date()).toISOString(),
            x: 3.14159,
            k: 42,
            o: { a:1, b:2 }
        };

        // Insert record
        var count
        return v.insert('TestType', record)
            .then((result) => {
                // Select all records back to see how many there
                // are and that the specific one is there
                return v.select('TestType', [ '_id', 'id' ]);
            })
            .then((result) => {
                count = result.length;

                // Ensure record was inserted
                result.should.include.one.with.property('id', id);

                // Delete record
                return v.delete('TestType', { id: id });
            })
            .then((result) => {
                // Select records
                return v.select('TestType', [ '_id', 'id' ]);
            })
            .then((result) => {
                // Ensure only one record was deleted
                result.length.should.equal(count - 1);

                // Ensure the right data was deleted
                result.should.not.include.one.with.property('id', id);
            });
    });

    it('can publish to a topic', function() {
        var id = 'PB-' + (new Date()).getTime().toString();
        var message = {
            id: id,
            ts: (new Date()).toISOString(),
            x: 3.14159,
            k: 42,
            o: { a:1, b:2 }
        };

        // Insert message
        return v.publish('/test/topic', message)
            .then((result) => {
                // Rule should insert the record into a TestType
                // so select it to find the record.  However, this
                // takes some time to execute the rule, so we need
                // to give it some time.  Adding 50ms.
                return new Promise((resolve, reject) => {
                    setTimeout(() => resolve(), 50);
                })
                .then(() => {
                    return v.select('TestType', [], { id: id });
                });
            })
            .then((result) => {
                // Ensure record was inserted
                result.length.should.equal(1)
                result[0].should.have.property('k', 42);
            });

    });

    it('can execute a procedure', function() {
        return v.execute('echo', { arg1: 3.14159, arg2: 'xxx' })
            .then((result) => {
                result.should.have.property('arg1', 3.14159);
                result.should.have.property('arg2', 'xxx');
            });
    });


});