function LaunchAssistant() {}

LaunchAssistant.prototype = {
	setup: function() {
		//$('version-info').update("Version " + Mojo.Controller.appInfo.version);
		var that = this;
		this.userCookie = new Mojo.Model.Cookie('phoenixFirstRun');
		this.themeCookie = new Mojo.Model.Cookie('phnxTheme');
		
		//load the theme
		if (typeof(this.themeCookie.get()) !== "undefined"){
			$$('body')[0].addClassName(this.themeCookie.get().className);
		}
		else{
			$$('body')[0].addClassName('default');
		}
		
		if (typeof(this.userCookie.get()) !== "undefined") {
			//using a regular cookie makes sure that the Lawnchair stores have been initialized
			setTimeout(function(){
				that.startApp();
			}, 1000);
		}else{
			//just create the cookie so it isn't null anymore
			this.userCookie.put({
				run: true 
			});
			var user = new Lawnchair('phoenixusers'); //create the lawnchair stores
			var prefs = new Lawnchair('phoenixprefs');
			var timelines = new Lawnchair('phoenixtimelines');
			setTimeout(function(){
				that.controller.get("add-button").setStyle({"bottom":"0px"});
			}, 500);
		}
	},
	startApp: function(){
		var users = new Lawnchair('phoenixusers');
		var that = this;
		users.all(function(r){
			if (r.length === 0){
				var that = this;
				setTimeout(function(){
					that.controller.get("add-button").setStyle({"bottom":"0px"});
				}, 500);
			}else{
				currentUser = r[0];
				cachedUsers = r;
				Mojo.Controller.stageController.swapScene({
					'name': 'main',
					transition: Mojo.Transition.crossFade,
					disableSceneScroller: true
				});
				
			}
		}.bind(this));
	},
	doOAuth: function() {
		this.visited = true;
		var oauthConfig={
			callbackScene:'finishAuth', //Name of the assistant to be called on the OAuth Success
			requestTokenUrl:'https://api.twitter.com/oauth/request_token',
			requestTokenMethod:'GET', // Optional - 'GET' by default if not specified
			authorizeUrl:'https://api.twitter.com/oauth/authorize',
			accessTokenUrl:'https://api.twitter.com/oauth/access_token',
			accessTokenMethod:'GET', // Optional - 'GET' by default if not specified
			consumer_key: twitter.key,
			consumer_key_secret: twitter.secret,
			callback:'http://www.google.com' // Optional - 'oob' by default if not specified
		 };
		 Mojo.Controller.stageController.swapScene('oauth',oauthConfig);
	},
	buttonTapped: function(event){
		this.doOAuth();
	},
	activate: function(event){
		this.controller.listen(this.controller.get("add-button"), Mojo.Event.tap, this.buttonTapped.bind(this));
		//this.controller.listen(this.controller.get("btnGo"), Mojo.Event.tap, this.checkActivation.bind(this));		
	},
	deactivate: function(event){
		this.controller.stopListening(this.controller.get("add-button"), Mojo.Event.tap, this.buttonTapped.bind(this));		
	}
}