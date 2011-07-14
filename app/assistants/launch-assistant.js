function LaunchAssistant(args) {
	if (args.user) {
		this.hasUser = true;
		this.args = args;
	}
	else {
		this.hasUser = false;
	}
}

LaunchAssistant.prototype = {
	setup: function() {
		
		this.controller.setupWidget(Mojo.Menu.appMenu, {omitDefaultItems: true}, {visible: true, items: global.menuItems});
		// this.controller.stageController.Toasters = new ToasterChain();
		
		if (this.hasUser) {
			this.controller.stageController.user = this.args.user;
			this.controller.stageController.users = this.args.users;
			global.accounts = this.args.users;
			setTimeout(function(){
				var opts = {};
				if (this.hasUser && this.args.autoScroll) {
					opts.autoScroll = true;
					opts.panel = this.args.panel;
				}
				this.controller.stageController.swapScene({
					'name': 'main',
					transition: Mojo.Transition.crossFade,
					disableSceneScroller: true
				}, opts); 
			}.bind(this), 500);
		}
		else {
			this.showAddButton();
		}
	},
	showAddButton: function() {
		setTimeout(function(){
			// short delay for visual effect
			this.controller.get('add-button').setStyle({'opacity': '1'});
		}.bind(this), 800); 
	},
	buttonTapped: function(event) {
		this.controller.stageController.swapScene('oauth');
	},
	activate: function(event) {
		//load the current theme
		var prefs = new LocalStorage();
		var theme = prefs.read('theme');
		this.controller.stageController.loadStylesheet('stylesheets/' + theme +'.css');
		
		this.controller.listen(this.controller.get("add-button"), Mojo.Event.tap, this.buttonTapped.bind(this));
	},
	deactivate: function(event) {
		this.controller.stopListening(this.controller.get("add-button"), Mojo.Event.tap, this.buttonTapped);		
	}
};