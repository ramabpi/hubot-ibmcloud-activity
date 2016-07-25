// Description:
//	Summarizes the activity of the bluemix bot.
//
// Configuration:
//	 HUBOT_AUDIT_ENDPOINT Elastic search endpoint.
//   uuid Unique identifier of container running this bot.
//
// Commands:
//   hubot activity help - Show available commands in the activity category.
//
// Author:
//	kurtism
//
/*
 * Licensed Materials - Property of IBM
 * (C) Copyright IBM Corp. 2016. All Rights Reserved.
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 */
'use strict';

var path = require('path');
var TAG = path.basename(__filename);

const utils = require('@ibm/hubot-ibmcloud-utils').utils;
const activity_consumer = require('../lib/activity.consumer');// getClient() will only be set if usage tracking is enabled and the related ES index is ready to use.

const COMMAND_USAGE_HELP = /activity\s+help/i;
const COMMAND_USAGE_REPORT = /activity\s+(today|this week)/i;

function isChartingEnabled(robot) {
	if (process.env.USAGE_CHART_DISABLED) {
		return false;
	}

	return utils.isSlack(robot) || utils.isFacebook(robot);
}

function getChartDocLink(startTime, endTime) {
	return `http://bot-charts.mybluemix.net?startTime=${startTime}&endTime=${endTime}&uuid=${activity_consumer.getContainerUUID()}`;
}

function getChartPreviewLink(startTime, endTime) {
	return `http://bot-charts.mybluemix.net/preview?startTime=${startTime}&endTime=${endTime}&uuid=${activity_consumer.getContainerUUID()}`;
}

// substitutes the translated activity name into the generic "performed activity" strings.
function getDisplayString(robot, activity_id, activity_count) {
	var displayString;
	var translated_activity = i18n.__(activity_id);

	if (translated_activity && translated_activity !== activity_id) { // i18n will return the original key if it's unknown.
		if (activity_count === 1) {
			displayString = i18n.__('usage.performed.activity.once', translated_activity);
		}
		else {
			displayString = i18n.__('usage.performed.activity.multiple', activity_count, translated_activity);
		}
	}
	else {
		robot.logger.error(`${TAG}: Detected untranslated bot activity_id, ${activity_id}, while generating bot activity report.`);
	}

	return displayString;
}

