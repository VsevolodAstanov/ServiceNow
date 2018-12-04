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
		self.variables.forEach(function(variable, index) {
			
			if(variable.type == self.VARIABLE_TYPES["checkbox"] && variable.choices.length > 0) {
				variable.type = self.VARIABLE_TYPES["label"];

				variable.choices.forEach(function(choice, i) {

					self.variables.splice(index+1, 0, {
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
		});

		if(self.variables.length == 0)
			throw "Variable list is empty";
	};

	this._createVariables = function() {

	};

	this._createChoices = function() {

	};

	this._defineVariableOrder = function() {

		var section = false;
		var order = 0;

		self.variables.forEach(function(v, index) {

			if(v.type == self.VARIABLE_TYPES["checkbox"]) {
				v.order = (order += self.CHECKBOX_ORDER);
				return;
			}

			if(section == true) {
				v.order = (order += self.CONTAINER_ORDER);
				if(v.type == self.VARIABLE_TYPES["containerend"])
					section = false;
				return;
			}

			order = (Math.ceil((order + 1)/100)*100);
			v.order = order;

			if(v.type == self.VARIABLE_TYPES["containerstart"])
				section = true;
		});

		self.variables.forEach(function(v) {
			gs.info("Variable: " + v.question_text);
			gs.info("Unique Value: " + v.name);
			gs.info("Help Text: " + v.help_text);
			gs.info("Type: " + v.type);
			gs.info("Mandatory : " + v.mandatory);
			gs.info("Choices: " + v.choices);
			gs.info("Order: " + v.order);
			gs.info("\n");
		});
	};

	this._getUniqueValue = function(val, gl) {

		var re = /(_$|_[a-z0-9]+$)/g;
		var full = val;
		var uniqueWord;
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
		val = val.replace(/\s+/g, "_");
		val = val.replace(/\W+/g, "");
		val = "u_" + val;

		if(val.length > 30) {
			uniqueWord = val.match(re)[0];
			val = val.substring(0, 30);
			del = re.exec(val);
			val = val.substring(0, del.index);
		}

		val = val.replace(/_$/, "");
		
		if(gl) {

			var s = 2;
			var getUniqueKey = function(val) {

				if(self._uniqueKeyContainer.indexOf(val) >= 0) {

					return getUniqueKey(val+=s);
				}

				return val;
			}

			val = getUniqueKey(val);

			self._uniqueKeyContainer.push(val);
		}

		return val;
	};

	this._parseChoices = function(type, choices) {

		if(!choices) 
			return [];

		switch(type) {
			case self.VARIABLE_TYPES["macro"]:
				return choices;

			case self.VARIABLE_TYPES["reference"]:
				choices = self._splitChoices(choices);
				return {
					"table": choices[0],
					"query": choices[1]
				};

			default:
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
}


new CatalogItem().createDefinitions("a61f69521b826700cd6298efbd4bcba3");