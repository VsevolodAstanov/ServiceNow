var adminID = gs.getUserID();

//User ID
GlideImpersonate().impersonate("bf6ad3446f877600cbcf77131c3ee447"); 

//atalog Item list
var names = [];

var itemGR = new GlideRecord('sc_cat_item');
//itemGR.addActiveQuery();
itemGR.addEncodedQuery("type!=bundle^sys_class_name!=sc_cat_item_guide^type!=package^sys_class_name!=sc_cat_item_content^sys_class_name!=sc_cat_item_producer^active=true");
itemGR.orderBy("name");
itemGR.query();

var count = 0;

while(itemGR.next()) {

	var gr = new GlideRecord('sc_category_user_criteria_mtom');
	gr.addQuery('sc_category', itemGR.getValue('category'));
	gr.query();

	if(new sn_sc.CatItem(itemGR.getUniqueValue()).canView() == true && !gr.hasNext()) {
		gs.info(itemGR.name.getDisplayValue());
		count++;
	}

}

gs.info("Count of items: " + count);

GlideImpersonate().impersonate(adminID);