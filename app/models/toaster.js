/*
	Toasters are slide-up mini scenes. 
	Using the ToasterChain class to keep track of history.
	
	This particular file is a module of functions that
	each Toaster class inherits.
*/

var Toaster = {
	render: function(obj, template) {
		var content = Mojo.View.render({
			object: obj,
			template: template
		});
		
		// Append to the Toasters container
		get('toasters').innerHTML = get('toasters').innerHTML + content;
	},
	show: function() {
		if (this.shim) {
			get('shim').removeClassName('ignore');
			get('shim').addClassName('show');
		}
		else {
			get('shim').addClassName('ignore');
			get('shim').removeClassName('show');
		}
        this.setup();
		this.animateShow();
	},
	hide: function() {
		this.animateHide();
		// this.cleanup(); // kill those evil listeners!
	},
	animateShow: function() {
		// CSS Animation method
		get(this.nodeId).addClassName('show');
		
		// Javascript Animation method
		// var from = get(this.nodeId).getHeight();
		// Mojo.Animation.animateStyle(get(this.nodeId), 'bottom', 'linear', {
		//             from: from,
		//             to: 0,
		//             duration: .1,
		//             curve: 'linear',
		//             onComplete: function(){
		// 		if (this.shim) {
		// 			get('shim').removeClassName('ignore');
		// 			get('shim').addClassName('show');
		// 		}
		// 		else {
		// 			get('shim').addClassName('ignore');
		// 			get('shim').removeClassName('show');
		// 		}
		//                 this.setup();
		//             }.bind(this)
		//         });
	},
	animateHide: function() {
		// CSS animation
		get(this.nodeId).removeClassName('show');
		
		// Javascript animation
		// var to = get(this.nodeId).getHeight();
		// Mojo.Animation.animateStyle(get(this.nodeId), 'bottom', 'linear', {
		//             from: 0,
		//             to: -to,
		//             duration: .1,
		//             curve: 'linear',
		//             onComplete: function(){
		//                 this.cleanup();
		//             }.bind(this)
		//         });
	},
	destroy: function() {
		// hide the toaster if it's visible
		this.hide();
		var id = this.id;
		setTimeout(function(){
			get('toaster-' + id).remove();
		}, 1000);
	},
	setup: function() {
		
	},
	cleanup: function() {
		
	}
};