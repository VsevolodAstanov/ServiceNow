var gr = new GlideRecord('sys_user');
gr.addActiveQuery();
gr.addQuery('locked_out', false);
gr.addNotNullQuery('u_ad_dn');
gr.query();

var allUsers = gr.getRowCount();

gs.print("All Users: " + allUsers);

var ouStore = {};

while(gr.next()) {

	var dv = gr.u_ad_dn.getDisplayValue();
	var unit = dv.substr(dv.lastIndexOf('OU='), (dv.indexOf(',DC=') - dv.lastIndexOf('OU='))).substr(3);

	if(!ouStore[unit])
		ouStore[unit] = 1;
	else {
		ouStore[unit]++;
	}

	if(unit == "")
		gs.print(dv);
}

var result;

for(var ou in ouStore) {
	result += "\nUnit: " + ou + " - " + "Users: " + ouStore[ou];
}

gs.print(result);