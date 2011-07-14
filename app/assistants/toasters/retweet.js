var RetweetToaster = Class.create(Toaster, {
	initialize: function(tweet, assistant) {
		this.id = toasterIndex++;
		this.nodeId = 'toaster-' + this.id;
		this.visible = false;
		this.shim = true;
		this.tweet = tweet;
		this.assistant = assistant;
		this.controller = getController();
		this.user = this.controller.stageController.user;
		var obj = {
			toasterId: this.id,
			message: 'Retweet @' + this.tweet.user.screen_name + '\'s status?'
		};
		this.render(obj, 'templates/toasters/retweet');
	},
	publishTapped: function(event) {
		var Twitter = new TwitterAPI(this.user);
		Twitter.action('retweet', this.tweet.id_str, function(response, meta){
			banner('Retweet successful!');
			this.user.retweeted.push(this.tweet.id_str);
			this.tweet.original_id = response.responseJSON.id_str;
			this.assistant.toasters.back();
		}.bind(this));
	},
	editTapped: function(event) {
		// Show compose toaster
		var rtText = 'RT @' + this.tweet.user.screen_name + ': ' + this.tweet.stripped;
		this.assistant.toasters.add(new ComposeToaster({'text': rtText,'rt':true}, this.assistant));
	},
	setup: function() {
		Mojo.Event.listen(get('publish'), Mojo.Event.tap, this.publishTapped.bind(this));
		Mojo.Event.listen(get('edit'), Mojo.Event.tap, this.editTapped.bind(this));
	},
	cleanup: function() {
		Mojo.Event.stopListening(get('publish'), Mojo.Event.tap, this.publishTapped);
		Mojo.Event.stopListening(get('edit'), Mojo.Event.tap, this.editTapped);
	}
});