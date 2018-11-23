function Application() {

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
				u_hier2: r["Division"],
				location: r["Location"],
				company: r["Company"]
			});
		}

		if(applications.length == 0) {
			gs.info("Application list is empty");
			return;
		}

		if(!_this.queryRelatedData())
			return;

		applications.forEach(function(appl) {

			var applGR = new GlideRecord('cmdb_ci_appl');
			applGR.initialize();
			applGR.name = appl.name;
			applGR.operational_status = appl.operational_status;
			applGR.support_group = _this.sys_user_group[appl.support_group];
			applGR.change_control = _this.sys_user_group[appl.change_control];
			applGR.owned_by = _this.sys_user[appl.owned_by];
			applGR.managed_by = _this.sys_user[appl.managed_by];
			applGR.description = appl.description;
			applGR.u_hier2 = _this.u_org_hierarchy[appl.u_hier2];
			applGR.location = _this.cmn_location[appl.location];
			applGR.company = _this.core_company[appl.company];

			applGR.insert();

			// if(applGR.isValidRecord()) {

			// 	var applID = applGR.getUniqueValue();

			// 	_this.addBSRel(groupID, _this.getDataByStr("sys_user", group.members));
			// }

		});
	};

	this.queryRelatedData = function() {

		var queryStore = {};
		var queryTables = [
			"sys_user",
			"cmn_location",
			"core_company",
			"sys_user_group",
			"u_org_hierarchy"
		];

		for(ql = 0; ql < queryTables.length; ql++) {
			_this[queryTables[ql]] = {};
			queryStore[queryTables[ql]] = "";
		}

		applications.forEach(function(appl) {
			queryStore.sys_user += appl.owned_by + "," + appl.managed_by + ",";
			queryStore.cmn_location += appl.location + ",";
			queryStore.core_company += appl.company + ",";
			queryStore.sys_user_group += appl.support_group + "," + appl.change_control + ",";
			queryStore.u_org_hierarchy += appl.u_hier2 + ",";
		});

		gs.info(queryStore.cmn_location);

		//Remove Duplicates
		for (var q in queryStore) {
			queryStore[q] = queryStore[q].split(",").filter(function(value, index, self) { 
			    return self.indexOf(value) === index;
			}).filter(Boolean).join(',');
		}

		var glideQueryHandler = function(table, q) {
			var gr = new GlideRecord(table);
			gr.addActiveQuery();
			if(table == "u_org_hierarchy") {
				gr.addQuery("u_name", "IN", q);
			} else {
				gr.addQuery("name", "IN", q);
			}
			if(table == "sys_user"){
				gr.addNotNullQuery("email");
				gr.addEncodedQuery("emailNOT LIKEa-")
			}
			gr.query();

			while(gr.next()) {

				var nameKey = (gr.name ? gr.name.getDisplayValue() : gr.u_name.getDisplayValue());

				_this[table][nameKey] = gr.getUniqueValue();
				var arrQuery = queryStore[table].split(",");
				gs.info(arrQuery);
				arrQuery.splice(arrQuery.indexOf(nameKey), 1);
				queryStore[table] = arrQuery.join(",");
				gs.info(arrQuery);
			}
		}

		for(var q in queryStore) {
			glideQueryHandler(q, queryStore[q])
		}

		var failQuery;
		for (var qu in queryStore) {
			if(queryStore[qu].length > 0) {
				gs.info("Wrong values on table : " + qu);
				gs.info(queryStore[qu]);
				failQuery = true;
			}
		}

		return !failQuery;
	};
}

new Application().createApplications();