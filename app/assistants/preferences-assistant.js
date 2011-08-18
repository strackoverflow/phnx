function PreferencesAssistant() {
	this.prefs = new LocalStorage();
	
	var accounts = [];
	for (var i=0; i < global.accounts.length; i++) {
		var acct = global.accounts[i];
		accounts.push({
			label: '@' + acct.username,
			value: acct.id
		});
	}
	
	// Add stuff here to auto-render them to the scene and auto-save on scene close.
	// Toggle and select widgets are the only ones that are supported so far
	this.sections = {
			'General Settings': [
				{key: 'theme', type: 'select', label: 'Theme', items: [
					{label: 'Rebirth', value: 'rebirth'},
					{label: 'Ash', value: 'ash'}
					// {label: 'Sunnyvale', value: 'sunnyvale'}
				]},
				{key: 'fontSize', type: 'select', label: 'Font Size', items: [
					{label: 'Tiny', value: 'tiny'},
					{label: 'Small', value: 'small'},
					{label: 'Medium', value: 'medium'},
					{label: 'Large', value: 'large'},
					{label: 'Huge', value: 'huge'}
				]},
				{key: 'cardIcons', type: 'toggle', label: 'Show card icons'},
				{key: 'refreshOnMaximize', type: 'toggle', label: 'Auto Refresh'},
				{key: 'refreshOnSubmit', type: 'toggle', label: 'Refresh after post'},
				{key: 'enterToSubmit', type: 'toggle', label: 'Enter to submit'}
			],
			'Notifications': [
				{key: 'notifications', type: 'toggle', label: 'Notifications'},
				{key: 'notificationInterval', type: 'select', label: 'Check Every', items:[
					{label: '5 min', value: '00:05'},
					{label: '15 min', value: '00:15'},
					{label: '30 min', value: '00:30'},
					{label: '1 hour', value: '01:00'},
					{label: '2 hours', value: '02:00'},
					{label: '6 hours', value: '06:00'},
					{label: '12 hours', value: '12:00'}
				]},
				{key: 'notificationHome', type: 'toggle', label: 'Home Timeline'},
				{key: 'notificationMentions', type: 'toggle', label: 'Mentions'},
				{key: 'notificationMessages', type: 'toggle', label: 'Messages'}
			],
			'Advanced Settings': [
				{key: 'forwardSwipe', type: 'select', label: 'Forward Swipe', items: [
					{label: 'Refresh All', value: 'all'},
					{label: 'Refresh Current', value: 'current'}
				]},
				// {key: 'limitToLocale', type: 'toggle', label: 'Exclude search results not in my own language'},
				{key: 'sendAnalytics', type: 'toggle', label: 'Send <strong>anonymous</strong> statistics to the developer to help improve phnx'}
			]
	};
	
	if (global.accounts.length > 1) {
		this.sections['General Settings'].push({key: 'defaultAccount', type: 'select', label: 'Default User', items: accounts});
	}
	this.widgets = {}; // holds attributes and models for widgets
}

PreferencesAssistant.prototype = {
	setup: function() {
		
		this.controller.setupWidget(Mojo.Menu.appMenu, {omitDefaultItems: true}, {visible: true, items: global.prefsMenu});

		var widgetHtml, html;
		var pageHtml = '';
		for (var sectionId in this.sections) {
			var sectionItems = this.sections[sectionId];
			widgetHtml = '';
			for (var i=0; i < sectionItems.length; i++) {
				var widget = sectionItems[i];
				
				if (widget.type === 'toggle') {
					
					html = Mojo.View.render({
						object: widget,
						template: 'preferences/toggle'
					});
					
					widgetHtml += html;
					
					this.controller.setupWidget('toggle-' + widget.key,
						this.widgets['attr_' + widget.key] = {
							trueValue: true,
							falseValue: false,
							trueLabel: 'On',
							falseLabel: 'Off'
						},
						this.widgets['model_' + widget.key] = {
							value: this.prefs.read(widget.key)
						}
					);
				}
				else if (widget.type === 'select') {
					html = Mojo.View.render({
						object: widget,
						template: 'preferences/select'
					});
					
					widgetHtml += html;
					this.controller.setupWidget('select-' + widget.key,
						this.widgets['attr_' + widget.key] = {
							choices: widget.items,
							labelPlacement: Mojo.Widget.labelPlacementLeft,
							label: widget.label
						},
						this.widgets['model_' + widget.key] = {
							value: this.prefs.read(widget.key)
						}
					);
				}
			}
			
			// set up section html
			var secObj = {
				title: sectionId,
				items: widgetHtml
			};
			
			var sectionHtml = Mojo.View.render({
				object: secObj,
				template: 'preferences/section'
			});
			
			pageHtml += sectionHtml;
		}
		
		this.controller.get('sections').update(pageHtml);
		
		// Manually add listeners after the elements are on the DOM
		this.controller.listen(this.controller.get('select-theme'), Mojo.Event.propertyChange, this.themeChanged.bind(this));
		this.controller.listen(this.controller.get('select-fontSize'), Mojo.Event.propertyChange, this.fontChanged.bind(this));
	},
	themeChanged: function(event) {
		var newTheme = event.value;
		Mojo.Log.info('theme changed to ' + newTheme);
		
		// Remove the old theme
		var oldTheme = this.prefs.read('theme');
		this.controller.stageController.unloadStylesheet('stylesheets/' + oldTheme + '.css');
		
		// Apply the new theme
		this.controller.stageController.loadStylesheet('stylesheets/' + newTheme + '.css');
	},
	fontChanged: function(event) {
		var body = this.controller.stageController.document.getElementsByTagName("body")[0];
		global.setFontSize(body, event.value);
	},
	cleanup: function() {
		// Save preferences on exit.
		for (var sectionId in this.sections) {
			var sectionItems = this.sections[sectionId];
			for (var i=0; i < sectionItems.length; i++) {
				var item = sectionItems[i];
				this.prefs.write(item.key, this.widgets['model_' + item.key].value);
			}
		}
		
		// Manually remove any listeners from above
		this.controller.stopListening(this.controller.get('select-theme'), Mojo.Event.propertyChange, this.themeChanged);
		this.controller.stopListening(this.controller.get('select-fontSize'), Mojo.Event.propertyChange, this.fontChanged);
	}
};