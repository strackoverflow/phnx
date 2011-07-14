function AboutAssistant(){}

AboutAssistant.prototype = {
	setup: function() {
		var appMenu = [
			Mojo.Menu.editItem,
			{
				label: 'Contact Support',
				command: 'cmdSupport'
			}
		];
		
		this.controller.setupWidget(Mojo.Menu.appMenu, {omitDefaultItems: true}, {visible: true, items: appMenu});
		this.controller.get('version').update(Mojo.appInfo.version);
		
		this.controller.listen('head-honcho', Mojo.Event.tap, this.awesomeSauce.bind(this));
		this.controller.listen('series-of-tubes', Mojo.Event.tap, this.coolio.bind(this));
	},
	awesomeSauce: function(event) {
		var Twitter = new TwitterAPI(this.controller.stageController.user);
		Twitter.getUser('rmxdave', function(r){
			this.controller.stageController.pushScene({
				name: 'profile',
				disableSceneScroller: true
			}, r.responseJSON);
		}.bind(this));
	},
	coolio: function(event) {
		global.openBrowser('http://phnxapp.com');
	},
	cleanup: function() {
		this.controller.stopListening('head-honcho', Mojo.Event.tap, this.awesomeSauce);
		this.controller.stopListening('series-of-tubes', Mojo.Event.tap, this.coolio);		
	}
};