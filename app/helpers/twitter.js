// TODO: Remove the assistant parameter from many of these functions
// TODO: Allow custom API (for Chinese users) 
var TwitterAPI = function(user, stageController) {
	
	this.apibase = 'https://api.twitter.com';
	this.version = '1'; // will probably have to change a lot more than just this number once v2 hits
	this.key = Config.key;
	this.secret = Config.secret;
	this.user = user;
	this.token = user.token;
	this.tokenSecret = user.secret;
	this.format = 'json'; // why would it be anything else?
	
	if (stageController) {
		this.stage = stageController;
	}
	else {
		this.stage = false;
	}
	
	this.endpoints = {
		home: 'statuses/home_timeline',
		mentions: 'statuses/mentions',
		messages: 'direct_messages',
		favorite: 'favorites/create',
		unfavorite: 'favorites/destroy',
		retweet: 'statuses/retweet',
		destroy: 'statuses/destroy',
		statusShow: 'statuses/show',
		statusUpdate: 'statuses/update',
		showUser: 'users/show',
		lookupUsers: 'users/lookup',
		userTimeline: 'statuses/user_timeline',
		userFavorites: 'favorites',
		followUser: 'friendships/create',
		unfollowUser: 'friendships/destroy',
		rateLimit: 'account/rate_limit_status',
		trends: 'trends',
		savedSearches: 'saved_searches',
		newDM: 'direct_messages/new',
		lists: 'lists',
		listSubscriptions: 'lists/subscriptions',
		listStatuses: 'lists/statuses',
		statusRetweets: 'statuses/retweets',
		retweetsToMe: 'statuses/retweeted_to_me',
		retweetsByMe: 'statuses/retweeted_by_me',
		retweetsOfMe: 'statuses/retweets_of_me',
		block: 'blocks/create',
		report: 'report_spam',
		friendshipExists: 'friendships/exists',
		followers: 'followers/ids',
		friends: 'friends/ids'
	};
	
};

