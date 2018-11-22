function ApplicationHandler() {

	var _this = this;
	var applications = [];
	var ps = new sn_impex.GlideExcelParser();
	var attachment = new GlideSysAttachment();
	var ga = new GlideRecord('sys_attachment');
	ga.addQuery('table_name', 'sys_update_set'); //Table name where file is attached
	ga.addQuery('table_sys_id', '1506197edb75234009351bfa4b961951'); //Record sys id where file is attached
	ga.query();

	if(!ga.next()){
		gs.info("Attchment is not defined");
		return;
	}

	var attStr = attachment.getContentStream(ga.getUniqueValue());

	this.createApplications = function() {

		ps.setSheetName("App CI"); // XSLX Tab name
		ps.parse(attStr);

		/*
			Available data to transform from XSLX to ServiceNow Fields/Related Lists:
				- Name
				- Operational Status
				- Approval Group
				- Business Owner
				- Technical Owner
				- Description
				- Related Business Services
				- Division
				- Location
		*/

		while(ps.next()) { 
			var r = ps.getRow(); 
			applications.push({
				name: r["Name"],
				operational_status: r["Operational Status"],
				support_group: r["L2 Support Group"],
				change_control: r["Approval Group"],
				owned_by: r["Business Owner"],
				managed_by: r["Technical Owner"],
				short_description: r["Description"],
				rel_business_services: r["Related Business Services"],
				u_heir2: r["Division"],
				location: r["Location"]
			});
		}

		if(applications.length == 0) {
			gs.info("Application list is empty");
			return;
		}

		_this.queryRelatedData();
	};

	this.queryRelatedData = function() {

		var queryStore = {};
		var queryTables = [
			"sys_user",
			"cmn_location",
			"sys_user_group",
			"u_org_hierarchy",
			"core_company"
		];

		for(ql = 0; ql < queryTables.length; ql++) {
			_this[queryTables[ql]] = {};
			queryStore[queryTables[ql]] = "";
		}


	}

	this.removeSpaces = function(str) {
		return str.replace(/\s+(?!,\s,)\s+|(?!\s+),\s+|,/g,",");
	};
}

new ApplicationHandler().createApplications();