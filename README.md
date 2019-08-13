<div style="height: 50px"><img style="float:right" alt="Vantiq Logo" src="http://vantiq.com/wp-content/uploads/2015/12/vantiq.png"/></div>

[![Build Status](https://travis-ci.org/Vantiq/vantiq-sdk-node.svg?branch=master)](https://travis-ci.org/Vantiq/vantiq-sdk-node)

# Vantiq Node.JS SDK

The [Vantiq](http://www.vantiq.com) NodeJS SDK is JavaScript library that provides an API into a Vantiq system for NodeJS applications.  The SDK connects to a Vantiq system using the [Vantiq REST API](https://dev.vantiq.com/docs/system/api/index.html).

## Installation

The SDK is available as an [NPM](https://www.npmjs.com/) module.  To install, use:

    % npm install vantiq-sdk

## Quick Start

You will need valid credentials on a Vantiq server in the form of a username and password.  If you have a private Vantiq server, contact your administrator for credentials.  If you wish to use the Vantiq public cloud, contact [support@vantiq.com](mailto:support@vantiq.com).

The first step is to create an instance of the Vantiq SDK providing the URL of the Vantiq server to connect:

    var Vantiq = require('vantiq-sdk');
    
    var vantiq = new Vantiq({ 
        server:     'https://dev.vantiq.com',
        apiVersion: 1
    });

where `<server>` is the full URL for the Vantiq server to connect to, such as *https://dev.vantiq.com/* and `apiVersion` is the version of the API to use.  If not specified, this defaults to the latest version, currently *1*.  At this point, the *Vantiq* instance has not yet connected to the server.  To establish a connection to the server, use the `authenticate` method:

    var promise = vantiq.authenticate(<username>, <password>);
    promise.then((result) => {
        console.log('Connected!');
    });

The `<username>` and `password` are the same credentials used to log into the system.  Note the username and password are not stored either in-memory or persistently after this authentication call.  After successfully authenticating with the system, the *Vantiq* instance stores in-memory an access token that subsequent API calls will use.

Now, you are able to perform any SDK calls to the Vantiq server.  For example, the following prints out the list of types that have been defined:

    var promise = vantiq.select('types');
    promise.then((resultSet) => {
        resultSet.each(entry => console.log(entry));
    });

## Command Line

As an example application, this SDK provides a command line interface that exercises the SDK in an interactive way.  The CLI command is `bin/vantiq-client`.  You can install this CLI into your path by installing this module globally,

    % npm install -g vantiq-sdk
    
To use this CLI, simply run the `vantiq-client` command.  The `help` command will provide help on what can be done through the CLI:

    Vantiq NodeJS SDK v1.0.5
    > help

      Commands:

        help [command...]                                               Provides help for a given command.
        exit                                                            Exits application.
        connect <server> <username> <password>                          Connects to the specified server with the given credentials.
        connect-token <server> <accessToken>                            Connects to the specified server using the given access token.
        access-token                                                    Prints out the current access token.
        select <type> [props] [where] [sort]                            Selects data for a given type with optional constraints in JSON form
        selectOne <type> <id>                                           Selects a single record using the given id
        count <type> [where]                                            Counts the number of records for a given type with where clause in JSON
                                                                        form
        insert <type> <file>                                            Inserts one or more records into the given type using the given JSON file
        update <type> <key> <file>                                      Updates the given record identified by the key for the given type using
                                                                        the given JSON file
        upsert <type> <file>                                            Inserts or updates the given record for the given type using the given
                                                                        JSON file
        delete <type> <where>                                           Deletes one or more records identified by the given constraint
        deleteOne <type> <id>                                           Deletes a single record with the given id
        publish <topic> <file>                                          Publishes a message in the given file onto the given topic
        execute <procedure> [params]                                    Executes the named procedure with optional arguments in JSON form
        evaluate <analyticsModel> [params]                              Evaluates the named analytics model with input parameters as a JSON object
        query <source> [params]                                         Queries the named source with the given parameters in JSON form
        subscribe <resource> <name> [operation]                         Subscribe to events listening in real-time
        unsubscribe                                                     Unsubscribes to all events and closes the WebSocket
        upload <filePath> [documentPath] [contentType] [resourcePath]   Uploads the given file. If no documentPath is given, the base filename is
                                                                        used. If no contentType is given, it is determined via node-mime. If no
                                                                        resourcePath is given, file will be uploaded as VANTIQ Document.
        download <contentPath> [filePath]                               Download the given file. If no filePath is specified, the file is printed
                                                                        to the console.

## Documentation

For the full documentation on the SDK, see the [SDK API Reference](./docs/api.md).

## Examples

For examples of working applications that use the SDK, see the [examples folder](./examples/).

## Copyright and License

Copyright &copy; 2016 Vantiq, Inc.  Code released under the [MIT license](./LICENSE).
