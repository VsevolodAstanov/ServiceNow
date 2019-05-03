var adminID = gs.getUserID();

//User ID
GlideImpersonate().impersonate("1124b8c60f67b500059d7d4ce1050ef1");

var catItemGR = new GlideRecord('sc_cat_item_category');
catItemGR.addActiveQuery();
catItemGR.addQuery('sc_cat_item.type', '!=', 'bundle');
catItemGR.addQuery('sc_cat_item.type', '!=', 'package');
catItemGR.addQuery('sc_cat_item.sys_class_name', '!=', 'sc_cat_item_guide');
catItemGR.addQuery('sc_cat_item.sys_class_name', '!=', 'sc_cat_item_content');
catItemGR.addQuery('sc_cat_item.sys_class_name', '!=', 'sc_cat_item_producer');
catItemGR.query();

var countAvail = 0;
var countUnavail = 0;

var catalog = {};
var items = {};

while(catItemGR.next()) {

	var hasCategory = catItemGR.sc_category.hasValue();
	var isCategoryVisible = (hasCategory == true ? (new sn_sc.CatCategory(catItemGR.getValue('sc_category')).canView()) : true);
	var category = (hasCategory == true ? catItemGR.sc_category.getDisplayValue() : "Global");
 
	if(!catalog[category] && isCategoryVisible) {
		catalog[category] = [];
	}

	if(new sn_sc.CatItem(catItemGR.getValue('sc_cat_item')).canView() == true && isCategoryVisible) {


		/* Reject Catalog Item By User Criteria WK GRC-FRR Users*/
		// if(catItemGR.sc_cat_item.short_description.getDisplayValue().indexOf('GRC FRR') == -1) {
		// 	var gr = new GlideRecord('sc_cat_item_user_criteria_no_mtom');
		// 	gr.initialize();
		// 	gr.setValue('sc_cat_item', catItemGR.getValue('sc_cat_item'));
		// 	gr.setValue('user_criteria', '0129961c1bc17b803e3c76e1dd4bcbe6');
		// 	gr.insert();
		// }

		catalog[category].push(catItemGR.sc_cat_item.getDisplayValue());
		items[catItemGR.getValue('sc_cat_item')] = catItemGR.sc_cat_item.getDisplayValue();
		countAvail++;
	} else {
		//gs.print(catItemGR.name.getDisplayValue());
		countUnavail++;
	}

}

var result = "";
for(var c in catalog) {

	if(catalog[c].length > 0) {
		result += '\n\nCategory: ' + c;

		for(var i = 0; i < catalog[c].length; i++) {
			result += "\n\t" + catalog[c][i] + " / ID:" + i;
		}
	}
}

gs.print("\n" + (gs.getUser().hasRole('itil') ? "ITIL: " : "End User: ") + gs.getUserName() +
"\nAvailable Items: " + countAvail +
"\nUnavailable Items: " + countUnavail +
result);

GlideImpersonate().impersonate(adminID);