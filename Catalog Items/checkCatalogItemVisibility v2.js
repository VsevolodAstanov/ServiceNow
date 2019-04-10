var countries = [];
var adminID = gs.getUserID();

var usersGR = new GlideRecord('sys_user');
usersGR.addActiveQuery();
usersGR.addNotNullQuery('manager');
usersGR.addQuery('locked_out', false);
usersGR.addEncodedQuery('u_ad_dnLIKEWKHealth');
usersGR.query();

while(usersGR.next()) {

	if(gs.getUser().getUserByID(usersGR.user_name.getDisplayValue()).hasRole('itil'))
		continue;

	var country = usersGR.u_country.getDisplayValue();

	if(countries.indexOf(country) != -1)
		continue;

	countries.push(country);

	//User ID
	GlideImpersonate().impersonate(usersGR.getUniqueValue());

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
	"\nCountry: " + country +
	result);

}

GlideImpersonate().impersonate(adminID);