function Panel(params){
	//DOM id of the panel
	this.id = params.id;
	//visible title shown in the upper navigation
	this.title = params.title;
	//the scroll position in the nav header
	this.state = params.state;
	//what DOM element should this panel be added to?
	this.parent = params.parent;	
	//timeline, search, list, etc
	this.type = params.type;
	this.controller = params.scene.controller;
	if (this.type === 'timeline'){
		this.model = new Timeline(params);	
	}
	this.setup(); //set up the panel
}

Panel.prototype = {
	setup: function(){
		var panel = this;			
		var panelHtml = Mojo.View.render({
			object: panel.toJSON(),
			template: 'templates/panels/' + panel.type
		});
		this.controller.get(this.parent).update(this.parent.innerHTML + panelHtml); //replace the html every time
		this.controller.setupWidget(this.id + "-scroller",{mode: 'vertical'},{});
		this.timeline.setup();
	},
	toJSON: function(){
		var json = {
			id: this.id,
			title: this.title,
			type: this.type,
			resource: this.resource,
			refresh: this.refresh,
			state: this.state,
			items: this.items
		};
		return json;
	}
};