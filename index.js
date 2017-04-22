var express = require('express');
var bodyParser = require('body-parser');
var fifo = require('fifo');
var networkAddress = require('network-address');
var urlencode = require('urlencode');
var nodeCleanup = require('node-cleanup');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');

var servefile = require("./lib/servefile");
var devicelist = require('./lib/devicelist')
var WebTorrentFifo = require('./lib/webtorrent-fifo')


// DIY media cast list
var device_list = new devicelist.DeviceList();


// Torrent client
var client = WebTorrentFifo();
nodeCleanup(function(exitCode, signal) {
    client.destroy();
    setTimeout(function() { console.log("Done."); }, 3000);
});
// Init storage 
var DEFAULT_STORE_PATH = "./store/"
mkdirp(DEFAULT_STORE_PATH, function(err) {
    if (!err) {
        console.log("Clearing data store.");
        rimraf(DEFAULT_STORE_PATH + "*", function() {
            console.log("Cleared!")
        });
    } else {
        console.log("error opening directory!")
        process.exit(-1);
    }
});


// Express
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
process.setMaxListeners(0);

app.get("/status", function(req, res) {
    result = []
    for (var t in client.torrents) {
        result.push({"name": client.torrents[t].name,
                     "ready": client.torrents[t].ready});
    }
    res.json({"jobs": result, "downloadSpeed": client.downloadSpeed});
});

app.get("/refresh", function(req, res) {
        console.log("Received refresh requests")
        device_list.refresh();
        res.end("OK");
    }
);

app.get("/devices", function(req, res) {
        console.log("Received device list request.");
        res.json(device_list.devices);
        res.end();
    }
);
app.get("/devices/:device_id/stream/:torrent_link", function(req, res) {
        device_id = req.params.device_id || "";
        torrent_link = req.params.torrent_link || "";
        
        media_url = "http://" + networkAddress() + ':' + server.address().port + '/'
        media_url += "stream/" + urlencode(torrent_link);
        
        try {
            add_serve_torrent(client, torrent_link, function(torrent) {
                device_list.play(device_id, media_url);
            });
        } catch (error) {
            res.end(error.message)
        }

        res.end("OK");
});

app.get("/stream/:link", function(req, res) {
        torrent_link = req.params.link || ""
        if (torrent_link === "") {
            res.end("No link supplied");
        }

        console.log("Received stream request for torrent " + torrent_link);
        try {
            add_serve_torrent(client, torrent_link, servefile.serveLargestFile.bind(null, req, res));
        } catch (error) {
            res.end(error.message)
        }
    }
);

function add_serve_torrent(client, torrent_link, callback) { 
        torrent = client.get(torrent_link);
        // If the torrent was added before and is currently active, this will
        // return it, otherwise the torrent will be added.
        if (torrent === null) {
            console.log("Adding torrent " + torrent_link);
            try {
                torrent = client.add(torrent_link, {path: DEFAULT_STORE_PATH})
            } catch (error) {
                console.error(error);
                throw new Error("Unable to add torrent.");
            }
        }

        if (!torrent.ready) {
            throw new Error("Not ready yet!");
            console.log("Waiting for torrent to become ready");
            torrent.once('ready', function() {
                // If the request is still alive when the callback is invoked
                // serve the larget file.
                if (torrent.destroyed) {
                    throw new Error("Torrent already destroyed!");
                }
                console.log("Serving via callback");
                callback(torrent);
            });
        } else {
            // The torrent is ready - either it was added in a previous call
            // to this function, or it was added from a different flow.
            if (torrent.destroyed) {
                throw new Error("Torrent already destroyed!");
            }
            console.log("Serving normally");
            callback(torrent);
        }
}
server = app.listen(80);



