function uiPolicyUtils(cat_id) {

	var self = this;
	var result = "";

	this.copyCatPolicy = function(id) {
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
				newPolicyActionsGR.insert();
			}
		}

		gs.print(result);
	};

	this._copyFields = function(ex_gr, new_gr, policy_id) {
		result += "\n\n" + ex_gr.getTableName() + ":\n";
		var fields = ex_gr.getFields();
		var fieldName,
			fieldValue,
			ge;

		for (var i = 0; i < fields.size(); i++) {
			ge = fields.get(i);
			fieldName = ge.getName();

			if (ge.hasValue() && fieldName.indexOf('sys_') == -1) {

				if(fieldName == 'catalog_item') {
					new_gr.setValue(fieldName, cat_id);
				}
				else if(fieldName == 'ui_policy') {-
					new_gr.setValue(fieldName, policy_id);
				}
				else if(fieldName == 'catalog_conditions') {

					var condition = ge.getValue();

					var ids = condition.match(/IO\:.{32}/g).join(',').replace(/IO:/g, "").split(',');

					var varNames = self._getVarialbeNamesByIDs(ids, ex_gr.getValue('catalog_item'));
					if(Object.keys(varNames).length == 0)
						continue;

					var varIDs = self._getVarialbeIDsByNames([varNames], cat_id);

					if(Object.keys(varIDs).length == 0)
						continue;

					for(var i = 0; i < ids.length; i++) {
						condition.replace(ids[i], varIDs[varNames[ids[i]]]);
					}

					new_gr.setValue(fieldName, condition);

				}
				else if(fieldName == 'catalog_variable') {

					var varName = ex_gr.getValue('variable');
					var varID = self._getVarialbeIDsByNames([varName], cat_id)[varName];
					if(!varID)
						continue;

					new_gr.setValue(fieldName, "IO:" + varID);
				}
				else {
					new_gr.setValue(fieldName, ge.getValue());
				}

				result += "\n\tField: " + fieldName + " / " + "Value: " + new_gr.getValue(fieldName);
			}
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

new uiPolicyUtils(/*Catalog SYS_ID */ "3455cc211bee37c0cd6298efbd4bcbe5").copyCatPolicy(/*Policy SYS_ID */ '3d11fafa1bcdb7c03e3c76e1dd4bcb82')