function CatalogItem(id) {

	var self = this;
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

	this.variables = [];
	this.dependency = [];
	this._uniqueKeyContainer = [];
	this.VARIABLE_TYPES = {};
	this.CONTAINER_ORDER = 50;
	this.CHECKBOX_ORDER = 10;

	var attStr = attachment.getContentStream(ga.getUniqueValue());

	this.createDefinitions = function() {

		try {
			if(!id)			
				throw "Catalog Item ID is not defined";

			var catItemGR = new GlideRecord('sc_cat_item');
			catItemGR.get(id);

			if(!catItemGR.isValidRecord())			
				throw "Catalog Item does not exist";

			self._getVariableTypes();
			self._parseFormVariables();
			self._defineVariableOrder();
			self._createVariables();

			self._uniqueKeyContainer = [];

		} catch(err) {
			gs.info("Error: " + err);
		}
	};;

	this._parseFormVariables = function() {

		ps.setSheetName("Form"); // XSLX Tab name
		ps.parse(attStr);

		var r,
			name,
			type,
			help_text,
			mandatory,
			choices;

		while(ps.next()) {

			r = ps.getRow();

			if(!r["Question"])
				continue;

			name = self._getUniqueValue(r["Question"], true);
			type = self._setVariableType(r["Variable type"]);
			help_text = r["Help Text"] || "";
			mandatory = r["Mandatory?"] == "Yes" ? (r["Dependency"] ? false : true) : false;
			choices = self._parseChoices(type, r["Values for fields"]);

			// choices.forEach(function(c) {
			// 	gs.info("Variable: " + c.question_text);
			// 	gs.info("Unique Value: " + c.name);
			// 	gs.info("Help Text: " + c.help_text);
			// 	gs.info("Type: " + c.type);
			// 	gs.info("Mandatory : " + c.mandatory);
			// 	gs.info("Choices: " + c.choices);
			// 	gs.info("Order: " + c.order);
			// 	gs.info("\n");
			// });

			self.variables.push({
				question_text: r["Question"],
				name: name,
				help_text: help_text,
				type: type,
				mandatory: mandatory,
				choices: choices,
				// dependency: self._parseDependency(r["Dependency"])
			});
		}

		gs.info("T4e");

		//Parse Chechbox Choices and define them as Variables
		for (var gv = 0; gv < self.variables.length; gv++) {
			var variable = self.variables[gv];
			
			if(variable.type == self.VARIABLE_TYPES["checkbox"] && variable.choices.length > 0) {
				variable.type = self.VARIABLE_TYPES["label"];

				variable.choices.forEach(function(choice, i) {

					self.variables.splice(gv+i+1, 0, {
						question_text: choice.text,
						name: self._getUniqueValue(choice.text, true),
						help_text: "",
						type: self.VARIABLE_TYPES["checkbox"],
						mandatory: variable.mandatory,
						choices: [],
					});
				});

				variable.choices = [];
			}
		}

		if(self.variables.length == 0)
			throw "Variable list is empty";
	};

	this._createVariables = function() {

		self.variables.forEach(function(v) {
			gs.info("Variable: " + v.question_text);
			gs.info("Unique Value: " + v.name);
			gs.info("Help Text: " + v.help_text);
			gs.info("Type: " + v.type);
			gs.info("Mandatory : " + v.mandatory);
			gs.info("Choices: " + v.choices);
			gs.info("Order: " + v.order);
			gs.info("\n");

			var variableGR = new GlideRecord('item_option_new');
			variableGR.initialize();
			variableGR.active = true;
			variableGR.cat_item = id;
			variableGR.question_text = v.question_text;
			variableGR.name = v.name;
			variableGR.order = v.order;
			variableGR.show_help = v.help_text ? true : false;
			variableGR.help_text = v.help_text;
			variableGR.type = v.type;
			variableGR.mandatory = v.mandatory;

			switch(v.type) {
				case self.VARIABLE_TYPES["macro"]:
					variableGR.macro = self._createMacro(v.name, v.choices);
					break;

				case self.VARIABLE_TYPES["containerstart"]:
					variableGR.layout = v.choices[0];
					variableGR.display_title = (v.choices[1] ? true : false);
					break;

				case self.VARIABLE_TYPES["reference"]:
					variableGR.reference = v.choices[0];
					variableGR.reference_qual_condition = v.choices[1];
					break;

				case self.VARIABLE_TYPES["listcollector"]:
					variableGR.list_table = v.choices[0];
					variableGR.reference_qual = v.choices[1];
					break;
			}

			if(self._isMultiChoiceBox(v.type)) {
				variableGR.include_none = true;
			}

			var varSysID = variableGR.insert();
			if(variableGR.isValidRecord() && self._isMultiChoiceBox(v.type) && v.choices.length > 0){
				self._createChoices(v.choices, varSysID);
			}
		});
	};

	this._createChoices = function(choices, id) {
		choices.forEach(function(choice) {
			var choicesGR = new GlideRecord('question_choice');
			choicesGR.initialize();
			choicesGR.question = id;
			choicesGR.order = choice.order;
			choicesGR.text = choice.text;
			choicesGR.value = choice.value;
			choicesGR.insert();
		});
	};

	this._defineVariableOrder = function() {

		var section = false;
		var box = false;
		var order = 0;
		var checkbox = self.VARIABLE_TYPES["checkbox"];
		var cont_start = self.VARIABLE_TYPES["containerstart"];
		var cont_end = self.VARIABLE_TYPES["containerend"];

		self.variables.forEach(function(v, index) {

			if(v.type == checkbox) {
				box = true;
				v.order = (order += self.CHECKBOX_ORDER);
				return;
			}

			if(!box && section == true) {
				v.order = (order += self.CONTAINER_ORDER);
				if(v.type == cont_end)
					section = false;
				return;
			}

			order = (Math.ceil((order + 1)/100)*100);
			v.order = order;

			box = false;

			if(v.type == cont_start)
				section = true;
		});
	};

	this._getUniqueValue = function(val, gl) {

		var re = /(_$|_[a-z0-9]+$)/g;
		var full = val;
		var del;

		//Additional suffix implemented instead of throw exception.
		// if(gl) {
		// 	for(var u = 0; u < self._uniqueKeyContainer.length; u++) {
		// 		if(self._uniqueKeyContainer[u].full == full) {
		// 			throw full + " already exists. Rename the variable";
		// 			val += "_" + val.match('_')[]
		// 		}
		// 	}
		// }
		
		val = val.toLowerCase();
		val = val.replace(/\W+/g, "_");
		val = "u_" + val;

		if(val.length > 30) {
			val = val.substring(0, 30);
			del = re.exec(val);
			val = val.substring(0, del.index);
		}

		val = val.replace(/_$/, "");
		
		if(gl) {
			var s = 1;
			var getUniqueKey = function(k) {
				if(self._uniqueKeyContainer.indexOf(k) >= 0) {
					s++;
					k = (!isNaN(k.slice(-1)) ? k.replace(/\d+$/,s) : k + "_" + s);
					return getUniqueKey(k);
				}
				return k;
			};

			val = getUniqueKey(val);

			self._uniqueKeyContainer.push(val);
		}

		return val;
	};

	this._parseChoices = function(type, choices) {

		if(!choices) 
			return [];

		if(type == self.VARIABLE_TYPES["macro"])
			return String(choices);

		if(type == self.VARIABLE_TYPES["reference"] || type == self.VARIABLE_TYPES["listcollector"]) {
			choices = self._splitChoices(choices);
			return [choices[0], choices[1]];
		}

		if(type == self.VARIABLE_TYPES["containerstart"]) {
			choices = self._splitChoices(choices);
			return [choices[0], choices[1]];
		}

		if(self._isMultiChoiceBox(type)) {
			choices = self._splitChoices(choices);
			var choice_text;
			var v = 0;
			while(v < choices.length) {
				choice_text = choices[v].replace(/[^A-Za-z0-9_@\.,()\-\s]+/g, "");
				choice_text = choice_text.replace(/^\s+/,"");
				choice_text == "" ? choices.splice(v, 1) : choices.splice(v, 1, {
					"text": choice_text,
					"value": self._getUniqueValue(choice_text),
					"order": (v+1)*100
				});

				v++;
			}

			return choices;
		}

		return [];
	};

	this._getVariableTypes = function() {
		var l,
			v;
		var varTypeGR = new GlideRecord('sys_choice');
		varTypeGR.addQuery("name", "question");
		varTypeGR.addQuery("inactive", "false");
		varTypeGR.addQuery("element", "type");
		varTypeGR.addQuery("language", "en");
		varTypeGR.orderBy("value");
		varTypeGR.query();
		while(varTypeGR.next()) {
			l = varTypeGR.getValue('label').toLowerCase().replace(/\W+/g, "");
			v = varTypeGR.getValue('value');
			self.VARIABLE_TYPES[l] = v;
		}
	};

	this._createMacro = function (name, text) {
		var macroGR = new GlideRecord('sys_ui_macro');
		macroGR.initialize();
		macroGR.name = "sc_" + name;
		macroGR.xml = '<?xml version="1.0" encoding="utf-8" ?>' +
		'<j:jelly trim="false" xmlns:j="jelly:core" xmlns:g="glide" xmlns:j2="null" xmlns:g2="null">' +
			text +
		'</j:jelly>';
		return macroGR.insert();
	};

	this._setVariableType = function(type) {
		type = type.toLowerCase().replace(/\W+/g, "");
		return self.VARIABLE_TYPES[type] || self.VARIABLE_TYPES["singlelinetext"];
	};

	this._splitChoices = function(choices) {
		return choices.replace(/\n/g, "--->>>" ).split("--->>>");
	};

	this._isMultiChoiceBox = function(type) {

		var answer = false;

		Object.keys(self.VARIABLE_TYPES).forEach(function(t) {
			if(self.VARIABLE_TYPES[t] == type && (t.indexOf("box") >= 0 || t.indexOf("choice") >= 0))
				return (answer = true);
		});

		return answer;
	};

	this.createPolicy = function() {
		try {
			if(!id)			
				throw "Catalog Item ID is not defined";

			var catItemGR = new GlideRecord('sc_cat_item');
			catItemGR.get(id);

			if(!catItemGR.isValidRecord())			
				throw "Catalog Item does not exist";

			self._parseDependency();
			self._createDependency();

		} catch(err) {
			gs.info("Error: " + err);
		}
	};

	this._parseDependency = function() {
		ps.setSheetName("Form"); // XSLX Tab name
		ps.parse(attStr);

		var r,
			name,
			dependency,
			listName = [],
			keyContainer = {};

		while(ps.next()) {
			r = ps.getRow();
			name = self._getUniqueValue(r["Question"], true);
			query = r["Dependency"];
			mandatory = r["Mandatory"];

			if(query) {
				self.dependency.push({
					name: name,
					query: query,
					mandatory: mandatory,
				});

				listName.push(name);
			}
		}

		var variableGR = new GlideRecord('item_option_new');
		variableGR.addQuery('name', 'IN', listName.join(","));
		variableGR.addQuery('cat_item', id);
		variableGR.query();
		while(variableGR.next()) {
			keyContainer[variableGR.name] = variableGR.getUniqueValue();
		}

		self.UIPolicyList = (function() {
			var l = {};
			
			self.dependency.forEach(function(dep) {

				var policyID = dep.query;
				var pa = {};

				if(!l[policyID])
					l[policyID] = [];
				
				pa[dep["name"]] = keyContainer[dep.name];
				pa.mandatory = (dep.mandatory ? "true" : "ignore");
				// pa.visible = dep.visible;
				// pa.readOnly = dep.readOnly;

				l[policyID].push(pa);
			});

			return l;
		})();
	};

	this._createDependency = function() {

		if(!self.UIPolicyList)
			throw "UI Policies are not required";

		for(var i in self.UIPolicyList) {

			var policyGR = new GlideRecord('catalog_ui_policy');
			policyGR.initialize();
			policyGR.setValue("active", true);
			policyGR.setValue("applies_to", "item");
			policyGR.setValue("catalog_item", id);
			policyGR.setValue("short_description", i);
			policyGR.setValue("applies_catalog", true);
			policyGR.setValue("applies_sc_task", true);
			policyGR.setValue("applies_req_item", true);
			policyGR.setValue("on_load", true);
			policyGR.setValue("reverse_if_false", true);
			policyGR.setValue("order", 100);
			var policyID = policyGR.insert();

			self.UIPolicyList[i].forEach(function(p){
				var name = Object.keys(p)[0];

				var policyActionGR = new GlideRecord("catalog_ui_policy_action");
				policyActionGR.initialize();
				policyActionGR.setValue("catalog_item", id);
				policyActionGR.setValue("variable", name);
				policyActionGR.setValue("catalog_variable", "IO:" + p[name]);
				policyActionGR.setValue("visible", "true");
				policyActionGR.setValue("mandatory", p.mandatory);
				policyActionGR.setValue("disabled", "ignore");
				policyActionGR.setValue("ui_policy", policyID);
				policyActionGR.insert();
			});
		}

	};
}


var catItemHandler = new CatalogItem("84cde77e1b45f7c03e3c76e1dd4bcb9e");
catItemHandler.createDefinitions();