var LookupToaster = Class.create(Toaster, {
	initialize: function(assistant) {
		this.id = toasterIndex++;
		this.nodeId = 'toaster-' + this.id;
		this.visible = false;
		this.shim = true;
		
		// We save the scene's assistant here
		this.assistant = assistant;
		this.controller = getController();
		this.user = this.controller.stageController.user;
		
		var obj = {
			toasterId: this.id
		};
		
		this.render(obj, 'templates/toasters/lookup');
		get('txtSearch-' + this.id).focus();
	},
	searchTapped: function(event) {
		if (this.controller.get('txtSearch-' + this.id).value.length > 0) {
			var Twitter = new TwitterAPI(this.user);
			Twitter.getUser(get('txtSearch-' + this.id).value, function(r){
				this.controller.stageController.pushScene({
					name: 'profile',
					disableSceneScroller: true
				}, r.responseJSON);
			}.bind(this));	
		}
	},
	setup: function() {		
		Mojo.Event.listen(get('search-' + this.id), Mojo.Event.tap, this.searchTapped.bind(this));
		get('txtSearch-' + this.id).observe('keydown', function(e){
			if (e.keyCode === 13) {
				this.searchTapped();
				e.stop();
			}
		}.bind(this));
	},
	cleanup: function() {
		Mojo.Event.stopListening(get('search-' + this.id), Mojo.Event.tap, this.searchTapped);
	}
});