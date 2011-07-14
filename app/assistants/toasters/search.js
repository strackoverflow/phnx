var SearchToaster = Class.create(Toaster, {
	initialize: function(title, response, assistant) {
		this.id = toasterIndex++;
		this.nodeId = 'toaster-' + this.id;
		this.shim = true;
		this.assistant = assistant;
		this.controller = getController();
		this.user = this.controller.stageController.user;
		this.title = title;

		var items = response.results;
		var th = new TweetHelper();
		for (var i=0; i < items.length; i++) {
			items[i] = th.processSearch(items[i]);
		}
		
		this.listModel = {"items": items};
		
		this.render({'toasterId':this.id, title: this.title}, 'templates/toasters/status-list');
		
		this.controller.setupWidget('status-scroller-' + this.id, {mode: 'vertical'},{});
		this.controller.setupWidget('status-list-' + this.id, {itemTemplate: "templates/tweets/search",listTemplate: "templates/list", renderLimit: 200}, this.listModel);

	},
	setup: function() {
		this.controller.instantiateChildWidgets(get('toasters'));
		
		var screenHeight = this.controller.window.innerHeight;
		get('status-scroller-' + this.id).setStyle({'max-height': (screenHeight - 65) + 'px'});
		get(this.nodeId).setStyle({'max-height': (screenHeight - 45) + 'px'});
		this.controller.listen(get('status-list-' + this.id), Mojo.Event.listTap, this.tweetTapped.bind(this));
	},
	tweetTapped: function(event) {
		// load the tweet first so we can get the user object and reply IDs, and other info
		// (not included in search results)
		var Twitter = new TwitterAPI(this.user);
		Twitter.getStatus(event.item.id_str, function(response){
			var th = new TweetHelper();
			var tweet = th.process(response.responseJSON);
			this.assistant.toasters.add(new TweetToaster(tweet, this.assistant));
		}.bind(this));
	}
});