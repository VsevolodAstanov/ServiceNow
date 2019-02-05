function UpdateData() {

	var self = this;
	var mapping = {};
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

	this.update = function() {

		ps.setSheetName("Data"); // XSLX Tab name

		ps.parse(attStr);

		var query = "";

		while(ps.next()) { 
			var r = ps.getRow();
			query += "^ORnumber=" + r["Number"];
			
			mapping[r["Number"]] = {
				assignment_group: r["Assignment Group"],
				u_business_service: r["Business Service"],
				u_technical_service: r["Technical Service"] 
			};
		}

		if(mapping.length == 0) {
			gs.info("Mapping Service list is empty");
			return;
		}

		var mappingGR = new GlideRecord("incident");
		mappingGR.addEncodedQuery(query);
		mappingGR.query();

		while(mappingGR.next()) {
			var num = mappingGR.number.getDisplayValue();
			mappingGR.setDisplayValue("assignment_group", mapping[num].assignment_group);
			mappingGR.setDisplayValue("u_business_service", mapping[num].u_business_service);
			mappingGR.setDisplayValue("u_technical_service", mapping[num].u_technical_service);

			gs.info("\n\nNumber: " + mappingGR.number.getDisplayValue());
			gs.info("\nAssignment Group: " + mappingGR.assignment_group);
			gs.info("\nBusiness Service: " + mappingGR.u_business_service);
			gs.info("\nTechnical Service: " + mappingGR.u_technical_service);

			mappingGR.setWorkflow(false);
			mappingGR.update();
		}

	};

}

new UpdateData().update();