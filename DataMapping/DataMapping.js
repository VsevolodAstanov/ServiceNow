function DataMapping(type) {

	var self = this;
	var ps = new sn_impex.GlideExcelParser();
	var attachment = new GlideSysAttachment();
	var ga = new GlideRecord('sys_attachment');
	ga.addQuery('table_name', 'sys_update_set'); //Table name where file is attached
	ga.addQuery('table_sys_id', (new GlideUpdateSet()).get()); //Record sys id where file is attached
	ga.query();

	if (!ga.next()) {
		gs.info("Attchment is not defined");
		return;
	}

	var attStr = attachment.getContentStream(ga.getUniqueValue());

	this.map = function() {

		gs.info("Start mapping for: " + type);

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
			gs.info("Error: " + err);
		}
	};

	this._groupToGroup = function(data) {
		self._replaceToSysIDs(["sys_user_group"], data);
		self._updateMappedRecord(["incident", "sc_task"], data);
	};

	this._tsToTS = function(data) {
		self._replaceToSysIDs(["u_cmdb_ci_technical_service"], data);
		self._updateMappedRecord(["incident"], data);
	};

	this._bsToBS = function(data) {
		self._replaceToSysIDs(["cmdb_ci_service", "cmdb_ci_appl"], data);
		//self._updateMappedRecord(["incident"], data);
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
					o['cmdb_ci_appl'] = app;

				data[type].push(o);
			}

			return data;
		} catch(e) {
			gs.info("Error: " + e);
		}
	};

	this._replaceToSysIDs = function(tables, data) {
		tables.forEach(function(table) {

			var gr = new GlideRecord(table);
			var query = ""
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
					var bus_serv = data[type];
					for(var ts = 0; ts < bus_serv.length; ts++) {
						query += "^ORname=" + bus_serv[ts]["old"] + "^ORname=" + bus_serv[ts]["new"];
					}
					break;
			}

			gr.addEncodedQuery(query);
			gr.query();
			gs.info("Rercords matched: " + gr.getRowCount() + "\n");
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

					case "Technical Services":

						for(var ts = 0; ts < tech_serv.length; ts++) {
							if(tech_serv[ts]["old"] == name)
								tech_serv[ts]["old"] = id;

							if(tech_serv[ts]["new"] == name)
								tech_serv[ts]["new"] = id;
						}
				}
			} 
		});
	};

	this._updateMappedRecord = function(tables, data) {
		tables.forEach(function(table) {
			
			var query = "";
			var gr = new GlideRecord(table);
			gr.addActiveQuery();
			gr.addQuery('sys_created_on', ">=", "javascript:gs.dateGenerate('2018-01-01','00:00:00')");

			gs.info("Type: " + type);
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

				// case "Business Services":
				// 	gr.addQuery("u_business_service", 'IN', Object.keys(data).join(','));
				// 	break;
			}

			//query += "^sys_created_on>=javascript:gs.dateGenerate('2018-01-01','00:00:00')"

			//gs.info(query);
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

								//gs.info(groups[g]["old"] + " : " + groups[g]["new"]);

								continue recordCycle;
							}
						}

					case "Technical Services":
						var tech_serv = data[type];

						for(var ts = 0; ts < tech_serv.length; ts++) {
							if(gr.getValue('u_technical_service') == tech_serv[ts]["old"]) {
								gr.setValue('u_technical_service', tech_serv[ts]["new"]);

								//gs.info(tech_serv[g]["old"] + " : " + tech_serv[g]["new"]);

								continue recordCycle;
							}
						}
				}
				//gr.setWorkflow(false);
				//gr.update();
				
				//gs.info(gr.assignment_group.getDisplayValue());
			}

			gs.print("\n\ttTable: " + table + "\n\tRecord: " + gr.getRowCount());
		});
	};
}

//new DataMapping("Groups").map();
new DataMapping("Business Services").map();
//new DataMapping("Technical Services").map();