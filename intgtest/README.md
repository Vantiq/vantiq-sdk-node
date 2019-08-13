# Integration Tests

The tests in this folder require the Vantiq server to have a test namespace
loaded into Vantiq with a specific set of types, procedures, etc that
reside in the `project` folder.

## Vantiq Project Setup

The following project must be loaded into an existing Vantiq server.  The
[Vantiq CLI](https://dev.vantiq.com/ui/ide/index.html#/resources) may be used 
to load the artifacts into the server:

* `types/TestType.json`: A data type for testing
* `rules/onTestPublish.vail`: A rule that persists an TestType record when an event is fired on `/test/topic`
* `procedures/echo.vail`: A procedure that simply echos the input arguments
* `sources/JSONPlaceholder.json`: A source used for testing

The following CLI commands will load these into the Vantiq server:

    % vantiq -s <profile> load type      ./type/TestType.json
    % vantiq -s <profile> load ruleset   ./rule/onTestPublish.vail
    % vantiq -s <profile> load procedure ./procedure/echo.vail
    % vantiq -s <profile> load source    ./sources/JSONPlaceholder.json

Note that `<profile>` specifies the proper server and credentials to use
in `~/.vantiq/profile`.

## Run Integration Tests

Once the project has been loaded, the integration tests can be run using the
command line:

    % env SERVER=<VantiqServerUrl> AUTHTOKEN=<VantiqAccessToken> mocha intgSpec.js --exit

*   **NOTE:** If an error occurs such as: `"env: mocha: No such file or directory"`, simply place
    `` `npm bin`/ `` before `mocha`.