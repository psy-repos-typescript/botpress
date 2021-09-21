## Runtime

The runtime has the following properties:

- Module support is disabled
- Some methods of the SDK are not available (nothing can be used to change the bot while in this mode)
- Almost all backend routes are disabled

### Methods removed from the SDK of actions/hooks

These methods are not available when running as a runtime.

http.createShortLink
http.deleteShortLink
http.createRouterForBot
http.deleteRouterForBot
events.registerMiddleware
events.removeMiddleware
dialog.getConditions
config.getModuleConfig
config.getModuleConfigForBot
config.mergeBotConfig
bots.exportBot
bots.importBot
bots.listBotRevisions
bots.createBotRevision
bots.rollbackBotToRevision
cms.deleteContentElements
cms.createOrUpdateContentElement
cms.saveFile
ghost.[forBot|forGlobal|forBots].upsertFile
ghost.[forBot|forGlobal|forBots].renameFile
ghost.[forBot|forGlobal|forBots].deleteFile

### Start BP with multiple runtimes

This mode will spin the normal Botpress server, but will send incoming events to a subprocess (a runtime). It will spin smaller runtimes which will handle everything related to the events/dialog/action processing/hooks/etc. It uses the lite SDK, and if there's a problem, they restart quickly.

```js
RUNTIME_COUNT = 3 // Will start the main server and spin 3 small instance for the runtime
```

### Start Botpress as a minimal runtime (semi-support for modules)

In this mode, there must be a "full" server running on the host. The internal password of both must match. When the `CORE_PORT` is defined, any call to `getAxiosConfigForBot` will be redirected to the core (so custom modules / misunderstood / etc can still work properly).

Also, events emitted for analytics (in process.BOTPRESS_EVENTS) are also transferred from the runtime to the core.

```js
CORE_PORT=3000
INTERNAL_PASSWORD=abc123
MESSAGING_ENDPOINT=http://localhost:3100
```

### Start Botpress as a minimal runtime standalone

The messaging endpoint is the only requirement in this mode. A server started this way can be contacted using converse.

```js
MESSAGING_ENDPOINT=http://localhost:3100
```
