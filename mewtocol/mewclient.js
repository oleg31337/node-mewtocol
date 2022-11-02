'use strict';
const net = require ('net');
const EventEmitter = require ('events').EventEmitter;
const defaultport = 9094; // default mewtocol port
const localhost = '127.0.0.1'; //default IP address
const defaulttimeout = 5000; //default 5 seconds timeout for PLC communication

class MewClient extends EventEmitter {
    constructor(host,port,timeout) {
        super();
        this.socket = new net.Socket();
        this.host = host || localhost;
        this.port = port || defaultport;
        this.timeout = timeout || defaulttimeout;
        this.socket.setTimeout(this.timeout); //set timeout for socket
        this.socket.on('close', (hadError)=>{
            this.emit('disconnect',hadError);
            if (hadError) {
                this.debug('Connection closed after an error');
                return;
            }
            this.debug('Connection closed.');
            return;
        });
        this.socket.on('timeout', () => {
            this.emit('timeout',{error:'Socket idle timeout'});
            this.debug('Socket idle timeout.');
            this.destroy();
        });
        this.socket.on('connect', () => {
            this.emit('connect',{host:this.host,port:this.port});
            this.debug('Connected to ' + this.host + ':' + this.port);
        });
        this.connect();
    }
    debug(...theArgs){
        if (process.env.DEBUG == 'true') {
            console.log(theArgs);
        }
    }
    connect() { //used for connection and re-connection
        var client = this;
        client.socket.connect({port:client.port, host:client.host});
    }
    destroy(){
        var client = this;
        client.socket.destroy();
        client.debug('Socket destroyed.');
    }
    parseIntArray(data){
        var arr=[];
        for (var i=0; i<data.length;i=i+4){
            var hexstr = data[i + 2] + data[i + 3] + data[i] + data[i + 1];
            var val = parseInt(hexstr, 16);
            arr.push(val);
        }
        return arr;
    }
    parseErrorCode(errnumber){
        var errmsg='';
        switch (errnumber){
            case 21:
                errmsg='NACK error';
                break;
            case 22:
                errmsg='WACK error';
                break;
            case 23:
                errmsg='Source MEWTOCOL station number overlap';
                break;
            case 24:
                errmsg='Transmission error';
                break;
            case 25:
                errmsg='Link unit hardware error';
                break;
            case 26:
                errmsg='MEWTOCOL station number setting error';
                break;
            case 27:
                errmsg='Frame-over error';
                break;
            case 28:
                errmsg='No response error';
                break;
            case 29:
                errmsg='Buffer close error';
                break;
            case 30:
                errmsg='Time-out error.';
                break;
            case 32:
                errmsg='Transmission impossible error';
                break;
            case 33:
                errmsg='Communication stop';
                break;
            case 36:
                errmsg='No local station error';
                break;
            case 38:
                errmsg='Other communication errors';
                break;
            case 40:
                errmsg='BCC error';
                break;
            case 41:
                errmsg='Format error';
                break;
            case 42:
                errmsg='Not-support error';
                break;
            case 43:
                errmsg='Procedure error';
                break;
            case 50:
                errmsg='Link setting error';
                break;
            case 51:
                errmsg='Simultaneous operation error';
                break;
            case 52:
                errmsg='Sending disable error';
                break;
            case 53:
                errmsg='Busy error';
                break;
            case 60:
                errmsg='Parameter error';
                break;
            case 61:
                errmsg='Data error';
                break;
            case 62:
                errmsg='Registration error';
                break;
            case 63:
                errmsg='Mode error';
                break;
            case 65:
                errmsg='Protect error';
                break;
            case 66:
                errmsg='Address error';
                break;
            case 67:
                errmsg='No data error';
                break;
            case 72:
                errmsg='Time-out error';
                break;
            case 73:
                errmsg='Time-out error';
                break;
            default:
                errmsg='Unknown error';
        }
        return errmsg;
    }
    RD(station,area,startaddr,endaddr){ //RD command. Read register.
        return new Promise((resolve,reject)=>{
            const areas=['D','L','F']; // Possible areas to read
            station=station.toString().padStart(2,'0'); //pad station number with 0 if required
            var cmdchar='%'; //use 118 byte message format by default
            startaddr=parseInt(startaddr,10);
            endaddr=parseInt(endaddr,10);
            if (endaddr < startaddr){
                reject({error:'endaddr must be greater or equal to startaddr'});
                return;
            }
            if (endaddr - startaddr>20) { //if more than 20 registers, switch to 2048 byte message format
                cmdchar='<';
            }
            var numofregisters = endaddr-startaddr+1;
            if (areas.includes(area)){
                var cmd = cmdchar+station+'#RD'+ area + startaddr.toString().padStart(5,'0') + endaddr.toString().padStart(5,'0') + '**\r';
                this.sendCommand(cmd)
                .then ((data)=>{
                    var arr = this.parseIntArray(data.slice(6,data.length));
                    if (numofregisters>1) resolve(arr)
                    else resolve(arr[0]);
                })
                .catch((err)=>{ reject(err);});
            }
            else {
                reject({error:'Invalid area. Valid areas for registers are D,L,F'});
                return;
            }
        })
    }
    RR(station,startaddr,endaddr){ //RR command. Read system register.
        return new Promise((resolve,reject)=>{
            station=station.toString().padStart(2,'0'); //pad station number with 0 if required
            var cmdchar='%'; //use 118 byte message format by default
            startaddr=parseInt(startaddr,10);
            endaddr=parseInt(endaddr,10);
            if (endaddr < startaddr){
                reject({error:'endaddr must be greater or equal to startaddr'});
                return;
            }
            if (endaddr - startaddr>20) { //if more than 20 registers, switch to 2048 byte message format
                cmdchar='<';
            }
            var numofregisters = endaddr-startaddr+1;
            var cmd = cmdchar+station+'#RR0' + startaddr.toString().padStart(3,'0') + endaddr.toString().padStart(3,'0') + '**\r';
            this.sendCommand(cmd)
            .then ((data)=>{
                var arr = this.parseIntArray(data.slice(6,data.length));
                if (numofregisters>1) resolve(arr)
                else resolve(arr[0]);
            })
            .catch((err)=>{ reject(err);});
            return;
        })
    }
    RS(station,startaddr,endaddr){ //RS command. Read timer/counter set value
        return new Promise((resolve,reject)=>{
            station=station.toString().padStart(2,'0'); //pad station number with 0 if required
            var cmdchar='%'; //use 118 byte message format by default
            startaddr=parseInt(startaddr,10);
            endaddr=parseInt(endaddr,10);
            if (endaddr < startaddr){
                reject({error:'endaddr must be greater or equal to startaddr'});
                return;
            }
            if (endaddr - startaddr>20) { //if more than 20 registers, switch to 2048 byte message format
                cmdchar='<';
            }
            var numofregisters = endaddr-startaddr+1;
            var cmd = cmdchar+station+'#RS' + startaddr.toString().padStart(4,'0') + endaddr.toString().padStart(4,'0') + '**\r';
            this.sendCommand(cmd)
            .then ((data)=>{
                var arr = this.parseIntArray(data.slice(6,data.length));
                if (numofregisters>1) resolve(arr)
                else resolve(arr[0]);
            })
            .catch((err)=>{ reject(err);});
            return;
        })
    }
    RK(station,startaddr,endaddr){ //RK command. Read timer/counter elapsed value
        return new Promise((resolve,reject)=>{
            station=station.toString().padStart(2,'0'); //pad station number with 0 if required
            var cmdchar='%'; //use 118 byte message format by default
            startaddr=parseInt(startaddr,10);
            endaddr=parseInt(endaddr,10);
            if (endaddr < startaddr){
                reject({error:'endaddr must be greater or equal to startaddr'});
                return;
            }
            if (endaddr - startaddr>20) { //if more than 20 registers, switch to 2048 byte message format
                cmdchar='<';
            }
            var numofregisters = endaddr-startaddr+1;
            var cmd = cmdchar+station+'#RK' + startaddr.toString().padStart(4,'0') + endaddr.toString().padStart(4,'0') + '**\r';
            this.sendCommand(cmd)
            .then ((data)=>{
                var arr = this.parseIntArray(data.slice(6,data.length));
                if (numofregisters>1) resolve(arr)
                else resolve(arr[0]);
            })
            .catch((err)=>{ reject(err);});
            return;
        })
    }
    RCS(station,area,address){ //RC S command. Read contact single value
        return new Promise((resolve,reject)=>{
            const areas=['X','Y','R','L'];
            station=station.toString().padStart(2,'0'); //pad station number with 0 if required
            if (areas.includes(area)){
                var cmd = "%"+station+'#RCS' + area + address.toString().padStart(4,'0') + '**\r';
                this.sendCommand(cmd)
                .then ((data)=>{
                    var val = data.slice(6,data.length);
                    resolve(val);
                })
                .catch((err)=>{ reject(err);});
            }
            else {
                reject({error:'Invalid area. Valid areas for contacts are X,Y,R,L'});
                return;
            }
        })
    }
    RCP(station,addresses){ //RC P command. Read contact multiple bit values up to 8 bits.
        return new Promise((resolve,reject)=>{
            const areas=['X','Y','R','L'];
            var addrstring='';
            station=station.toString().padStart(2,'0'); //pad station number with 0 if required
            if (addresses.length>8){
                reject({error:'Max 8 addresses allowed'});
                return;
            }
            for (var i=0;i<addresses.length;i++){ //build address string and validate areas
                if (!areas.includes(addresses[i].slice(0,1))){
                    reject({error:'Invalid area(s) Valid areas for contacts are X,Y,R,L'});
                    return;
                }
                addrstring+=addresses[i];
            }
            var cmd = "%"+station+'#RCP' + addresses.length.toString() + addrstring + '**\r';
            this.sendCommand(cmd)
            .then ((data)=>{
                var arr=[];
                var strarr = data.slice(6,data.length).split();
                for (var i=0;i<strarr.length;i++){
                    arr.push(parseInt(strarr[i],10));
                }
                resolve(arr);
                return;
            })
            .catch((err)=>{reject(err);});
        })
    }
    RCC(station,area,startaddr,endaddr){ //RC C command. Read contact word values
        return new Promise((resolve,reject)=>{
            const areas=['X','Y','R','L']; // Possible areas to read
            station=station.toString().padStart(2,'0'); //pad station number with 0 if required
            var cmdchar='%'; //use 118 byte message format by default
            startaddr=parseInt(startaddr,10);
            endaddr=parseInt(endaddr,10);
            if (endaddr < startaddr){
                reject({error:'endaddr must be greater or equal to startaddr'});
                return;
            }
            if (endaddr-startaddr>20) { //if more than 20 registers, switch to 2048 byte message format
                cmdchar='<';
            }
            var numofregisters = endaddr-startaddr+1;
            if (areas.includes(area)){
                var cmd = cmdchar+station+'#RCC'+ area + startaddr.toString().padStart(4,'0') + endaddr.toString().padStart(4,'0') + '**\r';
                this.sendCommand(cmd)
                .then ((data)=>{
                    var arr = this.parseIntArray(data.slice(6,data.length));
                    if (numofregisters>1) resolve(arr)
                    else resolve(arr[0]);
                })
                .catch((err)=>{ reject(err);});
            }
            else {
                reject({error:'Invalid area. Valid areas for contacts are X,Y,R,L'});
                return;
            }
        })
    }
    RT(station){ //RT command. Read PLC status
        return new Promise((resolve, reject) => {
            station=station.toString().padStart(2,'0'); //pad station number with 0 if required
            var cmd = '%'+station+'#RT**\r';
            this.sendCommand(cmd)
            .then((data)=> {
                var cputype = data[6]+data[7];
                var cpuversion = data[8]+data[9];
                var progcapacity = parseInt(data[10]+data[11],10);
                var operstatus = parseInt(data[12]+data[13],16);
                var errorflag = parseInt(data[16]+data[17],16);
                var selfdiag = parseInt(data[20]+data[21]+data[18]+data[19],16);
                //decode operation status
                var operation_mode = operstatus & 1;
                var testrun_mode = (operstatus & 2)>>1;
                var break_exec = (operstatus & 4)>>2;
                var break_cond = (operstatus & 8)>>3;
                var out_enable = (operstatus & 16)>>4;
                var step_run = (operstatus & 32)>>5;
                var msg_inst = (operstatus & 64)>>6;
                var remote_mode = (operstatus & 128)>>7;
                //decode error flag
                var self_diag_error = errorflag & 1;
                var voltage_dip = (errorflag & 2)>>1;
                var fuse_blow = (errorflag & 4)>>2;
                var intelligent_unit_error = (errorflag & 8)>>3;
                var io_verify = (errorflag & 16)>>4;
                var vbatt_drop = (errorflag & 32)>>5;
                var vbatt_drop_hold = (errorflag & 64)>>6;
                var oper_error = (errorflag & 128)>>7;
                resolve ({
                    cputype:cputype,
                    cpuversion:cpuversion,
                    progcapacity:progcapacity,
                    operstatus: {
                        operation_mode:operation_mode,
                        testrun_mode:testrun_mode,
                        break_exec:break_exec,
                        break_cond:break_cond,
                        out_enable:out_enable,
                        step_run:step_run,
                        msg_inst:msg_inst,
                        remote_mode:remote_mode
                    },
                    errorflag:{
                        self_diag_error:self_diag_error,
                        voltage_dip:voltage_dip,
                        fuse_blow:fuse_blow,
                        intelligent_unit_error:intelligent_unit_error,
                        io_verify:io_verify,
                        vbatt_drop:vbatt_drop,
                        vbatt_drop_hold:vbatt_drop_hold,
                        oper_error:oper_error
                    },
                    selfdiag:selfdiag
                });
                return;
            })
            .catch((err)=>{ reject(err);});
        });
    }
    sendCommand(cmd) { //send command to PLC and return response
        var client = this;
        if (client.socket.destroyed) { //if socket is destroyed, create a new one
            client.connect();
        }
        return new Promise((resolve, reject) => {
            var bigbuffer='';
            var timeout;
            var cmdchar = cmd.slice(0, 1);
            var station = cmd.slice(1, 3);
            if (!cmd.endsWith('\r')) cmd+='\r'; // add \r to command if not there
            client.socket.write(cmd, ()=>{ //send command to PLC
                timeout=setTimeout(function(){ //set timeout for the data to arrive
                    client.debug('Timeout error');
                    client.emit('timeout', {error:'Timeout waiting for the data from PLC'});
                    reject({error:'Timeout waiting for the data from PLC'});
                    return;
                },client.timeout);
                client.debug('Sent command:'+cmd+'\n');
            });
            var isresolved=false; //flag to indicate if the promise has been already resolved
            client.socket.on('data',function(buff){
                var stringbuff=buff.toString();
                if (!isresolved){ //check if promise has been already resolved
                    client.debug('Received:'+stringbuff.trimEnd());
                    if (stringbuff.startsWith(cmdchar+station+"!")){ // error message
                        clearTimeout(timeout);
                        var errcode=parseInt(stringbuff.slice(4,stringbuff.length-3),10);
                        isresolved=true;
                        client.emit('error', {error:'PLC returned error '+errcode+': '+client.parseErrorCode(errcode)});
                        reject({error:'PLC returned error '+errcode+': '+client.parseErrorCode(errcode)});
                        return;
                    }
                    else if ((stringbuff.startsWith(cmdchar+station+'$')) && !stringbuff.endsWith('&\r') && stringbuff.endsWith('\r')) { // single message response
                        clearTimeout(timeout);
                        client.debug('Full packet received');
                        isresolved=true;
                        resolve(stringbuff.slice(0,buff.length-3)); // Cut BCC and \r from the end of the message
                        return;
                    }
                    else if (stringbuff.startsWith(cmdchar+station+'$') && !stringbuff.endsWith('\r')) { // start of multi-packet response
                        clearTimeout(timeout);
                        client.debug('First packet received');
                        bigbuffer+=stringbuff;
                        timeout=setTimeout(function(){ //wait for the remaining data, then terminate with error
                            client.debug('Timeout error');
                            client.emit('timeout', {error:'Timeout waiting for the data from PLC'});
                            isresolved=true;
                            reject({error:'Timeout waiting for the data from PLC'});
                            return;
                        },client.timeout);
                    }
                    else if (!stringbuff.startsWith(cmdchar) && stringbuff.endsWith('&\r')) { //multi-packet multi-message response
                        clearTimeout(timeout);
                        client.debug('Middle packet received');
                        bigbuffer+=stringbuff.slice(0,stringbuff.length-4); //cut last 4 characters
                        client.socket.write(cmdchar+station+"**&\r",()=>{ //request the next packet from PLC
                            timeout=setTimeout(function(){ //wait for the remaining data, then terminate with error
                                client.debug('Timeout error');
                                client.emit('timeout', {error:'Timeout waiting for the data from PLC'});
                                isresolved=true;
                                reject({error:'Timeout waiting for the data from PLC'});
                                return;
                            },client.timeout);
                        });
                    }
                    else if (stringbuff.startsWith(cmdchar+station) && stringbuff.endsWith('&\r')) { //multi-message response
                        clearTimeout(timeout);
                        client.debug('Middle packet received');
                        bigbuffer+=stringbuff.slice(3,stringbuff.length-4); // cut first 3 and last 4 characters
                        client.socket.write(cmdchar+station+"**&\r",()=>{ //request the next packet from PLC
                            timeout=setTimeout(function(){ //wait for the remaining data, then terminate with error
                                client.debug('Timeout error');
                                client.emit('timeout', {error:'Timeout waiting for the data from PLC'});
                                isresolved=true;
                                reject({error:'Timeout waiting for the data from PLC'});
                                return;
                            },client.timeout);
                        });
                    }
                    else if (stringbuff.startsWith(cmdchar+station) && !stringbuff.endsWith('\r')) { //multi-message multi-packet response
                        clearTimeout(timeout);
                        client.debug('Middle packet received');
                        bigbuffer+=stringbuff.slice(3,stringbuff); // cut first 3 characters
                        timeout=setTimeout(function(){ //wait for the remaining data, then terminate with error
                            client.debug('Timeout error');
                            client.emit('timeout', {error:'Timeout waiting for the data from PLC'});
                            isresolved=true;
                            reject({error:'Timeout waiting for the data from PLC'});
                            return;
                        },client.timeout);
                    }
                    else if (stringbuff.startsWith(cmdchar+station) && stringbuff.endsWith('\r')) { //multi-message response last packet
                        clearTimeout(timeout);
                        client.debug('Last packet received');
                        bigbuffer+=stringbuff.slice(3,stringbuff.length-3); // cut first 3 and last 3 characters
                        isresolved=true;
                        resolve(bigbuffer);
                        return;
                    }
                    else if (!stringbuff.startsWith(cmdchar) && stringbuff.endsWith('\r')) {  // end of multi packet response
                        clearTimeout(timeout);
                        client.debug('Last packet received');
                        bigbuffer+=stringbuff.slice(0,stringbuff.length-3); // cut last 3 characters
                        isresolved=true;
                        resolve(bigbuffer);
                        return;
                    }
                    else { // Unexpected message
                        client.emit('error', {error:'Unexpected message received from PLC', msg:stringbuff});
                        clearTimeout(timeout);
                        isresolved=true;
                        reject({error:'Unexpected response from PLC'});
                        return;
                    }
                }
            });
            client.socket.on('error', (err) => {
                client.emit('error', {error:'TCP socket error', msg:err});
                reject(err);
                return;
            });
        })
    }
}
module.exports = MewClient;