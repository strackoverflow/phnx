/*
	User Model
		-Used for creating and managing User Accounts
*/

function User(){
	this.key = undefined;
	this.id = undefined;
	this.username = undefined;
	this.token = undefined;
	this.secret = undefined;
}

User.prototype = {
	load: function(id){
		var user = this;
		var db = new Lawnchair('phoenixusers');
		db.get(id, function(r){
			user.key = r.id;
			user.id = r.id;
			user.username = r.username;
			user.token = r.token;
			user.secret = r.secret;
		});
	},
	
	all: function(callback){
		var db = new Lawnchair('phoenixusers');
		db.all(callback);
	},
	
	create: function(attr){
		//needs to be called before save()
		this.key = attr.id;
		this.id = attr.id;
		this.username = attr.username;
		this.token = attr.token;
		this.secret = attr.secret;
	},
	
	save: function(){
		var db = new Lawnchair('phoenixusers');
		db.save(this);
	},
	
	remove: function(){
		var db = new Lawnchair('phoenixusers');
		db.remove(this.id);
		
		db.all(function(r){
			cachedUsers = r;
			if (cachedUsers.length > 0){
				currentUser = cachedUsers[0];
				Mojo.Controller.stageController.swapScene({
					'name': 'main',
					transition: Mojo.Transition.crossFade
				});
			}
			else{
				Mojo.Controller.stageController.swapScene({
					'name': 'launch',
					transition: Mojo.Transition.crossFade
				});
			}
		});
	}
};