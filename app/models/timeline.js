function Timeline(params){
	this.panel = panel;
	//url type to send requests to
	this.resource = params.resource;
	//should this panel be globally loaded/refreshed?
	this.refresh = params.refresh;
	this.scene = params.scene;
	this.controller = params.scene.controller;
	//how many tweets to load each request
	this.count = 50; 
	this.items = [];
}

Timeline.prototype = {
	setup: function(){
		this.controller.setupWidget('list-' + this.panel.id,{itemTemplate: "templates/tweets/item",listTemplate: "templates/list", renderLimit: 1000}, this.toJSON());
		this.controller.listen('list-' + this.panel.id, Mojo.Event.listTap, this.scene.tweetTapped.bind(this));
		this.controller.listen('more-' + this.panel.id, Mojo.Event.tap, this.moreButtonTapped.bind(this));
	},
	refresh: function(){
		
	},
	loadMore: function(){
		
	},
	getItems: function(mode){
		
	},
	gotItems: function(response){
		
	},
	toJSON: function(){
		var json = {
			items: this.items
		};
		return json;
	}
};