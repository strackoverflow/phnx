//this isn't a real helper class, 
//just some global functions that I find useful
//stop laughing at me, @balmer

function banner(message){
	Mojo.Controller.getAppController().showBanner(message, {source: 'notification'});
}
function ex(error){
	//Mojo.Controller.errorDialog(error);
	Mojo.Controller.getAppController().showBanner({messageText: error, icon: 'images/low/error.png'}, {source: 'notification'});
}
function pushScene(sceneName){
	Mojo.Controller.stageController.pushScene(sceneName);
}
function ajaxGet(url, successCallback){
	var request = new Ajax.Request("http://api.twitter.com" + url, {
		method: 'get',
		evalJSON: 'force',
		onSuccess: successCallback,
		onFailure: function(transport){
			var r = transport.responseJSON;
			ex(r.error);
		}
	});
}

