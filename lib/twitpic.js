/*
 * TwitPic API for Javascript
 * Copyright 2010 Ryan LeFevre - @meltingice
 *
 * Licensed under the New BSD License, more info in LICENSE file
 * included with this software.
 *
 * Source code is hosted at http://github.com/meltingice/TwitPic-API-for-Javascript
 */
 
/* Namespace the twitpic object for global access */
twitpic = window.twitpic || {};

(function(window) {

	/*
     * Solves the race-condition that occurs
     * when loading jQuery automatically. This event is fired
     * when the entire TwitPic script is finished loading.
     */
    var is_ready, ready_callback;
    twitpic.ready = function(callback) {
    	if(is_ready)
    		callback();
    	else
    		ready_callback = callback;
    }

	/*
	 * If jQuery hasn't been loaded already, lets
	 * do so now automatically.
	 */
	var conflict = false;
	if(!("jQuery" in window)) {
		conflict = true;
		var head      = document.getElementsByTagName('head')[0],
		script        = document.createElement('script');
		script.type   = 'text/javascript';
		script.src    = 'http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js';
		script.onload = init;
		head.appendChild(script);
	} else {
		init();
	}
	
	/*
	 * Loads the API methods, removes jQuery conflicts
	 * with other JS libraries, and sends the twitpic
	 * object and jQuery object as $ into a private scope
	 */
	function init() {
		if(conflict) jQuery.noConflict();
		load(twitpic, jQuery);
	}
	
	/*
	 * The guts of the API, nicely encapsulated to prevent
	 * any conflicts with other libraries
	 */
	function load(twitpic, $) {
	
		var API = {
			base_url : 'http://api.twitpic.com/',
			
			/*
			 * This validates the API arguments to make sure that
			 * we have all required arguments present before
			 * making the API call.
			 */
			validate : function(args, required) {
				$.each(required, function(i,name) {
					if(!(name in args)) {
						throw "Missing argument " + name + " in TwitPic API call";
					}
				});
			},
			
			/*
			 * Performs a query with the TwitPic JSONP API,
			 * and sends returned data to the user-defined
			 * callback function in the form of an object literal.
			 */
			query : function(url, data, callback) {
				var query_url = this.base_url + url + '.jsonp?callback=?';
			
				$.ajax({
					type: 'GET',
					url: query_url,
					data: data,
					dataType: 'jsonp',
					success: function(data) {
						callback(data);
					}
				});
			}
		};
		
		 twitpic.media = {
		 	/*
			 * media/show
			 * Required:
			 *		id - The short ID of the image
			 */
		 	show : function(args, callback) {
		 		API.validate(args, ['id']);
		 		API.query('2/media/show', args, callback);
		 	}
		 };
		
		twitpic.users = {
			/*
			 * users/show
			 * Required:
			 *		username - username of the user to get info for
			 * Optional
			 *		page - user photo pagination
			 */
			show : function(args, callback) {
				API.validate(args, ['username']);
				API.query('2/users/show', args, callback);
			}
		};
		
		twitpic.comments = {
			/*
			 * comments/show
			 * Required:
			 *		media_id - The short ID of the image
			 *		page - Comment pagination
			 */
			show : function(args, callback) {
				API.validate(args, ['media_id', 'page']);
				API.query('2/comments/show', args, callback);
			}
		};
		
		twitpic.place = {
			/*
			 * place/show
			 * Required:
			 *		id - The ID of the place
			 * Optional:
			 *		user - restrict photos to this username
			 */
			show : function(args, callback) {
				API.validate(args, ['id']);
				API.query('2/place/show', args, callback);
			}
		};
		
		twitpic.places = {
			/*
			 * places/show
			 * Required:
			 *		user - the username of the user
			 */
			show : function(args, callback) {
				API.validate(args, ['user']);
				API.query('2/places/show', args, callback);
			}
		};
		
		twitpic.events = {
			/*
			 * events/show
			 * Required:
			 *		user - the username of the user
			 */
			show : function(args, callback) {
				API.validate(args, ['user']);
				API.query('2/events/show', args, callback);
			}
		};
		
		twitpic.event = {
			/*
			 * event/show
			 * Required:
			 *		id - the short ID of the event
			 */
			show : function(args, callback) {
				API.validate(args, ['id']);
				API.query('2/event/show', args, callback);
			}
		};
		
		twitpic.tags = {
			/*
			 * tags/show
			 * Required:
			 *		tag - The tag to search for, or a comma separated list of tags
			 */
			show : function(args, callback) {
				API.validate(args, ['tag']);
				API.query('2/tags/show', args, callback);
			}
		};
		
		is_ready = true;
		if(ready_callback) ready_callback();
		
	}
	
})(window);