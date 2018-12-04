function createQniqueValue(k) {

	var re = /(_$|_[a-z0-9]+$)/g;
	var full = k;
	var uniqueValue;
	var delimer;
	
	k = k.toLowerCase();
	k = k.replace(/\s+/g, "_");
	k = k.replace(/\W+/g, "");
	k = "u_" + k;

	if(k.length > 30) {
		uniqueValue = k.match(re)[0];
		k = k.substring(0, 30);
		delimer = re.exec(k);
		k = k.substring(0, delimer.index);
	}

	k = k.replace(/_$/, "");

	return k;
}