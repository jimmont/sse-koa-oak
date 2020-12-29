import assert from 'assert';
import SSEMiddlewareSetup from './sse-koa.js';
import { app, port, count } from './example.js';

import puppeteer from 'puppeteer-core';

console.log("run some tests, if they fail, this should all stop");

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

const results = [];

// do any async outside of this
function describe(something, test){
	results.push(something);
	return test();
};

(async () => {
const browser = await puppeteer.launch(config);
const page = await browser.newPage();
await page.goto(`http://localhost:${ port }`);
const tested = await page.waitForFunction('self.tested');


await browser.close();


describe('basic service run with the example', function testo_basics(){
	let msg, type, data, messages = app.results;
	msg = messages[0];
	type = msg.type, data = msg.data;
	assert.equal(type, 'open', 'first eventSource event opens the connection');
	assert.equal(messages.length, count + 2, 'sent an expected number of events in the example');
	msg = messages[ messages.length - 1];
	type = msg.type, data = msg.data;
	assert.equal(type, 'error', 'last eventSource event force closes the connection from the server');
	msg = messages[1];
	data = new Date(msg.data);
	assert.equal(msg.type, 'message', 'message event type');
	assert.equal(!isNaN(data) && data.toString() === msg.data, true, 'message data as expected');

	results.push(`${ messages.length } messages look correct`);
});

// TODO more tests
// ping etc tests

console.log(results);

process.exit(0);

})();

