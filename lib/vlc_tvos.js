var WebSocket = require('simple-websocket');

module.exports.play = play

function play(ip, url)
{
    try {
        sock = new WebSocket("ws://" + ip);
    } catch (error) {
        console.error(error);
        return;
    } finally {
        sock.on('error', function() {
            console.error(error);
        });
    }
    
    sock.once('connect', function()
    {
        console.log("Dispatching play message to " + ip);
        sock.send(JSON.stringify( 
            { 
                type: "openURL",
                url: url
            }
        )); 
    });
    
    // Assuming sock object will be cleaned up by GC. 
    // Also assuming that we can't be late to receive the connect event (async JS??)
}
