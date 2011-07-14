function OauthAssistant() {

	var oauthConfig = {
		callbackScene: 'finishAuth', //Name of the assistant to be called on the OAuth Success
		requestTokenUrl: 'https://api.twitter.com/oauth/request_token',
		requestTokenMethod: 'GET', // Optional - 'GET' by default if not specified
		authorizeUrl: 'https://api.twitter.com/oauth/authorize',
		accessTokenUrl: 'https://api.twitter.com/oauth/access_token',
		accessTokenMethod: 'GET', // Optional - 'GET' by default if not specified
		consumer_key: Config.key,
		consumer_key_secret: Config.secret,
		callback: 'http://www.google.com' // Optional - 'oob' by default if not specified
	};
	
	this.message = null;
	this.accessor = null;
	this.authHeader = null;
	this.method=null;
	this.oauth_verifier=null;
	this.callbackScene=oauthConfig.callbackScene;
	this.requestTokenUrl=oauthConfig.requestTokenUrl;
	this.authorizeUrl=oauthConfig.authorizeUrl;
	this.accessTokenUrl=oauthConfig.accessTokenUrl;
	this.consumer_key=oauthConfig.consumer_key;
	this.consumer_key_secret=oauthConfig.consumer_key_secret;
	if(oauthConfig.callback!=undefined)
	this.callback=oauthConfig.callback;
	else
	this.callback='oob';
	if(oauthConfig.requestTokenMethod!=undefined)
	this.requestTokenMethod=oauthConfig.requestTokenMethod;
	else
	this.requestTokenMethod='GET';
	if(oauthConfig.accessTokenMethod!=undefined)
	this.accessTokenMethod=oauthConfig.accessTokenMethod;
	else
	this.accessTokenMethod='GET';
	this.url='';
	this.requested_token='';
	this.exchangingToken=false;
}
OauthAssistant.prototype.setup = function() {
	
	this.controller.setupWidget('browser',{},this.storyViewModel = {});
	this.reloadModel = {
		icon: 'refresh',
		command: 'refresh'
	};
	this.stopModel = {
		icon: 'load-progress',
		command: 'stop'
	};
	this.cmdMenuModel = {
		visible: true,
		items: [{}, this.reloadModel]
	};
	this.controller.setupWidget(Mojo.Menu.commandMenu, {menuClass:'no-fade'}, this.cmdMenuModel);
	Mojo.Event.listen(this.controller.get('browser'),Mojo.Event.webViewLoadProgress, this.loadProgress.bind(this));
	Mojo.Event.listen(this.controller.get('browser'),Mojo.Event.webViewLoadStarted, this.loadStarted.bind(this));
	Mojo.Event.listen(this.controller.get('browser'),Mojo.Event.webViewLoadStopped, this.loadStopped.bind(this));
	Mojo.Event.listen(this.controller.get('browser'),Mojo.Event.webViewLoadFailed, this.loadStopped.bind(this));
	Mojo.Event.listen(this.controller.get('browser'),Mojo.Event.webViewTitleUrlChanged, this.titleChanged.bind(this));
	this.requestToken();
}
OauthAssistant.prototype.titleChanged = function(event) {
	var callbackUrl=event.url;
	var responseVars=callbackUrl.split("?");
	if(!this.exchangingToken && (responseVars[0]==this.callbackURL+'/' || responseVars[0]==this.callbackURL)){
	this.controller.get('browser').hide();
	var response_param=responseVars[1];
	var result=response_param.match(/oauth_token=*/g);
	if(result!=null){
		var params=response_param.split("&");
		var token=params[0].replace("oauth_token=","");
		this.oauth_verifier=params[1].replace("oauth_verifier=","");
		this.exchangeToken(token);
	}
	}
}
OauthAssistant.prototype.signHeader = function (params){
	if(params==undefined)
		params='';
	if(this.method==undefined)
		this.method='GET';
	var timestamp=OAuth.timestamp();
	var nonce=OAuth.nonce(11);
	this.accessor = {consumerSecret: this.consumer_key_secret, tokenSecret : this.tokenSecret};
	this.message = {method: this.method, action: this.url, parameters: OAuth.decodeForm(params)};
	this.message.parameters.push(['oauth_consumer_key',this.consumer_key]);
	this.message.parameters.push(['oauth_nonce',nonce]);
	this.message.parameters.push(['oauth_signature_method','HMAC-SHA1']);
	this.message.parameters.push(['oauth_timestamp',timestamp]);
	if(this.token!=null)
	this.message.parameters.push(['oauth_token',this.token]);
	this.message.parameters.push(['oauth_version','1.0']);
	this.message.parameters.sort()
	OAuth.SignatureMethod.sign(this.message, this.accessor);
	this.authHeader=OAuth.getAuthorizationHeader("", this.message.parameters);
	return true;
}
OauthAssistant.prototype.requestToken = function (){
	this.url=this.requestTokenUrl;
	this.method=this.requestTokenMethod;
	this.signHeader("oauth_callback="+this.callback);
	new Ajax.Request(this.url,{
	method: this.method,
	encoding: 'UTF-8',
	requestHeaders:['Authorization',this.authHeader],
	onComplete:function(response){
		//ex(response.responseText);
		var response_text=response.responseText;
		var responseVars=response_text.split("&");
		var auth_url=this.authorizeUrl+"?"+responseVars[0]+"&oauth_consumer="+this.consumer_key;
		var oauth_token=responseVars[0].replace("oauth_token=","");
		var oauth_token_secret=responseVars[1].replace("oauth_token_secret=","");
		this.requested_token=oauth_token;
		this.token=this.requested_token;
		this.tokenSecret=oauth_token_secret;
		var oauthBrowserParams={
		authUrl:auth_url,
		callbackUrl:this.callback
		}
		this.instanceBrowser(oauthBrowserParams);
	}.bind(this)
	});
}
OauthAssistant.prototype.exchangeToken = function (token){
	this.exchangingToken=true;
	this.url=this.accessTokenUrl;
	this.token=token;
	this.method=this.accessTokenMethod;
	this.signHeader("oauth_verifier="+this.oauth_verifier);
	new Ajax.Request(this.url,{
		method: this.method,
		encoding: 'UTF-8',
		requestHeaders:['Authorization',this.authHeader],
		onComplete:function(response){
			var response_text = response.responseText;
			this.controller.stageController.swapScene({name:this.callbackScene},{source:'oauth',response:response_text});
		}.bind(this)
	});
}
OauthAssistant.prototype.instanceBrowser = function(oauthBrowserParams) {
	this.storyURL = oauthBrowserParams.authUrl;
	this.callbackURL=oauthBrowserParams.callbackUrl
	this.controller.get('browser').mojo.openURL(oauthBrowserParams.authUrl);
}
OauthAssistant.prototype.handleCommand = function(event) {
	if (event.type == Mojo.Event.command) {
		switch (event.command) {
			case 'refresh':
				this.controller.get('browser').mojo.reloadPage();
				break;
			case 'stop':
				this.controller.get('browser').mojo.stopLoad();
				break;
		}
	}
 };
  //  loadStarted - switch command button to stop icon & command
 //
 OauthAssistant.prototype.loadStarted = function(event) {
	this.cmdMenuModel.items.pop(this.reloadModel);
	this.cmdMenuModel.items.push(this.stopModel);
	this.controller.modelChanged(this.cmdMenuModel);
	this.currLoadProgressImage = 0;
 };
  //  loadStopped - switch command button to reload icon & command
 OauthAssistant.prototype.loadStopped = function(event) {
	this.cmdMenuModel.items.pop(this.stopModel);
	this.cmdMenuModel.items.push(this.reloadModel);
	this.controller.modelChanged(this.cmdMenuModel);
 };
  //  loadProgress - check for completion, then update progress
 OauthAssistant.prototype.loadProgress = function(event) {
	var percent = event.progress;
	try {
		if (percent > 100) {
			percent = 100;
		}
		else if (percent < 0) {
			percent = 0;
		}
		// Update the percentage complete
		this.currLoadProgressPercentage = percent;
		// Convert the percentage complete to an image number
		// Image must be from 0 to 23 (24 images available)
		var image = Math.round(percent / 4.1);
		if (image > 23) {
			image = 23;
		}
		// Ignore this update if the percentage is lower than where we're showing
		if (image < this.currLoadProgressImage) {
			return;
		}
		// Has the progress changed?
		if (this.currLoadProgressImage != image) {
			// Cancel the existing animator if there is one
			if (this.loadProgressAnimator) {
				this.loadProgressAnimator.cancel();
				delete this.loadProgressAnimator;
			}
						  // Animate from the current value to the new value
			var icon = this.controller.select('div.load-progress')[0];
			if (icon) {
				this.loadProgressAnimator = Mojo.Animation.animateValue(Mojo.Animation.queueForElement(icon),
											"linear", this._updateLoadProgress.bind(this), {
					from: this.currLoadProgressImage,
					to: image,
					duration: 0.5
				});
			}
		}
	}
	catch (e) {
		Mojo.Log.logException(e, e.description);
	}
 };
  OauthAssistant.prototype._updateLoadProgress = function(image) {
  // Find the progress image
	image = Math.round(image);
	// Don't do anything if the progress is already displayed
	if (this.currLoadProgressImage == image) {
		return;
	}
	var icon = this.controller.select('div.load-progress');
	if (icon && icon[0]) {
		icon[0].setStyle({'background-position': "0px -" + (image * 48) + "px"});
	}
	this.currLoadProgressImage = image;
 };
OauthAssistant.prototype.activate = function(event) {
	var prefs = new LocalStorage();
	var theme = prefs.read('theme');
	this.controller.stageController.loadStylesheet('stylesheets/' + theme +'.css');
}

OauthAssistant.prototype.deactivate = function(event) {

}
OauthAssistant.prototype.cleanup = function(event) {
	Mojo.Event.stopListening(this.controller.get('browser'),Mojo.Event.webViewLoadProgress, this.loadProgress);
	Mojo.Event.stopListening(this.controller.get('browser'),Mojo.Event.webViewLoadStarted, this.loadStarted);
	Mojo.Event.stopListening(this.controller.get('browser'),Mojo.Event.webViewLoadStopped, this.loadStopped);
	Mojo.Event.stopListening(this.controller.get('browser'),Mojo.Event.webViewLoadFailed, this.loadStopped);
	Mojo.Event.stopListening(this.controller.get('browser'),Mojo.Event.webViewTitleUrlChanged, this.titleChanged);
}

