String.prototype.parseLinks = function() {
	var tweet = this.replace(/(^|\s)@(\w+)/g, "$1<span id='user' name='$2' class='link'>@$2</span>");
	tweet = tweet.replace(/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/g, "<span id='link' class='link'>$&</span>");
	return tweet.replace(/(^|\s)#(\w+)/g, "$1<span id='hashtag' class='link-disabled'>#$2</span>");
};
