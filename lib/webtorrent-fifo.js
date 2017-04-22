var WebTorrent = require('webtorrent');
var inherits = require('inherits');
var rimraf = require('rimraf');

var DEFAULT_MAX_TORRENTS = 1;

inherits(WebTorrentFifo, WebTorrent);
function WebTorrentFifo(opts) { 
    if (!(this instanceof WebTorrentFifo)) return new WebTorrentFifo(opts)
    WebTorrent.call(this, opts);

    if (!opts) opts = {};
    this.maxConcurrentTorrents = opts.maxConcurrentTorrents || DEFAULT_MAX_TORRENTS;
}

WebTorrentFifo.prototype.add = function(torrentId, opts, ontorrent) {
    // If torrent is new, check list for room.
    if (this.get(torrentId) === null) {
        if (this.torrents.length >= this.maxConcurrentTorrents) {
            console.log("Reached maximum torrents, removing oldest torrent " + this.torrents[0].magnetURI);
            this.remove(this.torrents[0].magnetURI);
        }
    }
    return WebTorrentFifo.super_.prototype.add.call(this, torrentId, opts, ontorrent);
}

WebTorrentFifo.prototype.remove = function(torrentId, cb) {
    // Override default remove to delete files from torrent.
    // Get path
    var torrent = this.get(torrentId);
    var path = null;
    if (torrent) {
        var path = torrent.path;
    }
    // Destroy torrent normally
    WebTorrentFifo.super_.prototype.remove.call(this, torrentId, cb);
    // Delete path if possible. TODO: restrict paths so this can't be used to delete random files 
    // when running as root
    console.log("Deleting all files under " + path);
    if (path) {
        rimraf(path, function(err) { 
            console.log("Deleted file, result " + err);
        });
    }
}

WebTorrentFifo.prototype.destroy = function(cb) {
    to_remove = []
    for (var torrent in this.torrents) {
        console.log("Listing torrent...");
        to_remove.push(this.torrents[torrent].magnetURI);
    }
    for (var target in to_remove) {
        console.log("Cleaning torrent...");
        this.remove(to_remove[target]);
    }
    return WebTorrentFifo.super_.prototype.destroy.call(this, cb);
}
module.exports = WebTorrentFifo;

