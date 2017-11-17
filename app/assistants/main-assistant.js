function MainAssistant(opts) {
	if (typeof(opts) === 'undefined') {
		opts = {};
	}
	this.opts = opts;
	this.offset = 0;
	this.currentPage = 0; //index position of the item in the below array
	
	this.loadingMore = false; //flag to determine if items should go to the bottom of a list
	this.imagePreview = false;
	this.loading = false;
	
	this.savedSearchesLoaded = false;
	this.searchLoaded = false;
	this.switcher = false;
	
	this.count = 100; //how many tweets to load each request
	this.renderLimit = 1000; //umm...this scares me. used in list widgets to prevent flickering...
	this.toasters = new ToasterChain();
}

MainAssistant.prototype = {
	setup: function() {
		// Start the background notifications timer
		global.setTimer();
		
		this.user = this.controller.stageController.user;
		this.users = this.controller.stageController.users; 
		
		var homeItems, mentionsItems, messagesItems, i;

		if (this.user.home && this.user.mentions && this.user.messages) {
			homeItems = this.user.home;
			mentionsItems = this.user.mentions;
			messagesItems = this.user.messages;
			
			// A very sloppy and inelegant way to update the times of these tweets.
			// TODO: Fix this abomination
			var th = new TweetHelper();
			var tweet, d;
			for (i=0; i < homeItems.length; i++) {
				tweet = homeItems[i];
				d = new Date(tweet.created_at);
				tweet.time_str = d.toRelativeTime(1500);
			}
			
			for (i=0; i < mentionsItems.length; i++) {
				tweet = mentionsItems[i];
				d = new Date(tweet.created_at);
				tweet.time_str = d.toRelativeTime(1500);
			}
			
			for (i=0; i < messagesItems.length; i++) {
				tweet = messagesItems[i];
				d = new Date(tweet.created_at);
				tweet.time_str = d.toRelativeTime(1500);
			}
		}
		else {
			homeItems = [];
			mentionsItems = [];
			messagesItems = [];
		}

		/**
			this.panels:
				@id is used for html elements (and some misc stuff)
				@index is used rarely
				@position is used in panel templates
				@resource is used by the resource helper to figure out endpoint urls
				@refresh tells if this panel should be refreshed globally
				@update tells if this panel should be updated globally

			TODO: make panels truly dynamic
		**/

		this.panels = [
			{index: 0, position: 1, id: "home", title: "home", type: "timeline", resource: "home", height: 0, refresh: true, update: true, state: {left: 0, top: 0}, model: {items:homeItems}},
			{index: 1, position: 2, id: "mentions", title: "mentions", type: "timeline", resource: "mentions", height: 0, refresh: true, update: true,	state: {left: -133, top: 0}, model: {items:mentionsItems}},
			{index: 2, position: 3, id: "messages", title: "messages", type: "timeline", resource: "messages", height: 0, refresh: true, update: true,	state: {left: -339, top: 0}, model: {items:messagesItems}},
			{index: 3, position: 4, id: "lists", title: "lists", type: "lists", height: 0, refresh: false, update: false},
			{index: 4, position: 5, id: "search", title: "search", type: "search", height: 0, refresh: false, update: false}
		];

		this.timeline = 0; //index position of the timeline, default to first one
		
		this.controller.get('header-title').update(this.user.username);
		
		// Build the account menu items
		
		var am = new Account();
		am.all(function(r){
			this.users = r;			
		}.bind(this));
		
		var accountMenuItems = [];
		if (this.users) {
			for (i=0; i < this.users.length; i++) {
				accountMenuItems.push({
					label: '@' + this.users[i].username,
					command: 'account-' + this.users[i].id
				});
			}	
		}
		else {
			var me = {
				label: '@' + this.user.username,
				command: 'account-' + this.user.id
			};
			this.users = [me];
			accountMenuItems.push(me);
		}
		
		accountMenuItems.push({
			label: 'New Account',
			command: 'cmdNewAccount'
		});
		
		accountMenuItems.push({
			label: 'Logout @' + this.user.username,
			command: 'cmdRemoveAccount'
		});
		
		var menuItems = [
			Mojo.Menu.editItem,
			{
				label: 'Accounts',
				items: accountMenuItems
			},
			{
				label: 'Lookup User',
				command: 'cmdFindUser'
			},
			{
				label: 'Preferences',
				command: 'cmdPreferences'
			},
			{
				label: 'About phnx',
				command: 'cmdAbout'
			},
			{
				label: 'Contact Support',
				command: 'cmdSupport'
			}
		];
		
		this.controller.setupWidget(Mojo.Menu.appMenu, {omitDefaultItems: true}, {visible: true, items: menuItems});

		// create the panels
		var panelHtml = '';
		for (var j=0; j < this.panels.length; j++) {
			var panel = this.panels[j];			
			var content = Mojo.View.render({
				object: panel,
				template: 'templates/panels/' + panel.type
			});
			panelHtml += content;
			
			this.controller.get('scrollItems').update(panelHtml); 
			
			this.controller.setupWidget(panel.id + "-scroller",{mode: 'vertical'},{});
			if (panel.type === "timeline") {
				this.controller.setupWidget('list-' + panel.id,{itemTemplate: "templates/tweets/item",listTemplate: "templates/list", renderLimit: this.renderLimit}, panel.model);
			}
		}
		
		// Set up Lists and Search widgets
		this.savedSearchesModel = {items: []};
		this.trendingTopicsModel = {items: []};
		
		this.controller.setupWidget('trending-topics-list',{itemTemplate: "templates/search-list-item",listTemplate: "templates/list", renderLimit: 50}, this.trendingTopicsModel);
		this.controller.setupWidget('saved-searches-list',{itemTemplate: "templates/search-list-item",listTemplate: "templates/list", renderLimit: 30}, this.savedSearchesModel);
		
		this.listsModel = {items: []};
		this.listsYouFollowModel = {items: []};
		
		this.controller.setupWidget('your-lists-list',{itemTemplate: "templates/list-item",listTemplate: "templates/list", renderLimit: 30}, this.listsModel);
		this.controller.setupWidget('lists-you-follow-list',{itemTemplate: "templates/list-follows",listTemplate: "templates/list", renderLimit: 30}, this.listsYouFollowModel);
		
		this.setScrollerSizes();
		
		var panelElements = this.controller.select('.panel');
		var loadMoreBtns = this.controller.select('.load-more');
		var timelineLists = this.controller.select('.timeline-list');
		
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
		
		//listen to the lists
		for (i=0; i < timelineLists.length; i++) {
			var el = timelineLists[i];
			this.controller.listen(el, Mojo.Event.listTap, this.tweetTapped.bind(this));
		}
		
		//listen to the load more buttons
		for (i=0; i < loadMoreBtns.length; i++) {
			var btn = loadMoreBtns[i];
			this.controller.listen(btn, Mojo.Event.tap, this.moreButtonTapped.bind(this));
		}
				
		this.addListeners();
		setTimeout(function(){
			this.refreshAll();
			this.loadLists();
			// get the avatar for the minimized card
			this.getUserAvatar();
			
			if (this.opts.autoScroll) {
				var panel = this.getPanel(this.opts.panel);
				this.scrollTo(panel.index);
			}
		}.bind(this),10);
	},
	handleCommand: function(event) {
		if (event.type === Mojo.Event.back) {
			if (this.toasters.items.length > 0) {
				if (this.imagePreview) {
					this.toasters.items[this.toasters.items.length - 1].closePreview();
				}
				else {
					this.toasters.back();
				}
				event.stop();
			}
			
		}
		else if (event.type === Mojo.Event.forward) {
			var prefs = new LocalStorage();
			var onSwipe = prefs.read('forwardSwipe');
			if (Ajax.activeRequestCount === 0) {
				if (onSwipe === 'current') {
					this.refresh();			
				}
				else if (onSwipe === 'all') {
					this.refreshAll();
				}
			}
		}
		else if (typeof(event.command) !== 'undefined') {
			if (event.command.indexOf('theme-') > -1) {
				this.switchTheme(event.command);
			}
			else if (event.command.indexOf('font-') > -1) {
				this.changeFont(event.command);
			}
			else if (event.command.indexOf('account-') > -1) {
				var userId = event.command.substr(event.command.indexOf('-') + 1);
				this.openAccount(userId);
			}
			else if (event.command === 'cmdNewAccount') {
				this.newAccountTapped();
			}
			else if (event.command === 'cmdMyProfile') {
				// this.showProfile(this.user.username, true);
				var Twitter = new TwitterAPI(this.user);
				Twitter.getUser(this.user.username, function(response){
					this.controller.stageController.pushScene({
						name: 'profile',
						disableSceneScroller: true
					}, response.responseJSON);
				}.bind(this));
			}
			else if (event.command === 'cmdFindUser') {
				this.toasters.add(new LookupToaster(this));
			}
			// else if (event.command === 'cmdPreferences') {
			//	// this.controller.stageController.pushScene('preferences');
			// }
			else if (event.command === 'cmdRemoveAccount') {
				this.logout();
			}
		}
	},
	switchTheme: function(command) {
		// var theme = command.substr(command.indexOf('-') + 1);
		// var classes = this.controller.select('body')[0].classNames();
		// var i;
		// for (i=0; i < classes.length; i++) {
		//	this.controller.select('body')[0].removeClassName(classes[i]);
		// }
		// 
		// this.controller.select('body')[0].addClassName(theme);
		// 
		// //add cookie to save theme
		// var themeCookie = new Mojo.Model.Cookie('phnxTheme');
		// themeCookie.put({
		//	className: theme 
		// });
	},
	changeFont: function(cmdFont) {
		var font = cmdFont.substr(cmdFont.indexOf('-') + 1);
		var fonts = ['small', 'medium', 'large'];
		// var body = this.controller.select('body')[0];
		var body = this.controller.document.getElementsByTagName("body")[0];
		for (var i=0; i < fonts.length; i++) {
			Element.removeClassName(body, 'font-' + fonts[i]);
		}
		Element.addClassName(body, 'font-' + font);
		var prefs = new LocalStorage();
		prefs.write('fontSize', font);
	},
	setScrollerSizes: function() {
		if (this.controller.window && this.controller) {
			var screenHeight = this.controller.window.innerHeight;
			var screenWidth = this.controller.window.innerWidth;
			var height = screenHeight - 0; //subtract the header
			// var height = screenHeight; //subtract the header
			var i;
			//grab each panel element. There should be as many of these as there are in this.panels
			
			var panelElements = this.controller.select('.panel');
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
			this.controller.get('image-preview').hide();	
		}
	},
	scrollTo: function(idx) {
		//this moves the horizontal scroller
		this.controller.get("sideScroller").mojo.setSnapIndex(idx, true);
	},
	scrollerChanged: function(event) {
		var panel = this.panels[event.value];
		
		//hide the beacon and new content indicator on the old panel
		var oldPanel = this.panels[this.timeline];
		if (oldPanel.refresh) {
			// newTweets = this.controller.select('#panel-' + oldPanel.id + ' .new-tweet');
			// for (var i=0; i < newTweets.length; i++) {
			//	this.controller.get(newTweets[i]).removeClassName('new-tweet');
			// }
			this.controller.get(oldPanel.id + '-beacon').removeClassName('show');
		}		
		if (event.value === 4) {
			// enable the search box
			this.controller.get('txtSearch').disabled = false;
			if (this.searchLoaded === false) {
				this.searchLoaded = true;
				this.loadSearch();
			}
		}
		else {
			this.controller.get('txtSearch').blur();
			this.controller.get('txtSearch').disabled = true;
		}
		
		//update the index
		this.timeline = event.value;
		// Move the indicator arrow
		this.moveIndicator(panel.id);
	},
	loadSearch: function() {
		// Loads saved searches and trending topics
		var Twitter = new TwitterAPI(this.user);
		Twitter.trends(function(response){
			var resp = response.responseJSON;
			var trends = resp[0].trends;
			this.trendingTopicsModel.items = trends;
			this.controller.modelChanged(this.trendingTopicsModel);
		}.bind(this));
	
		Twitter.getSavedSearches(function(response){
			var savedSearches = response.responseJSON;
			if (savedSearches.length > 0) {
				if (savedSearches.length === 1) {
					this.controller.get('saved-searches').addClassName('single');
				}
				this.savedSearchesModel.items = savedSearches;
				this.controller.modelChanged(this.savedSearchesModel);
				this.controller.get('saved-searches').show();
				this.savedSearchesLoaded = true;
			}
		}.bind(this));
	},
	refreshAll: function() {
		this.refreshPanel(this.panels[0]);
		this.refreshPanel(this.panels[1]);
		this.refreshPanel(this.panels[2]);
	},
	refresh: function() {
		this.refreshPanel(this.panels[this.timeline]);
	},
	refreshPanelId: function(id) {
		this.refreshPanel(this.getPanel(id));
	},
	refreshPanel: function(panel) {
		this.loadingMore = false;
		var lastId = 0;
		if (panel.refresh) {
			if (panel.model.items.length > 0) {
				// grab the second tweet for gap detection
				var tweet = panel.model.items[1];
				
				if (tweet.is_rt) {
					lastId = tweet.original_id;
				}
				else{
					lastId = tweet.id_str;
				}
			}
			if (lastId === 0) {
				this.getTweets(panel);
			}else{
				this.getTweets(panel, lastId); 
			}
		}
		else if (panel.id === 'search') {
			this.loadSearch();
		}
	},
	refreshAndScrollTo: function(id) {
		var panel = this.getPanel(id);
		this.refreshAll();
		this.scrollTo(panel.index);
	},
	getUserAvatar: function() {
		var Twitter = new TwitterAPI(this.user, this.controller.stageController);
		Twitter.getUser(this.user.username, function(r) {
			var img = r.responseJSON.profile_image_url.replace('_normal', '_bigger');
			var cardHtml = Mojo.View.render({
				object: {image: img},
				template: 'templates/account-card'
			});
			this.controller.get('preload').src = img;
			this.controller.get('account-shim').update(cardHtml);
		}.bind(this));
	},
	getPanel: function(id) {
		var panel;
		for (var i=0; i < this.panels.length; i++) {
			panel = this.panels[i];
			if (panel.id === id) {
				return panel;
			}
		}
	},
	loadMore: function(timeline) {
		this.loadingMore = true;
		var model = this.panels[this.timeline].model;
		var maxId = model.items[model.items.length - 1].id_str;
		this.getTweets(this.panels[this.timeline], undefined, maxId);
	},
	getTweets: function(panel, lastId, maxId) {		
		var args = {
			'count': this.count,
			'include_entities': 'true',
			'full_text': 'true'
		};
		
		if (lastId) {
			args.since_id = lastId;
		}
		if (maxId) {
			args.max_id = maxId;
		}
		var Twitter = new TwitterAPI(this.user);
		Twitter.timeline(panel, this.gotItems.bind(this), args, this);
	},
	fillGap: function(panel) {
		var args = {
			count: this.count,
			include_entities: 'true',
			max_id: panel.gapStart,
			since_id: panel.gapEnd
		};
		var Twitter = new TwitterAPI(this.user);
		Twitter.timeline(panel, this.gotGap.bind(this), args, this);
	},
	gotGap: function(response, meta) {
		banner('Not done yet');
	},
	gotItems: function(response, meta) {
		// one-size-fits-all function to handle timeline updates
		// Does lots of looping to update relative times. Needs optimization
		
		var panel = meta.panel;
		var model = panel.model;
		var scroller = panel.id + "-scroller";
		var more = "more-" + panel.id;
		var tweets = response.responseJSON;
		var xCount = tweets.length;
		
		var i;
		
		if (tweets.length > 1) {
			var count = 0;
			for (i=0; i < tweets.length; i++) {
				if (panel.id === 'messages') {
					tweets[i].user = tweets[i].sender;
					tweets[i].dm = true;
				}
				var th = new TweetHelper();
				tweets[i] = th.process(tweets[i]);
			}
			
			if (!this.loadingMore) {
				this.controller.get(panel.id + '-beacon').addClassName('show');
			}
		}
		else {
			this.controller.get(panel.id + '-beacon').removeClassName('show');
		}
		
		var scrollId = 0; // this is the INDEX (not ID, sorry) of the new tweet to scroll to
		
		if (model.items.length > 0 && this.loadingMore) {
			//loading "more" items (not refreshing), so append to bottom
			
			for (i=1; i < tweets.length; i++) {
				//start the loop at i = 1 so tweets aren't duplicated
				model.items.splice((model.items.length - 1) + i, 0, tweets[i]);
			}
			
		}
		else if (model.items.length > 0 && !this.loadingMore) {
			// a typical refresh is being performed here (append to top)
			var k;
			
			// loop through old tweets
			for (k=0; k < model.items.length; k++) {
				// remove the tweet divider
				if (model.items[k].cssClass === 'new-tweet'){
					model.items[k].cssClass = "old-tweet";
				}
			}
			
			var hasGap, loopCount;
			var tweetCount = tweets.length;
			if (tweets[tweets.length - 1].id_str === model.items[0].id_str) {
				// There is no gap if the first tweet is included here
				// Adjust loopCount to exclude this duplicate tweet from being included
				hasGap = false;
				loopCount = tweets.length - 2;
				tweetCount--;
			}
			else {
				hasGap = true;
				loopCount = tweets.length - 1;
				panel.gapStart = tweets[tweets.length - 1].id_str;
				panel.gapEnd = model.items[0].id_str;
			}
			
			hasGap = false; // ignore gap detection in this release
			
			var j;
			for (j = loopCount; j >= 0; j--) {
				//doing a backwards (upwards?) loop to get the items in the right order
				
				if (j === loopCount) {
					tweets[j].cssClass = 'new-tweet';
					
					// These nouns are used in the "X New {Noun}" message
					var nouns = {
						'home': 'Tweet',
						'mentions': 'Mention',
						'messages': 'Direct Message'
					};
					
					// TODO: Make this message tappable to load gaps
					var msg = tweetCount + ' New ' + nouns[panel.id];
					if (tweetCount > 1) {
						msg += 's'; //pluralize
					}
					
					if (hasGap) {
						msg += '<br /><span>Tap to load missing tweets</span>';
					}
					
					tweets[j].dividerMessage = msg;
				}
				model.items.splice(0,0,tweets[j]);
			}
			
			scrollId = tweetCount; // set the index of the new tweet to auto-scroll to
		}
		else{
			// the timeline was empty so do a 1:1 mirror of the tweets response
			model.items = tweets;
		}
		// Write a few (10) of the latest tweets to the user's cache (async)
		this.user[panel.id] = model.items.slice(0,10);
		var account = new Account();
		account.load(this.user);
		account.save();
		
		// Save the recent ids for notification checks
		if (tweets.length > 0 && !this.loadingMore) {
			var store = new LocalStorage();
			store.write(this.user.id + '_' + panel.id, tweets[0].id_str);	
		}
		
		if (panel.update) {
			for (i=0; i < model.items.length; i++) {
				var tweet = model.items[i];
				tweet.time_str = this.timeSince(tweet.created_at);
			}
		}
		
		this.controller.modelChanged(panel.model);
		if (scrollId !== 0) {
			this.controller.get('list-' + panel.id).mojo.revealItem(scrollId, true);
		}
		if (model.items.length === 0 || (this.loadingMore && tweets.length === 0)) {
			this.controller.get(more).hide();
		}
		this.loading = false;
	},
	timeSince: function(time) {
		//using a modified Date function in helpers/date.js
		var d = new Date(time);
		return d.toRelativeTime(1500);
	},
	loadLists: function() {
		var Twitter = new TwitterAPI(this.user);
		Twitter.userLists({'user_id':this.user.id}, function(response){
			var lists = response.responseJSON;
			if (lists.length > 0) {
				if (lists.length === 1) {
					this.controller.get('your-lists').addClassName('single');
				}
				this.listsModel.items = lists;
				this.controller.modelChanged(this.listsModel);	
				this.controller.get('your-lists').show();
			}
		}.bind(this));
		
		Twitter.listSubscriptions({'user_id':this.user.id}, function(response) {
			var subs = response.responseJSON.lists;
			if (subs.length > 0) {
				if (subs.length === 1) {
					this.controller.get('lists-you-follow').addClassName('single');
				}
				this.listsYouFollowModel.items = subs;
				this.controller.modelChanged(this.listsYouFollowModel);
				this.controller.get('lists-you-follow').show();
			}
		}.bind(this));
	},
	newTweet: function(event) {
		if (this.toasters.items.length === 0) {
			this.toggleCompose({});
		}
	},
	toggleCompose: function(opts) {
		this.toasters.add(new ComposeToaster(opts, this));
	},
	refreshTapped: function(event) {
		if (Ajax.activeRequestCount === 0) {
			this.refreshAll();
		}
	},
	moreButtonTapped: function(event) {
		this.loadMore(this.timeline);
	},
	windowResized: function(event) {
		this.setScrollerSizes();
	},
	shimTapped: function(event) {
		this.toasters.nuke();
	},
	newAccountTapped: function(event) {
		var args = {
			name: global.authStage,
			lightweight: true
		};
		
		var self = this;
		var pushMainScene = function(stageController) {
			stageController.user = {};
			stageController.users = self.users;
			stageController.pushScene('oauth', true);
		};
		
		var app = Mojo.Controller.getAppController();
		var authStage = app.getStageProxy(global.authStage);
		if (authStage) {
			authStage.activate();
		}
		else {
			setTimeout(function() {
				app.createStageWithCallback(args, pushMainScene, "card");
			}, 200);
		}
	},
	openAccount: function(userId) {		
		var users = new Account();
		users.all(function(r) {
			var user;
			for (var i=0; i < r.length; i++) {
				var u = r[i];
				if (u.key == userId) {
					user = u;
				}
			}
			var stageName = global.mainStage + user.key;
			var args = {
				name: stageName,
				lightweight: true
			};
			
			var pushMainScene = function(stageController) {
				global.stageActions(stageController);
				var launchArgs = {
					user: user,
					users: r
				};
				stageController.pushScene('launch', launchArgs);
			};
			
			var app = Mojo.Controller.getAppController();
			var userStage = app.getStageProxy(stageName);
			
			if (userStage) {
				userStage.activate();
			}
			else {
				app.createStageWithCallback(args, pushMainScene, "card");	
			}			
		}.bind(this));
	},
	logout: function() {
		var accounts = new Lawnchair('phnxAccounts');
		var user = this.user;
		accounts.remove(user.id);
		var prefs = new LocalStorage();
		var am = new Account();
		am.all(function(r){
			if (r.length > 0) {
				// change the default account to the next one in line
				prefs.write('defaultAccount', r[0].id);
				this.openAccount(r[0].id);	
			}
			else {
				prefs.write('defaultAccount', '0');
				this.newAccountTapped();
				
			}
			setTimeout(function(){
				var app = this.controller.stageController.getAppController();
				app.closeStage(global.mainStage + user.id);
			}.bind(this), 500);
		}.bind(this));	
	},
	tweetTapped: function(event) {
		if (this.toasters.items.length === 0) {
			Mojo.Log.info(event.originalEvent.srcElement.id);
			
			if (event.originalEvent.srcElement.id === 'gap') {
				// Load the gap if it's gappy
				Mojo.Log.info('gaptastic!');
				var panel = this.getPanel(this.panels[this.timeline]);
				this.fillGap(panel);
			}
			else {
				this.toasters.add(new TweetToaster(event.item, this));		
			}
		}
	},
	addCommas: function(nStr) {
		//from http://www.mredkj.com/javascript/nfbasic.html
		//used in the profile toaster to format counts
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
		if (count > 9999) {
			//format in shorthand format for over 10k
			var milForm = count / 1000000;
			var thouForm = count / 1000;
			var newCount;
			if (milForm >= 1) {
				//count is in the millions
				newCount = parseInt(milForm, 10);
				return newCount + 'm';
			}
			else if (thouForm >= 1) {
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
	moveIndicator: function(panelId) {
		var positions = {
			'home': 'first',
			'mentions': 'second',
			'messages': 'third',
			'lists': 'fourth',
			'search': 'fifth'
		};
		
		this.controller.get('indicator').className = ''; // remove existing classes
		this.controller.get('indicator').addClassName(positions[panelId]);
	},
	navButtonTapped: function(event) {
		var id = event.srcElement.id;
		var panelId = id.substr(id.indexOf('-') + 1);
		
		var panelIndex;
		//get the index of the panel for the nav item
		for (i=0; i < this.panels.length; i++) {
			if (this.panels[i].id === panelId) {
				panelIndex = i;
			}
		}
		
		//if it's the current panel, scroll to the top
		//otherwise, scroll to that panel
		if (this.timeline === panelIndex) {
			var scroller = panelId + '-scroller';
			var position = this.controller.get(scroller).mojo.getScrollPosition();
			var size = this.controller.get(scroller).mojo.scrollerSize();
			if (position.top === 0) {
				// scroll to bottom
				this.controller.get(scroller).mojo.scrollTo(0, -99999999, true);
			}
			else {
				this.controller.get(scroller).mojo.scrollTo(0, 0,true);
			}
		}else{
			this.scrollTo(panelIndex);
		}
	},
	listTapped: function(event) {
		var listId = event.item.id_str;
		var Twitter = new TwitterAPI(this.user);
		Twitter.listStatuses({'list_id': listId, "count": "100", 'include_entities': 'true'}, function(response){
			var opts = {
				id: listId,
				name: event.item.slug,
				type: 'list',
				items: response.responseJSON,
				user: this.user
			};
			
			this.controller.stageController.pushScene('status', opts);
		}.bind(this));
	},
	searchListTapped: function(event) {
		var query = event.item.name;
		this.search(query);
	},
	search: function(query) {
		var Twitter = new TwitterAPI(this.user);
		Twitter.search(query, function(response) {
			// this.toasters.add(new SearchToaster(query, response.responseJSON, this));
			var opts = {
				type: 'search',
				query: query,
				items: response.responseJSON.results,
				user: this.user
			};
			this.controller.stageController.pushScene('status', opts);
		}.bind(this));
	},
	rtTapped: function(event) {
		var Twitter = new TwitterAPI(this.user);
		var id = event.srcElement.id;
		var opts = {
			type: 'retweets',
			user: this.user,
			rtType: id
		};
		
		if (id === 'rt-ofyou') {
			Twitter.retweetsOfMe(function(response) {
				if (response.responseJSON.length > 0) {
					opts.name = 'RTs of You';
					opts.items = response.responseJSON;
					this.controller.stageController.pushScene('status', opts);
				}
				else {
					banner('Twitter did not find anything');
				}				
			}.bind(this));
		}
	},
	headerTapped: function(event) {
		// Show the user's profile
		var Twitter = new TwitterAPI(this.user);
		Twitter.getUser(this.user.username, function(response){
			this.controller.stageController.pushScene({
				name: 'profile',
				disableSceneScroller: true
			}, response.responseJSON);
		}.bind(this));
	},
	stageActivate: function(event) {
		var prefs = new LocalStorage();
		if (prefs.read('refreshOnMaximize')) {
			this.refreshAll();
		}
	},
	addListeners: function(event) {
		this.controller.listen(this.controller.get('sideScroller'), Mojo.Event.propertyChange, this.scrollerChanged.bind(this));
		this.controller.listen(this.controller.get('rt-ofyou'), Mojo.Event.tap, this.rtTapped.bind(this));
		this.controller.listen(this.controller.get('refresh'), Mojo.Event.tap, this.refreshTapped.bind(this));
		this.controller.listen(this.controller.get('new-tweet'), Mojo.Event.tap, this.newTweet.bind(this));
		this.controller.listen(this.controller.get('header-title'), Mojo.Event.tap, this.headerTapped.bind(this));
		this.controller.listen(this.controller.get('shim'), Mojo.Event.tap, this.shimTapped.bind(this));		
		this.controller.listen(this.controller.window, 'resize', this.windowResized.bind(this));
		this.controller.listen(this.controller.get('nav-home'), Mojo.Event.tap, this.navButtonTapped.bind(this));
		this.controller.listen(this.controller.get('nav-mentions'), Mojo.Event.tap, this.navButtonTapped.bind(this));
		this.controller.listen(this.controller.get('nav-messages'), Mojo.Event.tap, this.navButtonTapped.bind(this));
		this.controller.listen(this.controller.get('nav-lists'), Mojo.Event.tap, this.navButtonTapped.bind(this));
		this.controller.listen(this.controller.get('nav-search'), Mojo.Event.tap, this.navButtonTapped.bind(this));
		this.controller.listen(this.controller.get('your-lists-list'), Mojo.Event.listTap, this.listTapped.bind(this));
		this.controller.listen(this.controller.get('lists-you-follow-list'), Mojo.Event.listTap, this.listTapped.bind(this));
		this.controller.listen(this.controller.get('saved-searches-list'), Mojo.Event.listTap, this.searchListTapped.bind(this));
		this.controller.listen(this.controller.get('trending-topics-list'), Mojo.Event.listTap, this.searchListTapped.bind(this));
		
		
		this.controller.get(this.controller.document).observe("keyup", function(e) {
			// banner(e.keyCode + ' is the key');
			if (e.keyCode !== 27 && e.keyCode !== 57575 && this.toasters.items.length === 0) {
				// type to tweet, ignore the back gesture
				
				// keycodes for punctuation and symbols are not normal
				// so only ascii chars are passed to the compose toaster for now...
				var text = Mojo.Char.isValidWrittenChar(e.keyCode);
				if (this.timeline !== 4) {
					this.toggleCompose({
						'text': text
					}); 
				}
				else {
					// type to search on the search panel
					if (e.keyCode !== 13) {
						if (this.controller.get('txtSearch').value.length === 0) {
							this.controller.get('txtSearch').value = text;
						}

						var len = this.controller.get('txtSearch').value.length;
						this.controller.get('txtSearch').setSelectionRange(len,len); //focus the cursor at the end
						this.controller.get('txtSearch').focus(); 
					}
				}
			}
		}.bind(this));
		this.controller.get('txtSearch').observe('keydown', function(e) {
			if (e.keyCode === 13 && this.controller.get('txtSearch').value.length > 0) {
				this.search(this.controller.get('txtSearch').value);
				e.stop();
			}
		}.bind(this));
	},
	stopListening: function() {
		this.controller.stopListening(this.controller.get('sideScroller'), Mojo.Event.propertyChange, this.scrollerChanged);
		this.controller.stopListening(this.controller.get('rt-ofyou'), Mojo.Event.tap, this.rtTapped);
		this.controller.stopListening(this.controller.get('refresh'), Mojo.Event.tap, this.refreshTapped);
		this.controller.stopListening(this.controller.get('new-tweet'), Mojo.Event.tap, this.newTweet);
		this.controller.stopListening(this.controller.get('header-title'), Mojo.Event.tap, this.headerTapped);
		this.controller.stopListening(this.controller.get('shim'), Mojo.Event.tap, this.shimTapped);	
		this.controller.stopListening(this.controller.window, 'resize', this.windowResized);
		this.controller.stopListening(this.controller.get('nav-home'), Mojo.Event.tap, this.navButtonTapped);
		this.controller.stopListening(this.controller.get('nav-mentions'), Mojo.Event.tap, this.navButtonTapped);
		this.controller.stopListening(this.controller.get('nav-messages'), Mojo.Event.tap, this.navButtonTapped);
		this.controller.stopListening(this.controller.get('nav-lists'), Mojo.Event.tap, this.navButtonTapped);
		this.controller.stopListening(this.controller.get('nav-search'), Mojo.Event.tap, this.navButtonTapped);
		this.controller.stopListening(this.controller.get('your-lists-list'), Mojo.Event.listTap, this.listTapped);
		this.controller.stopListening(this.controller.get('lists-you-follow-list'), Mojo.Event.listTap, this.listTapped);
		this.controller.stopListening(this.controller.get('saved-searches-list'), Mojo.Event.listTap, this.searchListTapped);
		this.controller.stopListening(this.controller.get('trending-topics-list'), Mojo.Event.listTap, this.searchListTapped);
	},
	activate: function(event) {
		var body = this.controller.stageController.document.getElementsByTagName("body")[0];
		var prefs = new LocalStorage();
		var font = prefs.read('fontSize');
		global.setFontSize(body, font);
		
      		var navBar = this.controller.stageController.document.getElementById("nav-bar");
      		var spacers = this.controller.stageController.document.getElementsByClassName("nav-bar-spacer");
      		var showNavBar = prefs.read('showNavBar');
      		global.showNavBar(navBar,spacers,showNavBar);
	},
	deactivate: function(event) {
		this.controller.get(this.controller.document).stopObserving("keyup");
		this.controller.get('txtSearch').stopObserving('keydown');
	},
	cleanup: function(event) {
		this.stopListening();
	},
	setUser: function(user) {
		this.controller.window.user = user;
	}
};
