function AssignmentGroupsHandler() {

	this.groups = [];
	this.ps = new sn_impex.GlideExcelParser();
	this.attachment = new GlideSysAttachment();
	var ga = new GlideRecord('sys_attachment');
	ga.addQuery('table_name', 'sys_update_set'); //Table name where file is attached
	ga.addQuery('table_sys_id', '1506197edb75234009351bfa4b961951'); //Record sys id where file is attached
	ga.query();

	if(!ga.next()){
		gs.info("Attchment is not defined");
		return;
	}

	this.attStr = this.attachment.getContentStream(ga.getUniqueValue());
}

AssignmentGroupsHandler.prototype.removeSpaces = function(str) {
	return str.replace(/\s+(?!,\s,)\s+|(?!\s+),\s+|,/g,",");
}

AssignmentGroupsHandler.prototype.createGroups = function() {

	var _this = this;

	this.ps.setSheetName("Assignment Groups"); // XSLX Tab name
	this.ps.parse(this.attStr);

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

	while(this.ps.next()) { 
		var r = this.ps.getRow(); 
		this.groups.push({
			name: r["Assignment group name"],
			manager: r["Group Manager"],
			company: r["Company"],
			description: r["Description"],
			location: r["Location"],
			types: this.removeSpaces(r["Group type"]),
			members: this.removeSpaces(r["Group Members"]),
			roles: this.removeSpaces(r["Roles"])
		});
	}

	if(this.groups.length == 0) {
		gs.info("Group list is empty");
		return;
	}

	this.queryRelatedData();

	this.groups.forEach(function(group) {

		var groupGR = new GlideRecord('sys_user_group');
		groupGR.initialize();
		groupGR.name = group.name;
		groupGR.manager = _this.sys_user[group.manager];
		groupGR.company = _this.core_company[group.company];
		groupGR.description = group.description;
		groupGR.location = _this.cmn_location[group.location];
		groupGR.type = _this.getDataByStr("sys_user_group_type", group.types).join(",");
		groupGR.insert();

		if(groupGR.isValidRecord()) {

			var groupID = groupGR.getUniqueValue();

			_this.addUserRel(groupID, _this.getDataByStr("sys_user", group.members));
			_this.addRoleRel(groupID, _this.getDataByStr("sys_user_role", group.roles));
		}

	});
}

AssignmentGroupsHandler.prototype.queryRelatedData = function() {

	this.sys_user = {};
	this.cmn_location = {};
	this.sys_user_role = {};
	this.sys_user_group_type = {};
	this.core_company = {};

	var queryStore = {
		"sys_user": "",
		"cmn_location": "",
		"sys_user_role": "",
		"sys_user_group_type": "",
		"core_company": ""
	};

	var _this = this;

	this.groups.forEach(function(group) {
		queryStore.sys_user += "," + group.manager + "," + group.members;
		queryStore.cmn_location += "," + group.location;
		queryStore.sys_user_role += "," + group.roles;
		queryStore.sys_user_group_type += "," + group.types;
		queryStore.core_company += "," + group.company;
	});

	var glideQueryHandler = function(table, q) {
		var gr = new GlideRecord(table);
		gr.addActiveQuery();
		gr.addQuery("name", "IN", q);
		if(table == "sys_user")
			gr.addNotNullQuery("email");
		gr.query();

		while(gr.next()) {
			_this[table][gr.name.getDisplayValue()] = gr.getUniqueValue();
		}
	}

	for(var q in queryStore) {
		glideQueryHandler(q, queryStore[q])
	}
}

AssignmentGroupsHandler.prototype.getDataByStr = function(store, str) {

	var q = str.split(",");
	var res = [];

	for(var i = 0; i < q.length; i++) {
		res.push(this[store][q[i]]);
	}

	return res;
}

AssignmentGroupsHandler.prototype.addUserRel = function(id, members) {

	if(!id)
		return;

	for(var m = 0; m < members.length; m++) {
		var memberRelationGR = new GlideRecord("sys_user_grmember");
		memberRelationGR.initialize();
		memberRelationGR.user = members[m];
		memberRelationGR.group = id;
		memberRelationGR.insert();
	}
}

AssignmentGroupsHandler.prototype.addRoleRel = function(id, roles) {

	if(!id)
		return;

	for(var r = 0; r < roles.length; r++) {
		var roleRelationGR = new GlideRecord("sys_group_has_role");
		roleRelationGR.initialize();
		roleRelationGR.role = roles[r];
		roleRelationGR.group = id;
		roleRelationGR.insert();
	}
}

new AssignmentGroupsHandler().createGroups();