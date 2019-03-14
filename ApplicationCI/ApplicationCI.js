function Application() {

	var self = this;
	var applications = [];
	var ps = new sn_impex.GlideExcelParser();
	var attachment = new GlideSysAttachment();
	var ga = new GlideRecord('sys_attachment');
	ga.addQuery('table_name', 'sys_update_set'); //Table name where file is attached
	ga.addQuery('table_sys_id', (new GlideUpdateSet()).get()); //Record sys id where file is attached
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

			var _application = {};

			if(r["Name"])
				_application.name = r["Name"];
			if(r["Company"])
				_application.company = r["Company"];
			if(r["L2 Support Group"])
				_application.support_group = r["L2 Support Group"];
			if(r["L1 Support Group"])
				_application.assignment_group = r["L1 Support Group"];
			if(r["Approval Group"])
				_application.change_control =r["Approval Group"];
			if(r["Business Owner"])
				_application.owned_by = r["Business Owner"];
			if(r["Technical Owner"])
				_application.managed_by = r["Technical Owner"];
			if(r["Description"])
				_application.short_description = r["Description"];
			if(r["Related Business Services"])
				_application.business_service = r["Related Business Services"];
			if(r["Division"])
				_application.u_hier2 = r["Division"];
			if(["Location"])
				_application.location = r["Location"];

			applications.push(_application);
		}

		if(applications.length == 0) {
			gs.info("Application list is empty");
			return;
		}

		if(!self.queryRelatedData())
			return;

		applications.forEach(function(appl) {

			var applGR = new GlideRecord('cmdb_ci_appl');
			applGR.initialize();
			applGR.name = appl.name;
			applGR.operational_status = appl.operational_status;
			applGR.support_group = self.sys_user_group[appl.support_group];
			applGR.assignment_group = self.sys_user_group[appl.assignment_group];
			applGR.change_control = self.sys_user_group[appl.change_control];
			applGR.owned_by = self.sys_user[appl.owned_by];
			applGR.managed_by = self.sys_user[appl.managed_by];
			applGR.short_description = appl.short_description;
			applGR.u_hier2 = self.u_org_hierarchy[appl.u_hier2];
			applGR.location = self.cmn_location[appl.location];
			applGR.company = self.core_company[appl.company];

			applGR.insert();

			if(applGR.isValidRecord()) {
				self.addBSRelation(applGR.getUniqueValue(), appl.business_service);
			}

		});
	};

	this.queryRelatedData = function() {

		var queryStore = {};
		var queryTables = [
			"sys_user",
			"cmn_location",
			"core_company",
			"sys_user_group",
			"u_org_hierarchy",
			"cmdb_ci_service"
		];

		for(ql = 0; ql < queryTables.length; ql++) {
			self[queryTables[ql]] = {};
			queryStore[queryTables[ql]] = "";
		}

		applications.forEach(function(appl) {
			if(appl.owned_by)
				queryStore.sys_user += appl.owned_by + ",";
			if(appl.managed_by)
				queryStore.sys_user += appl.managed_by + ",";
			if(appl.location)
				queryStore.cmn_location += appl.location + ",";
			if(appl.company)
				queryStore.core_company += appl.company + ",";
			if(appl.support_group)
				queryStore.sys_user_group += appl.support_group + ",";
			if(appl.change_control)
				queryStore.sys_user_group += appl.change_control + ","
			if(appl.assignment_group)
				queryStore.sys_user_group += appl.assignment_group + ",";
			if(appl.u_hier2)
				queryStore.u_org_hierarchy += appl.u_hier2 + ",";
			if(appl.business_service)
				queryStore.cmdb_ci_service += appl.business_service + ",";
		});

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

				self[table][nameKey] = gr.getUniqueValue();
				var arrQuery = queryStore[table].split(",");
				arrQuery.splice(arrQuery.indexOf(nameKey), 1);
				queryStore[table] = arrQuery.join(",");
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

	this.addBSRelation = function(child, parents) {
		parents = parents.split(",");
		for(var p = 0; p < parents.length; p++) {

			gs.info(parents[p]);
			var relGR = new GlideRecord('cmdb_rel_ci');
			relGR.initialize();
			relGR.child = child;
			relGR.parent  = self.cmdb_ci_service[parents[p]];
			relGR.type = "1a9cb166f1571100a92eb60da2bce5c5"; //Used By: (Child)
			relGR.insert();
		}
	};
}

new Application().createApplications();