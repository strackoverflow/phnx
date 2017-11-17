var TwitterAPI = function(user, stageController) {
	this.apibase		= 'https://api.twitter.com';
	this.version		= '1.1';
	this.key			= Config.key;
	this.secret			= Config.secret;
	this.user			= user;
	this.token			= user.token;
	this.tokenSecret	= user.secret;

	if (stageController) {
		this.stage = stageController;
	} else {
		this.stage = false;
	}

	this.endpoints = {
		home:				'statuses/home_timeline',
		mentions:			'statuses/mentions_timeline',
		messages:			'direct_messages',
		sentMessages:		'direct_messages/sent',
		favorite:			'favorites/create',
		unfavorite:			'favorites/destroy',
		retweet:			'statuses/retweet',
		destroy:			'statuses/destroy',
		destroyDM:			'direct_messages/destroy',
		statusShow:			'statuses/show',
		statusUpdate:		'statuses/update',
		showUser:			'users/show',
		lookupUsers:		'users/lookup',
		userTimeline:		'statuses/user_timeline',
		userFavorites:		'favorites/list',
		followUser:			'friendships/create',
		unfollowUser:		'friendships/destroy',
		rateLimit:			'account/rate_limit_status',
		trends:				'trends/place',
		searchTweets:		'search/tweets',
		savedSearches:		'saved_searches/list',
		newDM:				'direct_messages/new',
		lists:				'lists/list',
		listSubscriptions:	'lists/subscriptions',
		listStatuses:		'lists/statuses',
		statusRetweets:		'statuses/retweets',
		retweetsOfMe:		'statuses/retweets_of_me',
		block:				'blocks/create',
		report:				'users/report_spam',
		friendshipExists:	'friendships/show',
		followers:			'followers/ids',
		friends:			'friends/ids',
		updateProfileImage:	'account/update_profile_image'
	};
};

