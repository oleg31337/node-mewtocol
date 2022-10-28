# node-mewtocol
#### Panasonic MEWTOCOL COM protocol implementation for Node-JS
Please use official MEWTOCOL manual as a reference: [MEWTOCOL.pdf](https://mediap.industry.panasonic.eu/assets/custom-upload/Factory%20&%20Automation/PLC/Manuals/mn_all_plcs_mewtocol_user_pidsx_en.pdf)
At the moment only some read commands are implemented:
- RD(station,memory-area,start-addr,end-addr) - Read Registers
- RCS(station,memory-area,address) - Read single Contact binary value
- RCC(station,memory-area,start-addr,end-addr) - Read Contact values as 16bit integers
- RCP(station,addresses-array) - Read up to 8 Contact binary values in a single request
- RS(station,start-addr,end-addr) - Read timer set values
- RK(station,start-addr,end-addr) - Read timer elapsed values
- RR(station,start-addr,end-addr) - Read system register
- RT(station) - Read PLC status

### Install

Run the following command in the root directory of your Node.JS application:

    npm install jsmewtocol

Run the following command for global install:

    npm install -g jsmewtocol

### Usage:
```
const MewClient = require('jsmewtocol');
var ip=10.10.10.11 // ip address of the PLC
var port=9094; // TCP port is optional, default is 9094
var timeout=5000; // timeout is optional, default is 5000ms

const client = new MewClient(ip,port,timeout);
client.on('connect', (server) => { console.log('Event: connected to server: '+server.host+":"+server.port); });
client.on('disconnect', (err) => { console.log('Event: disconnected '+err); }); //the err for disconnect is true if there was an error before disconnecting
client.on('error', (err) => { console.log('Event: error: ' + err.error); }); //err object will contain error details
client.on('timeout', (err) => { console.log('Event: timeout: ' + err.error); }); //err object will contain timeout reason

//If we want to consecutively read different values from the PLC we can use Promises .then construction:
client.RD(1,'D',800,809) // first let's read registers from area D, addresses 800-809 (10 values)
.then ((data)=>{console.log(data); return client.RCS(1,'X','50A');}) // then let's read single bit from Contact area X at address 50, bit #10 (0xA)
.then ((data)=>{console.log(data); return client.RCC(1,'X',100,109);})// then read 16bit Contact values from area X from addresses 100-109 (10 values)
.then ((data)=>{console.log(data); return client.RT(1);}) // then read PLC status
.then ((data)=>{console.log(data); return client.destroy();}) // we need to destroy the connection after we are done reading, otherwise it will wait until socket timeout
.catch ((err) =>{ console.error(err); client.destroy();}); // catch any errors
```
> It is important to destroy the client socket. Otherwise it will hang until PLC drops the connection on it's end or socket timeout will happen.
> If the socket is destroyed due to timeout, the node-mewtocol will try to re-establish the connection