var query = "";

userList.forEach(function(user){
	query += user.name + ",";
});

var grUser = new GlideRecord('sys_user');
grUser.addActiveQuery();
grUser.addQuery('name', 'IN', query);
grUser.addActiveQuery('locked_out', 'false');
grUser.addQuery('company', 'f225979c0f0f6100059d7d4ce1050eef');
grUser.query();

gs.info(grUser.getRowCount());

while(grUser.next()) {

	userList.forEach(function(user, index) {
		if(user.name == grUser.name) {
			grUser.u_bpo = user.bpo;
			grUser.update();

			//userList.splice(index, 1);
		}
	});
}

// userList.forEach(function(user) {
// 	gs.info("User not found: " + user.name);
// });