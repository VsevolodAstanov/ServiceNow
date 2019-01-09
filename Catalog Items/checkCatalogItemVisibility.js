var adminID = gs.getUserID();

//User ID
GlideImpersonate().impersonate(); 

//atalog Item list
var names = [];

var itemGR = new GlideRecord('sc_cat_item');
itemGR.addActiveQuery();
itemGR.orderBy("name", 'IN', names.join(','));
itemGR.query();

gs.info("Count of items: " + itemGR.getRowCount() + "\n");

while(itemGR.next()) {

	gs.info(itemGR.name.getDisplayValue());
	gs.info("Visible: " + new sn_sc.CatItem(itemGR.getUniqueValue()).canView() + "\n");
}

GlideImpersonate().impersonate(adminID);