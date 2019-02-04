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

			switch(type) {
				case "Groups":
					this._groupToGroup();
					break;

				case "Technical Services":
					this._tsToTS();
					break;

				case "Business Services":
					this._bsToBS();
					break;
			}

		} catch (err) {
			gs.info("Error: " + err);
		}
	};

	this._groupToGroup = function() {
		var data = self._parseData();

		//gs.info(JSUtil.describeObject(data));
		var groups = self._replaceToSysIDs(["sys_user_group"], data);
		gs.info(JSUtil.describeObject(data));

		//self._updateMappedRecord(["incident", "sc_task"], type, groups);
	};

	this._tsToTS = function() {
		var data = self._parseData();

		gs.info(JSUtil.describeObject(data));
		var ts = self._replaceToSysIDs(["u_cmdb_ci_technical"], data);

		//self._updateMappedRecord(["incident"], type, groups);
	};

	this._bsToBS = function() {
		var data = self._parseData();

		gs.info(JSUtil._replaceToSysIDs(data));
		//var groups = self._replaceToSysIDs(["sys_user_group"], data);

		//self._updateMappedRecord(["incident"], type, groups);
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
			switch(type) {
				case "Groups":
					var groups = data[type];
					var query = ""
					for(var g = 0; g < groups.length; g++) {
						query += "^ORname=" + groups[g]["old"] + "^ORname=" + groups[g]["new"];
					}
					break;

				// case "Technical Services":
				// 	gr.addQuery("u_technical_services", 'IN', Object.keys(data).join(','));
				// 	break;

				// case "Business Services":
				// 	gr.addQuery("u_business_service", 'IN', Object.keys(data).join(','));
				// 	break;
			}

			gr.addEncodedQuery(query);
			gr.query();
			gs.info("Records: " + gr.getRowCount());
			while(gr.next()) {

				switch(type) {
					case "Groups":

						var name = gr.name.getDisplayValue();
						var id = gr.getUniqueValue();

						for(var g = 0; g < groups.length; g++) {
							if(groups[g]["old"] == name)
								groups[g]["old"] = id;

							if(groups[g]["new"] == name)
								groups[g]["new"] = id;
						}
				}
			} 
		});
	};

	// this._updateMappedRecord: function(tables, type, data) {
	// 	tables.forEach(function(table) {

	// 		var query = "";
	// 		var gr = new GlideRecord(table);
	// 		gr.addActiveQuery();
	// 		switch(type) {
	// 			case "Groups":
	// 				for(var d = 0; d < data.length; d++) {
	// 					gr.addOrQuery("assignment_group", Object.keys(data[d]).join());
	// 				}
	// 				break;

	// 			case "Technical Services":
	// 				gr.addQuery("u_technical_services", 'IN', Object.keys(data).join(','));
	// 				break;

	// 			case "Business Services":
	// 				gr.addQuery("u_business_service", 'IN', Object.keys(data).join(','));
	// 				break;
	// 		}

	// 		gr.addQuery('state', "IN", [1,2,3,6].join(','));
	// 		gr.addQuery('sys_created_on', ">=", "javascript:gs.dateGenerate('2018-01-01','00:00:00')");
	// 		gr.query();

	// 		gs.print("\nTable: " + table + "\nRecord: " + gr.getRowCount());
	// 	});
	// };
}

new DataMapping("Groups").map();
//new DataMapping("Business Services").map();
//new DataMapping("Technical Services").map();