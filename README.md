sse-koa
===
> sse <a href="https://developer.mozilla.org/docs/Web/API/Server-sent_events/Using_server-sent_events">server-sent event</a> middleware, use stream programming model
<a href="https://communityinviter.com/apps/koa-js/koajs" rel="KoaJs Slack Community">![KoaJs Slack](https://img.shields.io/badge/Koa.Js-Slack%20Channel-Slack.svg?longCache=true&style=for-the-badge)</a>

Install
---
> npm install --save git+https://github.com/jimmont/sse-koa.git#master

Usage
---
see [example.js](example.js)
```js
const Application = require('koa');
const SSEMiddlewareSetup = require('sse-koa');
const app = new Application();
const port = 8765;
app.use( SSEMiddlewareSetup({
	// do heartbeat() every ping seconds, default 60
	ping: 120,
	// setup response.sse for requests where route() returns truthy value, default all requests
	route: (request)=>{
		return request.URL.pathname.startsWith('/sse');
	}
}) );
app.use(async ({request, response}, next) => {
	// context.response.sse is a writable stream
	const { sse } = response;
	// middleware results in client seeing 'open' event on an EventSource
	sse.send('hello listeners'); // client sees 'message' event
	// close the connection
	sse.end(); // client sees 'error' event
});
app.listen( port );
console.log(`open http://localhost:${ port }`);
```
a writable stream 
> sse.send(data)
```js
/**
 * 
 * @param {String} data sse data to send, if it's a string, an anonymous event will be sent.
 * @param {Object} data sse send object mode
 * @param {Object|String} data.data data to send, if it's object, it will be converted to json
 * @param {String} data.event sse event name
 * @param {Number} data.id sse event id
 * @param {Number} data.retry sse retry times
 * @param {*} encoding not use
 * @param {function} callback same as the write method callback
 */
send(data, encoding, callback)
```
>ctx.sse.end()
close the connection

**NOTE** `SSEMiddleware` must be used after compress() if compression is used

CHANGES
------
1.0.0
* cleanup, test
* ES Modules, Nodejs >= 14.x
0.x
* all prior see https://github.com/yklykl530/koa-sse.git

MIT License
------

Copyright (c) 2020 jimmont.com
Copyright (c) 2018 kailu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
