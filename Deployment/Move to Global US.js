var updatesGR = new GlideRecord('sys_update_xml');
updatesGR.addEncodedQuery('update_set=47f44e641ba0b700cd6298efbd4bcbdf^action=DELETE');
updatesGR.query();

gs.print(updatesGR.getRowCount());

while(updatesGR.next()) {
	updatesGR.setValue('update_set', 'a2f8f7c10f322100f0b205cce1050e2d'); //Default
	updatesGR.update();
}