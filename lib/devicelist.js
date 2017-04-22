var inherits = require('inherits')
var shortid = require('shortid');
var dlnacasts = require('dlnacasts');
var airplayer = require('airplayer');

var vlc_tvos = require('./vlc_tvos')

function Device(name, player_cb, type) {
    this.name = name;
    this.player_cb = player_cb;
    this.type = type;
    
    this.id = shortid.generate(); 
}

Device.prototype.play = function (url) {
    this.player_cb(url);
}


function DeviceList() {
    this._devices = [];
    this._is_setup = false;
    this._setup();
}

DeviceList.prototype._add_player = function(player_name, player_cb, type) {
    device = new Device(player_name, player_cb, type);
    devices_list = this._devices
    if (device.id in devices_list) {
        console.error("Device " + device.id + " already in list!");
    } else {
        console.log("Adding device " + device.id + " to list.");
        devices_list[device.id] = device;
    }
}

DeviceList.prototype.refresh = function() {
    if (this._is_setup) {
        this._dlna_context.update();
        this._airplayer_context.update();
        this._vlc_context.update();
    } else {
        console.warning("Update called prior to setup!")
    }
} 

DeviceList.prototype.play = function(device_id, url) {
    if (!(device_id in this._devices)) {
        // Raise exception?
        console.error("Device " + device_id + " does not exist!");
        return new Error("Unknown device");
    }

    device = this._devices[device_id];
    device.play(url);
    return true;
}

Object.defineProperty(DeviceList.prototype, 'devices',  {
    get: function() {
        result = []
        for (var device in this._devices) {
            result.push({
                name: this._devices[device].name,
                type: this._devices[device].type,
                id:   this._devices[device].id
            });
        }
        return result;
    }
})

DeviceList.prototype._errorHandler = function(tag, error) {
    tag = tag || "main";
    console.error(this.constructor.name + " (" + tag + "): " + error);
}

DeviceList.prototype._setup = function() {
    if (!this._is_setup) {
        // DLNA
        this._dlna_context = dlnacasts();
        this._dlna_context.on('update', (
            function(player) {
                this._add_player(player.name, player.play.bind(player), "DLNA");
            }
        ).bind(this));
        this._dlna_context.on('error', this._errorHandler.bind(this, "DLNACtx"));

        // AirPlay
        this._airplayer_context = airplayer();
        this._airplayer_context.on('update', (
            function(player) {
                this._add_player(player.name, player.play.bind(player), "AirPlay");
            }
        ).bind(this));
        this._airplayer_context.on('error', this._errorHandler.bind(this, "AirPlayCtx"));

        // VLC - uses AirPlay library with different play function
        this._vlc_context = airplayer();
        this._vlc_context.on('update', (
            function(player) {
                this._add_player(player.name, vlc_tvos.play.bind(null, player.host), "VLC (tvOS)");
            }
        ).bind(this));
        this._vlc_context.on('error', this._errorHandler.bind(this, "VLCCtx"));
        
        this._is_setup = true;
        this.refresh();
    } else {
        console.warning(this.constructor.name + " already set up!");
    }
}

module.exports.DeviceList = DeviceList