TwitterAPI.prototype = {
	url: function(endpoint) {
		// Build an API URL from all of the parts we store.
		return this.apibase + '/' + this.version + '/' + endpoint + '.' + this.format;
	},
	timeline: function(panel, callback, args, assistant) {		
		this.sign('GET', this.url(this.endpoints[panel.resource]), callback, args, {'panel': panel, 'assistant': assistant});
	},
	notificationCheck: function(resource, callback, args, user) {
		// Similar to timeline function but it needs to pass the user object to sign the request properly
		this.sign('GET', this.url(this.endpoints[resource.name]), callback, args, {"user": user, "resource": resource, "silent": true});
	},
	action: function(key, id, callback, assistant) {
		this.sign('POST', this.url(this.endpoints[key] + '/' + id), callback, {'id': id}, {'assistant': assistant});
	},
	getStatus: function(id, callback, assistant) {
		this.sign('GET', this.url(this.endpoints.statusShow + '/' + id), callback, {'include_entities': 'true'}, {'assistant': assistant});
	},
	postTweet: function(args, callback, assistant) {
		this.sign('POST', this.url(this.endpoints.statusUpdate), callback, args, {'assistant':assistant});
	},
	getUser: function(screen_name, callback) {
		this.sign('GET', this.url(this.endpoints.showUser), callback, {'screen_name': screen_name}, {});
	},
	getUsersById: function(userIds, callback) {
		this.sign('GET', this.url(this.endpoints.lookupUsers), callback, {'user_id': userIds}, {});
	},
	getUserTweets: function(args, callback) {
		// args.include_rts = true;
		this.sign('GET', this.url(this.endpoints.userTimeline), callback, args, {});
	},
	getFavorites: function(username, args, callback) {
		this.sign('GET', this.url(this.endpoints.userFavorites + '/' + username), callback, args, {});
	},
	followUserName: function(username, callback) {
		this.sign('POST', this.url(this.endpoints.followUser), callback, {'screen_name':username}, {});
	},
	followUser: function(id, callback) {
		this.sign('POST', this.url(this.endpoints.followUser), callback, {'user_id':id}, {});
	},
	unfollowUser: function(id, callback) {
		this.sign('POST', this.url(this.endpoints.unfollowUser), callback, {'user_id':id}, {});
	},
	checkFollow: function(userA, userB, callback) {
		this.sign('GET', this.url(this.endpoints.friendshipExists), callback, {'user_a':userA, 'user_b': userB}, {});
	},
	rateLimit: function() {
		// Displays a banner about the current rate limit
		this.sign('GET', this.url(this.endpoints.rateLimit), function(response, meta){
			var status = response.responseJSON;
			var resetDate = new Date(status.reset_time);
			banner(status.remaining_hits + '/' + status.hourly_limit + ' until ' + resetDate.toUTCString());
		}, {}, {});
	},
	trends: function(callback) {
		this.sign('GET', this.url(this.endpoints.trends), callback, {}, {});
	},
	getSavedSearches: function(callback) {
		this.sign('GET', this.url(this.endpoints.savedSearches), callback, {}, {});
	},
	newDM: function(args, callback) {
		this.sign('POST', this.url(this.endpoints.newDM), callback, args, {});
	},
	userLists: function(args, callback) {
		this.sign('GET', this.url(this.endpoints.lists), callback, args, {});
	},
	listSubscriptions: function(args, callback) {
		this.sign('GET', this.url(this.endpoints.listSubscriptions), callback, args, {});
	},
	listStatuses: function(args, callback) {
		this.sign('GET', this.url(this.endpoints.listStatuses), callback, args, {});
	},
	search: function(query, callback) {
		// Query can be either a string or an object literal with named parameters in it
		var url = 'http://search.twitter.com/search.json';
		var args = {"result_type":"mixed","rpp":"150"};
		
		if (typeof(query) === 'string') {
			args.q = query;
		}
		else {
			for (var key in query) {
				args[key] = query[key];
			}
		}
		
		// var prefs = new LocalStorage();
		// if (prefs.read('limitToLocale')) {
		// 	var locale = Mojo.Locale.getCurrentLocale();	
		// 	args.lang = locale;
		// }

		this.plain('GET', url, args, callback);
	},
	showRetweets: function(id, callback) {
		var args = {
			"count": 100
		};
		this.sign('GET', this.url(this.endpoints.statusRetweets + '/' + id), callback, args, {});
	},
	retweetsToMe: function(callback) {
		this.sign('GET', this.url(this.endpoints.retweetsToMe), callback, {"count": 100}, {});
	},
	retweetsByMe: function(callback) {
		this.sign('GET', this.url(this.endpoints.retweetsByMe), callback, {"count": 100}, {});
	},
	retweetsOfMe: function(callback) {
		this.sign('GET', this.url(this.endpoints.retweetsOfMe), callback, {"count": 100}, {});
	},
	block: function(id, callback) {
		this.sign('POST', this.url(this.endpoints.block), callback, {'user_id': id}, {});
	},
	report: function(id, callback) {
		this.sign('POST', this.url(this.endpoints.report), callback, {'user_id': id}, {});
	},
	getFollowers: function(userId, callback) {
		this.sign('GET', this.url(this.endpoints.followers), this.gotIds.bind(this), {'user_id': userId, 'cursor': '-1'}, {callback: callback});
	},
	getFriends: function(userId, callback) {
		this.sign('GET', this.url(this.endpoints.friends), this.gotIds.bind(this), {'user_id': userId, 'cursor': '-1'}, {callback: callback});
	},
	gotIds: function(response, meta) {
		var ids = response.responseJSON.ids.slice(0,99);
		var idList = '';
		for (var i=0; i < ids.length; i++) {
			if (idList !== ''){
				idList += ',';
			}
			idList += ids[i];
		}
		this.getUsersById(idList, function(r){
			meta.callback(r.responseJSON);
		});
	},
	sign: function(httpMethod, url, callback, args, meta) {

		var currentUser;
		var silent = false; // if true, errors are not reported on the screen.

		if (meta.user) {
			silent = true;
		}
		
		if (meta.silent === true) {
			silent = true;
		}
		
		//args is an object literal of URL parameters to be included
		//meta is an object literal with data that needs to be passed through to the callback
		
		var i; //to make JSLint shut up.

		var message = {
			method: httpMethod,
			action: url,
			parameters: []
		};

		//when using OAuth, parameters must be included in the request body
		//and in the base signature of the Auth Header
		
		var params = '';

		for (var key in args) {
			if (params !== '') {
				params += '&';
			}
			params += key + '=' + encodeURIComponent(args[key]);
			message.parameters.push([key, args[key]]);
		}

		OAuth.completeRequest(message, {
			consumerKey: this.key,
			consumerSecret: this.secret,
			token: this.token,
			tokenSecret: this.tokenSecret
		});

		var authHeader = OAuth.getAuthorizationHeader(this.apibase, message.parameters);
		
		var opts = {
			method: httpMethod,
			encoding: 'UTF-8',
			requestHeaders: {
				Authorization: authHeader,
				Accept: 'application/json'
			},
			parameters: params,
			success: callback,
			silent: silent
		};
		
		if (meta) {
			opts.meta = meta;
		}
		
		this.request(url, opts);
		
	},
	plain: function(httpMethod, url, args, callback, silent) {
		// Send a plain HTTP request. No OAuth signing.
		
		if (typeof(silent) === 'undefined') {
			silent = false;
		}
		
		var params = '';

		for (var key in args) {
			if (params !== '') {
				params += '&';
			}
			params += encodeURIComponent(key) + '=' + encodeURIComponent(args[key]);
		}
		params = params.replace('%08',''); // remove the hidden backspace character (messes up searches sometimes)
		
		this.request(url, {
			method: httpMethod,
			encoding: 'UTF-8',
			parameters: params,
			success: callback,
			silent: silent
		});
	},
	request: function(url, opts) {
		// A wrapper for the PrototypeJS request object
		// Allows for connection checking and timeouts
		var user = this.user;
		var stage = this.stage;
		if (!opts.silent || opts.silent === false) {
			this.toggleLoading(true);
		}
		
		var connectionResponse = function(r) {
			var conn = r.isInternetConnectionAvailable;
			// var conn = false; // for testing with no internet connection
			if (conn) {
				opts.onSuccess = function(response) {
					if (Ajax.activeRequestCount <= 1) {
						this.toggleLoading(false);
					}
					
					if (!opts.meta) {
						opts.success(response);
					}
					else {
						opts.success(response, opts.meta);
					}
				}.bind(this);
				
				opts.onFailure = function(transport) {
					if (Ajax.activeRequestCount <= 1 && opts.silent !== true) {
						this.toggleLoading(false);
					}
					if (opts.silent !== true) {
						// Out of sight, out of mind...
						if (transport.status === 500 || transport.status === 502 || transport.status === 503) {
							global.fail();
						}
						else if (transport.status === 401) {
							// do nothing, this is a weird 401 error.
						}
						else {
							global.ex(transport.status + ': ' + transport.responseJSON.error);	
						}
					}
				}.bind(this);
				var req = new Ajax.Request(url, opts);
			}
			else {
				this.toggleLoading(false);
				// ex('No internet connection.');
			}
		};
		
		var service = new Mojo.Service.Request('palm://com.palm.connectionmanager', { 
			method: 'getStatus',
			onSuccess: connectionResponse.bind(this),
			onFailure: connectionResponse.bind(this)
		});
	},
	toggleLoading: function(show) {
		var user = this.user;
		if (show) {
			if (this.stage === false) {
				g(user.id, 'loading').addClassName('show');	
			}
			else {
				this.stage.document.getElementById('loading').className = 'show';
			}
		}
		else {
			if (this.stage === false) {
				g(user.id, 'loading').removeClassName('show');
			}
			else {
				this.stage.document.getElementById('loading').className = '';
			}
		}
	}
};