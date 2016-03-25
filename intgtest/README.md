# Integration Tests

The tests in this folder require the VantIQ server to have a test namespace
loaded into VantIQ with a specific set of types, procedures, etc that
reside in the `project` folder.

## VantIQ Project Setup

The following project must be loaded into an existing VantIQ server.  The
[VantIQ CLI](https://dev.vantiq.com/ui/ide/index.html#/resources) may be used 
to load the artifacts into the server:

* `type/TestType.type`: A data type for testing
* `rule/onTestPublish.rule`: A rule that persists an TestType record when an event is fired on `/test/topic`
* `procedure/echo.proc`: A procedure that simply echos the input arguments

The following CLI commands will load these into the VantIQ server:

    % vantiq -s <profile> load type      ./type/TestType.type
    % vantiq -s <profile> load ruleset   ./rule/onTestPublish.rule
    % vantiq -s <profile> load procedure ./procedure/echo.proc

Note that `<profile>` specifies the proper server and credentials to use
in `~/.vantiq/profile`.

## Run Integration Tests

Once the project has been loaded, the integration tests can be run using the
command line:

    % env SERVER=<VantIQserverUrl> USERNAME=<username> PASSWORD=<password> mocha intgSpec.js

