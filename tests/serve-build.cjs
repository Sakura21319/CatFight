const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve('build/web-mobile');
const mime = {'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.wasm':'application/wasm'};
http.createServer((req,res)=>{
  const file=path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(err?'Not found':data);});
}).listen(7458,'127.0.0.1',()=>console.log('Game build: http://127.0.0.1:7458'));
