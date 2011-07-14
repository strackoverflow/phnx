var TweetHelper = function() {}

TweetHelper.prototype = {
	process: function(tweet) {
		// takes a tweet and does all sorts of stuff to it
		
		// Save the created_at property for all tweets
		tweet.timestamp = tweet.created_at;
		
		if (!tweet.dm) {
			if (typeof(tweet.retweeted_status) !== "undefined") {
				var orig = tweet;
				var retweeter = tweet.user;
				tweet = tweet.retweeted_status;
				tweet.retweeter = retweeter;
				tweet.original_id = orig.id_str;
				tweet.is_rt = true;
				tweet.footer = "<br />Retweeted by " + retweeter.screen_name;
			}
			else{
				tweet.is_rt = false;
			}
			//disable clickable source links
			tweet.source = tweet.source.replace('href="', 'href="#');
			tweet.via = 'via';
			// Save the link to the tweet on Twitter.com for fun times
			tweet.link = 'http://twitter.com/' + tweet.user.screen_name + '/status/' + tweet.id_str;
		}
		
		// Expand some shortened links automatically via the entities payload
		if (tweet.entities && tweet.entities.urls) {
			var links = tweet.entities.urls;
			for (var i = links.length - 1; i >= 0; i--){
				if (links[i].expanded_url !== null) {
					tweet.text = tweet.text.replace(new RegExp(links[i].url, 'g'), links[i].expanded_url);
				}
			}	
		}
		
		var d = new Date(tweet.created_at);
		tweet.time_str = d.toRelativeTime(1500);
		
		//keep the plaintext version for quote-style RTs (so HTML doesn't get tossed in there)
		tweet.stripped = tweet.text;
		tweet.text = tweet.text.parseLinks();
		return tweet;
	},
	processSearch: function(tweet) {
		// search tweets are stupid and in a different format from the rest.
		tweet.source = tweet.source.unescapeHTML(); // search returns escaped HTML for some reason		
		//disable clickable source links
		tweet.source = "via " + tweet.source.replace('href="', 'hhref="#');
		var d = new Date(tweet.created_at);
		tweet.time_str = d.toRelativeTime(1500);
		if (tweet.metadata.result_type === 'popular') {
			tweet.toptweet = 'Top Tweet';
		}
		//keep the plaintext version for quote-style RTs (so HTML doesn't get tossed in there)
		tweet.stripped = tweet.text;
		tweet.text = tweet.text.parseLinks();
		return tweet;
	},
	isRetweeted: function(tweet, user) {
		// Finds out if you retweeted this tweet
		var r = false;
		
		for (var i=0; i < user.retweeted.length; i++) {
			if (user.retweeted[i] === tweet.id_str) {
				r = true;
			}
		}
		
		return r;
	},
	autoExpand: function(tweet, callback) {
		// Auto expands links via ajax
		if (tweet.entities && tweet.entities.urls) {
			var urls = tweet.entities.urls;
			for (var i=0; i < urls.length; i++) {
				var link = urls[i].url;
				if (link.indexOf('is.gd') > -1) {
					this.expandIsgd(link, callback);
				}
				else {
					// try to expand through bit.ly API last
					// since there are so many custom bit.ly URLs
					this.expandBitly(link, callback);	
				}
			}
		}
	},
	expandIsgd: function(shortUrl, callback) {
		var url = 'http://is.gd/forward.php?format=simple&shorturl=' + encodeURIComponent(shortUrl);
		var req = new Ajax.Request(url, {
			method: 'GET',
			onSuccess: function(response) {
				if (Ajax.activeRequestCount === 1) {
					Element.removeClassName('loading', 'show');
				}
				callback(shortUrl, response.responseText);
			},
			onFailure: function(response) {
				if (Ajax.activeRequestCount === 1) {
					Element.removeClassName('loading', 'show');
				}
				Mojo.Log.error(response.responseText);
			}
		});
		
	},
	expandBitly: function(shortUrl, callback) {
		var x_user = Config.bitlyUser;
		var x_key = Config.bitlyKey;
		var url = 'http://api.bitly.com/v3/expand?format=json&shortUrl=' + encodeURIComponent(shortUrl) + '&login=' + x_user + '&apiKey=' + x_key;
		var req = new Ajax.Request(url, {
			method: 'GET',
			onSuccess: function(response) {
				// banner(response.responseText);
				if (Ajax.activeRequestCount === 1) {
					Element.removeClassName('loading', 'show');
				}
				var r = response.responseJSON.data.expand[0];
				
				if (!r.error) {
					callback(shortUrl, r.long_url);
				}
			},
			onFailure: function(response) {
				if (Ajax.activeRequestCount === 1) {
					Element.removeClassName('loading', 'show');
				}
				Mojo.Log.error(response.responseText);
			}
		});
	}
};