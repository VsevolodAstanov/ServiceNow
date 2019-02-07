function Development(bus_name) {
	var self = this;
	var b_unit_scope;
	var busVerified = false;
	var stories = [];
	var REST_USER = '';
	var REST_PASSWORD = '';
	var INSTANCE_NAME = '';

	this._getBusinessUnitByName = function() {
		try {
			var busGR = new GlideRecord('u_business_unit_scope');
			busGR.addQuery('u_name', bus_name);
			busGR.query();
			if (!busGR.next())
				throw "Business Unit Scope is not found";

			b_unit_scope = busGR.getUniqueValue();
		} catch (e) {
			gs.print("Error _getBusinessUnitByName: " + e);
		}
	};

	this._queryStories = function() {
		try {

			self._getBusinessUnitByName();

			var storyGR = new GlideRecord("rm_story");
			storyGR.addActiveQuery();
			storyGR.addQuery("u_business_unit_scope", b_unit_scope);
			storyGR.addQuery("blocked", false);
			storyGR.query();

			while (storyGR.next()) {
				stories.push({
					number: storyGR.number.getDisplayValue(),
					state:  storyGR.state.getDisplayValue(),
					data: storyGR.u_update_set.getDisplayValue()
				});
			}
		} catch (e) {
			gs.print('Error _queryStories: ' + e);
		}

	};

	this.getUpdateSetList = function() {

		self._queryStories();

		if (stories.length == 0)
			gs.print('No data is attached for ' + busName + ' Business Unit Scope');

		try {
			var printedData = "";

			for (s = 0; s < stories.length; s++) {

				if(stories[s].state == "Deployment")
					printedData += stories[s].number + ":\n" + stories[s].data + "\n\n";
			}

			gs.print("\n" + printedData);

		} catch (e) {
			gs.print("Error getUpdateSetList: " + e);
		}


	}

	this.validateDeployData = function() {

		var updateSets = self._GetRemoteUpdateSets("stg");

		var query = "";
		updateSets.forEach(function(set) {
			query += "^ORu_update_setLIKE" + set.name;
		});

		var storyGR = new GlideRecord('rm_story');
		storyGR.addEncodedQuery(query);
		storyGR.query();
		while(storyGR.next()) {

			var state = storyGR.state.getDisplayValue();

			for(var set = 0; set < updateSets.length; set++) { 

				if(storyGR.u_update_set.getDisplayValue().indexOf(updateSets[set].name) >= 0) {

					if(state == "Deployment" || state == "In Testing" || state == "Work in progress") {
						updateSets[set].state = state;
						updateSets[set].saved = true;
					}
					else 
						updateSets.splice(set, 1);
				}
			}
		}

		updateSets.sort(function(f) {
			if(f.saved)
				return -1;
		});

		var result = "\n";
		updateSets.forEach(function(set) {
			result += set.name + "\n\tStored: " + set.saved + "\n\t Story State: " + set.state + "\n\n";
		});

		gs.print(result);
	};

	this._GetRemoteUpdateSets = function(inst_type) {
		try {
			var sets = [];

			var request = new sn_ws.RESTMessageV2();
			request.setHttpMethod('get');
			request.setEndpoint("https://" + inst_type + INSTANCE_NAME + '/api/now/table/sys_update_set');
			request.setBasicAuth(REST_USER, REST_PASSWORD);
			request.setQueryParameter("sysparm_query", "nameLIKE_" + bus_name + "_^state!=ignore^nameSTARTSWITH2018^ORnameSTARTSWITH2019");
			response = request.execute();
			httpResponseStatus = response.getStatusCode();

			gs.info(httpResponseStatus);

			if (httpResponseStatus != 200)
				throw "Unable to connect to " + type + " Instance";

			var result = JSON.parse(response.getBody()).result;

			result.forEach(function(record) {
				sets.push({
					name: record.name,
					state: record.state,
					saved: false,
					commmited: false
				});
			});

			return sets;
		} catch (ex) {
			gs.print(ex);
		}
	}
}

var businessUnit = "";
//new Development(businessUnit).getUpdateSetList();
new Development(businessUnit).validateDeployData();