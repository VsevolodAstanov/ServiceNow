var adminID = gs.getUserID();

//User ID
GlideImpersonate().impersonate("5e9f68906fbb064076eca9331c3ee424");

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
			result += "\n\t" + catalog[c][i];
		}
	}
}

gs.print("\n" + (gs.getUser().hasRole('itil') ? "ITIL: " : "End User: ") + gs.getUserName() +
"\nAvailable Items: " + countAvail +
"\nUnavailable Items: " + countUnavail +
result);

GlideImpersonate().impersonate(adminID);