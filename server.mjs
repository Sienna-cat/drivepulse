import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
  try{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const clean=pathname==='/'?'/index.html':pathname;
    const file=path.resolve(root,'.'+clean);
    if(!file.startsWith(root+path.sep))throw new Error('forbidden');
    const body=await readFile(file);
    res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(body);
  }catch(err){res.writeHead(err.message==='forbidden'?403:404,{'content-type':'text/plain; charset=utf-8'});res.end(err.message==='forbidden'?'Forbidden':'Not found');}
});
const port=Number(process.env.PORT||4186);server.listen(port,'127.0.0.1',()=>console.log(`DrivePulse running at http://127.0.0.1:${port}`));
