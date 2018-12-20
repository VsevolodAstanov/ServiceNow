function CatalogItem() {

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
	this._uniqueKeyContainer = [];
	this.VARIABLE_TYPES = {};
	this.CONTAINER_ORDER = 50;
	this.CHECKBOX_ORDER = 10;

	var attStr = attachment.getContentStream(ga.getUniqueValue());

	this.createDefinitions = function(id) {

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
			self._createVariables(id);

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
			name = self._getUniqueValue(r["Question"], true);
			type = self._setVariableType(r["Variable type"]);
			help_text = r["Help Text"] || "";
			mandatory = r["Mandatory"] ? (r["Dependency"] ? false : true) : false;
			choices = self._parseChoices(type, r["Values for fields"]);

			// choices.forEach(function(c) {
			// 	gs.info("Variable: " + c.question_text);
			// 	gs.info("Unique Value: " + v.name);
			// 	gs.info("Help Text: " + v.help_text);
			// 	gs.info("Type: " + v.type);
			// 	gs.info("Mandatory : " + v.mandatory);
			// 	gs.info("Choices: " + v.choices);
			// 	gs.info("Order: " + v.order);
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

	this._createVariables = function(id) {

		self.variables.forEach(function(v) {
			// gs.info("Variable: " + v.question_text);
			// gs.info("Unique Value: " + v.name);
			// gs.info("Help Text: " + v.help_text);
			// gs.info("Type: " + v.type);
			// gs.info("Mandatory : " + v.mandatory);
			// gs.info("Choices: " + v.choices);
			// gs.info("Order: " + v.order);
			// gs.info("\n");

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

			if(v.type == self.VARIABLE_TYPES["macro"])
				variableGR.macro = self._createMacro(v.name, v.choices);

			if(v.type == self.VARIABLE_TYPES["containerstart"]) {
				variableGR.display_title = true;
				variableGR.layout = "2across";
			}

			if(v.type == self.VARIABLE_TYPES["reference"]) {
				variableGR.reference = v.choices[0];
				variableGR.reference_qual_condition = v.choices[1];
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

		if(type == self.VARIABLE_TYPES["reference"]) {
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

	this._parseDependency = function() {

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
	}
}


new CatalogItem().createDefinitions("0879b3ec1beaa3803e3c76e1dd4bcbd2");