// Return a promise that will be resolved with a usage report for the specified timeframe.  Promise might be resolved with nothing
// in case the usage report was sent via formatted message attachments.
//
// Valid timeframes: today, this week
function getUsageReport(robot, res, timeframe) {
	if (!activity_consumer.getClient()) {
		return Promise.resolve(i18n.__('usage.info.unavailable'));
	}

	return new Promise((resolve, reject) => {
		var startTime = new Date();
		var endTime = new Date();

		if (timeframe.indexOf('today') > -1) {
			// This is 12 midnight in the timezone the bot is running in.
			startTime.setHours(0, 0, 0, 0);
		}
		else if (timeframe.indexOf('week') > -1) {
			// 7 days from now.
			var seven_days_in_ms = 1000 * 60 * 60 * 24 * 7;
			startTime = new Date(startTime - seven_days_in_ms);
		}
		else {
			// Should never see this.
			resolve(i18n.__('usage.not.supported', timeframe));
			return;
		}

		const bot_activity_query = {
			query: {
				query_string: {
					query: `timestamp:[${startTime.getTime()} TO ${endTime.getTime()}] AND container_uuid:${activity_consumer.getContainerUUID()}`,
					lowercase_expanded_terms: false
				}
			},
			aggs: { bot_activity: { terms: { field: 'activity_id', order: { _term: 'asc' } } } }
		};

		let queryBodyStr = JSON.stringify(bot_activity_query);
		robot.logger.info(`${TAG}: Asynch call to ES client search for index:${activity_consumer.BOTACTIVITY_INDEX_NAME} with body:${queryBodyStr}.`);
		activity_consumer.getClient().search({
			index: activity_consumer.BOTACTIVITY_INDEX_NAME,
			searchType: 'count',
			body: bot_activity_query
		}).then((result) => {
			if (result && result.aggregations && result.aggregations.bot_activity && result.aggregations.bot_activity.buckets) {
				let buckets = result.aggregations.bot_activity.buckets;

				if (!buckets.length) {
					resolve(i18n.__('usage.done.nothing', timeframe));
				}
				else {
					let usageReport = '';

					buckets.forEach((bucket) => {
						let activity_string = getDisplayString(robot, bucket.key, bucket.doc_count);

						if (activity_string) {
							usageReport += '\n' + activity_string;
						}
					});

					if (!usageReport.length) {
						// we had buckets but none for the type of bot activity we report on.
						resolve(i18n.__('usage.done.nothing', timeframe));
					}
					else {
						// usage report starts with \n
						if (timeframe.indexOf('today') > -1) {
							if (isChartingEnabled(robot)) {
								robot.emit('ibmcloud.formatter', {
									response: res,
									attachments: [
										{
											title: i18n.__('usage.bot.activity.title'),
											text: i18n.__('usage.summary.day.text'),
											title_link: getChartDocLink(startTime.getTime(), endTime.getTime()),
											image_url: getChartPreviewLink(startTime.getTime(), endTime.getTime())
										}
									]
								});
								resolve();
							}
							else {
								resolve(i18n.__('usage.summary.day') + usageReport);
							}
						}
						else if (timeframe.indexOf('week') > -1) {
							if (isChartingEnabled(robot)) {
								robot.emit('ibmcloud.formatter', {
									response: res,
									attachments: [
										{
											title: i18n.__('usage.bot.activity.title'),
											text: i18n.__('usage.summary.week.text'),
											title_link: getChartDocLink(startTime.getTime(), endTime.getTime()),
											image_url: getChartPreviewLink(startTime.getTime(), endTime.getTime())
										}
									]
								});
								resolve();
							}
							else {
								resolve(i18n.__('usage.summary.week') + usageReport);
							}
						}
						else {
							// not translated, b/c not shown to user.
							reject(`detected unsupported timeframe while generating usage report.  timeframe: ${timeframe}`);
						}
					}
				}
			}
			else {
				// not translated, b/c not shown to user.
				reject(`Unexpected query result from Elasticsearch on host. Result: ${JSON.stringify(result, null, 2)}`);
			}
		}).catch((error) => {
			reject(error);
		});
	});
}

module.exports = (robot) => {

	// setup response for messages coming in via the hubot adapter.
	robot.respond(COMMAND_USAGE_REPORT, (res) => {
		robot.logger.debug(`${TAG}: COMMAND_USAGE_REPORT res.message.text=${res.message.text}.`);
		robot.logger.info(`${TAG}: Getting activity report...`);
		const timeframe = res.match[1];
		robot.logger.info(`${TAG}: Async call to getUsageReport()...`);
		return getUsageReport(robot, res, timeframe).then((result) => {
			robot.logger.info(`${TAG}: Successful async call to getUsageReport() returned with result:${result}`);
			robot.emit('ibmcloud.formatter', { response: res, message: result});
		}).catch((error) => {
			robot.logger.error(`${TAG}: Error while getting the bot usage report:`);
			robot.logger.error(error);
		});
	});

	robot.respond(COMMAND_USAGE_HELP, (res) => {
		robot.logger.debug(`${TAG}: COMMAND_USAGE_HELP res.message.text=${res.message.text}.`);
		robot.logger.info(`${TAG}: Listing help activity...`);

		// hubot activity today - Displays statistics of the bot activity today.
		// hubot activity this week - Displays statistics of the bot activity this week.

		let help = robot.name + ' activity today - ' + i18n.__('help.activity.day') + '\n';
		help += robot.name + ' activity this week - ' + i18n.__('help.activity.week') + '\n';
		robot.emit('ibmcloud.formatter', { response: res, message: '\n' + help});
	});
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
