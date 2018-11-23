var ImportGroupsDefinitions = Class.create();
ImportGroupsDefinitions.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	
	createGroupsDefinitions: function() {
		var import_data = this.getParameter('sysparm_import_data');

		if(import_data) {
			import_data = JSON.parse(import_data);

			//var groups = this._handleGroups(import_data);
			//this._createGroups(groups);

			//var business_services = this._handleServices(import_data, "Categories (BS)");
			//this._createServices(business_services, "cmdb_ci_service");

			var technical_services = this._handleServices(import_data, "Subcategories (TS)");
			this._createServices(technical_services, "u_cmdb_ci_technical_service");

			var result = this.newItem("response");
			result.setAttribute("groups", JSON.stringify(this._createdGroups, 2, 2));
			result.setAttribute("not_existing_users", JSON.stringify(this._notExistingUsers, 2, 2));
			result.setAttribute("business_services", JSON.stringify(this._createdBusinessServices, 2, 2));
			result.setAttribute("technical_services", JSON.stringify(technical_services, 2, 2));
			result.setAttribute("businessCritValues", JSON.stringify(this._businessCritValues, 2, 2));
		}
	},

	_handleGroups: function(import_data) {

		var groups_sheet = import_data['Assignment Groups']; //Name of Groups sheet
		var groups = [];

		if (groups_sheet) {
			var name,
				types,
				company,
				members = [],
				roles = [],
				domains = [],
				manager;

			for (var i = 0; i < groups_sheet.length; i++) {

				//Group Name
				name = groups_sheet[i]['Assignment group name'];
				if(!name)
					continue;

				//Group Type
				types = (groups_sheet[i]['Types'] ? groups_sheet[i]['Types'].replace(/\s+/g,"").split(",") : []);

				//Group Company
				company = groups_sheet[i]['Company'] || "";

				//Group Members
				members = (groups_sheet[i]['Group Members'] ? groups_sheet[i]['Group Members'].replace( /\r\n/g,"--->>>").split("--->>>") : []);

				//Group Manager
				manager = groups_sheet[i]['Group Manager'] || members[0] || "";

				//Group Roles
				roles = (groups_sheet[i]['Group Roles'] ? groups_sheet[i]['Group Roles'].replace(/\s+/g,"").split(",") : []);

				domains = (groups_sheet[i]['Domain Visibility'] ? groups_sheet[i]['Domain Visibility'].split(",") : []);

				groups.push({
					name : name,
					types : types,
					company : company,
					members : members,
					manager : manager,
					roles : roles,
					domains: domains
				});	
			}
		}

		return groups;
	},

	_handleServices: function(import_data, sheet_name) {
		var services_sheet = import_data[sheet_name]; //Name of Business Services or sheet
		var services = [];

		if (services_sheet) {
			var name,
				description,
				busines_criticality,
				managed_by,
				owned_by,
				support_group,
				approval_group, //change_control
				problem_approval_group, //u_problem_approval_group
				location,
				operational_status;

			for (var s = 0; s < services_sheet.length; s++) {

				//Name
				name = services_sheet[s]['Name'];
				if(!name)
					continue;

				//Description
				description = services_sheet[s]['Description'];

				//Business Criticality
				busines_criticality = services_sheet[s]['Business Criticality'];

				//Managed By
				managed_by = services_sheet[s]['Managed By'];

				//Owned By
				owned_by = services_sheet[s]['Owned By'];

				//Support Group
				support_group = services_sheet[s]['Support Group'];

				//Approval Group
				approval_group = services_sheet[s]['Approval Group'];

				//Problem Approval Group
				problem_approval_group = services_sheet[s]['Problem Approval Group'];

				//Location
				location = services_sheet[s]['Location'];

				//Operational Status
				operational_status = services_sheet[s]['Operational Status'];

				services.push({
					name: name,
					description: description,
					busines_criticality: busines_criticality,
					managed_by: managed_by,
					owned_by: owned_by,
					support_group: support_group,
					change_control: approval_group,
					u_problem_approval_group: problem_approval_group,
					location: location,
					operational_status: operational_status
				});
			}
		}

		return services;
	},

	_createGroups: function(groups) {

		var existingGroupsGR = this._getExistingGroups(groups);
		while(existingGroupsGR.next()){
			existing:for(var e = 0; e < groups.length; e++) {
				if(existingGroupsGR.name == groups[e].name) {
					//this._updateGroup(existingGroupsGR, groups[e]);
					groups.splice(e, 1);
					continue existing;
				}
			}
		}

		for(var n = 0; n < groups.length; n++) {

			var group = groups[n];
			var members,
				roles,
				types,
				manager,
				company,
				domains;

			if(group.members)
				members = this._getMembers(group.members);
			if(group.roles)
				roles = this._getRoles(group.roles);
			if(group.types)
				types = this._getGroupTypes(group.types);
			if(group.company)
				company = this._getGroupCompany(group.company);
			if(group.manager)
				manager = this._getGroupManager(group.manager);
			if(group.domains)
				domains = this._getGroupDomains(group.domains);

			var groupGR = new GlideRecord('sys_user_group');
			groupGR.initialize();
			groupGR.name = groups[n].name;

			if(company)
				groupGR.company = company;
			if(types)
				groupGR.type = types.join(",");
			if(manager)
				groupGR.manager = manager;

			var groupSysID = groupGR.insert();

			if(!groupGR.isValidRecord()) {
					this._createdGroups.push({
					"name": groups[n].name,
					"sys_id": "Duplicate"
				});

				continue;
			}

			if(members)
				this._addGroupMembers(members, groupSysID);
			if(roles)
				this._addGroupRoles(roles, groupSysID);
			if(domains)
				this._addDomainVisibility(domains, groupSysID);

			this._createdGroups.push({
				"name": groups[n].name,
				"sys_id": groupSysID
			});
		}
	},

	_createServices: function(services, type) {
		if(this._businessCritValues.length == 0)
			this._getBusinessCritValues();

		// var existingServicesGR = this._getExistingServices(services, type);
		// while(existingServicesGR.next()){
		// 	existingServices:for(var s = 0; s < services.length; s++) {
		// 		if(existingServicesGR.name == services[s].name) {
		// 			//this._updateService(existingServicesGR, services[s]);
		// 			services.splice(s, 1);
		// 			continue existingServices;
		// 		}
		// 	}
		// }

		for(var ser = 0; ser < services.length; ser++) {
			var service = services[ser];
			var serviceGR = new GlideRecord(type);
			serviceGR.initialize();
			serviceGR.name = service.name;

			if(service.description)
				serviceGR.comments = service.description;
			if(service.busines_criticality)
				serviceGR.busines_criticality = this._getBSValue(service.busines_criticality);
			if(service.support_group)
				serviceGR.support_group = this._getGroupByName(service.support_group) || '';
			if(service.change_control)
				serviceGR.change_control = this._getGroupByName(service.change_control) || '';
			if(service.u_problem_approval_group)
				serviceGR.u_problem_approval_group = this._getGroupByName(service.u_problem_approval_group) || '';
			serviceGR.setWorkflow(false);
			var service_id = serviceGR.insert();

			this._createdBusinessServices.push({
				"name": service.name,
				"sys_id": service_id
			});
		}

	},

	_getExistingGroups: function(groups) {
		var q = "";
		for(var g = 0; g < groups.length; g++) {
			var name =  groups[g].name;
			q =+ "^ORname=" + name;
		}

		var groupsGR = new GlideRecord('sys_user_group');
		groupsGR.addEncodedQuery(q);
		groupsGR.query();

		return groupsGR;
	},

	_getExistingServices: function(services, type) {
		var q = "";
		for(var s = 0; s < services.length; s++) {
			var name =  services[s].name;
			q =+ "^ORname=" + name;
		}

		var servicesGR = new GlideRecord(type);
		servicesGR.addEncodedQuery(q);
		servicesGR.query();

		return servicesGR;
	},

	_getMembers: function(members) {
		var members_ids = [];
		var userGR = new GlideRecord('sys_user');
		userGR.addEncodedQuery('nameIN' + members.join(","));
		userGR.query();

		while(userGR.next()) {
			members_ids.push(userGR.getUniqueValue());
			members = members.join(",").replace(userGR.name, "").split(",").filter(Boolean);
		}

		this._notExistingUsers.push(members.join(","));

		return members_ids;
	},

	_getGroupManager: function(manager) {
		var managerGR = new GlideRecord('sys_user');
		managerGR.addQuery('name', manager);
		managerGR.query();
		managerGR.next();

		return managerGR.getUniqueValue();
	},

	_getRoles: function(roles) {
		var roles_ids = [];
		var roleGR = new GlideRecord('sys_user_role');
		roleGR.addEncodedQuery('nameIN' + roles.join(","));
		roleGR.query();
		while(roleGR.next()) {
			roles_ids.push(roleGR.getUniqueValue());
		}

		return roles_ids;
	},

	_getGroupTypes: function(types) {
		var types_ids = [];
		var typeGR = new GlideRecord('sys_user_group_type');
		typeGR.addEncodedQuery('nameIN' + types.join(","));
		typeGR.query();
		while(typeGR.next()) {
			types_ids.push(typeGR.getUniqueValue());
		}

		return types_ids;
	},

	_getGroupCompany: function(company) {
		var companyGR = new GlideRecord('core_company');
		companyGR.addQuery('name', company);
		companyGR.query();
		companyGR.next();

		return companyGR.getUniqueValue();
	},

	_getGroupDomains: function(domains) {
		var _domains = [];
		var domainGR = new GlideRecord('domain');
		domainGR.addEncodedQuery('nameIN' + domains.join(","));
		domainGR.query();
		while(domainGR.next()) {
			_domains.push(domainGR.getUniqueValue());
		}

		return _domains;
	},

	_addGroupMembers: function(members, group_id) {
		if(!group_id)
			return;

		for(var m = 0; m < members.length; m++) {
			var memberRelationGR = new GlideRecord('sys_user_grmember');
			memberRelationGR.initialize();
			memberRelationGR.user = members[m];
			memberRelationGR.group = group_id;
			memberRelationGR.insert();
		}
	},

	_addGroupRoles: function(roles, group_id) {
		if(!group_id)
			return;

		for(var r = 0; r < roles.length; r++) {
			var roleRelationGR = new GlideRecord('sys_group_has_role');
			roleRelationGR.initialize();
			roleRelationGR.role = roles[r];
			roleRelationGR.group = group_id;
			roleRelationGR.insert();
		}
	},

	_addDomainVisibility: function(domains, group_id) {

		if(!group_id)
			return;

		for(var d = 0; d < domains.length; d++) {
			var domainVisibilityGR = new GlideRecord('sys_user_group_visibility');
			domainVisibilityGR.initialize();
			domainVisibilityGR.sys_domain = domains[d];
			domainVisibilityGR.group = group_id;
			domainVisibilityGR.insert();
		}
	},

	_getGroupByName: function(name) {
		var groups = this._createdGroups;
		for(var g = 0; g < groups.length; g++) {
			if(groups[g].name == name) {
				return groups[g].sys_id;
			}
		}

		var groupGR = new GlideRecord('sys_user_group');
		groupGR.addQuery('name', name);
		groupGR.query();
		if(groupGR.next())
			return groupGR.getUniqueValue();
	},

	_getBusinessCritValues: function() {
		var bcValuesGR = new GlideRecord('sys_choice');
		bcValuesGR.addQuery("name", "cmdb_ci_service");
		bcValuesGR.addQuery("inactive", "false");
		bcValuesGR.addQuery("element", "busines_criticality");
		bcValuesGR.addQuery("language", "en");
		bcValuesGR.query();
		while(bcValuesGR.next()) {
			this._businessCritValues.push({
				'label': bcValuesGR.getValue('label'),
				'value': bcValuesGR.getValue('value'),
			});
		}
	},

	_getBSValue: function(bc) {
		var bcs = this._businessCritValues;
		for(var e = 0; e < bcs.length; e++) {
			if(bcs[e].label == bc) {
				return bcs[e].value;
			}
		}
	},

	_createdGroups: [],
	_createdBusinessServices: [],
	_createdTechnicalServices: [],
	_businessCritValues: [],
	_notExistingUsers: [],
	
    type: 'ImportGroupsDefinitions'
});