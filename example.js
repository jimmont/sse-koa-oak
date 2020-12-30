import Application from 'koa';
import SSEMiddleware from './sse-koa.js';
const port = 8900;
//const compress = require('koa-compress');
//const cors = require('@koa/cors');
const app = new Application();
// NOTE sse must be used after compress, when compress is used
//app.use(compress())
//app.use(cors());

const html = `<!DOCTYPE html>
<html lang="en">
	<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SSE server-sent events example</title>
<style>
html{background:#851;}
body{color:#000;background:#fff;font-family:system-ui,sans-serif;line-height:1.3;font-size:1rem;padding:1rem;margin:0;min-height:100vh;}
pre, code{font-family:"SF Mono", "Monaco", "Inconsolata", "Fira Mono", "Droid Sans Mono", "Source Code Pro", "Lucida Console", monospace;white-space:pre-line;}
</style>
	</head>
	<body>

<p><a href="https://developer.mozilla.org/docs/Web/API/Server-sent_events/Using_server-sent_events" rel=noopener>Server-sent events</a> demo, also see the <code>console</code> output.</p>
<pre></pre>
<script>
const eventSource = new EventSource("http://localhost:${ port }/sse");
const result = [];
function report(event){
	const { type, data, origin } = event;
	if (origin !== self.location.origin ){
	// NOTE recommended for security
		return;
		// NOTE after this point validate content based on the use-case
	};
	const node = document.querySelector('pre');
	result.push({type, data});

	switch(type){
	case 'bye':
		eventSource.close();
		function done(res){
		// test will watch for this to complete
			return self.tested = res.tested;
		};
		fetch('/report', {method: 'POST', headers: new Headers({"content-type":"application/json; charset=utf-8"}), body: JSON.stringify(result)})
		.then(res=>res.json())
		.then(done)
		.catch(done)
		;
	break;
	case 'error':
		console.error(event);
	break;
	};

	node.prepend(\`
\${node.childNodes.length + 1} \${type} \${ data }
\`);
	console.log( {type, data, event} );
}
eventSource.onmessage = eventSource.onerror = eventSource.onopen = report;
eventSource.addEventListener('hello',report);
eventSource.addEventListener('bye',report);
eventSource.addEventListener('ping',report);

function loaded(){
	switch(eventSource.readyState){
	case 2:
		// likely 503, confirm and report:
		function done(res){
			const { status, statusText } = res;
			console.warn({status, res});
			const event = new CustomEvent('error', {detail: res});
			event.origin = new URL(event.detail.url).origin;
			event.data = \`\${ status } \${ statusText }\`;
			report( event );
			self.tested = status;
		}
		fetch('/sse').then(done).catch(done);
	break;
	case 0:
	// not open yet
		setTimeout(loaded, 100);
	break;
	case 1:
	// ok
	break;
	}
};
window.onload = loaded;
</script>

	</body>
</html>
`;

const count = 7;
function example({ request, response }){
	let n = 0;

	let interval = setInterval(() => {
		let date = (new Date()).toString();
		response.sse.send(date);
		console.log('🕊  broadcast', date);
		n++;
		if (n >= count) {
			console.log('🖖 send manual close');
			response.sse.end();
		}
	}, 1000);
	response.sse.on('close', (...args) => {
		clearInterval(interval)
	});

}

app.on('error', (error, context)=>{
	const { request, response } = context;
	console.warn(`⚡️ app error "${ error.message }"${ context ? ( ['', request.url, response.status].join(' ') ):'' }`);
});

const config = {
	ping: 1,
	max: 2,
	route: function( request ){
		return request.URL.pathname.startsWith('/sse');
	},
};
app.use( SSEMiddleware(config) );

app.tested = [];
app.use(async (ctx, next) => {
	const { request, response } = ctx;
	switch(request.URL.pathname){
	case '/':
		response.status = 200;
		response.body = html;
	break;
	case '/favicon.ico':
		response.status = 200;
		response.body = '';
	break;
	case '/report':
		let tested = app.tested, received = null;
		if(request.method === 'POST'){
			const body = await requestbody(ctx);
			received = JSON.parse(body);
			tested.push( received );
		}
		response.status = 200;
		response.body = {tested: tested.length, received};
	break;
	case '/sse':
		example(ctx, next);
	break;
	default:
		response.status = 404;
		response.body = '404 not found';
	};
});

function requestbody(ctx){
	return new Promise((resolve, reject)=>{
		const incoming = [];
		const { req, request } = ctx;
		req.on('data', (data)=>{ incoming.push( data.toString('utf8') ); });
		req.on('end', (data)=>{
			const body = incoming.join('\n');
			request.body = body;
			resolve(body);
		});
		req.on('error', (err)=>{ reject(err); });
	});
}

app.listen( port );
console.log(`
open http://localhost:${ port }
`);

export { app, port, count, config };
