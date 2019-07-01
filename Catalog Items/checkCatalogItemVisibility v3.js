var adminID = gs.getUserID(); 

var countries = []; 
var catalog = {}; 
var items = {}; 
var result = ""; 
var countAvail = 0; 
var countUnavail = 0; 
var euDone = false; 
var itilDone = false; 

var usersGR = new GlideRecord('sys_user'); 
usersGR.addEncodedQuery('u_ad_dnLIKEOU=FRS^nameNOT LIKE000_^user_nameNOT LIKEa-^u_auth_source=active_directory'); 
//usersGR.setLimit(100); 
usersGR.orderBy('country'); 
usersGR.query(); 

gs.print(usersGR.getRowCount()); 

var catItemGR = new GlideRecord('sc_cat_item_category'); 
catItemGR.addActiveQuery(); 
catItemGR.addQuery('sc_cat_item.type', '!=', 'bundle'); 
catItemGR.addQuery('sc_cat_item.type', '!=', 'package'); 
catItemGR.addQuery('sc_cat_item.sys_class_name', '!=', 'sc_cat_item_guide'); 
catItemGR.addQuery('sc_cat_item.sys_class_name', '!=', 'sc_cat_item_content'); 
catItemGR.addQuery('sc_cat_item.sys_class_name', '!=', 'sc_cat_item_producer');
//catItemGR.addQuery('short_descriptsion', 'NOT LIKE', 'Supported by GRC FRR'); 
catItemGR.query();

gs.print(catItemGR.getRowCount());

var users = 0; 
var itil = 0; 
var eu = 0; 

while(usersGR.next()) { 

	// if(euDone && itilDone) 
	// continue; 
	GlideImpersonate().impersonate(usersGR.getUniqueValue()); 

	var countryID = usersGR.country.getDisplayValue(); 
	var countryDone = (countries.indexOf(countryID) >= 0); 
	var isITIL = gs.getUser().hasRole('itil'); 

	if(!countryDone) { 
		itilDone = false; 
		euDone = false; 
	} 

	if(itilDone && isITIL && countryDone) 
		continue; 

	if(euDone && !isITIL && countryDone) 
		continue;

	if(isITIL) { 
		itilDone = true; 
	} else { 
		euDone = true; 
	} 

	//result += (isITIL ? "\nITIL User: " : "\nEnd User: ") + usersGR.name.getDisplayValue() + " / " + countryID; 
	countries.push(countryID); 

	users++; 

	//User ID 
	while(catItemGR.next()) { 

		var hasCategory = catItemGR.sc_category.hasValue(); 
		var isCategoryVisible = (hasCategory == true ? (new sn_sc.CatCategory(catItemGR.getValue('sc_category')).canView()) : true); 
		var category = (hasCategory == true ? catItemGR.sc_category.getDisplayValue() : "Global"); 

		if(!catalog[category] && isCategoryVisible) { 
			catalog[category] = {}; 
		} 

		if(new sn_sc.CatItem(catItemGR.getValue('sc_cat_item')).canView() == true && isCategoryVisible) { 
			if(catalog[category][catItemGR.sc_cat_item.sys_id + ""])
				continue; 

			catalog[category][catItemGR.sc_cat_item.sys_id + ""] = catItemGR.sc_cat_item.getDisplayValue();

			//items[catItemGR.getValue('sc_cat_item')] = catItemGR.sc_cat_item.getDisplayValue(); 
			countAvail++; 
		} else { 
			//gs.print(catItemGR.name.getDisplayValue()); 
			countUnavail++; 
		}
	}

	catItemGR.restoreLocation(); 
} 

for(var c in catalog) {

	if(Object.keys(catalog[c]).length > 0) {
		result += '\n\nCategory: ' + c;

		for(var i in catalog[c]) {
			result += "\n\t" + catalog[c][i] + " / ID: " + i ;
		}
	}
}

GlideImpersonate().impersonate(adminID); 

gs.print("\nAvailable Items: " + countAvail + 
"\nUnavailable Items: " + countUnavail + 
result); 

// gs.print("Countries: " + countries.join(',')) 
// gs.print("Users: " + users); 
// gs.print(result);