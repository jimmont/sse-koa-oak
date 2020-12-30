import assert from 'assert';
import SSEMiddlewareSetup from './sse-koa.js';
import puppeteer from 'puppeteer-core';
import { app, port, count, config as SSEMiddlewareConfig } from './example.js';

const start = Date.now();

console.log(`
🧨 run some tests, if they fail, this should all stop 💥
`);

// TODO remove these for more general case, or something
const config = {
	headless: false,
	devtools: true,
	slowMo: 250,
	executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	args: ['--no-sandbox']
};
process.argv.reduce(function configure(options, arg, i){
	// allow name=value or name:value
	var parts = arg.match(/^-*(?:http-?)?([a-z][a-z0-9]+)(?:[=:]?(.+))?/i);
	if(parts){
		let name = parts[1];
		let value = (parts[2] || '').trim();
		switch(typeof options[ name ]){
		case 'number':
			options[ name ] = Number(value);
		break;
		case 'boolean':
			options[ name ] = Boolean(value);
		break;
		default:
			options[ name ] = value;;
		};
	}
	return options;
}, config);

// do any async outside of this
function describe(something, test){
	console.log('👾', something);
	return test();
};

async function visiting(url, browser, ...fn){
	const page = await browser.newPage();
	await page.goto(url);
	const tested = await page.waitForFunction(...fn);
	const {type, value} = tested._remoteObject;
	await page.close();
	return {type,value};
}



(async () => {
const browser = await puppeteer.launch(config);

let url = `http://localhost:${ port }`;
let exceedby = 1;
let browserResults = await Promise.all(
	// deliberately exceed the max
	new Array( SSEMiddlewareConfig.max + exceedby ).fill('')
		.map((it, i) => visiting( url + `?i=${ i }`, browser, 'self.tested' ))
);

await browser.close();

describe('expected browser results', function testo_basics(){
	let list = browserResults, max = SSEMiddlewareConfig.max;
	assert.equal(max + exceedby, list.length, 'all the pages returned a result');
	list.sort((n,m)=>{
		const a = n.value, b = m.value;
		return a < b ? -1 : (a > b ? 1 : 0);
	});
	list.forEach((msg, i, list)=>{
		if(i < max){
			assert.equal(msg.value, i+1, 'when sorted, each added by +1 to the results collected');
		}else{
			assert.equal(msg.value, 503, 'everything beyond the max should have exceeded the service max and returned a 503 status');
		}
	});
});

describe('basic service run with the example', function testo_results(){
	let list = app.tested;
	assert.equal(list.length, SSEMiddlewareConfig.max, 'same number of results as max');
	list.forEach( list=>list.forEach((msg, i, list)=>{
		const {type, data} = msg;
		switch(i){
		case 0:
			assert.equal(type, 'hello', 'sends "event: hello" first');
		break;
		case list.length - 1:
			assert.equal(type, 'bye', 'sends "event: bye" last');
		break;
		default:
			assert.equal(!/^(hello|bye)$/i.test(type), true, `sends any type that is not 'event: hello' or 'event: bye'`);
			switch(type){
			case 'message':
				assert.equal(!!data, true, '"event: message" includes some sort of "data: ..."');
			break;
			case 'ping':
				assert.equal(!data, true, `no data even if field label is present (ie "data: ") it's empty--so the event registers`);
			break;
			};
		}
	}) );
});

console.log(`
🚀 done and all good in ${ ((Date.now() - start)/1000).toFixed(3) }s
`);

process.exit(0);

})();

