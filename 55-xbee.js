/**
 * Copyright 2013 Freak Ent.
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
 **/

// XBee Node-RED node file
console.log("********** Loading XBee Node ************");


// Require main module
var util = require("util");
var events = require("events");
var RED = require("../../red/red");
var XBee = require('svd-xbee').XBee;

// The main node definition - most things happen in here
function XBeeInNode(n) {      
    // Create a RED node
    RED.nodes.createNode(this,n);
    var node = this;
    this.serial = n.serial;
    this.serialConfig = RED.nodes.getNode(this.serial);
    
//    util.log(util.format("Serial Config: %j", this.serialConfig));
    
    if (node.serialConfig) {

        try {
		        node.log(util.format("Get XBee on %s:%s from pool...", this.serialConfig.serialport, this.serialConfig.serialbaud));
    
            node.xbee = xbeePool.get(
              node.serialConfig.serialport,
            	node.serialConfig.serialbaud
            ).xbee;
            
        } catch(err) {
            // ToDo : Retry every 10 seconds 
        		node.log(util.format("Failed to initialise XBee on %s", this.serialConfig.serialport));
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
    				node.log(util.format("IO from %s -> %s", node.remote64.hex, util.inspect(sample))); 
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


// The main node definition - most things happen in here
function XBeeOutNode(n) {      
    // Create a RED node
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
            ).xbee;
            
        } catch(err) {
            // ToDo : Retry every 10 seconds 
        		node.log(util.format("Failed to initialise XBee on %s", this.serialConfig.serialport));
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
            node.error("missing destination address");
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

// Register the node by name. This must be called before overriding any of the
// Node functions.
console.log("Registering xbee in node");
RED.nodes.registerType("xbee in", XBeeInNode);

RED.nodes.registerType("xbee out", XBeeOutNode);


var xbeePool = function() {
    var pool = {};
    return {
        get:function(port,baud,callback) {
            var id = port;
            if (!pool[id]) {
                pool[id] = function() {
                    var obj = {
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
            						
            						//util.log("Calling init");
        								obj.xbee.init();
    								    //util.log("Called init");

            
						        	} catch(err) {
						            // ToDo : Retry every 10 seconds 
        								util.log(util.format("Failed to initialise XBee on %s", this.serialConfig.serialport));
						            this.error(err);
            						return;
							        }

											obj.xbee.on("initialized", function(params) {
				    						//util.log("*****************************");
        								util.log("XBee in pool initialised.");
				    						util.log(util.inspect(params));
            						obj.xbee.discover();            
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
