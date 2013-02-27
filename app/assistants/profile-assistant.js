function ProfileAssistant(user) {
	this.user = user;
	this.renderLimit = 200;
	this.panels = ['history','mentions','favorites','info'];
	this.toasters = new ToasterChain();
}

ProfileAssistant.prototype = {
	setup: function() {
		this.controller.setupWidget(Mojo.Menu.appMenu, {omitDefaultItems: true}, {visible: true, items: global.menuItems});
		this.menuItems = [];
		
		if (this.user.following) {
			this.menuItems.push({
				label: 'Unfollow',
				command: 'cmdUnfollow'
			});
		}
		else {
			this.menuItems.push({
				label: 'Follow',
				command: 'cmdFollow'
			});
		}
		
		this.menuItems.push({
			label: 'Public Mention',
			command: 'cmdMention'
		});
		this.menuItems.push({
			label: 'Send Direct Message',
			command: 'cmdMessage'
		});
		this.menuItems.push({
			label: 'Block',
			command: 'cmdBlock'
		});
		this.menuItems.push({
			label: 'Report Spam',
			command: 'cmdSpam'
		});
		
		if (!this.user.newCard) {
			this.menuItems.push({
				label: 'Open In New Card',
				command: 'cmdNewCard'
			});	
		}
		
		this.historyModel = {items:[]};
		this.mentionsModel = {items:[]};
		this.favoritesModel = {items:[]};
		
		if (this.user.newCard) {
			this.historyModel.items = this.user.history;
			this.mentionsModel.items = this.user.mentions;
			this.favoritesModel.items = this.user.favorites;
			
			// Apply theme / font and all that junk
			var prefs = new LocalStorage();
			var theme = prefs.read('theme');
			this.controller.stageController.loadStylesheet('stylesheets/' + theme +'.css');
			
			var body = this.controller.stageController.document.getElementsByTagName("body")[0];
			var font = prefs.read('fontSize');
			global.setFontSize(body, font);
			
			// var img = this.user.profile_image_url.replace('_normal', '_bigger');
			var img = 'images/low/user-card.png';
			var cardHtml = Mojo.View.render({
				object: {image: img},
				template: 'templates/account-card'
			});
			this.controller.get('account-shim').update(cardHtml);
			
		}
		
		this.account = this.controller.stageController.user;

		var sceneHtml = Mojo.View.render({
			object: this.user,
			template: 'profile/content'
		});
		
		this.controller.get('profile-scene').update(sceneHtml);
		
		// Fix any missing data
		if (this.user.description === '') {
			// Rather than hide the description, we replace it with this text.
			// Since the list looks best with a "first" and "last" element
			this.controller.get('description').update('This user has not filled out their bio.');
		}
		if (this.user.location === '') {
			this.controller.get('location').hide();
		}
		if (!this.user.url) {
			this.controller.get('url').hide();
		}
		
		this.controller.setupWidget('list-history',{itemTemplate: "templates/tweets/item",listTemplate: "templates/list", renderLimit: this.renderLimit}, this.historyModel);
		this.controller.setupWidget('list-mentions',{itemTemplate: "templates/tweets/search",listTemplate: "templates/list", renderLimit: this.renderLimit}, this.mentionsModel);
		this.controller.setupWidget('list-favorites',{itemTemplate: "templates/tweets/item",listTemplate: "templates/list", renderLimit: this.renderLimit}, this.favoritesModel);
		
		for (var i=0; i < this.panels.length; i++) {
			this.controller.setupWidget(this.panels[i] + "-scroller",{mode: 'vertical'},{});
			this.controller.listen(this.controller.get('btn-' + this.panels[i]), Mojo.Event.tap, this.navTapped.bind(this));
		}
		
		var panelElements = this.controller.select('.panel');
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
		
		this.controller.instantiateChildWidgets(this.controller.get('profile-scene'));

		this.setScrollerSizes();
		
		this.controller.listen(this.controller.get('sideScroller'), Mojo.Event.propertyChange, this.scrollerChanged.bind(this));
		this.controller.listen(this.controller.get('list-history'), Mojo.Event.listTap, this.tweetTapped.bind(this));
		this.controller.listen(this.controller.get('list-favorites'), Mojo.Event.listTap, this.tweetTapped.bind(this));
		this.controller.listen(this.controller.get('list-mentions'), Mojo.Event.listTap, this.mentionTapped.bind(this));
		this.controller.listen(this.controller.get('shim'), Mojo.Event.tap, this.shimTapped.bind(this));
		this.controller.listen(this.controller.get('options'), Mojo.Event.tap, this.optionsTapped.bind(this));
		this.controller.listen(this.controller.get('tweets'), Mojo.Event.tap, this.tweetsTapped.bind(this));
		this.controller.listen(this.controller.get('following'), Mojo.Event.tap, this.followingTapped.bind(this));
		this.controller.listen(this.controller.get('followers'), Mojo.Event.tap, this.followersTapped.bind(this));
		this.controller.listen(this.controller.get('url'), Mojo.Event.tap, this.urlTapped.bind(this));
		this.controller.listen(this.controller.get('profile-avatar'), Mojo.Event.tap, this.avatarTapped.bind(this));
		
		if (this.user.id_str === this.account.id) {
			this.controller.get('options').setStyle({'display':'none'});
		}
		
		// Holy eager loading, Batman!
		// Timeout so the scene can be fully set up before requests are made
		// (helps with the Request triggering the loading bar)
		setTimeout(function(){
			
			if (this.user.id_str !== this.account.id) {
				this.checkFollowing();	
			}
			else {
				// lol, lazy
				this.controller.get('follows-verb').update('is');
			}
			
			if (!this.user.newCard) {
				this.getHistory();
				this.getMentions();
				this.getFavorites();	
			}
		}.bind(this), 200);
		
		this.controller.get('btn-history').addClassName('active');
		this.currentPanel = 0;
	},
	checkFollowing: function() {
		var Twitter = new TwitterAPI(this.account);
		Twitter.checkFollow(this.user.id_str, this.account.id, function(response) {
			var following	= false;

			try {
				following = response.responseJSON.relationship.source.following;
			} catch (e) {
			}

			if (following) {
				this.controller.get('follows-verb').update('follows');
			} else {
				this.controller.get('follows-verb').update('does not follow');
				this.menuItems[2].disabled = true;
			}
		}.bind(this));
	},
	handleCommand: function(event) {
		if (event.type === Mojo.Event.back) {
			if (this.toasters.items.length > 0) {
				this.toasters.back();
				event.stop();
			}	
		}
		else if (event.type === Mojo.Event.forward) {
			this.refresh();
		}
	},
	refreshAll: function() {
		this.getHistory({'since_id':this.historyModel.items[0].id_str});
		this.getMentions({'since_id':this.mentionsModel.items[0].id_str});
		this.getFavorites({'since_id':this.favoritesModel.items[0].id_str});
	},
	refresh: function() {
		// Refresh the current panel
		var panel = this.panels[this.currentPanel];
		switch(panel) {
			case 'history':
				this.getHistory({'since_id':this.historyModel.items[0].id_str});
				break;
			case 'mentions':
				this.getMentions({'since_id':this.mentionsModel.items[0].id_str});
				break;
			case 'favorites':
				this.getFavorites({'since_id':this.favoritesModel.items[0].id_str});
				break;
		}
	},
	getHistory: function(opts) {
		var Twitter = new TwitterAPI(this.account);
		
		var args = {
			"user_id": this.user.id_str,
			"count": 100,
			"include_entities": true
		};
		
		for (var key in opts) {
			args[key] = opts[key];
		}
		
		Twitter.getUserTweets(args, function(response){
			var th = new TweetHelper();
			for (var i=0; i < response.responseJSON.length; i++) {
				var tweet = response.responseJSON[i];
				tweet = th.process(tweet);
			}
			if (this.historyModel.items.length === 0) {
				this.historyModel.items = response.responseJSON;
			}
			else {
				for (i = response.responseJSON.length - 1; i >= 0; i--){
					this.historyModel.items.splice(0, 0, response.responseJSON[i]);
				}
			}
			this.user.history = this.historyModel.items;
			this.controller.modelChanged(this.historyModel);
		}.bind(this));
	},
	getMentions: function(opts) {
		var Twitter = new TwitterAPI(this.account);
		var query = '@' + this.user.screen_name;
		
		for (var key in opts) {
			query += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(opts[key]);
		}
		
		Twitter.search('@' + this.user.screen_name, function(response){
			var items = response.responseJSON.results;
			var th = new TweetHelper();
			for (var i=0; i < items.length; i++) {
				items[i] = th.processSearch(items[i]);
			}
			if (this.mentionsModel.items.length === 0) {
				this.mentionsModel.items = items;
			}
			else {
				for (i = items.length - 1; i >= 0; i--){
					this.mentionsModel.items.splice(0, 0, items[i]);
				}
			}
			this.user.mentions = this.mentionsModel.items;
			this.controller.modelChanged(this.mentionsModel);
		}.bind(this));
	},
	getFavorites: function(opts) {
		var Twitter = new TwitterAPI(this.account);
		var args = {
			count:				100,
			include_entities:	true,
			user_id:			this.user.id_str
		};

		for (var key in opts) {
			args[key] = opts[key];
		}

		Twitter.getFavorites(args, function(response) {
			var th = new TweetHelper();
			for (var i=0; i < response.responseJSON.length; i++) {
				var tweet = response.responseJSON[i];
				tweet = th.process(tweet);
			}
			if (this.favoritesModel.items.length === 0) {
				this.favoritesModel.items = response.responseJSON;
			}
			else {
				for (i = response.responseJSON.length - 1; i >= 0; i--){
					this.favoritesModel.items.splice(0, 0, response.responseJSON[i]);
				}
			}
			this.user.favorites = this.favoritesModel.items;
			this.controller.modelChanged(this.favoritesModel);
		}.bind(this));
	},
	setScrollerSizes: function() {
		if (this.controller.window && this.controller) {
			var screenHeight = this.controller.window.innerHeight;
			var screenWidth = this.controller.window.innerWidth;
			var height = screenHeight - 135; //subtract the top stuff
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
				
				// TODO: add some height to the mentions scroller...
				
				//each scroller needs a max height. otherwise they don't scroll
				this.controller.get(this.panels[i] + "-scroller").setStyle({"max-height": height + "px"});
			}
		}
	},
	navTapped: function(event) {
		var id = event.srcElement.id.substr(event.srcElement.id.indexOf('-') + 1);
		for (var i=0; i < this.panels.length; i++) {
			if (this.panels[i] === id) {
				this.scrollTo(i);
			}
		}
	},
	scrollerChanged: function(event) {
		var i = event.value;
		this.currentPanel = i;
		this.controller.select('.active')[0].removeClassName('active');
		this.controller.get('btn-' + this.panels[i]).addClassName('active');
	},
	scrollTo: function(i) {
		this.controller.get("sideScroller").mojo.setSnapIndex(i, true);
	},
	urlTapped: function(event) {
		global.openBrowser(this.user.url);
	},
	tweetsTapped: function(event) {
		this.scrollTo(0);
	},
	tweetTapped: function(event) {
		var tweet = event.item;
		this.toasters.add(new TweetToaster(tweet, this));
	},
	mentionTapped: function(event) {
		var Twitter = new TwitterAPI(this.account);
		Twitter.getStatus(event.item.id_str, function(response){
			var th = new TweetHelper();
			var tweet = th.process(response.responseJSON);
			this.toasters.add(new TweetToaster(tweet, this));
		}.bind(this));	
	},
	shimTapped: function(event) {
		this.toasters.nuke();
	},
	optionsTapped: function(event) {
		
		this.controller.popupSubmenu({
			onChoose: this.popupHandler,
			placeNear: this.controller.get('options'),
			items: this.menuItems
		});
	},
	popupHandler: function(command) {
		switch (command) {
			case 'cmdFollow':
				this.follow();
				break;
			case 'cmdUnfollow':
				this.unfollow();
				break;
			case 'cmdMention':
				this.mention();
				break;
			case 'cmdMessage':
				this.message();
				break;
			case 'cmdBlock':
				this.block();
				break;
			case 'cmdSpam':
				this.spam();
				break;
			case 'cmdNewCard':
				this.newCard();
				break;
		}
	},
	follow: function() {
		var Twitter = new TwitterAPI(this.account);
		Twitter.followUser(this.user.id_str, function(response){
			banner('Now following @' + this.user.screen_name);
			this.menuItems[0] = {label: 'Unfollow', command: 'cmdUnfollow'};
		}.bind(this));
	},
	unfollow: function() {
		var opts = {
			title: 'Are you sure you want to unfollow @' + this.user.screen_name + '?',
			callback: function(){	
				var Twitter = new TwitterAPI(this.account);
				Twitter.unfollowUser(this.user.id_str, function(response){
					banner('Unfollowed @' + this.user.screen_name);
					this.menuItems[0] = {label: 'Follow', command: 'cmdFollow'};
					this.toasters.back();
				}.bind(this));
			}.bind(this)
		};
		
		this.toasters.add(new ConfirmToaster(opts, this));
	},
	mention: function() {
		var opts = {
			text: '@' + this.user.screen_name + ' '
		};
		this.toasters.add(new ComposeToaster(opts, this));
	},
	message: function() {
		var args = {
			user: this.user,
			dm: true
		};
		this.toasters.add(new ComposeToaster(args, this));
	},
	block: function() {
		var opts = {
			title: 'Are you sure you want to block @' + this.user.screen_name + '?',
			callback: function(){	
				var Twitter = new TwitterAPI(this.account);
				Twitter.block(this.user.id_str, function(response){
					banner('Blocked @' + this.user.screen_name);
					this.toasters.back();
				}.bind(this));
			}.bind(this)
		};
		
		this.toasters.add(new ConfirmToaster(opts, this));
	},
	spam: function() {
		var opts = {
			title: 'Are you sure you want to report @' + this.user.screen_name + '?',
			callback: function(){	
				var Twitter = new TwitterAPI(this.account);
				Twitter.report(this.user.id_str, function(response) {
					banner('Reported @' + this.user.screen_name);
					this.toasters.back();
				}.bind(this));
			}.bind(this)
		};
		
		this.toasters.add(new ConfirmToaster(opts, this));
	},
	newCard: function(event) {
		var stageName = global.userStage + global.stageId++;
		
		var appController = Mojo.Controller.getAppController();
		
		var pushCard = function(stageController){
			stageController.user = this.account;
			global.stageActions(stageController);
			this.user.newCard = true;
			stageController.pushScene('profile', this.user);
		}.bind(this);

		appController.createStageWithCallback({name: stageName, lightweight: true}, pushCard);
		
		this.controller.stageController.popScene();
	},
	activate: function(event) {
		// this.controller.get(this.controller.document).observe("keyup", function(e) {
		//	// banner(e.keyCode + ' is the key');
		//	if (e.keyCode !== 27 && e.keyCode !== 57575 && this.toasters.items.length === 0) {
		//		// type to tweet, ignore the back gesture
		//		
		//		// keycodes for punctuation and symbols are not normal
		//		// so only ascii chars are passed to the compose toaster for now...
		//		var text = Mojo.Char.isValidWrittenChar(e.keyCode);
		//		this.toasters.add(new ComposeToaster({text:'@' + this.user.screen_name + ' ' + text}, this));
		//		// this.toggleCompose({
		//		//	'text': text
		//		// }); 
		//	}
		// }.bind(this));	
	},
	avatarTapped: function(event) {
		var img = this.user.profile_image_url.replace('_normal', '');
		this.controller.stageController.pushScene('pictureView', img);
	},
	followingTapped: function(event) {
		var Twitter = new TwitterAPI(this.account);
		Twitter.getFriends(this.user.id_str, function(r){
			this.toasters.add(new UserListToaster('@' + this.user.screen_name + '\'s friends', r, this));			
		}.bind(this));
	},
	followersTapped: function(event) {
		var Twitter = new TwitterAPI(this.account);
		Twitter.getFollowers(this.user.id_str, function(r){
			this.toasters.add(new UserListToaster('@' + this.user.screen_name + '\'s followers', r, this));
		}.bind(this));
	},
	deactivate: function(event) {
		// this.controller.get(this.controller.document).stopObserving('keyup');
	},
	cleanup: function() {
		for (var i=0; i < this.panels.length; i++) {
			this.controller.stopListening(this.controller.get('btn-' + this.panels[i]), Mojo.Event.tap, this.navTapped);
		}
		this.controller.get(this.controller.document).stopObserving('keyup');
		this.controller.stopListening(this.controller.get('sideScroller'), Mojo.Event.propertyChange, this.scrollerChanged);
		this.controller.stopListening(this.controller.get('list-history'), Mojo.Event.listTap, this.tweetTapped);
		this.controller.stopListening(this.controller.get('list-favorites'), Mojo.Event.listTap, this.tweetTapped);
		this.controller.stopListening(this.controller.get('list-mentions'), Mojo.Event.listTap, this.mentionTapped);
		this.controller.stopListening(this.controller.get('shim'), Mojo.Event.tap, this.shimTapped);
		this.controller.stopListening(this.controller.get('options'), Mojo.Event.tap, this.optionsTapped);
		this.controller.stopListening(this.controller.get('tweets'), Mojo.Event.tap, this.tweetsTapped);
		this.controller.stopListening(this.controller.get('following'), Mojo.Event.tap, this.followingTapped);
		this.controller.stopListening(this.controller.get('followers'), Mojo.Event.tap, this.followersTapped);				
		this.controller.stopListening(this.controller.get('url'), Mojo.Event.tap, this.urlTapped);
		this.controller.stopListening(this.controller.get('profile-avatar'), Mojo.Event.tap, this.avatarTapped);
	}
};
