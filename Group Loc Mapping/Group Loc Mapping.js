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

		ps.setSheetName("Global TS group Mapping"); // XSLX Tab name

		ps.parse(attStr);

		/*
			Available data to transform from XSLX to ServiceNow Fields/Related Lists:
				- Technical Service
				- Assignment Group
				- AD DN
		*/

		while(ps.next()) {
			var r = ps.getRow();

			if(!r["Technical Service"] || !r["Assignment Group"] || !r["AD DN"])
				continue;

			var _mapping = {};

			_mapping.technical_service = r["Technical Service"];
			_mapping.assignment_group = r["Assignment Group"];
			_mapping.ad_dn = r["AD DN"];
			if(r["PRB"])
				_mapping.prb = r["PRB"];
			if(r["CAB"])
				_mapping.cab = r["CAB"];

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
			mappingGR.u_ad_dn = mapp.ad_dn;
			mappingGR.u_output_table = "sys_user_group";
			mappingGR.u_output_group = self.sys_user_group[mapp.assignment_group];
			mappingGR.u_output_record = self.sys_user_group[mapp.assignment_group];
			if(mapp.prb)
				mappingGR.u_output_pbm_record = self.sys_user_group[mapp.prb];
			if(mapp.cab)
				mappingGR.u_output_cab_record = self.sys_user_group[mapp.cab];
			
			
			mappingGR.u_type = "ba473b63379e53002153d5c543990eed" // Business Service to Group
			mappingGR.insert();
		});
	};

	this._queryRelatedData = function() {

		var queryStore = {};
		var queryTables = [
			"cmdb_ci_service",
			"sys_user_group"
		];

		for(ql = 0; ql < queryTables.length; ql++) {
			self[queryTables[ql]] = {};
			queryStore[queryTables[ql]] = "";
		}

		mapping.forEach(function(mapp) {
			queryStore.cmdb_ci_service += mapp.technical_service + ",";
			queryStore.sys_user_group += mapp.assignment_group + ",";
			if(mapp.prb)
				queryStore.sys_user_group += mapp.prb + ",";
			if(mapp.cab)
				queryStore.sys_user_group += mapp.cab + ",";
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
			gr.addQuery("name", "IN", q);
			if(table == "sys_user_group") {
				gr.addQuery("operational_status", "1"); //Operational
				gr.addNullQuery("support_group");		//Global Technical Services
			}
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