var ConfirmToaster = Class.create(Toaster, {
	initialize: function(opts, assistant) {
		this.id = toasterIndex++;
		this.nodeId = 'toaster-' + this.id;
		this.visible = false;
		this.shim = true;
		this.opts = opts;
		this.assistant = assistant;
		this.controller = assistant.controller;

		this.render({toasterId: this.id, title: opts.title}, 'templates/toasters/confirm');
	},
	confirmTapped: function(event) {
		this.opts.callback();
	},
	cancelTapped: function(event) {
		this.assistant.toasters.backX(2);
	},
	setup: function() {
		this.controller.listen(this.controller.get('confirm-' + this.id), Mojo.Event.tap, this.confirmTapped.bind(this));
		this.controller.listen(this.controller.get('cancel-' + this.id), Mojo.Event.tap, this.cancelTapped.bind(this));
	},
	cleanup: function() {
		this.controller.stopListening(this.controller.get('confirm-' + this.id), Mojo.Event.tap, this.confirmTapped);
		this.controller.stopListening(this.controller.get('cancel-' + this.id), Mojo.Event.tap, this.cancelTapped);
	}
});