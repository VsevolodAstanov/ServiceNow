var updatesGR = new GlideRecord('sys_update_xml');
updatesGR.addEncodedQuery('update_set=' + (new GlideUpdateSet()).get() + '^action=DELETE');
updatesGR.query();

gs.print(updatesGR.getRowCount());

while(updatesGR.next()) {
	updatesGR.setValue('update_set', 'a2f8f7c10f322100f0b205cce1050e2d'); //Default
	updatesGR.update();
}

var updateSetGlobal = new GlideRecord('sys_update_xml');

updateSetGlobal.addEncodedQuery('update_set=a2f8f7c10f322100f0b205cce1050e2d^action=DELETE^sys_created_by=WK_NA_Vsevolod.Astanov@wolterskluwer.com');
updateSetGlobal.query();
updateSetGlobal.deleteMultiple();
gs.print(updateSetGlobal.getRowCount());