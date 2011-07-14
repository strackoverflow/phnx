var Account = Class.create({
	initialize: function(data) {
		this.db = new Lawnchair('phnxAccounts');
		this.data = {
			home: [],
			mentions: [],
			messages: []
		};
	},
	all: function(callback) {
		this.db.all(callback);
	},
	get: function(key, callback) {
		this.db.get(key, function(r){
			this.data = r;
			if (callback) {
				callback(r);
			}
		}.bind(this));
	},
	getByName: function(name, callback) {
		this.db.find('r.name == "' + name + '"', callback);
	},
	load: function(attributes) {
		this.data = attributes;
	},
	set: function(key, value) {
		this.data[key] = value;
	},
	save: function() {
		// why do I have to manually set this? unsure...
		this.data.key = this.data.id;
		this.db.save(this.data);
	},
	destroy: function() {
		this.db.remove(this.data.key);
	},
	toJSON: function() {
		return this.data;
	}
});