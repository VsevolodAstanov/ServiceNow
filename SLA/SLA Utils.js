function SLAUtils() {
	this.createOnExisting = function(query, oldName, newName) {
		var slaDefGR = new GlideRecord('contract_sla');
		slaDefGR.addEncodedQuery(query);
		//slaDefGR.setLimit(1);
		slaDefGR.query();

		var result = "";

		while(slaDefGR.next()) {

			var newSLADefGR = new GlideRecord('contract_sla');

			var fields = slaDefGR.getFields();
			var fieldName,
				fieldValue,
				ge;

			for (var i = 0; i < fields.size(); i++) {
				ge = fields.get(i);
				fieldName = ge.getName();

				if (ge.hasValue() && fieldName.indexOf('sys_') == -1) {
					fieldValue = ge.getValue().replace(oldName, newName);
					newSLADefGR.setValue(fieldName, fieldValue);
					//gs.print("Field: " + fieldName + " / " + "Value: " + fieldValue);
				}
			}

			newSLADefGR.insert();
		}
	}
}

new SLAUtils().createOnExisting('nameLIKE', '', '');