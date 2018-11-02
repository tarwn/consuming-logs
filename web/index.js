const config = require('../config');
const WebServer = require('./webServer');

const web = new WebServer(config);
web.start()
    .then(() => {
        console.log(`Web console started on http://localhost:${config.webPort}`);
    });