TwitterAPI.prototype = {
	url: function(endpoint) {
		// Build an API URL from all of the parts we store.
		return this.apibase + '/' + this.version + '/' + endpoint + '.json';
	},
	timeline: function(panel, callback, args, assistant, resource) {
		args.tweet_mode = 'extended';
		this.sign('GET', this.url(this.endpoints[resource || panel.resource]), callback, args, {'panel': panel, 'assistant': assistant});
	},
	notificationCheck: function(resource, callback, args, user) {
		// Similar to timeline function but it needs to pass the user object to sign the request properly
		this.sign('GET', this.url(this.endpoints[resource.name]), callback, args, {"user": user, "resource": resource, "silent": true});
	},
	action: function(key, id, callback, assistant) {
		this.sign('POST', this.url(this.endpoints[key] + '/' + id), callback, {'id': id}, {'assistant': assistant});
	},
	favorite: function(key, id, callback, assistant) {
		this.sign('POST', this.url(this.endpoints[key]), callback, {'id': id}, {'assistant': assistant});
	},
	getStatus: function(id, callback, assistant) {
		this.sign('GET', this.url(this.endpoints.statusShow + '/' + id), callback, {'tweet_mode':'extended','include_entities': 'true'}, {'assistant': assistant});
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
		args.tweet_mode = 'extended';
		this.sign('GET', this.url(this.endpoints.userTimeline), callback, args, {});
	},
	getFavorites: function(args, callback) {
		args.tweet_mode = 'extended';
		this.sign('GET', this.url(this.endpoints.userFavorites), callback, args, {});
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
		this.sign('GET', this.url(this.endpoints.friendshipExists), callback, {
			source_id:	userA,
			target_id:	userB
		}, {});
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
		this.sign('GET', this.url(this.endpoints.trends), callback, { id: 1 }, {});
	},
	getSavedSearches: function(callback) {
		this.sign('GET', this.url(this.endpoints.savedSearches), callback, {}, {});
	},
	newDM: function(args, callback) {
		this.sign('POST', this.url(this.endpoints.newDM), callback, args, {});
	},
	destroyDM: function(args, callback) {
		this.sign('POST', this.url(this.endpoints.destroyDM), callback, args, {}); 
	},
	userLists: function(args, callback) {
		this.sign('GET', this.url(this.endpoints.lists), callback, args, {});
	},
	listSubscriptions: function(args, callback) {
		this.sign('GET', this.url(this.endpoints.listSubscriptions), callback, args, {});
	},
	listStatuses: function(args, callback) {
		args.tweet_mode = 'extended';
		this.sign('GET', this.url(this.endpoints.listStatuses), callback, args, {});
	},
	search: function(query, callback) {
		// Query can be either a string or an object literal with named parameters in it
		//var url = 'https://search.twitter.com/search.json';
		//var args = {"tweet_mode":"extended","result_type":"mixed","rpp":"150","include_entities":"1"}; //DC Added include_entities for inline thumbs
		var args = {"tweet_mode":"extended","result_type":"mixed","include_entities":"1"};

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

		//this.plain('GET', url, args, callback);
		this.sign('GET', this.url(this.endpoints.searchTweets), callback, args, {});
	},
	showRetweets: function(id, callback) {
		var args = {
			"count": 100,
			"tweet_mode": "extended"
		};
		this.sign('GET', this.url(this.endpoints.statusRetweets + '/' + id), callback, args, {});
	},
	retweetsOfMe: function(callback) {
		this.sign('GET', this.url(this.endpoints.retweetsOfMe), callback, {"tweet_mode":"extended","count": 100}, {});
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
	// Testing code for profile image upload - not ready - DC
	updateProfileImage: function(args, callback) {
		this.sign('POST', this.url(this.endpoints.updateProfileImage), callback, args, {});
	},
	gotIds: function(response, meta) {
		var start	= meta.start || 0;
		var ids		= response.responseJSON.ids.slice(start, start + 99);

		if (!ids || ids.length <= 0) {
			meta.callback(meta.results || []);
			return;
		}

		meta.start	= start + 100;
		this.getUsersById(ids.join(','), function(r) {
			if (meta.results) {
				var tmp = meta.results;

				meta.results = tmp.concat(r.responseJSON);
			} else {
				meta.results = r.responseJSON;
			}

			this.gotIds(response, meta);
		}.bind(this));
	},
	sign: function(httpMethod, url, callback, args, meta) {
		var silent = false; // if true, errors are not reported on the screen.

		if (meta.user) {
			silent = true;
		}

		if (meta.silent === true) {
			silent = true;
		}

		// args is an object literal of URL parameters to be included
		// meta is an object literal with data that needs to be passed through to the callback

		var message = {
			method:		httpMethod,
			action:		url,
			parameters:	args
		};

		// console.log(httpMethod + ' ' + url + '?' + Object.toJSON(args));

		OAuth.completeRequest(message, {
			consumerKey:		this.key,
			consumerSecret:		this.secret,
			token:				this.token,
			tokenSecret:		this.tokenSecret
		});

		var opts = {
			method:				httpMethod,
			encoding:			'UTF-8',
			success:			callback,
			silent:				silent,

			requestHeaders: {
				Authorization:	OAuth.getAuthorizationHeader(this.apibase, message.parameters),
				Accept:			'application/json'
			}
		};

		if (meta) {
			opts.meta = meta;
		}

		switch (httpMethod.toUpperCase()) {
			default:
			case 'GET':
				this.request(OAuth.addToURL(url, args), opts);
				break;

			case 'POST':
				opts.postBody = OAuth.formEncode(args);
				this.request(url, opts);
				break;
		}
	},
	plain: function(httpMethod, url, args, callback, silent) {
		/* Send a plain HTTP request. No OAuth signing. */

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

		/* Remove the hidden backspace character (messes up searches sometimes) */
		params = params.replace('%08','');

		this.request(url, {
			method:		httpMethod,
			encoding:	'UTF-8',
			parameters:	params,
			success:	callback,
			silent:		silent
		});
	},
	request: function(url, opts) {
		/*
			A wrapper for the PrototypeJS request object, which allows for
			connection checking and timeouts.
		*/
		var user		= this.user;
		var stage		= this.stage;

		if (!opts.silent || opts.silent === false) {
			this.toggleLoading(true);
		}

		var connectionResponse = function(r) {
			if (!r.isInternetConnectionAvailable) {
				this.toggleLoading(false);
				return;
			}

			opts.onSuccess = function(response) {
				if (Ajax.activeRequestCount <= 1) {
					this.toggleLoading(false);
				}

				if (!opts.meta) {
					opts.success(response);
				} else {
					opts.success(response, opts.meta);
				}
			}.bind(this);

			opts.onFailure = function(transport) {
				if (Ajax.activeRequestCount <= 1 && opts.silent !== true) {
					this.toggleLoading(false);
				}

				if (opts.silent !== true) {
					Mojo.Log.info('HTTP Failure ' + transport.status);

					if (transport.status >= 500 && transport.status <= 599) {
						/* 5xx is a server failure */
						global.fail();
					} else {
						for (var i = 0, err; err = transport.responseJSON.errors[i]; i++) {
							global.ex(transport.status + ': ' + err.message);
						}
					}
				}
			}.bind(this);

			new Ajax.Request(url, opts);
		}.bind(this);

		var service = new Mojo.Service.Request('palm://com.palm.connectionmanager', {
			method:		'getStatus',
			onSuccess:	connectionResponse,
			onFailure:	connectionResponse
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
