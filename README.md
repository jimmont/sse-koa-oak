#sse-koa-oak

server-sent event middleware, see <a href="https://html.spec.whatwg.org/multipage/server-sent-events.html">WHATWG</a>, <a href="https://developer.mozilla.org/docs/Web/API/Server-sent_events/Using_server-sent_events">MDN</a>

INSTALL + USE
-------
`npm install --save git+https://github.com/jimmont/sse-koa-oak.git`

see example in [example.js](example.js)

**NOTE** `SSEMiddleware` must be used after compress()

```js
// import the middleware
const SSEMiddleware = require('sse-koa-oak');
// or where package.json has "type": "module" instead use:
// import SSEMiddleware from 'sse-koa-oak';

app.use( SSEMiddleware({
	// do heartbeat() every ping seconds, default 60
	ping: 120,
	// setup ctx.response.sse for requests where route() returns truthy value
	route: (request)=>{
		return request.URL.pathname.startsWith('/eventstream');
	}
}) );
app.use(async ({request, response}, next) => {
	// response.sse is a writable stream, an EventSource in the browser
	const { sse } = response;
	// middleware results in client seeing 'open' event
	sse.send('hello listeners'); // client sees 'message' event
	// close the connection: client sees 'error' event
	sse.end(); 
});
```

MIT License
------

Copyright (c) 2020 jimmont.com

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

CHANGES
------
0.1.0 2020-12
* cleanup, test
* ES Modules, Nodejs >= 14.x
* based on several prior implementations including https://github.com/yklykl530/koa-sse.git

