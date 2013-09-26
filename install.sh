#!/bin/sh 
NR_HOME=~/Development/node/node-red
FE_NODES=$NR_HOME/nodes/freakent-nodes
mkdir -p $FE_NODES
cp 55-xbee.* $FE_NODES
