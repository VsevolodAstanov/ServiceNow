function Services(service_type) {

	var _this = this;
	var service_type = service_type;
	var services = [];
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

	this.createServices = function() {

		if(service_type == "cmdb_ci_service")
			ps.setSheetName("Business Services"); // XSLX Tab name

		if(service_type == "u_cmdb_ci_technical_service")
			ps.setSheetName("Technical Services"); // XSLX Tab name


		ps.parse(attStr);

		/*
			Available data to transform from XSLX to ServiceNow Fields/Related Lists:
				- Name
				- Business Criticality
				- Approval Group
				- Problem Approval Group
				- Support Group
				- Operational Status
				- Business Owner
				- Technical Owner
				- Location
				- Description
		*/

		while(ps.next()) { 
			var r = ps.getRow();

			var _service = {};

			if(r["Name"])
				_service.name = r["Name"];
			if(r["Operational Status"])
				_service.operational_status = r["Operational Status"];
			if(r["Support Group"])
				_service.support_group = r["Support Group"];
			if(r["Problem Approval Group"])
				_service.u_problem_approval_group = r["Problem Approval Group"];
			if(r["Approval Group"])
				_service.change_control =r["Approval Group"];
			if(r["Business Criticality"])
				_service.busines_criticality = r["Business Criticality"];
			if(r["Business Owner"])
				_service.owned_by = r["Business Owner"];
			if(r["Technical Owner"])
				_service.managed_by = r["Technical Owner"];
			if(["Location"])
				_service.location = r["Location"];
			if(r["Company"])
				_service.company = r["Company"];
			if(r["Description"])
				_service.description = r["Description"];

			services.push(_service);
		}

		if(services.length == 0) {
			gs.info("Service list is empty");
			return;
		}

		if(!_this.queryRelatedData())
			return;

		services.forEach(function(serv) {

			var servicesGR = new GlideRecord(service_type);

			var isInsert = function() {
				if(_this.duplicates.length > 0) {
					for(var d = 0; d < _this.duplicates.length; d++) {
						if(_this.duplicates[d].name == serv.name) {
							servicesGR.get(_this.duplicates[d].id);
							_this.duplicates.splice(d, 1);
							gs.info("Update Service :" + serv.name);
							return false;
						}
					}
				}

				return true;
			};

			if(isInsert()) {
				servicesGR.initialize();
				servicesGR.name = serv.name;

				gs.info("New Service :" + serv.name);
			}

			if(serv.operational_status)
				servicesGR.operational_status = serv.operational_status;
			if(serv.support_group)
				servicesGR.support_group = _this.sys_user_group[serv.support_group];
			if(serv.change_control)
				servicesGR.change_control = _this.sys_user_group[serv.change_control];
			if(serv.u_problem_approval_group)
				servicesGR.u_problem_approval_group = _this.sys_user_group[serv.u_problem_approval_group];
			if(serv.owned_by)
				servicesGR.owned_by = _this.sys_user[serv.owned_by];
			if(serv.managed_by)
				servicesGR.managed_by = _this.sys_user[serv.managed_by];
			if(serv.busines_criticality)
				servicesGR.busines_criticality = _this._getBSValue(serv.busines_criticality);
			if(serv.location)
				servicesGR.location = _this.cmn_location[serv.location];
			if(serv.company)
				servicesGR.company = _this.core_company[serv.company];
			if(serv.description)
				servicesGR.short_description = serv.description;

			servicesGR.update();
		});
	};

	this.queryRelatedData = function() {

		_this.duplicates = [];

		var queryStore = {};
		var queryTables = [
			"sys_user",
			"cmn_location",
			"core_company",
			"sys_user_group"
		];

		queryTables.push(service_type);

		for(ql = 0; ql < queryTables.length; ql++) {
			_this[queryTables[ql]] = {};
			queryStore[queryTables[ql]] = "";
		}

		services.forEach(function(serv) {
			queryStore[service_type] += serv.name + ",";

			if(serv.owned_by)
				queryStore.sys_user += serv.owned_by + ",";
			if(serv.managed_by)
				queryStore.sys_user += serv.managed_by + ",";
			if(serv.location)
				queryStore.cmn_location += serv.location + ",";
			if(serv.company)
				queryStore.core_company += serv.company + ",";
			if(serv.support_group)
				queryStore.sys_user_group += serv.support_group + ",";
			if(serv.change_control)
				queryStore.sys_user_group += serv.change_control + ","
			if(serv.u_problem_approval_group)
				queryStore.sys_user_group += serv.u_problem_approval_group + ",";
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
			if(table.indexOf("u_") == 0)
				gr.addQuery("u_name", "IN", q);
			else
				gr.addQuery("name", "IN", q);
			if(table == "sys_user"){
				gr.addNotNullQuery("email");
				gr.addEncodedQuery("emailNOT LIKEa-");
			}
			gr.query();

			while(gr.next()) {
				var name = gr.name.getDisplayValue();
				var id = gr.getUniqueValue();

				if(table == service_type) {
					_this.duplicates.push({
						name: name,
						id: id
					});
				}

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
				if(qu == service_type)
					continue;

				gs.info("Wrong values on table : " + qu);
				gs.info(queryStore[qu]);
				failQuery = true;
			}
		}

		return !failQuery;
	};

	this._getBusinessCritValues = function() {
		_this.businessCritValues = [];
		var bcValuesGR = new GlideRecord('sys_choice');
		bcValuesGR.addQuery("name", "u_cmdb_ci_technical_service");
		bcValuesGR.addQuery("inactive", "false");
		bcValuesGR.addQuery("element", "busines_criticality");
		bcValuesGR.addQuery("language", "en");
		bcValuesGR.query();
		while(bcValuesGR.next()) {
			_this.businessCritValues.push({
				'label': bcValuesGR.getValue('label'),
				'value': bcValuesGR.getValue('value'),
			});
		}
	};

	this._getBSValue = function(bc) {
		var bcv = _this.businessCritValues;
		for(var e = 0; e < bcv.length; e++) {
			if(bcv[e].label == bc) {
				return bcv[e].value;
			}
		}
	};
}

/*
	'u_cmdb_ci_technical_service'
	'cmdb_ci_service'
*/

new Services('cmdb_ci_service').createServices();