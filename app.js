//
// Let's Chat
//

'use strict';

var _ = require('lodash'),
    fs = require('fs'),
    colors = require('colors'),
    express = require('express.io'),
    expressMiddleware = require('express.io-middleware'),
    http = require('http'),
    nunjucks = require('nunjucks'),
    mongoose = require('mongoose'),
    MongoStore = require('connect-mongo')(express),
    all = require('require-tree');

var psjon = require('./package.json'),
    settings = require('./app/config.js');

var auth = require('./app/auth/index'),
    models = all('./app/models'),
    middlewares = all('./app/middlewares'),
    controllers = all('./app/controllers'),
    core = require('./app/core/index');

//
// Express.io Setup
//
var app;
if (settings.server.https) {
     app = express().https({
        key: fs.readFileSync(settings.server.https.key),
        cert: fs.readFileSync(settings.server.https.cert)
    }).io();
} else {
    app = express().http().io();
}
expressMiddleware(app);

// Session
var sessionStore = new MongoStore({
    url: settings.database.uri,
    auto_reconnect: true
});

// Session
var session = {
    key: 'connect.sid',
    secret: settings.secrets.cookie,
    store: sessionStore
};

app.use(express.cookieParser());
app.use(express.session(session));

auth.setup(app, session);

// Public
app.use('/media', express.static(__dirname + '/media'));

// Templates
nunjucks.configure('templates', {
    autoescape: true,
    express: app
});

// HTTP Middlewares
app.use(express.json());
app.use(express.urlencoded());

//
// Controllers
//
_.each(controllers, function(controller) {
    controller.apply({
        app: app,
        core: core,
        settings: settings,
        middlewares: middlewares,
        models: models,
        controllers: controllers
    });
});

//
// Mongo
//

mongoose.connection.on('error', function (err) {
    throw new Error(err);
});

mongoose.connection.on('disconnected', function() {
    throw new Error('Could not connect to database');
});

//
// Go Time
//
mongoose.connect(settings.database.uri, function(err) {
    if (err) throw err;
    //
    // HTTPS / HTTP
    //
    if (settings.server.https) {
        // Create an HTTP -> HTTPS redirect server
        var redirectServer = express(),
            port = settings.server.https.port || 5001;
        redirectServer.get('*', function(req, res) {
            res.redirect('https://' + req.host + ':' + port + req.path)
        });
        http.createServer(redirectServer).listen(settings.server.port || 5000);
        app.listen(port);
    } else {
        app.listen(settings.server.port || 5000);
    }
    //
    // XMPP
    //
    if (settings.xmpp.enable) {
        var xmpp = require('./app/xmpp/index');
        xmpp(core);
    }
});

var art = fs.readFileSync('./app/misc/art.txt', 'utf8');
console.log('\n' + art + '\n\n' + 'Release ' + psjon.version.yellow + '\n');
