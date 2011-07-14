// Note: phnx themes are not loaded in the dashboard stage so don't use those styles.
function DashboardAssistant(items, resource, account, accounts) {
	this.count = 0;
	this.items = items;
	this.resource = resource;
	this.account = account;
	this.accounts = accounts;
}

DashboardAssistant.prototype = {
	setup: function() {
		
		this.controller.listen(this.controller.stageController.document, Mojo.Event.stageActivate, this.stageActivate.bind(this));
		
		// Display the dashboard
		this.update(this.items, this.resource, this.account, this.accounts);
	},
	update: function(items, resource, account, accounts) {
		this.items = items;
		this.resource = resource;
		this.account = account;
		this.accounts = accounts;
		// Show a new notification and update the dashboard
		var from;
		if (items[0].user) {
			this.title = this.resource.noun + ' from @' + items[0].user.screen_name;
			from = items[0].user.screen_name;
		}
		else {
			// Direct messages have different property names
			this.title = 'Message from @' + items[0].sender.screen_name;
			from = items[0].sender.screen_name;
		}
		this.message = items[0].text;
		this.count += items.length;
		
		var bannerMessage = '@' + from + ': ' + this.message;

		var bannerParams = {
			messageText: bannerMessage,
			soundClass: 'notifications'
		};
		
		Mojo.Controller.getAppController().showBanner(bannerParams, {source: "notification"}, 'phnx');
		this.controller.stageController.indicateNewContent(true); // flashy
		var info = {title: this.title, message: this.message, count: this.count};

		var renderedInfo = Mojo.View.render({object: info, template: 'dashboard/item-info'});
		var infoElement = this.controller.get('dashboardinfo');
		infoElement.innerHTML = renderedInfo;
		this.listenDashboard();
	},
	listenDashboard: function() {
		this.controller.listen(this.controller.get('dashboard-icon'), Mojo.Event.tap, this.iconTapped.bind(this));
		this.controller.listen(this.controller.get('dashboard-body'), Mojo.Event.tap, this.bodyTapped.bind(this));
	},
	iconTapped: function(event) {
		var launchArgs = {
			user: this.account,
			users: this.accounts,
			autoScroll: false
		};
		this.createStage(launchArgs);		
	},
	bodyTapped: function(event) {
		var launchArgs = {
			user: this.account,
			users: this.accounts,
			autoScroll: true,
			panel: this.resource.name
		};
		this.createStage(launchArgs);
	},
	createStage: function(launchArgs) {
		var app = this.controller.stageController.getAppController();
		var stageName = global.mainStage + this.account.id;
		Mojo.Log.info('Launching stage ' + stageName);
		var args = {
			name: stageName,
			lightweight: true
		};
		
		var pushMainScene = function(stageController) {
			global.stageActions(stageController);
			stageController.pushScene('launch', launchArgs);
		};
		
		var userStage = app.getStageProxy(stageName);
		
		if (!userStage) {
			app.createStageWithCallback(args, pushMainScene, "card");
		}
		else {
			userStage.activate();
			if (launchArgs.autoScroll) {
				userStage.delegateToSceneAssistant('refreshAndScrollTo', this.resource.name);
			}
		}		
	},
	stageActivate: function(event) {
		this.controller.stageController.indicateNewContent(false); // no more flashy
	},
	cleanup: function() {
		this.controller.stopListening(this.controller.stageController.document, Mojo.Event.stageActivate, this.stageActivate);
		var appController = Mojo.Controller.getAppController();
		appController.closeStage(global.dashboardStage);
	}
};