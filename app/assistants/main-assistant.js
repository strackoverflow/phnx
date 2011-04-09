// TODO: Profile list listeners, user buttons (follow, mention, DM, block/spam)

function MainAssistant() {

	this.offset = 0;
	this.currentPage = 0; //index position of the item in the below array
	
	this.currentTweet = {}; //placeholder for when a tweet is tapped
	this.tweetBar = false; //flag. true when the tweetbar is visible
	this.rtBar = false; //true when the RT bar is visible
	this.linksBar = false; //true when the links bar is visible
	this.setupComplete = false;
	this.loadingMore = false; //flag to determine if items should go to the bottom of a list
	this.accountPanel = false; //is the account panel open?
	this.imagePreview = false;
	this.loading = false;
	this.convo = false; //is the conversation view open?
	this.profile = false;
	//some compose variables
	this.compose = {
		visible: false,
		sending: false, //to prevent chained duplicate submissions
		reply_to: null,
		lat: null,
		lng: null
	};
	
	this.count = 80; //how many tweets to load each request
	this.renderLimit = 1000; //umm...this scares me. used in list widgets
	
	/**
		this.panels:
			@panel id is used for html elements (and some misc stuff)
			@index is used rarely
			@position is used in panel templates
			@resource is used by the resource helper to figure out endpoint urls
			@refresh tells if this panel should be refreshed globally
			@update tells if this panel should be updated globally
			
		TODO: make panels truly dynamic
	**/
	
	this.panels = [
		{index: 0, position: 1, id: "home", title: "home", type: "timeline", resource: "home", height: 0, refresh: true, update: true, state: {left: 0, top: 0}, model: {items:[]}},
		{index: 1, position: 2, id: "mentions", title: "mentions", type: "timeline", resource: "mentions", height: 0, refresh: true, update: true,	state: {left: -133, top: 0}, model: {items:[]}},
		{index: 2, position: 3, id: "messages", title: "messages", type: "timeline", resource: "messages", height: 0, refresh: true, update: true,	state: {left: -339, top: 0}, model: {items:[]}}
		//{id: "navLists", title: "lists", type: "all-lists", state: {left: -559, top: 0}},
		//{id: "navSearch", title: "search", type: "search", state: {left: -654, top: 0}}
	];
	
	this.timeline = 0; //index position of the timeline, default to first one
	this.users = new Lawnchair('phoenixusers');
}

