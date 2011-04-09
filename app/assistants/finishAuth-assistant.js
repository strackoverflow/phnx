function FinishAuthAssistant(r) {
	this.tokens = {oauth_token: "", oauth_token_secret: "", user_id: "", screen_name: ""};
	this.response = r.response;
}
FinishAuthAssistant.prototype = {
	setup: function(){
		this.listen();
		var tokens = this.response.strip().split("&");
		var i;
		for (i = 0; i < tokens.length; i++) {
			var token = tokens[i];
			if (token.substr(0, 12) === "oauth_token=") {
				this.tokens.oauth_token = token.substr(12);
			}
			else if (token.substr(0, 18) === "oauth_token_secret") {
				this.tokens.oauth_token_secret = token.substr(19);
			}
			else if (token.substr(0,8) === "user_id="){
				this.tokens.user_id = token.substr(8);
			}
			else if (token.substr(0,12) === "screen_name="){
				this.tokens.screen_name = token.substr(12);
			}
		}
		this.storeTokens();
	},
	storeTokens: function(){
		var u = {
			key: this.tokens.screen_name,
			id: this.tokens.user_id,
			username: this.tokens.screen_name,
			token: this.tokens.oauth_token,
			secret: this.tokens.oauth_token_secret
		};
		
		currentUser = u;
		cachedUsers.push(u);
		var users = new Lawnchair("phoenixusers");
		users.save(u);
		// 
		// Mojo.Controller.stageController.swapScene({
		// 	'name': 'main',
		// 	transition: Mojo.Transition.crossFade
		// });
	},
	nextTapped: function(event){
		Mojo.Controller.stageController.swapScene({
			'name': 'main',
			transition: Mojo.Transition.crossFade,
			disableSceneScroller: true
		});
	},
	followTapped: function(event){
		var userId = event.currentTarget.id;
		var url = 'http://api.twitter.com/1/friendships/create.json';
		var message = {
	        method: "POST",
	        action: url,
	        parameters: []
	    };
		message.parameters.push(["screen_name", userId]);
		OAuth.completeRequest(message, {
	        consumerKey: twitter.key,
	        consumerSecret: twitter.secret,
	        token: currentUser.token,
	        tokenSecret: currentUser.secret
	    });
	    var authHeader = OAuth.getAuthorizationHeader('http://api.twitter.com', message.parameters);
	    var request = new Ajax.Request(url, {
	        method: "POST",
	        requestHeaders: {
	            Authorization: authHeader,
	            Accept: 'application/json'
	        },
	        postBody: "screen_name=" + userId,
	        onSuccess: function(transport){
				banner('Thanks for following!');
			},
	        onFailure: function(transport){
				ex('Sadface! There was an error...');
	        }
	    });
	},
	listen: function(event){
		this.controller.listen('next', Mojo.Event.tap, this.nextTapped.bind(this));
		this.controller.listen('rmxdave', Mojo.Event.tap, this.followTapped.bind(this));
		this.controller.listen('phnxapp', Mojo.Event.tap, this.followTapped.bind(this));		
	},
	cleanup: function(event){
		this.controller.stopListening('next', Mojo.Event.tap, this.nextTapped());
		this.controller.stopListening('rmxdave', Mojo.Event.tap, this.followTapped());
		this.controller.stopListening('phnxapp', Mojo.Event.tap, this.followTapped());
	}
};
