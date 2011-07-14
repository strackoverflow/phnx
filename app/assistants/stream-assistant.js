function StreamAssistant() {

}

StreamAssistant.prototype = {
	setup: function() {
		this.longPoll();
	},
	activate: function(event) {
		
	},
	longPoll: function() {
		this.controller.get('response').update('starting poll');
		var url = 'https://userstream.twitter.com/2/user.json';
		var self = this;
		
		var args = {};
		var message = {
			method: 'GET',
			action: url,
			parameters: []
		};

		//when using OAuth, parameters must be included in the request body
		//and in the base signature of the Auth Header
		
		var params = '';

		for (var key in args) {
			params += '&' + key + '=' + encodeURIComponent(args[key]);
			message.parameters.push([key, args[key]]);
		}
		
		var currentUser = getUser();
		
		OAuth.completeRequest(message, {
			consumerKey: Twitter.key,
			consumerSecret: Twitter.secret,
			token: currentUser.token,
			tokenSecret: currentUser.secret
		});

		var authHeader = OAuth.getAuthorizationHeader(Twitter.apibase, message.parameters);
		
		this.controller.get('response').update('creating request');
		var req = new Ajax.Request(url, {
			method: 'GET',
			requestHeaders: {
				Authorization: authHeader,
				Accept: 'application/json',
				"X-User-Agent": 'phnx 1.0'
			},
			parameters: params,
			onSuccess: function(response) {
				this.controller.get('response').update('success');
				// this.controller.get('response').update(response.responseText);
				// self.longPoll();
			},
			onFailure: function(transport) {
				this.controller.get('response').update('failure');
				// this.controller.get('response').update(transport.responseText);
				// self.longPoll();
			}
		});		
	},
	deactivate: function(event) {
		
	},
	cleanup: function(event) {
		
	}
};
