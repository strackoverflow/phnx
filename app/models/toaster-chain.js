// This "class" contains information about toasters that have been pushed up
// and provides some methods to navigate through these toasters

window.ToasterChain = function() {
	this.items = []; //a collection of objects (toasters)
};

ToasterChain.prototype = {
	add: function(toaster) {
		// Add a toaster to the stack
		
		if (this.items.length > 0) {
			// hide the currently visible toaster
			this.items[this.items.length - 1].hide();
		}
		else {
			// hide the navbar
			try {
				get('nav-bar').setStyle({'bottom':'-100px'});
				get('footer').hide();
			}
			catch (e){}
		}
		
		// store and show the new toaster
		this.items.push(toaster);
		toaster.show();
	},
	back: function() {
		// Remove the topmost toaster and show the one "behind" it
		if (this.items.length > 0) {
			var toaster = this.items.pop();
			toaster.destroy();
			
			// If there are more items, show the next one
			if (this.items.length > 0) {
				this.items[this.items.length - 1].show();
			}
			else {
				// Otherwise show the navbar
				get('shim').removeClassName('show');
				get('shim').addClassName('ignore');
				setTimeout(function(){
					get('nav-bar').setStyle({'bottom':'0px'});
					
					try {
						get('footer').show();
					}
					catch (e){}
				}, 300);
			}
		}
	},
	backX: function(x) {
		// Go back X amount of times
		for (var i=0; i < x; i++) {
			this.back();
		}
	},
	nuke: function() {
		// Hide and destroy all toasters
		for (var i=0; i < this.items.length; i++) {
			var toaster = this.items.pop();
			toaster.destroy();
		}
		this.items = []; //reset the array just to be sure
		
		get('shim').removeClassName('show');
		get('shim').addClassName('ignore');
		setTimeout(function(){
			try {
				get('nav-bar').setStyle({'bottom':'0px'});
				get('footer').show();
			}
			catch (e){}
			
		}, 300);
	}
};

// global variable
// var Toasters = new ToasterChain();