function GroupLocMapping() {

	var self = this;
	var mapping = [];
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

	this.createMapping = function() {

		ps.setSheetName("TS group mapping"); // XSLX Tab name

		ps.parse(attStr);

		/*
			Available data to transform from XSLX to ServiceNow Fields/Related Lists:
				- Technical Service
				- Assignment Group
				- Location
		*/

		while(ps.next()) {
			var r = ps.getRow();
			var _mapping = {};

			if(r["Technical Service"])
				_mapping.technical_service = r["Technical Service"];
			if(r["Assignment Group"])
				_mapping.assignment_group = r["Assignment Group"];
			if(r["Location"])
				_mapping.location = r["Location"];
			if(r["AD DN"])
				_mapping.ad_dn = r["AD DN"];

			mapping.push(_mapping);
		}

		if(mapping.length == 0) {
			gs.info("Mapping Service list is empty");
			return;
		}

		if(!self._queryRelatedData())
			return;

		mapping.forEach(function(mapp) {

			var mappingGR = new GlideRecord("u_business_service_to_group_org_loc_mapping");
			mappingGR.initialize();
			mappingGR.u_input_table = "cmdb_ci_service";
			mappingGR.u_input_business_service = self.cmdb_ci_service[mapp.technical_service];
			mappingGR.u_input_record = self.cmdb_ci_service[mapp.technical_service];
			mappingGR.u_language = "en";
			mappingGR.u_location = self.cmn_location[mapp.location];
			mappingGR.u_output_table = "sys_user_group";
			mappingGR.u_output_group = self.sys_user_group[mapp.assignment_group];
			mappingGR.u_output_record = self.sys_user_group[mapp.assignment_group];
			mappingGR.u_type = "ba473b63379e53002153d5c543990eed" // Business Service to Group
			mappingGR.insert();
		});
	};

	this._queryRelatedData = function() {

		var queryStore = {};
		var queryTables = [
			"cmdb_ci_service",
			"cmn_location",
			"sys_user_group"
		];

		for(ql = 0; ql < queryTables.length; ql++) {
			self[queryTables[ql]] = {};
			queryStore[queryTables[ql]] = "";
		}

		mapping.forEach(function(mapp) {
			queryStore.cmdb_ci_service += mapp.technical_service + ",";
			queryStore.cmn_location += mapp.location + ",";
			queryStore.sys_user_group += mapp.assignment_group + ",";
		});

		//Remove Duplicates
		for (var q in queryStore) {
			queryStore[q] = queryStore[q].split(",").filter(function(value, index, self) { 
			    return self.indexOf(value) === index;
			}).filter(Boolean).join(',');
		}

		gs.info(queryStore.cmdb_ci_service);
		gs.info(queryStore.cmn_location);
		gs.info(queryStore.sys_user_group);

		var glideQueryHandler = function(table, q) {
			var gr = new GlideRecord(table);
			gr.addActiveQuery();
			gr.addQuery("name", "IN", q);
			gr.query();

			while(gr.next()) {
				var name = gr.name.getDisplayValue();
				var id = gr.getUniqueValue();

				self[table][name] = id;

				//Avoid duplicate values
				var arrQuery = queryStore[table].split(",");
				arrQuery.splice(arrQuery.indexOf(name), 1);
				queryStore[table] = arrQuery.join(",");
			}
		};

		for(var qs in queryStore) {
			glideQueryHandler(qs, queryStore[qs]);
		}

		self._getBusinessCritValues();

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

new GroupLocMapping().createMapping();