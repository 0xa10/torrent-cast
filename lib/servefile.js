var mime = require('mime');
var rangeParser = require('range-parser');
var pump = require("pump");

module.exports.serveLargestFile = serveLargestFile;
module.exports.serveFile = serveFile;

function encodeRFC5987 (str) {
  return encodeURIComponent(str)
    // Note that although RFC3986 reserves "!", RFC5987 does not,
    // so we do not need to escape it
    .replace(/['()]/g, escape) // i.e., %27 %28 %29
    .replace(/\*/g, '%2A')
    // The following are not required for percent-encoding per RFC5987,
    // so we can allow for a little better readability over the wire: |`^
    .replace(/%(?:7C|60|5E)/g, unescape)
}

function serveLargestFile(req, res, torrent) {
    if (!torrent.ready) {
        console.error("Torrent not yet ready!");
    }
    
    largest_file = torrent.files.reduce(function(a, b) {
        return a.length > b.length ? a : b
    });
    console.log("File chosen: " + largest_file.name);
    serveFile(req, res, largest_file); 
}

function serveFile(req, res, file) {
    res.statusCode = 200
    res.setHeader('Content-Type', mime.lookup(file.name))

    // Support range-requests
    res.setHeader('Accept-Ranges', 'bytes')

    // Set name of file (for "Save Page As..." dialog)
    res.setHeader(
        'Content-Disposition',
        'inline; filename*=UTF-8\'\'' + encodeRFC5987(file.name)
    )

    // Support DLNA streaming
    res.setHeader('transferMode.dlna.org', 'Streaming')
    res.setHeader(
        'contentFeatures.dlna.org',
        'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000'
    )

    // `rangeParser` returns an array of ranges, or an error code (number) if
    // there was an error parsing the range.
    var range = rangeParser(file.length, req.headers.range || '')

    if (Array.isArray(range)) {
    res.statusCode = 206 // indicates that range-request was understood

    // no support for multi-range request, just use the first range
    range = range[0]

    res.setHeader(
      'Content-Range',
      'bytes ' + range.start + '-' + range.end + '/' + file.length
    )
    res.setHeader('Content-Length', range.end - range.start + 1)
    } else {
        range = null
        res.setHeader('Content-Length', file.length)
    }

    if (req.method === 'HEAD') {
        return res.end()
    }

    pump(file.createReadStream(range), res)
}
