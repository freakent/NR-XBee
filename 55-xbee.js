/**
 * Copyright 2013 Freak Enterprises
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NR-XBee - Node-RED module to support use of XBee wireless modules
 *
 * Highly inspired by Node-RED's own serial and mqtt modules. 
 * XBee interfacing is performed using the excellent svd-xbee node.js module and inherits 
 * the same dependencies on API Mode etc (see https://github.com/jouz/svd-xbee for details).
 *
 **/

 var util = require("util");
 var events = require("events");
 var RED = require("../../red/red");
 //var XBee = require('svd-xbee').XBee;

/**
 * XBeeInNode - Provides an inbound connection to an XBEE network through an XBee module 
 *              connected to the computer's serial port. 
 *
 * The address of the XBee module from which the message was originally sent is available 
 * in  msg.source.
 *	
 * XBee addresses are specified as base64 Hex strings, e.g. 0013a200408b9437.
 **/
 function XBeeInNode(n) {      
    RED.nodes.createNode(this,n);
    module.exports = function(RED){
    var node = this;
    this.serial = n.serial;
    this.serialConfig = RED.nodes.getNode(this.serial);
    
    if (node.serialConfig) {

        try {
          node.log(util.format("Get XBee on %s:%s from pool...", this.serialConfig.serialport, this.serialConfig.serialbaud));

          node.xbee = xbeePool.get(
              node.serialConfig.serialport,
              node.serialConfig.serialbaud
            ).xbee; // ToDo: I'm not convinced that using a wrapper object is desirable or necessary

      } catch(err) {
          node.log(util.format("Failed to get XBee on %s", this.serialConfig.serialport));
          this.error(err);
          return;
      }

      node.xbee.on("newNodeDiscovered", function(xnode) {
          node.log(util.format("XBee node %s discovered", xnode.remote64.hex));

          xnode.on("data", function(data) {
            node.log(util.format("Data from %s -> %s", xnode.remote64.hex, util.inspect(data))); 
            node.send({ "payload": data, "source": xnode.remote64.hex }); 
        });

          xnode.on("io", function(sample) {
            node.log(util.format("IO from %s -> %s", xnode.remote64.hex, util.inspect(sample))); 
            node.send({ "payload": sample, "source": xnode.remote64.hex }); 
        });

      });

  } else {
    node.error("missing serial config");
}

}

XBeeInNode.prototype.close = function() {
    // Called when the node is shutdown - eg on redeploy.
    // Allows ports to be closed, connections dropped etc.
    // eg: this.client.disconnect();
    util.log("XBeeInNode closed");
}


/**
 * XBeeOutNode - 	Provides an outbound connection to an XBEE network through an 
 *                XBee module connected to the computer's serial port. 
 *
 * The address of the XBee module to send the message to can either be set in the 
 * node's web UI configuration or passed as a parameter in msg.destination. 
 * Only the msg.payload is sent to the destination XBee.
 *
 * XBee addresses are specified as base64 Hex strings, e.g. 0013a200408b9437.
 *
 **/
 function XBeeOutNode(n) {      
    RED.nodes.createNode(this,n);
    var node = this;
    this.destination = n.destination;
    this.serial = n.serial;
    this.serialConfig = RED.nodes.getNode(this.serial);

    if (node.serialConfig) {

        try {
          node.log(util.format("Get XBee on %s:%s from pool...", this.serialConfig.serialport, this.serialConfig.serialbaud));

          node.xbee = xbeePool.get(
              node.serialConfig.serialport,
              node.serialConfig.serialbaud
            ).xbee; // ToDo: I'm not convinced that using a wrapper object is desirable or necessary

      } catch(err) {
          node.log(util.format("Failed to get XBee on %s", this.serialConfig.serialport));
          this.error(err);
          return;
      }

      node.on("input",function(msg) {
          addr = node.destination || msg.destination; // || 0013a20040aa18df  [0x00, 0x13, 0xa2, 0x00, 0x40, 0xaa, 0x18, 0xdf]
          if (addr) {
          	node.log(util.format("Send %s to %s, using %s", msg.payload, addr, util.inspect(msg)));
          	xnode = node.xbee.addNode(node.xbee.tools.hexStr2bArr(addr));
          	xnode.send(msg.payload.replace("\\n", String.fromCharCode(10)).replace("\\r", String.fromCharCode(13)));
          } else {
            node.error("missing XBee destination address");
        }
    });

  } else {
    node.error("missing serial config");
}

}

XBeeOutNode.prototype.close = function() {
    // Called when the node is shutdown - eg on redeploy.
    // Allows ports to be closed, connections dropped etc.
    // eg: this.client.disconnect();
    util.log("XBeeOutNode closed");
}


/**
 * XBeeDIOutNode -    rovides the ability to set a Digital IO pin state via a Controller XBee module connected to the computer's serial port. 
 *
 * The address of the XBee module to send the message to can either be set in the 
 * node's web UI configuration or passed as a parameter in msg.destination. 
 * The target IO Pin is specified in the Web UI or passed as a msg.dio parameter.
 * The desired state is specified in the Web UI or passed as a msg.state parameter.
 *
 * XBee addresses are specified as base64 Hex strings, e.g. 0013a200408b9437.
 *
 **/
 function XBeeDIOutNode(n) {      
    RED.nodes.createNode(this,n);
    var node = this;
    this.destination = n.destination;
    this.dio = n.dio;
    this.serial = n.serial;
    this.state = n.pinstate;
    this.serialConfig = RED.nodes.getNode(this.serial);

    if (node.serialConfig) {

        try {
            node.log(util.format("Get XBee on %s:%s from pool...", this.serialConfig.serialport, this.serialConfig.serialbaud));

            node.xbee = xbeePool.get(
              node.serialConfig.serialport,
              node.serialConfig.serialbaud
            ).xbee; // ToDo: I'm not convinced that using a wrapper object is desirable or necessary
            
        } catch(err) {
            node.log(util.format("Failed to get XBee on %s", this.serialConfig.serialport));
            this.error(err);
            return;
        }
        
        node.on("input",function(msg) {
          addr = node.destination || msg.destination; // || 0013a20040aa18df  [0x00, 0x13, 0xa2, 0x00, 0x40, 0xaa, 0x18, 0xdf]
          state = node.state || msg.state; // i.e. DIGITAL_OUTPUT_LOW or DIGITAL_OUTPUT_HIGH
          dio = node.dio || msg.dio; // e.g. DIO4
          if (addr && state && dio) {
            node.log(util.format("Send %s to %s, using %s", msg.payload, addr, util.inspect(msg)));
            xnode = node.xbee.addNode(node.xbee.tools.hexStr2bArr(addr));
            xnode.setPinMode(dio, state);
            node.log('Setting: '+dio+' to state: '+state+' on XBee with address: '+addr);
        } else {
            node.error("missing XBee destination address, dio and/or state");
        }
    });

    } else {
        node.error("missing serial config");
    }

}

XBeeDIOutNode.prototype.close = function() {
    // Called when the node is shutdown - eg on redeploy.
    // Allows ports to be closed, connections dropped etc.
    // eg: this.client.disconnect();
    util.log("XBeeDIOutNode closed");
}

// Register the nodes by name. This must be called before overriding any of the Node functions.
console.log("Registering xbee in node");
RED.nodes.registerType("xbee in", XBeeInNode);
RED.nodes.registerType("xbee out", XBeeOutNode);
RED.nodes.registerType("xbee dio out", XBeeDIOutNode);


/**
 * xbeePool - Provides a sharable pool of XBee connections which are used by both 
 *            the inbound and outbound nodes. 
 *
 * ToDo: There's a lot of stuff in here that can probably be pulled out once I'm sure it's not needed
 **/
 var xbeePool = function() {
    var pool = {};
    return {
        get:function(port,baud,callback) {
            var id = port;
            if (!pool[id]) {
                pool[id] = function() {
                    var obj = { // ToDo: I'm not convinced that using a wrapper object is desirable or necessary
                    _emitter: new events.EventEmitter(),
                    xbee: null,
                        serial: null, //ToDo : Remove
                        _closing: false,
                        tout: null,
                        on: function(a,b) { this._emitter.on(a,b); },
                        close: function(cb) { this.serial.close(cb)},
                        write: function(m,cb) { this.serial.write(m,cb)},
                    }
                    var setupXBee = function() {
                    	try { // ToDo : is try catch here actually necessary?
                            util.log(util.format("About to initialise the XBee on %s:%s...", port, baud));

                            obj.xbee = new XBee({
                             port: port,
                             baudrate: baud
                         });

                            obj.xbee.init();

                        } catch(err) {
						            // ToDo : Retry every 10 seconds 
                                    util.log(util.format("Failed to initialise XBee on %s", this.serialConfig.serialport));
                                    this.error(err);
                                    return;
                                }

                                obj.xbee.on("initialized", function(params) {
                                    util.log(util.format("XBee initialised in pool -> %j", params));
                                    obj.xbee.discover();            
                                });
                                // Triggered whenever a node is discovered that is not already
                                // added. / myNode will not show up here!
                                obj.xbee.on("newNodeDiscovered", function(node) {
                                  console.log("Node %s discovered", node.remote64.hex);
                                });


//                      obj.xbee.on('error', function(err) {
//                                util.log("[serial] serial port "+port+" error "+err);
//                                obj.tout = setTimeout(function() {
//                                        setupSerial();
//                                },settings.serialReconnectTime);
//                      });

//                        obj.serial.on('close', function() {
//                                if (!obj._closing) {
//                                    util.log("[serial] serial port "+port+" closed unexpectedly");
//                                    obj.tout = setTimeout(function() {
//                                            setupSerial();
//                                    },settings.serialReconnectTime);
//                                }
//                      });

//                      obj.serial.on('open',function() {
//                                util.log("[serial] serial port "+port+" opened at "+baud+" baud");
//                                obj.serial.flush();
//                                obj._emitter.emit('ready');
//                      });

//                      obj.serial.on('data',function(d) {
//                                obj._emitter.emit('data',d);
//                      });

}
setupXBee();
return obj;
}();
}
return pool[id];
},
close: function(port) {
    if (pool[port]) {
        if (pool[port].tout != null) clearTimeout(pool[port].tout);
        pool[port]._closing = true;
        try {
            pool[port].close(function() {
                util.log("[serial] serial port closed");
            });
        } catch(err) {
        };
    }
    delete pool[port];
}
}
}();


}
