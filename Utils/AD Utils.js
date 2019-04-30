var gr = new GlideRecord('sys_user');
gr.addActiveQuery();
//gr.addQuery('locked_out', false);
gr.addEncodedQuery('active!=false^u_ad_dnLIKEOU=^nameNOT LIKE000_^user_nameNOT LIKEa-^u_auth_source=active_directory');
//gr.setLimit(1000);
gr.query();

var allUsers = gr.getRowCount();

gs.print("All Users: " + allUsers);

var UNIT_LEVEL = 5;
var ouStore = {};

for (var lvl = 1; lvl <= UNIT_LEVEL; lvl ++) {
	ouStore["level_" + lvl] = {};
}

while(gr.next()) {

	//gs.print(gr.name.getDisplayValue());

	var ad_dn = gr.u_ad_dn.getDisplayValue();
	var ou_re = /(OU=.*?)(,|$)/g;
	var ou_list_arr = [];
	var ou_list = [];

	while((ou_list = ou_re.exec(ad_dn)) !== null) {
		var unit = ou_list[1];
		ou_list_arr.push(unit);

		// for (var l = 1; l <= UNIT_LEVEL; l++) {
		// 	gs.print("Unit: " + unit + " - " + "Level: " + l);
		// 	addUnit(unit, l);
		// }
	}

	addUnit(ou_list_arr);
}

function addUnit(list) {

	list = list.reverse();

	for(var l = 1; l <= 5; l++) {

		if(!list[l-1])
			continue;

		//if(list.length == 5) {

		if(list[l-1].indexOf('OU=WK-') != -1 || list[l-1].indexOf('OU=NASS-WKUS') != -1 || list[l-1].indexOf('OU=FRS') != -1 || list[l-1].indexOf('OU=WKHealth-') != -1 || list[l-1].indexOf('APAC-Organizations') != -1) {
			if(!ouStore["level_" + l][list[l-1]])
				ouStore["level_" + l][list[l-1]] = 1;
			else
				ouStore["level_" + l][list[l-1]]++;
		}



		// 	if(l == 5 && list[l-1] == "Accounts")
		// 		gs.print(list.toString());
		// }
		// else if(list.length == 4 && (l == 3 || l == 4)) {
		// 	if(!ouStore["level_" + (l+1)][list[l-1]])
		// 		ouStore["level_" + (l+1)][list[l-1]] = 1;
		// 	else
		// 		ouStore["level_" + (l+1)][list[l-1]]++;
		// }
		// else {
		// 	if(!ouStore["level_" + l][list[l-1]])
		// 		ouStore["level_" + l][list[l-1]] = 1;
		// 	else
		// 		ouStore["level_" + l][list[l-1]]++;
		// }


	}
}

var result;

for(var l in ouStore) {
	result += "\n\nLevel: " + l;

	var total = 0;

	for(var ut in ouStore[l]) {
		result += "\n\t" + ut + ": " + ouStore[l][ut];
		total += ouStore[l][ut];
	}

	result += "\n\n\tTotal: " + total;
}

gs.print(result);

// var user = "0bfa3bb76fb0e680cbcf77131c3ee4db";

// var olm = new OrgLocMapping();
// olm.debugEnabled();
// var answer = olm.getMappingForUser("Business Service to Group", /*Business Service id*/ "0f2573d337da13002153d5c543990e8a", /*UserID*/user);
// var group = answer.u_output_record;



// if(group) {
// 	var grGroup = new GlideRecord('sys_user_group');
// 	grGroup.get(answer.u_output_record);
// 	gs.print(grGroup.name.getDisplayValue());
// }