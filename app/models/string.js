String.prototype = {
	parseURL: function() {
		return this.replace(/[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&\?\/.=]+/, function(url) {
			return url.link(url);
		});
	},
	parseUsername: function() {
		return this.replace(/[@]+[A-Za-z0-9-_]+/, function(u) {
			var username = u.replace("@","")
			return u.bold(username);
		});
	},
	parseHashtag: function() {
		return this.replace(/[#]+[A-Za-z0-9-_]+/, function(t) {
			var tag = t.replace("#","%23")
			return t.bold(tag);
		});
	}
};