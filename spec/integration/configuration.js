module.exports = {
	connection: {
		name: "default",
		user: "guest",
		pass: "guest",
		host: "127.0.0.1",
		port: 5672,
		vhost: "%2f",
		replyQueue: "customReplyQueue"
	},

	exchanges: [
		{
			name: "rabbot-ex.topic",
			type: "topic",
			autoDelete: false
		}	],

	queues: [
		{
			name: "rabbot-q.topic",
			autoDelete: false,
			subscribe: true
		}	],

	bindings: [
		{
			exchange: "rabbot-ex.topic",
			target: "rabbot-q.topic",
			keys: "this.is.#"
		}
	]
};
