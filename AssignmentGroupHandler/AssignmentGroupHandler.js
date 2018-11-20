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

	this.parser.setSheetName("Assignment Groups"); // XSLX Tab name
	this.parser.parse(this.attStr);

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

	while(this.parser.next()) { 
		var r = this.parser.getRow(); 
		groups.push({
			name: r["Assignment group name"],
			manager: r["Group Manager"],
			company: r["Company"],
			description: r["Description"],
			location: r["Location"],
			types: r["Group type"].replace(/\s+/g,"").split(","),
			members: r["Group Members"].split(","),
			roles: r["Roles"].replace(/\s+/g,"").split(",")		
		});
	}

	if(groups.length == 0)
		return gs.info("Group list is empty");

	gs.info(groups[0].members[0]);
}

new AssignmentGroupsHandler().createGroups();