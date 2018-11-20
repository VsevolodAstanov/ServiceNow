function AssignmentGroupsHandler() {

	this.parser = new sn_impex.GlideExcelParser();
	this.attachment = new GlideSysAttachment();
	var ga = new GlideRecord('sys_attachment');
	ga.addQuery('table_name', 'sys_update_set'); //Table name where file is attached
	ga.addQuery('table_sys_id', '1506197edb75234009351bfa4b961951'); //Record sys id where file is attached
	ga.query();

	if(!ga.next())
		return gs.info("Attchment is not defined");

	this.attStr = this.attachment.getContentStream(ga.getUniqueValue());
}

AssignmentGroupsHandler.prototype.createGroups = function() {

	var _this = this;

	_this.parser.setSheetName("Assignment Groups"); // XSLX Tab name
	_this.parser.parse(_this.attStr);

	/*
		Available data to transform from XSLX to ServiceNow Fields/Related Lists:
			- Name
			- Manager
			- Company
			- Description
			- Location
			- Type
			- Location
			- Group Members
			- Roles
	*/

	var groups = [];

	while(_this.parser.next()) { 
		var r = _this.parser.getRow(); 
		groups.push({
			name: r["Assignment group name"],
			manager: r["Group Manager"],
			company: r["Company"],
			description: r["Description"],
			location: r["Location"],
			types: r["Group type"].replace(/\s+/g,"").split(","),
			members: r["Group Members"],
			roles: r["Roles"].replace(/\s+/g,"").split(",")
		});
	}

	if(groups.length == 0)
		return gs.info("Group list is empty");

	var users = _this.getUsers(groups);
	var types = _this.getTypes(groups);
	var roles = _this.getRoles(groups);

	groups.forEach(function(group) {

		var groupGR = new GlideRecord('sys_user_group');
		groupGR.initialize();
		groupGR.name = group.name;
		groupGR.manager = users[group.name];
		groupGR.company = group.company;
		groupGR.description = group.description;
		groupGR.location = group.location;
		groupGR.types = group.types;

	});

	gs.info(groups[0].members[0]);
}

AssignmentGroupsHandler.prototype.getUsers = function(groups) {

	var notVerifiedUsers = "";

	groups.forEach(function(group) {
		notVerifiedUsers += group.manager + "," + group.members;
	});

	var users = {};
	var usersGR = new GlideRecord("sys_user");
	usersGR.addActiveQuery();
	usersGR.addQuery("name", "IN", notVerifiedUsers);
	usersGR.addNotNullQuery("email");
	usersGR.query();

	while(usersGR.next()) {
		users[usersGR.name.getDisplayValue()] = usersGR.getUniqueValue();
	}

	return users;
}

AssignmentGroupsHandler.prototype.getTypes = function(groups) {

}

AssignmentGroupsHandler.prototype.getRoles = function(groups) {

}

new AssignmentGroupsHandler().createGroups();