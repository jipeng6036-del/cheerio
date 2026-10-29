const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');

async function verify(api, label) {
  const html = '<!doctype html><html><head><base href="https://cdn.example/assets/"></head><body><a href="one.html">one</a><a href="two.html">two</a><img src="image.png"></body></html>';
  await fs.writeFile('page.html', html);
  assert.equal(await fs.readFile('page.html','utf8'),html);
  const checks = [];
  for (const [loader, $] of [
    ['load', api.load(await fs.readFile('page.html', 'utf8'))],
    ['loadBuffer', api.loadBuffer(await fs.readFile('page.html'))],
    ...['http://[','not-a-url','/relative/'].flatMap(baseURI => [
      ['load-invalid-caller/'+baseURI, api.load(html,{baseURI})],
      ['loadBuffer-invalid-caller/'+baseURI, api.loadBuffer(Buffer.from(html),{baseURI})],
    ]),
  ]) {
    assert.equal($('a').first().prop('href'), 'https://cdn.example/assets/one.html');
    assert.equal($('img').prop('src'), 'https://cdn.example/assets/image.png');
    assert.deepEqual($.extract({links:[{selector:'a',value:'href'}]}), {links:['https://cdn.example/assets/one.html','https://cdn.example/assets/two.html']});
    checks.push({loader,href:$('a').first().prop('href'),src:$('img').prop('src'),extract:$.extract({links:[{selector:'a',value:'href'}]})});
  }
  const requests=[];
  const server=http.createServer((request,response)=>{
    requests.push(request.url);
    if(request.url==='/redirect'){
      response.writeHead(302,{location:'/page'});response.end();
    }else if(request.url==='/page'){
      response.writeHead(200,{'content-type':'text/html; charset=utf-8'});response.end(html);
    }else{response.writeHead(404);response.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const address=server.address();
    const $=await api.fromURL(`http://127.0.0.1:${address.port}/redirect`);
    assert.equal($('a').first().prop('href'),'https://cdn.example/assets/one.html');
    assert.deepEqual(requests,['/redirect','/page']);
    checks.push({loader:'fromURL',href:$('a').first().prop('href'),requests});
  }finally{
    await new Promise(resolve=>server.close(resolve));
  }
  const report={label,node:process.version,platform:process.platform,package:require('cheerio/package.json').version,checks,serversClosed:!server.listening,method:'Installed npm tarball consumer; actual disk reads plus loopback HTTP redirect/HTML parser. No mocked transports or paid/external services.'};
  await fs.writeFile(`${label}-installed-proof.json`,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}
module.exports={verify};
if(require.main===module)verify(require('cheerio'),'cjs').catch(error=>{console.error(error);process.exitCode=1;});
