NR-XBee
=======

Node-RED module to support use of XBee wireless modules

Highly inspired by Node-RED's own serial and mqtt modules. XBee interfacing is performed
using the excellent svd-xbee node.js module and inherits the same dependencies on 
API Mode etc (see https://github.com/jouz/svd-xbee for details).

Pre-requesites
--------------
1. Node-RED's serial module must be enabled
1. Install svd-xbee from github 

    $ npm install git+https://github.com/jouz/svd-xbee.git 

