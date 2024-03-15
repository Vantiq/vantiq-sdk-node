<div style="height: 50px"><img style="float:right" alt="Vantiq Logo" src="http://vantiq.com/wp-content/themes/vantiq/assets/vantiq2019/header/vantiqlogo-blue-2x.png"/></div>

[![Build Status](https://travis-ci.org/Vantiq/vantiq-sdk-node.svg?branch=master)](https://travis-ci.org/Vantiq/vantiq-sdk-node)

# Vantiq Node.JS SDK

The [Vantiq](http://www.vantiq.com) NodeJS SDK is JavaScript library that provides an API into a Vantiq system for NodeJS applications.  The SDK connects to a Vantiq system using the [Vantiq REST API](https://dev.vantiq.com/docs/system/api/index.html).

## Installation

The SDK is available as an [NPM](https://www.npmjs.com/) module.  To install, use:

    % npm install vantiq-sdk

## Quick Start

You will need valid credentials on a Vantiq server.  This can be in the form of a username and password OR an access token created in the Modelo UI for the server (under Administer menu -> Advanced -> Access Tokens).  An access token is required for use with a cloud server or OAuth-enabled server.  An access token OR the username/password option will work with a local or edge Vantiq server.

The first step is to create an instance of the Vantiq SDK providing the URL of the Vantiq server to connect:

    var Vantiq = require('vantiq-sdk');
    
    var vantiq = new Vantiq({ 
        server:     'https://dev.vantiq.com',
        apiVersion: 1
    });

where `<server>` is the full URL for the Vantiq server to connect to, such as *https://dev.vantiq.com/* and `apiVersion` is the version of the API to use.  If not specified, this defaults to the latest version, currently *1*.  At this point, the *Vantiq* instance has not yet connected to the server.

If you have an access token for your Vantiq server, just set `vantiq.accessToken` to the token's value:

    vantiq.accessToken = "<token value>";

Once you have done that, you are able to perform SDK calls like the `select()` shown below.

To establish a connection to the server using a username and password, use the `authenticate` method:

    var promise = vantiq.authenticate(<username>, <password>);
    promise.then((result) => {
        console.log('Connected!');
    });

The `username` and `password` are the same credentials used to log into the system.  Note the username and password are not stored either in-memory or persistently after this authentication call.  After successfully authenticating with the system, the *Vantiq* instance stores in-memory an access token that subsequent API calls will use.  

Now, you are able to perform any SDK calls to the Vantiq server.  For example, the following prints out the list of types that have been defined:

    var promise = vantiq.select('system.types');
    promise.then((resultSet) => {
        resultSet.forEach(entry => console.log(entry));
    });


## Documentation

For the full documentation on the SDK, see the [SDK API Reference](./docs/api.md).

## Examples

For examples of working applications that use the SDK, see the [examples folder](./examples/).

## Copyright and License

Copyright &copy; 2024 Vantiq, Inc.  Code released under the [MIT license](./LICENSE).
