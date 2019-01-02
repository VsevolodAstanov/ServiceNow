var criteriaID = "906fe9521b826700cd6298efbd4bcb93";
var names = [];

for(var n = 0; n < names.length; n++) {
	names[n] = names[n].toLowerCase();
}

var itemGR = new GlideRecord('sc_cat_item');
itemGR.addActiveQuery();
itemGR.addQuery('name', 'IN', names.join(','));
itemGR.query();

gs.info("Count of items: " + itemGR.getRowCount());
var items = [];
while(itemGR.next()) {
	var name = itemGR.name.getDisplayValue().toLowerCase();

	gs.info(itemGR.name.getDisplayValue());

	// if(names.indexOf(name) == -1) {
	// 	gs.info("No item: " + itemGR.name.getDisplayValue());
	// }

	items.push({
		name: name,
		id: itemGR.getUniqueValue()
	});
}

items.forEach(function(i) {
	var grMTOM = new GlideRecord('sc_cat_item_user_criteria_no_mtom');
	grMTOM.initialize();
	grMTOM.setValue("sc_cat_item", i.id);
	grMTOM.setValue("user_criteria", criteriaID);
	grMTOM.insert();
});
