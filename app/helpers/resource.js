function ResourceHelper(){
	this.version = '1'; //twitter api version
	this.api = 'https://api.twitter.com/' + this.version + '/';
	this.format = 'json'; //not sure why I'd use anything but JSON...
}

ResourceHelper.prototype = {
	//takes a resource key and returns a Twitter endpoint
	url: function(resource, params){
		var u; //endpoint resource
		switch(resource){
			case 'home':
				u = 'statuses/home_timeline';
				break;
			case 'mentions':
				u = 'statuses/mentions';
				break;
			case 'messages':
				u = 'direct_messages';
				break;
			case 'tweet':
				u = 'statuses/show/' + params.id;
				break;
			case 'user':
				u = 'users/show';
				break;
			case 'user_timeline':
				u = 'statuses/user_timeline';
				break;
			case 'favorites':
				u = 'favorites/' + params.screen_name;
				break;
		}
		
		return this.api + u + '.' + this.format;
	},
	search: function (query){
		return 'http://search.twitter.com/search.' + this.format + '?q=' + encodeURIComponent(query);
	}
}