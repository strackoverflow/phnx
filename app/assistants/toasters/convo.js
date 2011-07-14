var ConvoToaster = Class.create(Toaster, {
	initialize: function(tweet, assistant) {
		this.id = toasterIndex++;
		this.nodeId = 'toaster-' + this.id;
		this.visible = false;
		this.shim = true;
		
		this.assistant = assistant;
		this.controller = getController();
		this.user = this.controller.stageController.user;
		this.tweet = tweet;
		this.convoModel = {items: [this.tweet]};
		
		this.render({'toasterId':this.id}, 'templates/toasters/convo');
		
		this.controller.setupWidget('convo-scroller-' + this.id, {mode: 'vertical'},{});
		this.controller.setupWidget('convo-list-' + this.id, {itemTemplate: "templates/tweets/convo-item",listTemplate: "templates/list", renderLimit: 200}, this.convoModel);

		this.getStatus(this.tweet.in_reply_to_status_id_str);
	},
	getStatus: function(id) {
		var Twitter = new TwitterAPI(this.user);
		Twitter.getStatus(id, function(response, meta) {
			var tweet = response.responseJSON;
			var th = new TweetHelper();
			tweet = th.process(tweet);
			this.convoModel.items.push(tweet);
			get('convo-list-' + this.id).mojo.noticeUpdatedItems(0, this.convoModel.items);
			if (tweet.in_reply_to_status_id_str !== null) {
				this.getStatus(tweet.in_reply_to_status_id_str);
			}
		}.bind(this));	
	},
	tweetTapped: function(event) {
		this.assistant.toasters.add(new TweetToaster(event.item, this.assistant));
	},
	setup: function() {
		this.controller.instantiateChildWidgets(get('toasters'));
		
		var screenHeight = this.controller.window.innerHeight;
		get('convo-scroller-' + this.id).setStyle({'max-height': (screenHeight - 65) + 'px'});
		get(this.nodeId).setStyle({'max-height': (screenHeight - 45) + 'px'});
		this.controller.listen(get('convo-list-' + this.id), Mojo.Event.listTap, this.tweetTapped.bind(this));
	},
	cleanup: function() {
		this.controller.stopListening(get('convo-list-' + this.id), Mojo.Event.listTap, this.tweetTapped);
	}
});