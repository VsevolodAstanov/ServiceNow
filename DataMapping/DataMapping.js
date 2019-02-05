function DataMapping(type) {

	var self = this;
	var ps = new sn_impex.GlideExcelParser();
	var attachment = new GlideSysAttachment();
	var ga = new GlideRecord('sys_attachment');
	ga.addQuery('table_name', 'sys_update_set'); //Table name where file is attached
	ga.addQuery('table_sys_id', (new GlideUpdateSet()).get()); //Record sys id where file is attached
	ga.query();

	if (!ga.next()) {
		gs.log("Attchment is not defined", "Incident Data Mapping");
		return;
	}

	var attStr = attachment.getContentStream(ga.getUniqueValue());

	this.map = function() {

		gs.log("Start mapping for: " + type, "Incident Data Mapping");

		try {
			if (!type)
				throw "Map type is not defined";

			var data = self._parseData();

			switch(type) {
				case "Groups":
					this._groupToGroup(data);
					break;

				case "Technical Services":
					this._tsToTS(data);
					break;

				case "Business Services":
					this._bsToBS(data);
					break;
			}

		} catch (err) {
			gs.log("Error: " + err, "Incident Data Mapping");
		}
	};

	this._groupToGroup = function(data) {
		gs.log(JSUtil.describeObject(data), "Incident Data Mapping");
		self._replaceToSysIDs(["sys_user_group"], data);
		gs.log(JSUtil.describeObject(data), "Incident Data Mapping");
		self._updateMappedRecord(["incident", "sc_task"], data);
	};

	this._tsToTS = function(data) {
		gs.log(JSUtil.describeObject(data), "Incident Data Mapping");
		self._replaceToSysIDs(["u_cmdb_ci_technical_service"], data);
		gs.log(JSUtil.describeObject(data), "Incident Data Mapping");
		self._updateMappedRecord(["incident"], data);
	};

	this._bsToBS = function(data) {
		gs.log(JSUtil.describeObject(data), "Incident Data Mapping");
		self._replaceToSysIDs(["cmdb_ci"], data);
		gs.log(JSUtil.describeObject(data), "Incident Data Mapping");
		self._updateMappedRecord(["incident"], data);
	};

	this._parseData = function() {

		try {
			ps.setSheetName(type); // XSLX Tab name
			ps.parse(attStr);

			var data = {};
			data[type] = [];

			while (ps.next()) {
				var r = ps.getRow();
				var old_key = r["Old Name"] || "";
				var new_key = r["New Name"] || "";

				if(!old_key)
					throw "Old Value is not defined";

				if(!new_key)
					throw "New Value is not defined";

				var app = r["Application"] || "";

				var o = {};

				o["old"] = old_key;
				o["new"] = new_key;

				if(app)
					o['app'] = app;

				data[type].push(o);
			}

			return data;
		} catch(e) {
			gs.log("Error: " + e, "Incident Data Mapping");
		}
	};

	this._replaceToSysIDs = function(table, data) {

		var gr = new GlideRecord(table);
		var query = "";
		switch(type) {
			case "Groups":
				var groups = data[type];
				for(var g = 0; g < groups.length; g++) {
					query += "^ORname=" + groups[g]["old"] + "^ORname=" + groups[g]["new"];
				}
				break;

			case "Technical Services":
				var tech_serv = data[type];
				for(var ts = 0; ts < tech_serv.length; ts++) {
					query += "^ORname=" + tech_serv[ts]["old"] + "^ORname=" + tech_serv[ts]["new"];
				}
				break;

			case "Business Services":
				var bs_app = data[type];
				for(var ba = 0; ba < bs_app.length; ba++) {
					query += "^NQname=" + bs_app[ba]["old"] + "^sys_class_name=cmdb_ci_service^operational_status=2";
					query +=  "^NQname=" + bs_app[ba]["new"] + "^sys_class_name=cmdb_ci_service^location!=null^parent!=null";
					query +=  "^NQname=" + bs_app[ba]["new"] + "^sys_class_name=cmdb_ci_service^parent=null";
					if(bs_app[ba]["app"])
						query += "^NQname=" + bs_app[ba]["app"] + "^sys_class_name=cmdb_ci_appl";
				}
				break;
		}

		gr.addEncodedQuery(query);
		gr.query();
		gs.log("Rercords matched: " + gr.getRowCount() + "\n", "Incident Data Mapping");
		while(gr.next()) {

			var name = gr.name.getDisplayValue();
			var id = gr.getUniqueValue();

			switch(type) {
				case "Groups":

					for(var g = 0; g < groups.length; g++) {
						if(groups[g]["old"] == name)
							groups[g]["old"] = id;

						if(groups[g]["new"] == name)
							groups[g]["new"] = id;
					}
					
					break;

				case "Technical Services":

					for(var ts = 0; ts < tech_serv.length; ts++) {
						if(tech_serv[ts]["old"] == name)
							tech_serv[ts]["old"] = id;

						if(tech_serv[ts]["new"] == name)
							tech_serv[ts]["new"] = id;
					}
					
					break;

				case "Business Services":

					for(var ba = 0; ba < bs_app.length; ba++) {
						if(bs_app[ba]["old"] == name && gr.getValue('operational_status') == 2)
							bs_app[ba]["old"] = id;

						if(bs_app[ba]["new"] == name && gr.getValue('operational_status') == 1)
							bs_app[ba]["new"] = id;

						if(bs_app[ba]["app"] == name)
							bs_app[ba]["app"] = id;
					}
					
					break;
			}
		}
	};

	this._updateMappedRecord = function(tables, data) {
		tables.forEach(function(table) {
			
			var query = "";
			var gr = new GlideRecord(table);
			gr.addActiveQuery();
			gr.addQuery('sys_created_on', ">=", "javascript:gs.dateGenerate('2018-01-01','00:00:00')");

			gs.log("Type: " + type, "Incident Data Mapping");
			switch(type) {
				case "Groups":

					var groups = data[type];

					for(var g = 0; g < groups.length; g++) {
						query += "^ORassignment_group=" + groups[g]["old"];
					}
					break;

				case "Technical Services":

					var tech_serv = data[type];

					for(var ts = 0; ts < tech_serv.length; ts++) {
						query += "^ORu_technical_service=" + tech_serv[ts]["old"];
					}
					break;

				case "Business Services":
					var bs_app = data[type];

					for(var ba = 0; ba < bs_app.length; ba++) {
						query += "^ORu_business_service=" + bs_app[ba]["old"];
					}
					break;
			}

			gr.addEncodedQuery(query);
			gr.orderBy('number');
			gr.query();
			recordCycle: while(gr.next()) {
				switch(type) {
					case "Groups":
						var groups = data[type];

						for(var g = 0; g < groups.length; g++) {
							if(gr.getValue('assignment_group') == groups[g]["old"]) {
								gr.setValue('assignment_group', groups[g]["new"]);

								gs.log(groups[g]["old"] + " : " + groups[g]["new"], "Incident Data Mapping");

								self._update(gr);

								continue recordCycle;
							}
						}
						
						break;

					case "Technical Services":
						var tech_serv = data[type];

						for(var ts = 0; ts < tech_serv.length; ts++) {
							if(gr.getValue('u_technical_service') == tech_serv[ts]["old"]) {
								gr.setValue('u_technical_service', tech_serv[ts]["new"]);

								self._update(gr);

								continue recordCycle;
							}
						}
						
						break;

					case "Business Services":
						var bs_app = data[type];

						for(var ba = 0; ba < bs_app.length; ba++) {
							if(gr.getValue('u_business_service') == bs_app[ba]["old"]) {
								gr.setValue('u_business_service', bs_app[ba]["new"]);

								if(bs_app[ba]["app"])
									gr.setValue('u_application_ci', bs_app[ba]["app"])

								self._update(gr);

								continue recordCycle;
							}

							
						}
							
						break;
				}
			}

			gs.log("\n\tTable: " + table + "\n\tRecord: " + gr.getRowCount(), "Incident Data Mapping");
		});
	};

	this._update = function(gr) {
		gr.autoSysFields(false);
		gr.setWorkflow(false);
		gr.update();
	};
}

new DataMapping("Groups").map();
new DataMapping("Business Services").map();
new DataMapping("Technical Services").map();