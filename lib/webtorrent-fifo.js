var WebTorrent = require('webtorrent');
var inherits = require('inherits');

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

module.exports = WebTorrentFifo;

