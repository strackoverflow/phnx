function BitlyAPI(opts) {
	if (opts) {
		this.opts = opts;
	}
	else {
		this.opts = {};
	}
	this.apibase = 'http://api.bitly.com/v3';
	this.format = 'json';
	this.endpoints = {
		shorten: 'shorten',
		expand: 'expand'
	};
}

BitlyAPI.prototype = {
	url: function(endpoint) {
		return this.apibase + '/' + endpoint + '?format=' + this.format;
	},
	shorten: function(longUrl, callback) {
		var url = this.url(this.endpoints.shorten);
		var args = {
			"longUrl": longUrl,
			login: this.opts.user,
			apiKey: this.opts.key
		};
		this.request(url, args, callback);
	},
	request: function(url, args, callback) {
		var params = '';
		for (var key in args) {
			params += '&' + key + '=' + encodeURIComponent(args[key]);
		}
		
		var req = new Ajax.Request(url, {
			method: 'GET',
			parameters: params,
			onSuccess: function(response) {
				var shortUrl = response.responseJSON.data.url;
				callback(shortUrl, args.longUrl);
			},
			onFailure: function(response) {
				Mojo.Log.error(response.responseText);
			}
		});
	}
};