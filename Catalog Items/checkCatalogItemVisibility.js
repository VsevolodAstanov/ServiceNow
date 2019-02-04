var adminID = gs.getUserID();

//User ID
GlideImpersonate().impersonate("7d72b5526f111a4076eca9331c3ee4a6"); 

//Catalog Item list
var names = [];

var itemGR = new GlideRecord('sc_cat_item');
itemGR.addActiveQuery();
itemGR.addQuery('type', '!=', 'bundle');
itemGR.addQuery('type', '!=', 'package');
itemGR.addQuery('sys_class_name', '!=', 'sc_cat_item_guide');
itemGR.addQuery('sys_class_name', '!=', 'sc_cat_item_content');
itemGR.addQuery('sys_class_name', '!=', 'sc_cat_item_producer');
itemGR.orderBy("name");
itemGR.query();

var countAvail = 0;
var countUnavail = 0;

var catalog = {};

while(itemGR.next()) {

	var hasCategory = itemGR.category.hasValue();
	var isCategoryVisible = (hasCategory == true ? (new sn_sc.CatCategory(itemGR.getValue('category')).canView()) : true);
	var category = (hasCategory == true ? itemGR.category.getDisplayValue() : "Global");

	if(!catalog[category]) {
		catalog[category] = [];
	}

	//gs.info(category);

	if(new sn_sc.CatItem(itemGR.getUniqueValue()).canView() == true && isCategoryVisible) {
		catalog[category].push(itemGR.name.getDisplayValue());
		countAvail++;
	} else {
		//gs.info(itemGR.name.getDisplayValue());
		countUnavail++;
	}

}

gs.info("Available Items: " + countAvail);
gs.info("Unavailable Items: " + countUnavail + "\n");

for(var c in catalog) {

	if(catalog[c].length > 0) {
		gs.info("Category: " + c);

			for(var i = 0; i < catalog[c].length; i++) {
			gs.info("\t" + catalog[c][i]);
		}

		gs.info("\n");
	}
}

GlideImpersonate().impersonate(adminID);