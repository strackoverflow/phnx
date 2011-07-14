String.prototype.parseLinks = function() {
	var tweet = this.replace(/(^|\s)@(\w+)/g, "$1<span id='user' name='$2' class='link'>@$2</span>");
	tweet = tweet.replace(/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/g, "<span id='link' class='link'>$&</span>");
	return tweet.replace(/(^|\s)#(\w+)/g, "$1<span id='hashtag' class='link'>#$2</span>");
};

String.prototype.extractUrls = function() {
	// Based off the SpazCore URL extraction by Funkatron
	// https://github.com/funkatron/spaz-webos
	// Funkatron License
	
	// var wwwlinks = /(^|\s)((https?|ftp)\:\/\/)?([a-z0-9+!*(),;?&=\$_.-]+(\:[a-z0-9+!*(),;?&=\$_.-]+)?@)?([✪a-z0-9-.]*)\.([a-z]{2,3})(\:[0-9]{2,5})?(\/([a-z0-9+\$_-]\.?)+)*\/?(\?[a-z+&\$_.-][a-z0-9;:@&%=+\/\$_.-]*)?(#[a-z_.-][a-z0-9+\$_.-]*)?(\s|$)/gi;
	var str = this;
	var wwwlinks = /(^|\s|\(|:)(((http(s?):\/\/)|(www\.))([\w✪]+[^\s\)<]+))/gi;
	var ms = [];
	var URLs = [];
	while ( (ms = wwwlinks.exec(str)) !== null ) {
		for (var x=0; x<ms.length; x++) {
			if (!ms[x]) {
				ms[x] = '';
			}
		}
		var last = ms[7].charAt(ms[7].length - 1);
		if (last.search(/[\.,;\?]/) !== -1) { // if ends in common punctuation, strip
			ms[7] = ms[7].slice(0,-1);
		}
		URLs.push(ms[3]+ms[7]);
	}
	return URLs;
};