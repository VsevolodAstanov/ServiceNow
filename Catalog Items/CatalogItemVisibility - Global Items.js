var items = {};
var mtmQuery = '';

var catItemGR = new GlideRecord('sc_cat_item');
catItemGR.addActiveQuery();
catItemGR.addQuery('type', '!=', 'bundle');
catItemGR.addQuery('type', '!=', 'package');
catItemGR.addQuery('sys_class_name', '!=', 'sc_cat_item_guide');
catItemGR.addQuery('sys_class_name', '!=', 'sc_cat_item_content');
catItemGR.addQuery('sys_class_name', '!=', 'sc_cat_item_producer');
catItemGR.query();

while(catItemGR.next()) {
	mtmQuery += '^ORsc_cat_item=' + catItemGR.getUniqueValue();
	items[catItemGR.getUniqueValue()] = catItemGR.name.getDisplayValue();
}

gs.print("All Active Catalog Items: " + catItemGR.getRowCount());

var usCrAvForMTMGR = new GlideRecord('sc_cat_item_user_criteria_mtom');
usCrAvForMTMGR.addEncodedQuey(mtmQuery);
usCrAvForMTMGR.query();

while(usCrAvForMTMGR.next()) {
	if(items[usCrAvForMTMGR.getValue('sc_cat_item')])
		delete items[usCrAvForMTMGR.getValue('sc_cat_item')];
}

var globalItems = 0;
for(var i in items) {
	globalItems++;
}

gs.print("Global Active Catalog Items: " + globalItems);

/*
	Remove item visibility for defined User Criteria
*/

//User Criteria ID
// var criteriaID = "";

// for(var nuc in items) {
// 	var usCrAvForNOMTMGR = new GlideRecord('sc_cat_item_user_criteria_no_mtom');
// 	usCrAvForNOMTMGR.initialize();
// 	usCrAvForNOMTMGR.setValue('sc_cat_item', nuc);
// 	usCrAvForNOMTMGR.setValue('user_criteria', criteriaID);
// 	usCrAvForNOMTMGR.insert();
// }