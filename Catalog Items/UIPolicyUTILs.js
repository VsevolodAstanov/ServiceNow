function uiPolicyUtils(cat_id) {

	var self = this;
	var result = "";

	this.copyCatPolicy = function(id) {

		try {
			var catalogUIPolicyGR = new GlideRecord('catalog_ui_policy');

			if(!catalogUIPolicyGR.get(id))
				return gs.print("No Policy Found");

			var newPolicyGR = new GlideRecord('catalog_ui_policy');
			self._copyFields(catalogUIPolicyGR, newPolicyGR);

			if(newPolicyGR.insert()) {
				var policyActionsGR = new GlideRecord('catalog_ui_policy_action');
				policyActionsGR.addQuery('ui_policy', id);
				policyActionsGR.query();

				while(policyActionsGR.next()) {
					var newPolicyActionsGR = new GlideRecord('catalog_ui_policy_action');
					self._copyFields(policyActionsGR, newPolicyActionsGR, newPolicyGR.sys_id + "");
					newPolicyActionsGR.setValue('parent', newPolicyGR.sys_id + "");
					newPolicyActionsGR.insert();
				}
			}
		} catch(ex) {
			result += "\n\n[Exeption] copyCatPolicy: " + ex;
		}

		gs.print(result);
	};

	this._copyFields = function(ex_gr, new_gr, policy_id) {

		try {
			result += "\n\n" + ex_gr.getTableName() + ":\n";
			var fields = ex_gr.getFields();
			var fieldName,
				fieldValue,
				ge;

			new_gr.initialize();

			nextField:for (var i = 0; i < fields.size(); i++) {
				ge = fields.get(i);
				fieldName = ge.getName();

				if (ge.hasValue() && fieldName.indexOf('sys_') == -1) {

					switch(fieldName) {
						case "catalog_item":
							new_gr.setValue(fieldName, cat_id);
							break;

						case "ui_policy":
							new_gr.setValue(fieldName, policy_id);
							break;

						case "catalog_conditions":
							var condition = ge.getValue();
							var ids = condition.match(/IO\:.{32}/g).join(',').replace(/IO:/g, "").split(',');
							var varNames = self._getVarialbeNamesByIDs(ids, ex_gr.getValue('catalog_item'));

							if(Object.keys(varNames).length == 0)
								break;

							var varIDs = self._getVarialbeIDsByNames([(function(varNames){

								var res = [];

								for (var n in varNames) {
									res.push(varNames[n]);
								}

								return res;
							}(varNames))], cat_id);

							if(Object.keys(varIDs).length == 0)
								break;

							ids.forEach(function(id) {
								condition = condition.replace(id, varIDs[varNames[id]]);
							});

							new_gr.setValue(fieldName, condition);

							break;

						case "catalog_variable":
							var varName = ex_gr.getValue('variable');
							var varID = self._getVarialbeIDsByNames([varName], cat_id)[varName];
							if(!varID)
								continue;

							new_gr.setValue(fieldName, "IO:" + varID);

							break;

						default:
							new_gr.setValue(fieldName, ge.getValue());
					}

					result += "\n\tField: " + fieldName + " / " + "Value: " + new_gr.getValue(fieldName);
				}
			}
		} catch(ex) {
			result += "\n\n[Exeption] _copyFields: " + ex;
		}
	};

	this._getVarialbeIDsByNames = function(names, cat_id) {

		var res = {};
		var varsGR = new GlideRecord("item_option_new");
		varsGR.addQuery('cat_item', cat_id);
		varsGR.addQuery('name', 'IN', names.join(','));
		varsGR.query();
		while(varsGR.next()) {
			res[varsGR.name + ""] =  varsGR.sys_id + "";
		}

		return res;
	};

	this._getVarialbeNamesByIDs = function(sys_ids, cat_id) {

		var res = {};
		var varsGR = new GlideRecord("item_option_new");
		varsGR.addQuery('cat_item', cat_id);
		varsGR.addQuery('sys_id', 'IN', sys_ids.join(','));
		varsGR.query();
		while(varsGR.next()){
			res[varsGR.sys_id + ""] = varsGR.name + "";
		}

		return res;
	}
}

new uiPolicyUtils(/*Catalog SYS_ID */ "9b94847d1ba6b7c0cd6298efbd4bcb87").copyCatPolicy(/*Policy SYS_ID */ '22ed83881be67f80cd6298efbd4bcb24')