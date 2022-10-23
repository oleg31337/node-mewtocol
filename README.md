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
### Usage:
```
const Client = require('node-mewtocol');
var ip=10.10.10.11 // ip address of the PLC
var port=9094; // TCP port is optional, default is 9094
var timeout=5000; // timeout is optional, default is 5000ms
const client = new Client(ip,port,timeout);
client.RD(1,'D',800,809)
.then ((data)=>{console.log(data); return client.RCS(1,'X','501');})
.then ((data)=>{console.log(data); return client.RCC(1,'X',100,109);})
.then ((data)=>{console.log(data); return client.RT(1);})
.then ((data)=>{console.log(data); return client.destroy();})
.catch ((err) =>{ console.error(err); client.destroy();});
```
> It is important to destroy the client socket. Otherwise it will hang until PLC drops the connection on it's end.
> If the PLC drops the socket due to timeout, the node-mewtocol will try to re-establish the connection