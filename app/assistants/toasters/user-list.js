var UserListToaster = Class.create(Toaster, {
	initialize: function(title, items, assistant) {
		this.id = toasterIndex++;
		this.nodeId = 'toaster-' + this.id;
		this.shim = true;
		this.assistant = assistant;
		this.controller = getController();
		this.title = title;
		
		this.listModel = {"items": items};
		
		// Use the status list template - it's just a scrollers with a list & title
		this.render({'toasterId':this.id, title: this.title}, 'templates/toasters/status-list');
		
		this.controller.setupWidget('status-scroller-' + this.id, {mode: 'vertical'},{});
		this.controller.setupWidget('status-list-' + this.id, {itemTemplate: "templates/user-item",listTemplate: "templates/list", renderLimit: 100}, this.listModel);

	},
	setup: function() {
		this.controller.instantiateChildWidgets(get('toasters'));
		
		var screenHeight = this.controller.window.innerHeight;
		get('status-scroller-' + this.id).setStyle({'max-height': (screenHeight - 65) + 'px'});
		get(this.nodeId).setStyle({'max-height': (screenHeight - 45) + 'px'});
		this.controller.listen(get('status-list-' + this.id), Mojo.Event.listTap, this.userTapped.bind(this));
	},
	userTapped: function(event) {
		var Twitter = new TwitterAPI(this.controller.stageController.user);
		Twitter.getUser(event.item.screen_name, function(r){
			this.controller.stageController.pushScene({
				name: 'profile',
				disableSceneScroller: true
			}, r.responseJSON);
		}.bind(this));
	},
	cleanup: function() {
		this.controller.stopListening(get('status-list-' + this.id), Mojo.Event.listTap, this.userTapped);
	}
});