MainAssistant.prototype = {
	setup: function(){
		var btns = $$(".bar-btn");
		var i;
		for (i=0; i < btns.length; i++) {
			btns[i].addClassName("no-label");
			//btns[i].addClassName("big");
		}
		var menuItems = [
			Mojo.Menu.editItem,
			{
				label: "Accounts",
				command: 'cmdAccounts'
			},
			{
				label: 'Theme',
				items: [
					{label: 'Rebirth', command: 'theme-default'},
					{label: 'Flat', command: 'theme-dark'},
					{label: 'Cobalt', command: 'theme-black'},
					{label: 'Rose', command: 'theme-pink'},
					{label: 'Dexter', command: 'theme-red'},
					{label: 'Commando', command: 'theme-brown'},
					{label: 'Sky', command: 'theme-clouds'},
					{label: '#SB45', command: 'theme-sb45'}
				]
			},
			{
				label: 'Font Size',
				items: [
					{label: 'Small', command: 'font-small'},
					{label: 'Medium', command: 'font-medium'},
					{label: 'Large', command: 'font-large'}
				]
			},
			{
				label: "My Profile",
				command: 'cmdMyProfile'
			},
			{
				label: "Logout @" + currentUser.username,
				command: 'cmdRemoveAccount'
			}
		];
		this.controller.setupWidget(Mojo.Menu.appMenu, {omitDefaultItems: true}, {visible: true, items: menuItems});
		
		this.accountsModel = {
			items: []
		};
		
		this.navModel = {
			items: this.panels
		};
		
		this.convoModel = {
			items: []
		};
		
		this.controller.setupWidget("accounts-scroller",{mode: 'vertical'},{});		
		
		//highlight the first nav button
		this.navModel.items[0].cssClass = "active";
		this.controller.setupWidget("header", {mode: 'horizontal'}, this.model = {});		
		this.controller.setupWidget("nav-list",{itemTemplate: "templates/nav-item",listTemplate: "templates/header-list"}, this.navModel);
		this.controller.setupWidget("accounts-list",{itemTemplate: "templates/account-icon",listTemplate: "templates/list"}, this.accountsModel);
		this.controller.setupWidget('convo-scroller',{mode: 'vertical'},{});
		this.controller.setupWidget('convo-list', {itemTemplate: "templates/tweets/item",listTemplate: "templates/list"}, this.convoModel);
		var that = this;
		this.users.all(function(r){
			that.accountsModel.items = r;
			cachedUsers = r;
			that.controller.modelChanged(that.accountsModel);
		});

		//create the panels
		var panelHtml = "";
		for (i=0; i < this.panels.length; i++) {
			var panel = this.panels[i];			
			var content = Mojo.View.render({
				object: panel,
				template: 'templates/panels/' + panel.type
			});
			panelHtml += content;
			this.controller.get('scrollItems').update(panelHtml); //replace the html every time
			this.controller.setupWidget(panel.id + "-scroller",{mode: 'vertical'},{});
			if (panel.type === "timeline"){
				this.controller.setupWidget('list-' + panel.id,{itemTemplate: "templates/tweets/item",listTemplate: "templates/list", renderLimit: this.renderLimit}, panel.model);
			}
		}
		this.userTweets = {
			items: []
		};
		this.userFavorites = {
			items: []
		};
		this.userMentions = {
			items: []
		};

		this.controller.setupWidget('profile-tweets-list', {itemTemplate: "templates/tweets/user",listTemplate: "templates/list"}, this.userTweets);
		// this.controller.setupWidget('profile-mentions-list', {itemTemplate: "templates/tweets/item",listTemplate: "templates/list"}, this.userMentions);
		this.controller.setupWidget('profile-favorites-list', {itemTemplate: "templates/tweets/item",listTemplate: "templates/list"}, this.userFavorites);
		this.controller.setupWidget("info-scroller",{mode: 'vertical'},{});

		this.controller.setupWidget("profile-tweets-scroller",{mode: 'vertical'},{});
		// this.controller.setupWidget("profile-mentions-scroller",{mode: 'vertical'},{});
		this.controller.setupWidget("profile-favorites-scroller",{mode: 'vertical'},{});
		this.setScrollerSizes();
		var panelElements = $$('.panel');
		var loadMoreBtns = $$('.load-more');
		this.controller.setupWidget(
			"sideScroller", 
			this.attributes = {
				mode: 'horizontal-snap'
			}, 
			this.sideScrollModel = {
				snapElements: { x:	panelElements},
				snapIndex: 0
			}
		);
		this.controller.setupWidget(
			"profile-side-scroller", 
			this.attributes = {
				mode: 'horizontal-snap'
			}, 
			this.sideScrollModel = {
				snapElements: { x:	$$('.profile-panel')},
				snapIndex: 0
			}
		);

		

		//listen to the lists
		for (i=0; i < panelElements.length; i++) {
			var el = panelElements[i];
			this.controller.listen(el, Mojo.Event.listTap, this.tweetTapped.bind(this));
		}
		//listen to the load more buttons
		for (i=0; i < loadMoreBtns.length; i++) {
			var btn = loadMoreBtns[i];
			this.controller.listen(btn, Mojo.Event.tap, this.moreButtonTapped.bind(this));
		}
		//listen to the nav links
		this.controller.listen(this.controller.get('nav-list'), Mojo.Event.listTap, this.navLinkTapped.bind(this));

		var fontCookie = new Mojo.Model.Cookie('phnxFont');
		
		//load the theme
		if (typeof(fontCookie.get()) !== "undefined"){
			$('scene-container').addClassName(fontCookie.get().fontName);
		}
		else{
			$('scene-container').addClassName('font-small');
		}
		
		this.addListeners();
		
		//scroll up the command bar
		this.controller.get("command-bar").setStyle({"bottom": "0px"});
		//load things!
		this.refreshAll();
	},
	
	handleCommand: function(event){
		if (event.type === Mojo.Event.back){
			if (this.compose.visible){
				this.toggleCompose(false);	
			}	
			else if (this.tweetBar && !this.rtBar){
				this.showTweetBar(false);
			}
			else if (this.tweetBar && this.rtBar){
				this.controller.get("tweet-bar").setStyle({"bottom":"0px"});
				this.controller.get("rt-bar").setStyle({"bottom":"-200px"});
				this.rtBar = false;
			}
			else if (this.imagePreview){
				this.closePreview();
			}
			else if (this.convo){
				this.hideConvo();
			}
			else if (this.profile){
				this.hideProfile();
			}
			else if (this.accountPanel){
				this.toggleAccountPanel(false);
			}
			else if (!this.accountPanel && !this.compose.visible && !this.tweetBar && !this.rtBar){
				this.toggleAccountPanel(true);
			}
			event.stop();
		}
		else if (event.type === Mojo.Event.forward){
			if (!this.loading){
				this.refresh();
			}
		}
		else if (typeof(event.command) !== 'undefined'){
			if (event.command.indexOf('theme-') > -1){
				this.switchTheme(event.command);
			}
			else if (event.command.indexOf('font-') > -1){
				this.changeFont(event.command);
			}
			else if (event.command === 'cmdAccounts'){
				banner('Tip: back gesture to show accounts');
				this.toggleAccountPanel(true);
			}
			else if (event.command === 'cmdMyProfile'){
				this.showProfile(currentUser.username, true);
			}
			else if (event.command === 'cmdRemoveAccount'){
				this.users.remove(currentUser.key);
				this.users.all(function(r){
					cachedUsers = r;
					if (cachedUsers.length > 0){
						currentUser = cachedUsers[0];
						Mojo.Controller.stageController.swapScene({
							'name': 'main',
							transition: Mojo.Transition.crossFade,
							disableSceneScroller: true
						});
					}
					else{
						Mojo.Controller.stageController.swapScene({
							'name': 'launch',
							transition: Mojo.Transition.crossFade
						});
					}
				});
			}
		}
	},
	
	switchTheme: function(command){
		var theme = command.substr(command.indexOf('-') + 1);
		var classes = $$('body')[0].classNames();
		var i;
		for (i=0; i < classes.length; i++) {
			$$('body')[0].removeClassName(classes[i]);
		}
		
		$$('body')[0].addClassName(theme);
		
		//add cookie to save theme
		var themeCookie = new Mojo.Model.Cookie('phnxTheme');
		themeCookie.put({
			className: theme 
		});
	},
	changeFont: function(font){
		//var font = command.substr(command.indexOf('-') + 1);
		var classes = $('scene-container').classNames();
		var i;
		for (i=0; i < classes.length; i++) {
			$('scene-container').removeClassName(classes[i]);
		}
		$('scene-container').addClassName(font);

		var fontCookie = new Mojo.Model.Cookie('phnxFont');
		fontCookie.put({
			fontName: font 
		});
	},
	setScrollerSizes: function(){
		//header 64px on 320 width devices, 128 on hi-res devices
		//TODO: set navScroller dynamically
		//TODO: set SCROLL STATES for nav items dynamically (oh boy...)

		var screenHeight = this.controller.window.innerHeight;
		var screenWidth = this.controller.window.innerWidth;
		var height = screenHeight - 64; //subtract the header
		var i;
		//grab each panel element. There should be as many of these as there are in this.panels
		var panelElements = $$(".panel");
		var totalWidth = 0; //the width of the main container
		for (i=0; i < panelElements.length; i++) {
			var panel = panelElements[i];
			panel.setStyle({
				"width": screenWidth + "px"
			});
			totalWidth += screenWidth;

			//each scroller needs a max height. otherwise they don't scroll
			this.controller.get(this.panels[i].id + "-scroller").setStyle({"max-height": height + "px"});
		}
		
		//set the container width
		this.controller.get('scrollItems').setStyle({'width' : totalWidth + 'px'});
		//set the height of the dark 'shim' that we use sometimes
		this.controller.get('shim').setStyle({'height': screenHeight + 'px'});
		//set the height of the accounts bar
		this.controller.get('accounts-panel').setStyle({'height': screenHeight + 'px'});
		this.controller.get('convo-scroller').setStyle({'max-height': (screenHeight - 60) + 'px'});
		this.controller.get('profile-panel').setStyle({'height': (screenHeight - 20) + 'px' });
		
		//set the height of profile scrollers
		this.controller.get('profile-tweets-scroller').setStyle({'max-height': (screenHeight - 134) + 'px'});
		this.controller.get('profile-favorites-scroller').setStyle({'max-height': (screenHeight - 134) + 'px'});
		$('image-preview').hide();
	},
	
	navLinkTapped: function(event){
		var panelId = event.item.id;
		var panelIndex;
		var i;
		//get the index of the panel for the nav item
		for (i=0; i < this.panels.length; i++) {
			if (this.panels[i].id === panelId){
				panelIndex = i;
			}
		}
		
		//if it's the current panel, scroll to the top
		//otherwise, scroll to that panel
		if (this.timeline === panelIndex){
			this.controller.get('list-' + panelId).mojo.revealItem(0, true);
		}else{
			this.scrollTo(panelIndex);
		}
		
	},
	
	scrollTo: function(idx){
		//this moves the horizontal scroller
		this.controller.get("sideScroller").mojo.setSnapIndex(idx, true);
	},

	scrollerChanged: function(event){
		var panel = this.panels[event.value];
		//update the index
		this.timeline = event.value;
		//scroll the top nav
		this.scrollNav(panel.id);
	},
	
	scrollNav: function(id){
		//if this selector breaks, use the "class" attribute in the navModel items
		var divs = $$(".nav-item");
		var i;
		//remove the active class from any items that have it
		for (i=0; i < divs.length; i++) {
			divs[i].removeClassName("active");
		}
		
		//move the nav scroller to the preset state
		for (i=0; i < this.navModel.items.length; i++) {
			var nav = this.navModel.items[i];
			if (nav.id === id){
				this.controller.get("header").mojo.setState(nav.state, true);
			}
		}
		this.controller.get('nav-' + id).addClassName("active");
	},
	
	scrollMovement: function(event){
		//this function was created for "infinite scrolling"
		//not in use - too unstable
		var scroller = this.controller.get(event.srcElement.id);
		var timeline = "";
		var size = 0;
		if (scroller.id === "tweets-scroller"){
			size = this.tweetsModel.items.length;
			timeline = "tweets";
		}
		//var size = scroller.mojo.scrollerSize().height;
		var position = scroller.mojo.getScrollPosition().top;
		var leeway = size * - 50; //assume px per status item. lower number means load starts further from bottom. range 40-80px
		if ((position / leeway) > 1.2){
			this.loadMore(timeline);
		}
	},
	
	toggleAccountPanel: function(show){
		if (show){
			this.controller.get('accounts-panel').setStyle({
				'left' : '0px'
			});
			this.accountPanel = true;
		}
		else{
			this.controller.get('accounts-panel').setStyle({
				'left' : '-85px'
			});
			this.accountPanel = false;
		}
	},
	refreshAll: function(){
		//loads all timelines
		var i;
		this.loadingMore = false;
		var lastId = 0;
		for (i=0; i < this.panels.length; i++) {
			var panel = this.panels[i];
			if (panel.refresh){
				if (panel.model.items.length > 0){
					lastId = panel.model.items[0].id_str;
				}
				if (lastId === 0){
					this.getTweets(panel);
				}else{
					this.getTweets(panel, lastId); 
				}
			}
		}
	},
	refresh: function(){
		//refreshes the current timeline
		this.loadingMore = false;
		var lastId = 0;
		var panel = this.panels[this.timeline];
		if (panel.refresh){
			if (panel.model.items.length > 0){
				var tweet = panel.model.items[0];
				if (tweet.is_rt){
					lastId = tweet.original_tweet.id_str;
				}
				else{
					lastId = tweet.id_str;
				}
			}
			if (lastId === 0){
				this.getTweets(panel);
			}else{
				this.getTweets(panel, lastId); 
			}
		}
	},
	loadMore: function(timeline){
		this.loadingMore = true;
		var model = this.panels[this.timeline].model;
		var maxId = model.items[model.items.length - 1].id_str;
		this.getTweets(this.panels[this.timeline], undefined, maxId);
	},
	getTweets: function(panel, lastId, maxId){
		this.loading = true;
		var rh = new ResourceHelper();
		var url = rh.url(panel.resource); //using the resource helper to map endpoints
		var that = this;
		var message = {
			method: "GET",
			action: url,
			parameters: []
		};
		var i;
		//when using OAuth, parameters must be included in the request body
		//and in the base signature of the Auth Header
		message.parameters.push(["include_entities","true"]);
		message.parameters.push(["count",this.count]);
		var params = "include_entities=true&count=" + this.count;
		if (typeof(lastId) !== "undefined" && lastId !== 0){
			params += "&since_id=" + lastId;
			message.parameters.push(["since_id",lastId]);
		}
		if (typeof(maxId) !== "undefined" && maxId !== 0){
			params += "&max_id=" + maxId;
			message.parameters.push(["max_id",maxId]);
		}
		OAuth.completeRequest(message, {
			consumerKey: twitter.key,
			consumerSecret: twitter.secret,
			token: currentUser.token,
			tokenSecret: currentUser.secret
		});
		var authHeader = OAuth.getAuthorizationHeader('https://api.twitter.com', message.parameters);
		this.controller.get("refresh").addClassName("spin");
		var req = new Ajax.Request(url, {
			method: "GET",
			requestHeaders: {
				Authorization: authHeader,
				Accept: 'application/json'
			},
			parameters: params,
			onSuccess: function(response){
				if (panel.id === "messages"){
					var tweets = response.responseJSON;
					for (i=0; i < tweets.length; i++) {
						tweets[i].user = tweets[i].sender;
						tweets[i].dm = true;
						//tweets[i] = this.processTweet(tweets[i]);
					}
				}
				that.gotItems(panel, response.responseJSON);
			},
			onFailure: function(transport){
				that.controller.get("refresh").removeClassName("spin");
				ex(transport.responseJSON.error);
			}
		});
	},

	gotItems: function(panel, items){
		//ideally this is a one-size-fits-all function
		//for handling timeline responses
		var model = panel.model;
		var scroller = panel.id + "-scroller";
		var more = "more-" + panel.id;

		var xCount = items.length;		
		var tweets = items;
		var i;
		if (tweets.length > 0){
			var count = 0;
			for (i=0; i < tweets.length; i++) {
				tweets[i] = this.processTweet(tweets[i]);
			}
		}
		
		var scrollId = "";
		
		if (model.items.length > 0 && this.loadingMore) {
			//loading more items
			for (i=1; i < tweets.length; i++) {
				//start the loop at i = 1 so tweets aren't duplicated
				model.items.splice((model.items.length - 1) + i, 0, tweets[i]);
			}
			
		}
		else if (model.items.length > 0 && !this.loadingMore){
			//a typical refresh
			var k;
			for (k=0; k < model.items.length; k++) {
				//clear any new tweets
				model.items[k].cssClass = "old-tweet";
			}
			
			var j;
			for (j = tweets.length - 1; j >= 0; j--){
				//doing a backwards (upwards?) loop to get the items in the right order
				if (j === tweets.length - 1){
					tweets[j].cssClass = "new-tweet";
				}
				model.items.splice(0,0,tweets[j]);
			}
			
			scrollId = tweets.length;
		}
		else{
			model.items = tweets;		
		}
		
		this.updateLists();
		if (scrollId != ""){
			this.controller.get('list-' + panel.id).mojo.revealItem(scrollId, true);
		}
		this.controller.get('refresh').removeClassName('spin');
		this.controller.get(more).show();
		this.loading = false;
	},
	processTweet: function(tweet){
		//takes a tweet and does all sorts of stuff to it
		if (!tweet.dm){
			if (typeof(tweet.retweeted_status) !== "undefined"){
				var orig = tweet;
				var retweeter = tweet.user;
				tweet = tweet.retweeted_status;
				tweet.retweeter = retweeter;
				tweet.original_tweet = orig;
				tweet.is_rt = true;
				tweet.footer = "<br />Retweeted by " + retweeter.screen_name;
			}
			else{
				tweet.is_rt = false;
			}
			//disable clickable source links
			tweet.source = "via " + tweet.source.replace('href="', 'href="#');
		}
		//keep the plaintext version for quote-style RTs (so HTML doesn't get tossed in there)
		tweet.stripped = tweet.text;
		tweet.text = tweet.text.parseLinks();
		tweet.time_str = this.timeSince(tweet.created_at);
		return tweet;
	},
	timeSince: function(time){
		//using a modified Date function in helpers/date.js
		var d = new Date(time);
		return d.toRelativeTime(1500);
	},
	updateLists: function(){
		//updates the time on old tweets and notices new items
		var j;
		for (j=0; j < this.panels.length; j++) {
			var panel = this.panels[j];
			var mod = panel.model;
			var i;
			for (i=0; i < mod.items.length; i++) {
				var tweet = mod.items[i];
				tweet.time_str = this.timeSince(tweet.created_at);
			}
			this.controller.modelChanged(mod);
			// this.controller.get("list-" + panel.id).mojo.noticeUpdatedItems(0,mod.items);
			// this.controller.get("list-" + panel.id).mojo.setLength(mod.items.length);	
			//this.controller.get(scroller).mojo.adjustBy(0,1); //move the scroller by 1px
		}
	},
	newTweet: function(event){
		//$("command-bar").setStyle({"bottom":"-100px"});
		if (!this.compose.visible){
			this.toggleCompose(true);
		}else{
			this.toggleCompose(false);
		}
	},
	toggleCompose: function(show, type){
		if (show){
			var bottom = "80px";
			var arrow = "240px";
			if (type === "reply"){
				this.controller.get("txtTweet").value = "@" + this.currentTweet.user.screen_name + " ";
				this.compose.reply_to = this.currentTweet.id_str;
			}
			else if (type === 'rt'){
				this.controller.get("txtTweet").value = "RT @" + this.currentTweet.user.screen_name + " - " + this.currentTweet.stripped;
			}
			else if (type === 'dm'){
				this.controller.get("txtTweet").value = "d " + this.currentTweet.user.screen_name + " ";
			}
			this.updateCounter();
			this.compose.visible = true;
			this.controller.get('submit-tweet').show();
			this.controller.get('new-tweet').hide();
			this.controller.get("compose").setStyle({"bottom": bottom});
			this.showTweetBar(false);
		}else{
			this.compose.visible = false;
			this.controller.get('submit-tweet').hide();
			this.controller.get('new-tweet').show();
			this.controller.get("compose").setStyle({"bottom":"-190px"});
			this.controller.get("txtTweet").value = "";
			this.compose.reply_to = null;
		}
		$('txtTweet').focus();
	},
	tweetTapped: function(event){
		if (!this.tweetBar){
			this.currentTweet = event.item;
			this.showTweetBar(true);
		}
		else{
			this.showTweetBar(false);
			if (this.rtBar){
				this.controller.get("rt-bar").setStyle({"bottom":"-200px"});
			}
		}
	},
	tweetBarButtonTapped: function(event){
		var id = event.srcElement.id;
		if (id === "reply"){
			this.toggleCompose(true, "reply");		
		}
		else if (id === "retweet"){
			this.rtBar = true;
			$("tweet-bar").setStyle({"bottom":"-300px"});
			$("rt-bar").setStyle({"bottom":"0px"});
		}
		else if (id === "confirm-rt"){
			this.retweet(this.currentTweet.id_str);
			this.showTweetBar(false);
		}
		else if (id === "edit-rt"){
			this.toggleCompose(true, "rt");
		}
		else if (id === "favorite"){
			this.addFavorite(this.currentTweet.id_str);
			this.showTweetBar(false);
		}
		else if (id === "delete"){
			this.deleteTweet(this.currentTweet.id_str);
		}
		else if (id === 'dm'){
			this.toggleCompose(true, "dm");
			this.showTweetBar(false);
		}
		else if (id === 'convo'){
			//banner('Coming in the next version!');
			this.showConvo(this.currentTweet);
		}
		// else if (id === "more"){
		//	//this.showTweetBar(false);
		//	//this.showMoreMenu(event);
		// }
		// else if (id === "profile"){
		//	this.showTweetBar(false);
		//	// Mojo.Controller.stageController.pushScene({
		//	//	name: "profile",
		//	//	transition: Mojo.Transition.crossFade
		//	// }, this.currentTweet.user);
		// }
	},
	showTweetBar: function(show){

		if (show){
			if (this.convo){
				this.hideConvo();
			}
			if (this.profile){
				this.hideProfile();
			}
			this.tweetBar = true;
			if (this.panels[this.timeline].id !== "messages"){
				if (this.currentTweet.user.id == currentUser.id){
					this.controller.get("retweet").hide();
					this.controller.get("favorite").hide();
					this.controller.get("reply").hide();
					this.controller.get("delete").show();
				}
				else{
					this.controller.get("retweet").show();
					this.controller.get("favorite").show();
					this.controller.get("reply").show();
					this.controller.get("delete").hide();			
				}
				if (this.currentTweet.in_reply_to_status_id_str === null){
					this.controller.get("convo").hide();
				}else{
					this.controller.get("convo").show();
				}
				this.controller.get("dm").hide();
			}else{
				this.controller.get("dm").show();
				this.controller.get("reply").hide();
				this.controller.get("retweet").hide();
				this.controller.get("favorite").hide();
				this.controller.get("reply").hide();
				this.controller.get("convo").hide();
				this.controller.get("delete").hide();
			}
			var content = Mojo.View.render({
				object: this.currentTweet,
				template: 'templates/tweets/details'
			});

			this.controller.get("tweet-details").update(content);
			this.controller.get("shim").setStyle({"opacity":1, "display": "block"});
			this.controller.get("tweet-bar").setStyle({"bottom":"0px"});
			this.controller.get("command-bar").setStyle({"bottom":"-100px"});
			this.toggleCompose(false);
			this.toggleAccountPanel(false);
		}
		else{
			this.currentTweet = null;
			this.tweetBar = false;
			if (this.rtBar){
				$("rt-bar").setStyle({"bottom":"-200px"});
				this.rtBar = false;
			}
			this.controller.get("shim").setStyle({"opacity": 0, "display": "none"});
			this.controller.get("tweet-bar").setStyle({"bottom":"-480px"});
			this.controller.get("command-bar").setStyle({"bottom":"0px"});
		}
	},
	
	//TODO: move these to the resource helper
	addFavorite: function(id){
		var that = this;
		var url = "http://api.twitter.com/1/favorites/create/" + id + ".json";
		this.ajaxPost(url, id, that.favoriteSuccess);
	},
	retweet: function(id){
		var that = this;
		var url = "https://api.twitter.com/1/statuses/retweet/" + id + ".json";
		this.ajaxPost(url, id, that.retweetSuccess);
	},
	deleteTweet: function(id){
		var that = this;
		var url = "https://api.twitter.com/1/statuses/destroy/" + id + ".json";
		this.ajaxPost(url, id, that.deleteSuccess);
	},
	ajaxPost: function(url, id, callback){
		var postBod = "id=" + id;
		var message = {
			method: "POST",
			action: url,
			parameters: []
		};
		message.parameters.push(["id",id]);
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
			postBody: postBod,
			onSuccess: callback.bind(this),
			onFailure: function(transport){
				ex(transport.responseJSON.error);
			}
		}); 
	},
	retweetSuccess: function(response){
		banner("Retweet successful!");
	},
	deleteSuccess: function(response){
		var deleteIndex = 0;
		var i;
		for (i=0; i < this.panels[this.timeline].model.items.length; i++) {
			if (this.panels[this.timeline].model.items[i].id === this.currentTweet.id){
				deleteIndex = i;
			}
		}
		this.panels[this.timeline].model.items.splice(deleteIndex, 1);
		this.controller.modelChanged(this.panels[this.timeline].model);
		banner("No one will ever know...");
		this.showTweetBar(false);
	},
	favoriteSuccess: function(response){
		banner("Favorite created!");
	},
	updateCounter: function(){
		var txt = this.controller.get("txtTweet");
		var count = 140 - txt.value.length;
		this.controller.get("counter").update(count);
	},
	submitTweet: function(){
		if (this.compose.visible && this.controller.get("txtTweet").value.length <= 140 && this.controller.get("txtTweet").value.length > 0 && this.compose.sending === false){
			var that = this;
			this.compose.sending = true;
			this.controller.get("refresh").addClassName("spin");
			var url = 'https://api.twitter.com/1/statuses/update.json';
			var postBod = "status=" + encodeURIComponent(this.controller.get("txtTweet").value);
			var message = {
				method: "POST",
				action: url,
				parameters: []
			};
			message.parameters.push(["status",this.controller.get("txtTweet").value]);
			if (this.compose.reply_to !== null){
				message.parameters.push(["in_reply_to_status_id",this.compose.reply_to]);
				postBod += "&in_reply_to_status_id=" + this.compose.reply_to;
			}
			//message.parameters.push(["lat",this.lat],["long", this.lng]);
			//postBod += "&lat=" + this.lat + "&long=" + this.lng;
			OAuth.completeRequest(message, {
				consumerKey: twitter.key,
				consumerSecret: twitter.secret,
				token: currentUser.token,
				tokenSecret: currentUser.secret
			});
			var authHeader = OAuth.getAuthorizationHeader('http://api.twitter.com', message.parameters);
			
			var txt = this.controller.get("txtTweet").value;
			this.easterEggs(txt);
			
			var request = new Ajax.Request(url, {
				method: "POST",
				requestHeaders: {
					Authorization: authHeader,
					Accept: 'application/json'
				},
				postBody: postBod,
				onSuccess: this.tweetSuccess.bind(this),
				onFailure: function(transport){
					that.compose.sending = false;
					that.controller.get("refresh").removeClassName("spin");
					ex(transport.responseJSON.error);
				}
			});
		}
	},
	tweetSuccess: function(response){
		this.compose.sending = false;
		this.controller.get("refresh").removeClassName("spin");
		this.toggleCompose(false);
		this.showTweetBar(false);
		this.updateCounter();
		this.refresh();
	},
	refreshTapped: function(event){
		if (!this.loading){
			this.refresh();
		}
	},
	moreButtonTapped: function(event){
		this.loadMore(this.timeline);
	},
	windowResized: function(event){
		this.setScrollerSizes();
	},
	shimTapped: function(event){
		if (this.tweetBar){
			this.showTweetBar(false);
		}
		else if (this.imagePreview){
			this.closePreview();
		}
		else if (this.convo){
			this.hideConvo();
		}
		else if (this.profile){
			this.hideProfile();
		}
	},
	newAccountTapped: function(event){
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
		 Mojo.Controller.stageController.swapScene('oauth', oauthConfig);
	},
	accountTapped: function(event){
		currentUser = event.item;
		Mojo.Controller.stageController.swapScene({
			'name': 'main',
			transition: Mojo.Transition.crossFade,
			disableSceneScroller: true
		});
	},
	composeHeld: function(event){
		//banner('Coming soon!');
	},
	detailsTapped: function(event){
		var e = event.target;
		if (e.id === 'link'){
			var url = e.innerText;
			this.handleLink(url);
		}
		else if (e.id === 'user-avatar') {
			this.showProfile(this.currentTweet.user, false);
		}
		else if (e.id === 'user'){
			var username = e.innerText.substr(1);
			this.showProfile(username, true);
		}
	},
	submitTweetTapped: function(event){
		this.submitTweet();
	},
	handleLink: function(url){
		//looks for images and other neat things in urls
		if (url.indexOf('yfrog') > -1){
			this.showPreview(url + ':iphone', url);
		}
		else if (url.indexOf('twitpic') > -1) {
			var img = url.substr(url.indexOf('/', 8) + 1);
			this.showPreview('http://twitpic.com/show/large/' + img, url);
		}
		else if (url.indexOf('plixi') > -1) {
			this.showPreview('http://api.plixi.com/api/tpapi.svc/imagefromurl?size=large&url=' + url, url);
		}
		else if (url.indexOf('instagr.am') > -1) {
			this.showPreview('http://davidstrack.com/api/instagram.php?u=' + encodeURIComponent(url), url);
		}
		else if (url.indexOf('.jpg') > -1 || url.indexOf('.png') > -1 || url.indexOf('.gif') > -1 || url.indexOf('.jpeg') > -1){
			this.showPreview(url);
		}
		else{
			this.openBrowser(url);
		}
	},
	showPreview: function(src, url){
		this.imagePreview = true;
		var img = new Image();
		img.src = src;
		$('image-preview').show();		
		var that = this;
		//try to preload the image
		img.onLoad = this.showImage(src, url);
	},
	showImage: function(src, url){
		this.showTweetBar(false);
		$('preview').src = src;
		$('preview').name = url;
		$('shim').setStyle({"opacity": 1, "display": "block"});
		$('command-bar').setStyle({'bottom': '-100px'});
		$('image-preview').addClassName('rotate');
	},
	closePreview: function(){
		this.imagePreview = false;
		this.controller.get("shim").setStyle({"opacity": 0, "display": "none"});
		this.controller.get("command-bar").setStyle({"bottom": "0px"});
		this.controller.get('image-preview').removeClassName('rotate');
		setTimeout(function(){
			$('image-preview').hide();
		}, 1000);
	},
	previewTapped: function(event){
		var e = event.target;
		this.openBrowser(e.name);
		this.closePreview();
	},
	openBrowser: function(url){
		//it's just a link, open the browser
		this.controller.serviceRequest("palm://com.palm.applicationManager", {
			method: "open",
			parameters: {
				id: 'com.palm.app.browser',
				params: {
					scene: 'page',
					target: url
				}
			}
		});
	},
	showConvo: function(tweet){
		//tweet is (presumably) the last tweet in the "conversation"
		//this just finds a chain of replies, not a true conversation
		this.showTweetBar(false);
		if (this.convo){
			this.hideConvo();
		}
		this.controller.get('convo-panel').setStyle({'bottom': '0px'});
		this.controller.get("command-bar").setStyle({"bottom":"-200px"});
		this.controller.get("shim").setStyle({"opacity":1, "display": "block"});
		this.convo = true;
		this.convoModel.items = []; //reset the array
		this.convoModel.items[0] = tweet;
		this.controller.modelChanged(this.convoModel);
		this.getReplyStatus(tweet.in_reply_to_status_id_str);
		setTimeout(function(){
			$('convo-title').addClassName('show');
		}, 500);
	},
	getReplyStatus: function(id){
		var rh = new ResourceHelper();
		var url = rh.url('tweet', {id: id});
		var message = {
			method: "GET",
			action: url,
			parameters: []
		};
		OAuth.completeRequest(message, {
			consumerKey: twitter.key,
			consumerSecret: twitter.secret,
			token: currentUser.token,
			tokenSecret: currentUser.secret
		});
		var authHeader = OAuth.getAuthorizationHeader('https://api.twitter.com', message.parameters);
		var req = new Ajax.Request(url, {
			method: "GET",
			requestHeaders: {
				Authorization: authHeader,
				Accept: 'application/json'
			},
			onSuccess: this.gotReplyStatus.bind(this),
			onFailure: function(transport){
				ex(transport.responseJSON.error);
			}
		});
	},
	gotReplyStatus: function(response){
		var tweet = response.responseJSON;
		this.convoModel.items.push(this.processTweet(tweet));
		this.controller.modelChanged(this.convoModel);
		if (tweet.in_reply_to_status_id_str !== null){
			this.getReplyStatus(tweet.in_reply_to_status_id_str);
		}
	},
	hideConvo: function(){
		this.controller.get('convo-panel').setStyle({'bottom': '-480px'});
		this.controller.get("command-bar").setStyle({"bottom":"0px"});		
		this.controller.get("shim").setStyle({"opacity":0, "display": "none"});
		this.convo = false;
		this.controller.get('convo-title').removeClassName('show');
	},
	showProfile: function(user, load){
		//user is a user JSON object (string)
		//or a string
		this.profile = true;
		if (typeof(user) === "string"){
			this.profileUser = user;
		}
		else{
			this.profileUser = user.screen_name;
		}
		this.controller.get("profile-side-scroller").mojo.setSnapIndex(0, false);
		if (!load){
			this.renderUser(user);
			this.getUserTweets(user.screen_name);
		}
		else {
			this.getUserInfo(user);
		}
		$('profile-panel').setStyle({'bottom':'0px'});
		this.showTweetBar(false);
		$('shim').setStyle({
			'opacity': 1,
			'display': 'block'
		});
		
		$('command-bar').setStyle({'bottom':'-200px'});
	},
	renderUser: function(user) {
		$('profile-avatar').setStyle({'background': 'url(http://api.twitter.com/1/users/profile_image/' + user.screen_name + '.json?size=bigger)'});
		$('profile-name').update(user.name);
		$('profile-location').update(user.location);
		$('profile-url').update(user.url);
		$('profile-bio').update(user.description);
		$('profile-tweets-count').update(this.formatCount(user.statuses_count));
		$('profile-followers-count').update(this.formatCount(user.followers_count));
		$('profile-following-count').update(this.formatCount(user.friends_count));
		
		/*
		$('profile-panel').setStyle({
			'background' : '#' + user.profile_background_color,
			'color' : '#' + user.profile_text_color
		});
		*/
		if (user.following){
			$('unfollow-button').show();
		}
		else {
			$('follow-button').show();
		}
	},
	getUserInfo: function(username){
		var rh = new ResourceHelper();
		var url = rh.url('user');
		this.ajaxGet(url, [['screen_name', username]], this.gotUserInfo);
	},
	gotUserInfo: function(response){
		var user = response.responseJSON;
		this.renderUser(user);
		this.getUserTweets(user.screen_name);
	},
	getUserTweets: function(username){
		var rh = new ResourceHelper();
		var url = rh.url('user_timeline');
		this.ajaxGet(url, [['screen_name',username],['count',100],['include_rts','true']], this.gotUserTweets);
	},
	gotUserTweets: function(response){
		var tweets = response.responseJSON;
		for (var i=0; i < tweets.length; i++) {
			this.processTweet(tweets[i]);
		}
		this.userTweets.items = tweets;
		this.controller.modelChanged(this.userTweets);
	},
	getUserFavorites: function(){
		var rh = new ResourceHelper();
		var url = rh.url('favorites', {screen_name: this.profileUser});
		if (this.userFavorites.items.length === 0){
			this.ajaxGet(url, [['count', 50]], this.gotUserFavorites);
		}
	},
	gotUserFavorites: function(response){
		var tweets = response.responseJSON;
		for (var i=0; i < tweets.length; i++) {
			this.processTweet(tweets[i]);
		}
		this.userFavorites.items = tweets;
		this.controller.modelChanged(this.userFavorites);		
	},
	// getUserMentions: function(username){
	// 	var rh = new ResourceHelper();
	// 	var url = rh.search('@' + username);
	// 	this.ajaxGet(url, [], this.gotUserMentions);
	// },
	// gotUserMentions: function(response){
	// 	var results = response.responseJSON.results;
	// 	
	// },
	hideProfile: function(){
		this.profile = false;
		$('profile-panel').setStyle({'bottom':'-480px'});
		$('shim').setStyle({
			'opacity': 0,
			'display': 'none'
		});
		var scene = this;
		setTimeout(function(){
			//do cleanup after it's hidden
			$('profile-avatar').setStyle({'background': 'transparent'});
			$('profile-name').update('');
			$('profile-location').update('');
			$('profile-url').update('');
			$('profile-bio').update('');
			$('profile-tweets-count').update('');
			$('profile-followers-count').update('');
			$('profile-following-count').update('');
			$('follow-button').hide();
			$('unfollow-button').hide();
			scene.userTweets.items = [];
			scene.userFavorites.items = [];
			scene.userMentions.items = [];
			scene.controller.modelChanged(scene.userTweets);
			scene.controller.modelChanged(scene.userFavorites);
			scene.controller.modelChanged(scene.userMentions);	
			this.profileUser = {};					
		}, 600);
		$('command-bar').setStyle({'bottom':'0px'});
	},
	addCommas: function(nStr){
		//from http://www.mredkj.com/javascript/nfbasic.html
		nStr += '';
		x = nStr.split('.');
		x1 = x[0];
		x2 = x.length > 1 ? '.' + x[1] : '';
		var rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1' + ',' + '$2');
		}
		return x1 + x2;
	},
	formatCount: function(str) {
		var count = parseInt(str, 10);
		if (count > 9999){
			//format in shorthand format for over 10k
			var milForm = count / 1000000;
			var thouForm = count / 1000;
			var newCount;
			if (milForm >= 1){
				//count is in the millions
				newCount = parseInt(milForm, 10);
				return newCount + 'm';
			}
			else if (thouForm >= 1){
				//count is in the thousands
				newCount = parseInt(thouForm, 10);
				return newCount + 'k';
			}
		}
		else {
			//format the count with commas
			return this.addCommas(count);
		}
	},
	profileScrollerChanged: function(event){
		var val = event.value;
		var navDivs = $$('#profile-nav div');
		for (var i=0; i < navDivs.length; i++) {
			navDivs[i].removeClassName('active');
		}
		var btn = '';
		switch(val){
			case 0:
				btn = 'profile-btn-info';
				break;
			case 1:
				btn = 'profile-btn-tweets';
				break;
			// case 2:
			// 	btn = 'profile-btn-mentions';
			// 	break;
			case 2:
				btn = 'profile-btn-favorites';
				this.getUserFavorites();
				break;
		}
		$(btn).addClassName('active');
	},
	ajaxGet: function(url, params, callback){
		//xParams is an array of arrays of additional parameters
		var message = {
			method: "GET",
			action: url,
			parameters: params
		};
		
		var paramStr = "";
		for (var i=0; i < params.length; i++) {
			if (i > 0){
				paramStr += '&';
			}
			paramStr += params[i][0] + "=" + params[i][1];
		}

		OAuth.completeRequest(message, {
			consumerKey: twitter.key,
			consumerSecret: twitter.secret,
			token: currentUser.token,
			tokenSecret: currentUser.secret
		});
		
		var authHeader = OAuth.getAuthorizationHeader('https://api.twitter.com', message.parameters);
		var req = new Ajax.Request(url, {
			method: "GET",
			requestHeaders: {
				Authorization: authHeader,
				Accept: 'application/json'
			},
			parameters: paramStr,
			onSuccess: callback.bind(this),
			onFailure: function(transport){
				ex(transport.responseJSON.error);
			}
		});
	},
	profileNavTapped: function(event){
		var id = event.srcElement.id;
		var idx = 0;
		if (id === 'profile-btn-info'){
			idx = 0;
		}
		else if (id === 'profile-btn-tweets'){
			idx = 1;
		}
		else if (id === 'profile-btn-favorites'){
			idx = 2;
		}
		this.controller.get("profile-side-scroller").mojo.setSnapIndex(idx, true);
	},
	easterEggs: function(t){
		t = t.toLowerCase();
		
		if (t.indexOf('packers') > -1){
			banner('Go Packers!');
		}
		else if (t.indexOf('phnx') > -1){
			banner("Hey, that's me!");
		}
	},
	addListeners: function(event){
		var that = this;
		
		this.controller.listen('sideScroller', Mojo.Event.propertyChange, this.scrollerChanged.bind(this));
		this.controller.listen('refresh', Mojo.Event.tap, this.refreshTapped.bind(this));
		this.controller.listen('new-tweet', Mojo.Event.tap, this.newTweet.bind(this));
		this.controller.listen('reply', Mojo.Event.tap, this.tweetBarButtonTapped.bind(this));
		this.controller.listen('retweet', Mojo.Event.tap, this.tweetBarButtonTapped.bind(this));
		this.controller.listen('favorite', Mojo.Event.tap, this.tweetBarButtonTapped.bind(this));
		this.controller.listen('convo', Mojo.Event.tap, this.tweetBarButtonTapped.bind(this));	
		this.controller.listen('confirm-rt', Mojo.Event.tap, this.tweetBarButtonTapped.bind(this));
		this.controller.listen('edit-rt', Mojo.Event.tap, this.tweetBarButtonTapped.bind(this));
		this.controller.listen('delete', Mojo.Event.tap, this.tweetBarButtonTapped.bind(this));
		this.controller.listen('dm', Mojo.Event.tap, this.tweetBarButtonTapped.bind(this));		
		this.controller.listen('shim', Mojo.Event.tap, this.shimTapped.bind(this));
		this.controller.listen('new-account', Mojo.Event.tap, this.newAccountTapped.bind(this));
		this.controller.listen('accounts-list', Mojo.Event.listTap, this.accountTapped.bind(this));		
		this.controller.listen(this.controller.window, 'resize', this.windowResized.bind(this));
		this.controller.listen('compose', Mojo.Event.hold, this.composeHeld.bind(this));
		this.controller.listen('tweet-details', Mojo.Event.tap, this.detailsTapped.bind(this));
		this.controller.listen('submit-tweet', Mojo.Event.tap, this.submitTweetTapped.bind(this));
		this.controller.listen('preview', Mojo.Event.tap, this.previewTapped.bind(this));
		this.controller.listen('convo-list', Mojo.Event.listTap, this.tweetTapped.bind(this));
		this.controller.listen('profile-side-scroller', Mojo.Event.propertyChange, this.profileScrollerChanged.bind(this));
		this.controller.listen('profile-btn-info', Mojo.Event.tap, this.profileNavTapped.bind(this));
		this.controller.listen('profile-btn-tweets', Mojo.Event.tap, this.profileNavTapped.bind(this));
		this.controller.listen('profile-btn-favorites', Mojo.Event.tap, this.profileNavTapped.bind(this));
		this.controller.listen('profile-tweets-list', Mojo.Event.listTap, this.tweetTapped.bind(this));
		this.controller.listen('profile-favorites-list', Mojo.Event.listTap, this.tweetTapped.bind(this));
		this.controller.listen('profile-url', Mojo.Event.tap, this.profileURLTapped.bind(this));
		this.controller.get(document).observe('keydown', function(e){
			$('txtTweet').focus();
			if (e.keyCode === 13){
				that.submitTweet();
				e.stop();
			}
		});

		this.controller.get(document).observe("keyup", function(e){
			//banner('key: ' + e.keyCode);
			if (e.keyCode !== 27 && e.keyCode !== 57575 && !that.compose.visible){
				//ignore the back gesture
				that.toggleCompose(true);
			}
			else if (e.keyCode !== 130){
				that.updateCounter();
			}
			else if (e.keyCode === 130){
				//SYM KEY WTF??
			}
		});
	},
	profileURLTapped: function(event){
		var url = event.srcElement.innerText;
		this.handleURL(url);
	},
	activate: function(event){
		
	},
	deactivate: function(event){
		
	},
	cleanup: function(event){
		Mojo.Event.stopListening('sideScroller', Mojo.Event.propertyChange, this.scrollerChanged());
		Mojo.Event.stopListening('refresh', Mojo.Event.tap, this.refresh());
		Mojo.Event.stopListening('new-tweet', Mojo.Event.tap, this.newTweet());
		Mojo.Event.stopListening('reply', Mojo.Event.tap, this.tweetBarButtonTapped());
		Mojo.Event.stopListening('retweet', Mojo.Event.tap, this.tweetBarButtonTapped());
		Mojo.Event.stopListening('favorite', Mojo.Event.tap, this.tweetBarButtonTapped());
		Mojo.Event.stopListening('convo', Mojo.Event.tap, this.tweetBarButtonTapped());
		Mojo.Event.stopListening('confirm-rt', Mojo.Event.tap, this.tweetBarButtonTapped());
		Mojo.Event.stopListening('edit-rt', Mojo.Event.tap, this.tweetBarButtonTapped());
		Mojo.Event.stopListening('delete', Mojo.Event.tap, this.tweetBarButtonTapped());
		Mojo.Event.stopListening('dm', Mojo.Event.tap, this.tweetBarButtonTapped());	
		Mojo.Event.stopListening(this.controller.window, 'resize', this.windowResized());
		Mojo.Event.stopListening('shim', Mojo.Event.tap, this.shimTapped());
		Mojo.Event.stopListening('new-account', Mojo.Event.tap, this.newAccountTapped());
		Mojo.Event.stopListening('accounts-list', Mojo.Event.listTap, this.accountTapped());
		Mojo.Event.stopListening('compose', Mojo.Event.hold, this.composeHeld());
		Mojo.Event.stopListening('tweet-details', Mojo.Event.tap, this.detailsTapped());
		Mojo.Event.stopListening('submit-tweet', Mojo.Event.tap, this.submitTweetTapped());
		Mojo.Event.stopListening('preview', Mojo.Event.tap, this.previewTapped());
		Mojo.Event.stopListening('convo-list', Mojo.Event.listTap, this.tweetTapped());
		this.controller.get(document).stopObserving("keyup");
		this.controller.get(document).stopObserving("keydown");
		Mojo.Event.stopListening('profile-side-scroller', Mojo.Event.propertyChange, this.profileScrollerChanged());
		Mojo.Event.stopListening('profile-btn-info', Mojo.Event.tap, this.profileNavTapped());
		Mojo.Event.stopListening('profile-btn-tweets', Mojo.Event.tap, this.profileNavTapped());
		Mojo.Event.stopListening('profile-btn-favorites', Mojo.Event.tap, this.profileNavTapped());
		Mojo.Event.stopListening('profile-tweets-list', Mojo.Event.listTap, this.tweetTapped());
		Mojo.Event.stopListening('profile-favorites-list', Mojo.Event.listTap, this.tweetTapped());
		Mojo.Event.stopListening('profile-url', Mojo.Event.tap, this.profileURLTapped());
		//this.controller.get(document).stopObserving("keypress");
		//document.removeEventListener("keydown", this.enterKeyListener(), true);
	}
};