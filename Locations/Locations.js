function Location() {

	var self = this;
	var locations = [];
	var parents = [];
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

	this.createLocations = function() {

		ps.setSheetName("Office Locations"); // XSLX Tab name

		ps.parse(attStr);

		/*
			Available data to transform from XSLX to ServiceNow Fields/Related Lists:
				- Street Address
				- City
				- Zip
				- Phone

		*/

		while(ps.next()) { 
			var r = ps.getRow(); 
			locations.push({
				adress: r["Street Address"],
				city: r["City"],
				zip: r["Zip"],
				phone: r["Phone"]
			});
		}

		if(locations.length == 0) {
			gs.info("Location list is empty");
			return;
		}

		if(!self._queryRelatedData())
			return;

		var locs = "Locations:",
				name,
				id,
				region,
				city,
				country,
				phone,
				state,
				zip,
				adress;

		locations.forEach(function(mapp) {

			adress = mapp.adress;
			state = (self.cmn_location[mapp.city].state || "");
			city = mapp.city;
			region = self.cmn_location[mapp.city].region;
			country = self.cmn_location[mapp.city].country;
			name = adress + ", " + city + ", " + (state ? (state + ", ") : "") + country;
			id = self.cmn_location[mapp.city].id;
			phone = mapp.phone || "";
			zip = mapp.zip || "";



			locs += "\n\t Name: " + name;
			locs += "\n\t City name: " + city
			locs += "\n\t City: " + id;
			locs += "\n\t Region: " + region;
			locs += "\n\t Country: " + country;
			locs += "\n\t State: " + state;
			locs += "\n\t Street: " + adress;
			locs += "\n\t Zip: " + zip;
			locs += "\n\t Phone: " + phone + "\n";
			
			// var locationGR = new GlideRecord("cmn_location");
			// locationGR.initialize();
			// locationGR.name = mapp.adress + mapp.city + (state);
			// locationGR.parent = self.cmn_location[mapp.city].id;
			// locationGR.city = mapp.city;
			// locationGR.phone = mapp.phone;
			// locationGR.u_level = 5;
			// locationGR.u_region = self.cmn_location[mapp.city].region;
			// locationGR.country = self.cmn_location[mapp.city].country;
			// locationGR.state = self.cmn_location[mapp.city].state;
			// locationGR.street = mapp.adress;
			// locationGR.insert();
		});

		gs.print(locs);
	};

	this._queryRelatedData = function() {

		var queryStore = {};
		var queryTables = [
			"cmn_location"
		];

		for(ql = 0; ql < queryTables.length; ql++) {
			self[queryTables[ql]] = {};
			queryStore[queryTables[ql]] = "";
		}

		locations.forEach(function(loc) {
			queryStore.cmn_location += loc.city + ",";
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
			gr.addQuery('u_level', '4');
			gr.query();

			var name,
				id,
				region,
				country,
				state;

			while(gr.next()) {
				name = gr.name.getDisplayValue();
				id = gr.getUniqueValue();
				region = gr.getValue('u_region');
				country = gr.getValue('country');
				state = gr.getValue('state');

				self[table][name] = {
					id: id,
					region: region,
					state: state,
					country: country
				};

				//Avoid duplicate values
				var arrQuery = queryStore[table].split(",");
				arrQuery.splice(arrQuery.indexOf(name), 1);
				queryStore[table] = arrQuery.join(",");
			}
		};

		for(var qs in queryStore) {
			glideQueryHandler(qs, queryStore[qs]);
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

new Location().createLocations();