require( "../setup.js" );
var _ = require( "lodash" );

var harnessFactory = function( rabbit, cb, expected ) {
	var handlers = [];
	var received = [];
	var unhandled = [];
	var returned = [];
	expected = expected || 1;
	var check = function() {
		if ( ( received.length + unhandled.length + returned.length ) === expected ) {
			cb();
		}
  };

	function defaultHandle( message ) {
    console.log('acked')
		message.ack();
	}

	function wrap( handle ) {
		return function( message ) {
			handle( message );
			received.push( message );
			check();
		};
	}

	function handleFn( type, handle, queueName ) {
		if( _.isObject( type ) ) {
			var options = type;
			options.handler = wrap( options.handler || defaultHandle );
			handlers.push( rabbit.handle( options ) );
		} else {
			handlers.push( rabbit.handle( type, wrap( handle || defaultHandle ), queueName ) );
		}
	}

	function clean() {
		handlers.forEach( function( handle ) {
			handle.remove();
		} );
		handlers = [];
		received = [];
	}

	rabbit.onUnhandled( function( message ) {
		unhandled.push( message );
		message.ack();
		check();
	} );

	rabbit.onReturned( function( message ) {
		returned.push( message );
		check();
	} );

	return {
		add: function( msg ) {
			received.push( msg );
			check();
		},
		received: received,
		clean: clean,
		handle: handleFn,
		handlers: handlers,
		unhandled: unhandled,
		returned: returned
	};
};

describe( "Integration Test Suite", function() {
	var rabbit;
	before( function() {
		rabbit = require( "../../src/index.js" );
	} );

	describe( "when connected", function() {

		var harnessFn, connected;

		before( function() {
			harnessFn = harnessFactory.bind( undefined, rabbit );
			rabbit.once( "connected", function( c ) {
				connected = c;
			} );
			return rabbit.configure( require( "./configuration.js" ) );
		} );

		describe( "with topic routes", function() {
			var harness;
			before( function( done ) {
				this.timeout( 10000 );
				harness = harnessFn( done, 2 );
				harness.handle( "topic" );
				rabbit.publish( "rabbot-ex.topic", { type: "topic", routingKey: "this.is.a.test", body: "broadcast" } );
				rabbit.publish( "rabbot-ex.topic", { type: "topic", routingKey: "this.is.sparta", body: "leonidas" } );
				rabbit.publish( "rabbot-ex.topic", { type: "topic", routingKey: "a.test.this.is", body: "yoda" } );
			} );

			it( "should route all messages correctly", function() {
				var results = _.map( harness.received, function( m ) {
					return {
						body: m.body,
						key: m.fields.routingKey
					};
				} );
				_.sortBy( results, "body" ).should.eql(
					[
						{ body: "broadcast", key: "this.is.a.test" },
						{ body: "leonidas", key: "this.is.sparta" }
					] );
			} );

			after( function() {
				harness.clean();
			} );
		} );

    /*
     * this test case waits a second before calling rabbit.shutdown
     * i guess this allows time for the batch acks to go through
     * this results in the expected behavior of the queue being empty after the test
     */
    after( function() {
      return new Promise(function(resolve) {
        setTimeout(function() {
          resolve()
        }, 1000)
      })
      .then(function () {
        return rabbit.shutdown()
      })
    } );


    /*
     * this scenario calls rabbit.shutdown immediately,
     * and results in both messages being re-queued
     * since the handlers didn't ack and the consumer disconnected
     */
    /*
		after( function() {
      return rabbit.shutdown()
		} );
    */
	} );
} );

