/* Extend the Prototype AJAX object to have an abort method */
Ajax.Request.prototype.abort = function() {
	// prevent and state change callbacks from being issued
	this.transport.onreadystatechange = Prototype.emptyFunction;
	// abort the XHR
	this.transport.abort();
	// update the request counter
	Ajax.activeRequestCount--;
};