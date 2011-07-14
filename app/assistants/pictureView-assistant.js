function PictureViewAssistant(url) {
	this.url = url;
}

PictureViewAssistant.prototype = {
	setup: function() {
		this.handleWindowResizeHandler = this.handleWindowResize.bindAsEventListener(this);
		this.controller.listen(this.controller.window, 'resize', this.handleWindowResizeHandler);
		this.imageViewer = this.controller.get('divImageViewer');
		this.controller.setupWidget('divImageViewer',
			this.attributes = {
				noExtractFS: true
			},
			this.model = {
				onLeftFunction: function (){
					//TODO: show other images in the tweet OR other images by that user
				},
				onRightFunction: function (){

				}
			}
		);
	},
	handleWindowResize: function(event) {
		if (this.imageViewer && this.imageViewer.mojo) {
			this.imageViewer.mojo.manualSize(this.controller.window.innerWidth, this.controller.window.innerHeight);
		}
	},
	activate: function(event) {
		this.controller.enableFullScreenMode(true);
		this.controller.stageController.setWindowOrientation('free');
		this.imageViewer.mojo.centerUrlProvided(this.url);
	    this.imageViewer.mojo.manualSize(Mojo.Environment.DeviceInfo.screenWidth, Mojo.Environment.DeviceInfo.screenHeight);
	},
	deactivate: function(event) {
		this.controller.stageController.setWindowOrientation('up'); // Not sure if it's needed, but doesn't hurt
		this.controller.enableFullScreenMode(false);
	},
	cleanup: function(event) {
		this.controller.stopListening(this.controller.window, 'resize', this.handleWindowResizeHandler);
	}
};