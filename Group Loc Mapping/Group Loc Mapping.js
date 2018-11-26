function GroupLocMapping() {

	var _this = this;
	var mapping = [];
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

	this.createMapping = function() {

		ps.setSheetName("TS group mapping "); // XSLX Tab name

		ps.parse(attStr);

		/*
			Available data to transform from XSLX to ServiceNow Fields/Related Lists:
				- Technical Service
				- Assignment Group
				- Location
		*/

		while(ps.next()) { 
			var r = ps.getRow(); 
			mapping.push({
				technical_service: r["Technical Service"],
				assignment_group: r["Assignment Group"],
				location: r["Location"]
			});
		}

		if(mapping.length == 0) {
			gs.info("Mapping Service list is empty");
			return;
		}

		if(!_this.queryRelatedData())
			return;

		mapping.forEach(function(mapp) {

			var mappingGR = new GlideRecord("u_business_service_to_group_org_loc_mapping");
			mappingGR.initialize();
			mappingGR.u_input_table = "cmdb_ci_service";
			mappingGR.u_input_business_service = _this.cmdb_ci_service[mapp.technical_service];
			mappingGR.u_input_record = _this.cmdb_ci_service[mapp.technical_service];
			mappingGR.u_language = "en";
			mappingGR.u_location = _this.cmn_location[mapp.location];
			mappingGR.u_output_table = "sys_user_group";
			mappingGR.u_output_group = _this.sys_user_group[mapp.assignment_group];
			mappingGR.u_output_record = _this.sys_user_group[mapp.assignment_group];
			mappingGR.u_type = "ba473b63379e53002153d5c543990eed" // Business Service to Group
			mappingGR.insert();
		});
	};

	this.queryRelatedData = function() {

		var queryStore = {};
		var queryTables = [
			"cmdb_ci_service",
			"cmn_location",
			"sys_user_group"
		];

		for(ql = 0; ql < queryTables.length; ql++) {
			_this[queryTables[ql]] = {};
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

		gs.info(queryStore.cmn_location);
		gs.info(queryStore.cmn_location);
		gs.info(queryStore.cmn_location);

		var glideQueryHandler = function(table, q) {
			var gr = new GlideRecord(table);
			gr.addActiveQuery();
			gr.addQuery("name", "IN", q);
			gr.query();

			while(gr.next()) {
				var name = gr.name.getDisplayValue();
				var id = gr.getUniqueValue();

				_this[table][name] = id;

				//Avoid duplicate values
				var arrQuery = queryStore[table].split(",");
				arrQuery.splice(arrQuery.indexOf(name), 1);
				queryStore[table] = arrQuery.join(",");
			}
		};

		for(var qs in queryStore) {
			glideQueryHandler(qs, queryStore[qs]);
		}

		_this._getBusinessCritValues();

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