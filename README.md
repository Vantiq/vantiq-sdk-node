<div style="height: 50px"><img style="float:right" alt="VantIQ Logo" src="http://vantiq.com/wp-content/uploads/2015/12/vantiq.png"/></div>

[![Build Status](https://travis-ci.com/Vantiq/vantiq-sdk-node.svg?token=jUrpVsQpcEipBxV7WZED&branch=master)](https://travis-ci.com/Vantiq/vantiq-sdk-node)

# VantIQ Node.JS SDK

The [VantIQ](http://www.vantiq.com) NodeJS SDK is a [NodeJS](http://nodejs.org) module written in JavaScript that provides an API into a VantIQ system.  The VantIQ system may be in the cloud or deployed in an organizations internal or [IoT](http://en.wikipedia.org/wiki/Internet_of_Things) environment.  The SDK connects to the VantIQ servers using the [VantIQ REST API](https://dev.vantiq.com/docs/api/developer.html#api-reference-guide).

## Installation

To install, use *npm*:

    % npm install vantiq-sdk

## Quick Start

You will need valid credentials on a VantIQ server in the form of a username and password.

The first step is to create an instance of the VantIQ SDK providing the URL of the VantIQ server to connect:

    var VIQ = require('vantiq-sdk');
    
    var v = new VIQ({ 
        server:     'https://dev.vantiq.com',
        apiVersion: 1
    });

where `<serverUrl>` is the full URL for the VantIQ server to connect to, such as *https://dev.vantiq.com/* and `apiVersion` is the version of the API to connect to.  If not specified, this defaults to the latest version, currently *1*.  At this point, the *VIQ* instance has not yet connected to the server.  To establish a connection to the server, use the `authenticate` method:

    var promise = v.authenticate(<username>, <password>);
    promise.then((result) => {
        console.log('Connected!');
    });

The `<username>` and `password` are the same credentials used to log into the system.  Note the username and password are not stored either in-memory or persistently after this authentication call.  After successfully authenticating with the system, the *VIQ* instance stores in-meomry an access token that subsequent API calls will use.

Now, you are able to perform any SDK calls to the VantIQ server.  For example, the following prints out the list of types that have been defined:

    var promise = v.select('types');
    promise.then((resultSet) => {
        resultSet.each(entry => console.log(entry));
    });

## Command Line

As an example application, this SDK provides a command line interface that exercises the SDK in an interactive way.  The CLI command is `bin/viq`.  You can install this CLI into your path by installing this module globally,

    % npm install -g vantiq-sdk
    
To use this CLI, simply run the `viq` command.  The `help` command will provide help on what can be done through the CLI:

    VantIQ NodeJS SDK v0.5.0
    > help

      Commands:

        help [command...]                       Provides help for a given command.
        exit                                    Exits application.
        connect <server> <username> <password>  Connects to the specified server with the given credentials.  If no arguments
                                                specified, looks in the CLI command line
        select <type> [where]                   Selects data for a given type with an optional constraint
        count <type> [where]                    Counts the number of records for a given type with an optional constraint
        insert <type> <file>                    Inserts one or more records into the given type using the given JSON file
        update <type> <key> <file>              Updates the given record identified by the key for the given type using the given
                                                JSON file
        upsert <type> <file>                    Inserts or updates the given record for the given type using the given JSON file
        delete <type> <where>                   Deletes one or more records identified by the given constraint
        publish <topic> <file>                  Publishes a message in the given file onto the given topic
        execute <procedure> [file]              Executes the named procedure with optional arguments contained in a JSON file

## Documentation

For the full documentation on the SDK, see the [API Reference](./docs/api.md).

## Copyright and License

Copyright &copy; 2016 VantIQ, Inc.  Code released under the [MIT license](./LICENSE).
