import Stream from 'stream';
const DEFAULT_OPTIONS = {
	max: 10000,
	ping: 60, // seconds
	route: ()=>{ return true; },
	timer: null,
	pool: null,
	heartbeat: function(options){
		options.pool.forEach(options._heartbeat, options);
	},
	_heartbeat: function(sse, i, pool){
		sse.send(':');
	}
}
/**
 * SSE server-sent events middleware for Koa
 * @param {Object} options
 * @param {Number} options.max maximum client count; default 10000
 * @param {Number} options.ping heartbeat ping timer interval in seconds, minimum 1; default 60 (1 minute)
 * @param {function} options.route optionally apply middleware to routes that return truthy value, given request object, for example: (request)=>{ return request.URL.pathname.startsWith('/sse'); }; default allows all, ()=>true;
 * @param {function} options.heartbeat the ping function called with signature (options)
 * @param {function} options._heartbeat default pool iterator for each ping
 */
export default function SSEMiddlewareSetup(options = {}){
	options = Object.assign({}, DEFAULT_OPTIONS, options);
	options.pool = new Set();
	
	const { ping, heartbeat } = options;
	if(!isNaN(ping) && ping >= 1){
		// ping is seconds, so multiply by 1000;
		options.timer = setInterval(heartbeat, ping * 1000, options);
	}

	return async function SSEMiddleware(ctx, next) {
		const { response, request } = ctx;
		const { max, pool, route } = options;
		if ( !route( request )){
			return await next();
		}
		if (response.headersSent) {
			if (!(response.sse instanceof SSETransform)) {
				ctx.throw(500, 'SSE header sent, unable to respond');
			}
			return await next();
		}

		if (pool.size >= max) {
			ctx.throw(503, 'SSE client maximum exceeded, unavailable');
			return await next();
		}

		const sse = new SSETransform(ctx);
		pool.add(sse);
		sse.on('close', function() {
			pool.delete(sse);
		});
		response.sse = sse;
		await next();
		if (!response.body) {
			response.body = response.sse;
		} else if (response.body instanceof Stream) {
			if (response.body.writable) {
				response.body = response.body.pipe(response.sse);
			}
		} else {
			if (!response.sse.ended) {
				response.sse.send(response.body);
			}
			response.body = sse;
		}
	}
}
/*
see also
* https://developer.mozilla.org/docs/Web/API/Server-sent_events/Using_server-sent_events
* https://nodejs.org/api/stream.html#stream_class_stream_transform
* https://html.spec.whatwg.org/multipage/server-sent-events.html#server-sent-events
* https://github.com/koajs/examples/tree/master/stream-server-side-events
*/
class SSETransform extends Stream.Transform {
	constructor(context, options) {
		super({
			writableObjectMode: true
		});
		this.options = options;
		this.context = context;
		this.ended = false;
		context.request.socket.setTimeout(0);
		context.request.socket.setNoDelay(true);
		context.request.socket.setKeepAlive(true);
		context.response.set({
			'Content-Type': 'text/event-stream; charset=utf-8',
			'Cache-Control': 'no-cache, no-transform',
			'Connection': 'keep-alive',
			'X-Accel-Buffering': 'no'
		});
		this.send(':ok');
	}
	/**
	 * @param { String | Object } data to send, if a string an anonymous event will be sent, 
	 * @param { ANY } data.data data to send as JSON stringified
	 * @param { Number } data.id sse event id
	 * @param { Number } data.retry sse retry times
	 * @param { function } callback
	 * @see _transform() below
	 */
	send(data, callback) {
		if(this.ended || arguments.length === 0){
			return false;
		}else{
			super.write(data, encodeURI, callback);
		};
	}
	end(data, callback) {
		this.ended = true;
		super.end(data, encodeURI, callback);
	}
	stringify(data, ...args){
		try{
			return JSON.stringify(data, ...args);
		}catch(err){
			return err.message;
		};
	}
	_dataLines(line){ return this.prefix + line; }
	_transform(data, encoding, callback) {
		let sender, dataLines, prefix = 'data: ';
		const res = [];
		if (typeof data === 'string') {
			sender = {data};
		} else {
			sender = data;
		}
		if (sender.event) res.push('event: ' + sender.event);
		if (sender.retry) res.push('retry: ' + sender.retry);
		if (sender.id) res.push('id: ' + sender.id);

		if (typeof sender.data === 'object') {
			dataLines = this.stringify(sender.data);
			res.push(prefix + dataLines);
		} else if (sender.data === undefined) {
			// Send an empty string even without data
			res.push(prefix);
		} else {
			sender.data = String(sender.data);
			let commentPattern = /^\s*:\s*/;
			if(commentPattern.test(sender.data)){
				sender.data = sender.data.replace(commentPattern, '');
				prefix = ': ';
			}
			sender.data = sender.data.replace(/[\r\n]+/g, '\n');
			dataLines = sender.data.split(/\n/);
			
			res.push(...dataLines.map(this._dataLines, {prefix}));
		}
		const message = (res.join('\n')).toString('utf8') + '\n\n';
		this.push(message);
		this.emit('message', message);
		// compatible with koa-compress
		const { body } = this.context;
		if (body && typeof body.flush === 'function' && body.flush.name !== 'deprecated') {
			body.flush();
		}
		callback()
	}
}
