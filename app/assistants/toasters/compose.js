var ComposeToaster = Class.create(Toaster, {
	initialize: function(opts, assistant) {
		this.id = toasterIndex++;
		this.nodeId = 'toaster-' + this.id;
		this.textarea = 'txtCompose-' + this.id;
		this.assistant = assistant;
		this.controller = assistant.controller;
		this.user = this.controller.stageController.user;
		this.shim = false; //hide the shim when this toaster is toasty
		this.dm = false;
		this.reply = false;
		this.reply_id = '';
		this.geo = false;
		this.lat = 0;
		this.lng = 0;
		this.to = {};
		this.rt = false;
		this.availableChars = 140;
		this.count = 140;
		this.images = []; //any images to be uploaded
		this.uploading = false;
		this.sending = false;

		var toasterObj = {
			toasterId: this.id
		};

		if (opts.rt) {
			this.rt = true;
		}

		if (opts.dm) {
			this.dm = true;
			this.to = opts.user;
			toasterObj.to = opts.user.screen_name;
		}

		this.render(toasterObj, 'templates/toasters/compose');

		if (opts.text) {
			var txt;
			if (opts.text === '0') {
				txt = '@';
			}
			else {
				txt = opts.text;
			}
			get(this.textarea).value = txt;
			this.updateCounter();
		}

		// Select reply-all names at first
		if (opts.selectStart && opts.selectEnd) {
			get(this.textarea).selectionStart = opts.selectStart;
			get(this.textarea).selectionEnd = opts.selectEnd;
		}
		else if (this.rt) {
			get(this.textarea).setSelectionRange(0,0); //focus the cursor at the beginning
		}
		else {
			var len = get(this.textarea).value.length;
			get(this.textarea).setSelectionRange(len,len); //focus the cursor at the end
		}

		if (opts.reply_id) {
			this.reply = true;
			this.reply_id = opts.reply_id;
			get('submit-' + this.id).update('Post Reply');
		}

		if (opts.dm) {
			get('dm-' + this.id).addClassName('show');
			get('submit-' + this.id).update('Send Message');
		}

		// Need a timeout because sometimes the tapend event cancels the focus()
		setTimeout(function(){
			get(this.textarea).focus();
		}.bind(this), 0);
	},
	updateCounter: function() {
		var count = this.availableChars - get(this.textarea).value.length;
		get('count-' + this.id).update(count);
	},
	submitTweet: function(event) {
		var txt = get(this.textarea).value;
		var Twitter = new TwitterAPI(this.user);
		var args;
		if (txt.length <= this.availableChars && txt.length > 0) {
			if (this.uploading === false) {
				if (!this.dm) {
					this.easterEggs(txt); //display some joke banners teehee
					args = {'status': txt};

					if (this.reply) {
						args.in_reply_to_status_id = this.reply_id;
					}

					if (this.geo) {
						args['lat'] = this.lat;
						args['long'] = this.lng;
					}

					Twitter.postTweet(args, function(response, meta) {
						var prefs = new LocalStorage();
						var refresh = prefs.read('refreshOnSubmit');

						if (refresh) {
							this.assistant.refreshAll();
						}

						if (!this.rt) {
							this.assistant.toasters.back();
						}
						else {
							// If it's a retweet we want to go back 2 toasters to close the RT toaster
							this.assistant.toasters.backX(2);
						}
					}.bind(this));
				}
				else if (this.dm) {
					args = {'text': txt, 'user_id': this.to.id_str};
					Twitter.newDM(args, function(response) {
						var prefs = new LocalStorage();
						var refresh = prefs.read('refreshOnSubmit');

						if (refresh) {
							this.assistant.refreshAll();
						}

						this.assistant.toasters.back();
					}.bind(this));
				}
			}
			else {
				ex('An upload is in progress.');
			}
		}
		else if (txt.length === 0) {
			ex('That tweet is kind of empty.');
		}
		else {
			ex('Keep it under 140, please!');
		}
	},
	easterEggs: function(t) {
		t = t.toLowerCase();

		if (t.indexOf('packers') > -1) {
			banner('Go Packers! :)');
		}
		else if (t.indexOf('phnx') > -1 && t.indexOf('phnx.ws') < -1) {
			banner("Hey, that's me!");
		}
	},
	geotagTapped: function(event) {
		if (!this.geo) {
			this.getLocation();
		}
		else {
			this.geo = false;
			this.lat = 0;
			this.lng = 0;
			this.controller.get('geotag-' + this.id).removeClassName('active');
			banner('Location removed from tweet.');
		}
	},
	getLocation: function(){
		banner('Locating you...');
		this.controller.serviceRequest('palm://com.palm.location', {
			method : 'getCurrentPosition',
			parameters: {
				accuracy: 3,
				responseTime: 1,
				maximumAge: 90
			},
			onSuccess: this.gotLocation.bind(this),
			onFailure: function(response) {
				ex("There was an error getting a GPS fix.");
			}
		});
	},
	gotLocation: function(response){
		this.geo = true;
		this.lat = response.latitude;
		this.lng = response.longitude;
		this.controller.get('geotag-' + this.id).addClassName('active');
		banner('Found you!');
	},
	photoTapped: function(event) {
		var params = {
			defaultKind: 'image',
			kinds: ['image'],
			onSelect: function(file){
				var path = file.fullPath;
				this.upload(path);
			}.bind(this)
		};

		Mojo.FilePicker.pickFile(params, this.controller.stageController);
	},
	upload: function(path) {
		this.uploading = true;
		get('submit-' + this.id).setStyle({'opacity': '.4'});
		get('loading').addClassName('show');

		var args = [
			{ key:"key",				data: Config.twitpicKey	},
			{ key:"consumer_token",		data: Config.key		},
			{ key:"consumer_secret",	data: Config.secret		},
			{ key:"oauth_token",		data: this.user.token	},
			{ key:"oauth_secret",		data: this.user.secret	},

			{ key:"message",			data: ""				}
		];

		this.controller.serviceRequest('palm://com.palm.downloadmanager/', {
			method:				'upload',
			parameters: {
				url:			'http://api.twitpic.com/1/upload.json',
				fileLabel:		'media',
				fileName:		path,
				postParameters:	args,
				subscribe:		true
			},

			onSuccess: function(response) {
				var ta = get(this.textarea);

				if (response.completed) {
					var result = Mojo.parseJSON(response.responseString);

					this.uploading = false;
					get('submit-' + this.id).setStyle({'opacity': '1'});
					get('loading').removeClassName('show');

					if (ta.value.length > 0) {
						ta.value = ta.value + ' ';
					}

					ta.value = ta.value + result.url;
					this.updateCounter();
				}
			}.bind(this),

			onFailure: function() {
				this.uploading = false;

				get('submit-' + this.id).setStyle({'opacity': '1'});
				get('loading').removeClassName('loading');
				ex('Error uploading image.');
			}
		});
	},
	linkTapped: function(event) {
		var txt = this.controller.get(this.textarea).value;
		var urls = txt.extractUrls();
		var bitly = new BitlyAPI({
			custom: false,
			user: Config.bitlyUser,
			key: Config.bitlyKey
		});

		var callback = function(shrt, lng){
			this.controller.get(this.textarea).value = this.controller.get(this.textarea).value.replace(new RegExp(lng, 'g'), shrt);
		};

		for (var i=0; i < urls.length; i++) {
			var u = urls[i];
			if (u.indexOf('bit.ly') < 0) {
				bitly.shorten(u, callback.bind(this));
			}
		}
	},
	setup: function() {
		var prefs = new LocalStorage();
		if (prefs.read('enterToSubmit')) {
			get(this.textarea).observe('keydown', function(e){
				if (e.keyCode === 13) {
					this.submitTweet();
					e.stop();
				}
			}.bind(this));
		}

		get(this.textarea).observe('keyup', function(e){
				this.updateCounter();
		}.bind(this));
		Mojo.Event.listen(get('submit-' + this.id), Mojo.Event.tap, this.submitTweet.bind(this));
		Mojo.Event.listen(get('photo-' + this.id), Mojo.Event.tap, this.photoTapped.bind(this));
		Mojo.Event.listen(get('geotag-' + this.id), Mojo.Event.tap, this.geotagTapped.bind(this));
		Mojo.Event.listen(get('link-' + this.id), Mojo.Event.tap, this.linkTapped.bind(this));
	},
	cleanup: function() {
		get(this.textarea).stopObserving('keyup');
		var prefs = new LocalStorage();
		if (prefs.read('enterToSubmit')) {
			get(this.textarea.stopObserving('keydown'));
		}

		Mojo.Event.stopListening(get('submit-' + this.id), Mojo.Event.tap, this.submitTweet);
		Mojo.Event.stopListening(get('photo-' + this.id), Mojo.Event.tap, this.photoTapped);
		Mojo.Event.stopListening(get('geotag-' + this.id), Mojo.Event.tap, this.geotagTapped);
		Mojo.Event.stopListening(get('link-' + this.id), Mojo.Event.tap, this.linkTapped);
	}
});
