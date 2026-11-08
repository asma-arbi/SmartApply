import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,existsSync} from 'node:fs';
import {rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import net from 'node:net';
import mongoose from 'mongoose';
export async function freePort(port){await new Promise((res,rej)=>{const socket=net.createServer();socket.once('error',()=>rej(Error(`Port ${port} is occupied. Stop your existing project server before isolated tests.`)));socket.listen(port,'127.0.0.1',()=>socket.close(res));});}
export function stopOwnedChild(child){if(!child?.pid||child.exitCode!==null)return;if(process.platform==='win32')spawnSync('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else child.kill('SIGTERM');}
export async function startMongoTestRuntime(){
 const executable=process.env.TEST_MONGOD_PATH??'C:/Program Files/MongoDB/Server/7.0/bin/mongod.exe';if(!existsSync(executable))throw Error('Set TEST_MONGOD_PATH to a local mongod executable. Tests never use Atlas.');
 const port=await new Promise((res,rej)=>{const socket=net.createServer();socket.once('error',rej);socket.listen(0,'127.0.0.1',()=>{const value=socket.address().port;socket.close(()=>res(value));});});
 const directory=mkdtempSync(join(tmpdir(),'smartapply-mongo-test-'));const child=spawn(executable,['--dbpath',directory,'--bind_ip','127.0.0.1','--port',String(port),'--quiet','--replSet','smartapply_test'],{windowsHide:true,stdio:'ignore'});
 try{await new Promise((res,rej)=>{const deadline=Date.now()+15000;function poll(){const socket=net.connect(Number(port),'127.0.0.1');socket.once('connect',()=>{socket.destroy();res();});socket.once('error',()=>{socket.destroy();if(Date.now()>deadline)rej(Error('Isolated mongod did not start.'));else setTimeout(poll,150);});}child.once('error',rej);poll();});
 const client=new mongoose.mongo.MongoClient(`mongodb://127.0.0.1:${port}/?directConnection=true`,{serverSelectionTimeoutMS:5000});await client.connect();try{await client.db('admin').command({replSetInitiate:{_id:'smartapply_test',members:[{_id:0,host:`127.0.0.1:${port}`}]}});const deadline=Date.now()+20000;while(!(await client.db('admin').command({hello:1})).isWritablePrimary){if(Date.now()>deadline)throw Error('Test replica set election timed out.');await new Promise(r=>setTimeout(r,150));}}finally{await client.close();}
 return {uri:`mongodb://127.0.0.1:${port}/?replicaSet=smartapply_test`,stop:async()=>{stopOwnedChild(child);await removeTestDirectory(directory);}};
 }catch(e){stopOwnedChild(child);await removeTestDirectory(directory);throw e;}
}

async function removeTestDirectory(directory){const target=resolve(directory);if(dirname(target)!==resolve(tmpdir())||!/^smartapply-mongo-test-[A-Za-z0-9]+$/.test(basename(target)))throw Error('Refusing unexpected test-data cleanup path.');await new Promise(resolve=>setTimeout(resolve,1000));await rm(target,{recursive:true,force:true,maxRetries:10,retryDelay:200});}
