/*
  * Licensed Materials - Property of IBM
  * (C) Copyright IBM Corp. 2016. All Rights Reserved.
  * US Government Users Restricted Rights - Use, duplication or
  * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
  */
/*
 * Captures bot.activity events which are emitted via emitBotActivity calls in our robot scripts.  Stores the events
 * in Elasticsearch.  Also exports a few functions/variables for code interested at getting at these stored events.
 */
'use strict';

const es = require('../lib/es'); // getClient() will only be set if usage tracking is enabled and the related ES index is ready to use.
const env = require('./env');

var path = require('path');
var TAG = path.basename(__filename);

const usage_index_name = 'hubotusage';
const usage_doc_type = 'UsageEntry';

let esClient;

function auditDisabled() {
	var isDisabled = (process.env.HUBOT_BLUEMIX_AUDIT_DISABLED && (process.env.HUBOT_BLUEMIX_AUDIT_DISABLED === 'TRUE' || process.env.HUBOT_BLUEMIX_AUDIT_DISABLED === 'true'));
	var isNotDefined = !es.getClient();
	return isDisabled || isNotDefined;
}

// UUID of the container running this bot.
function getContainerUUID() {
	return env.uuid;
}

/*
* Add activity doc to ElasticSearch
*/
function createActivityDoc(robot, activity){
	if (!getClient()) {
		return;
	}

	var esDoc = {
		container_uuid: getContainerUUID(),
		timestamp: new Date().getTime(),
		activity_id: activity.activity_id
	};

	if (robot.adapterName) {
		esDoc.adapter_name = robot.adapterName.toLowerCase();
	}

	if (activity.app_name) {
		esDoc.app_name = activity.app_name;
	}

	if (activity.app_guid) {
		esDoc.app_guid = activity.app_guid;
	}

	if (activity.space_guid) {
		esDoc.space_guid = activity.space_guid;
	}

	if (activity.space_name) {
		esDoc.space_name = activity.space_name;
	}

	if (activity.event_type) {
		esDoc.event_type = activity.event_type;
	}

	return getClient().index({index: usage_index_name, type: usage_doc_type, body: esDoc}).then((result) => {
		if (!result || !result.created === true) {
			robot.logger.error(`${TAG}: Unexpected response while inserting usage doc into Elasticsearch; result:`);
			robot.logger.error(result);
		}
	}).catch((err) => {
		robot.logger.error(`${TAG}: Error inserting usage doc into Elasticsearch`);
		robot.logger.error(err);
	});
}

/*
 * Initialize elastic search so that the bot activity docs can be added to it.
 */
function init(robot) {
	return new Promise((resolve, reject) => {
		if (auditDisabled()) {
			robot.logger.warning('Auditing is disabled. To enable auditing, ensure HUBOT_AUDIT_ENDPOINT is defined and HUBOT_BLUEMIX_AUDIT_DISABLED is not set to true');
			reject('Auditing is disabled. To enable auditing, ensure HUBOT_AUDIT_ENDPOINT is defined and HUBOT_BLUEMIX_AUDIT_DISABLED is not set to true');
		}
		else {
			// set up activity callback, not part of this promise chain
			robot.on('bot.activity', (activity) => {
				createActivityDoc(robot, activity);
			});
			esClient = es.getClient();
			resolve(esClient);
		}
	});
}

/*
 * Returns the elasticsearch client to use on activity related searches.
 * If elasticsearch initialization was not successful or the index could not be created,
 * then undefined is returned.  Otherwise the elasticsearch client is returned.
 */
function getClient() {
	return esClient;
}

module.exports = {
	BOTACTIVITY_INDEX_NAME: usage_index_name,
	init,
	getContainerUUID,
	getClient
};

// --------------------------------------------------------------
// i18n (internationalization)
// It will read from a peer messages.json file.  Later, these
// messages can be referenced throughout the module.
// --------------------------------------------------------------
const i18n = require('i18n');
i18n.configure({
	// Add more languages to the list of locales when the files are created.
	directory: __dirname + '/../messages',
	defaultLocale: 'en',
	// Prevent messages file from being overwritten in error conditions (like poor JSON).
	updateFiles: false
});
// At some point we need to toggle this setting based on some user input.
i18n.setLocale('en');
