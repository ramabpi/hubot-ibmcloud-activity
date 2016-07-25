/*
  * Licensed Materials - Property of IBM
  * (C) Copyright IBM Corp. 2016. All Rights Reserved.
  * US Government Users Restricted Rights - Use, duplication or
  * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
  */
'use strict';

const i18n = require('i18n');
const path = require('path');

// Leverage rewire to gain access to internal functions.
const rewire = require('rewire');

const env = require('../src/lib/env');
const Helper = require('hubot-test-helper');
const helper = new Helper('../src/scripts');
const expect = require('chai').expect;
const mockESUtils = require('./mock.utils.es.js');


// Return a promise that will be resolved in the specified # of ms.
function delay(ms) {
	return new Promise((resolve) => {
		setTimeout(function(){
			resolve();
		}, ms);
	});
}

// Passing arrow functions to mocha is discouraged: https://mochajs.org/#arrow-functions
// return promises from mocha tests rather than calling done() - http://tobyho.com/2015/12/16/mocha-with-promises/
describe('Testing Usage hubot script', function() {

	let room;
	let usageRewire;
	let activityConsumerRewire;

	before(function() {
		mockESUtils.setupMockery();
	});

	beforeEach(function() {
		room = helper.createRoom();
		// Force all emits into a reply.
		room.robot.on('ibmcloud.formatter', function(event) {
			if (event.message) {
				event.response.reply(event.message);
			}
			else {
				event.response.send({attachments: event.attachments});
			}
		});
		usageRewire = rewire(path.resolve(__dirname, '..', 'src', 'scripts', 'usage'));
		activityConsumerRewire = rewire(path.resolve(__dirname, '..', 'src', 'lib', 'activity.consumer'));
	});

	afterEach(function() {
		room.destroy();
	});

	context('test activity doc creation', function() {
		it('should create an activyt doc', function() {
			env.uuid = 'nothing';
			var activityDoc = {
				app_name: 'app_name',
				app_guid: 'app_guid',
				space_guid: 'space_guid',
				space_name: 'space_name',
				event_type: 'event_type'
			};
			var indexFunc = function() {
				return new Promise((resolve, reject) => {
					resolve({created: false });
				});
			};
			var fakeESClient = { index: indexFunc};

			activityConsumerRewire.__set__('esClient', fakeESClient);
			activityConsumerRewire.__get__('createActivityDoc')(room.robot, activityDoc);
			activityConsumerRewire.__set__('esClient', undefined);
		});
	});

	context('user query bot usage', function() {
		// Controlling what data is returned from ES for the usage query is done via the container uuid environment variable.
		it('should respond with no usage', function() {
			env.uuid = 'nothing';
			return room.user.say('mimiron', '@hubot activity today').then(() => {
				return delay(100);
			}).then(() => {
				let response = room.messages[room.messages.length - 1];
				expect(response).to.eql(['hubot', '@mimiron ' + i18n.__('usage.done.nothing', 'today')]);
			});
		});

		it('should respond with chartDocLink', function(){
			var startTime = 0;
			var endTime = 1;
			var chartDocLink = usageRewire.__get__('getChartDocLink')(startTime, endTime);
			expect(chartDocLink).to.eql('http://bot-charts.mybluemix.net?startTime=0&endTime=1&uuid=nothing');
		});

		it('should respond with chartPreviewLink', function(){
			var startTime = 0;
			var endTime = 1;
			var chartPreviewLink = usageRewire.__get__('getChartPreviewLink')(startTime, endTime);
			expect(chartPreviewLink).to.eql('http://bot-charts.mybluemix.net/preview?startTime=0&endTime=1&uuid=nothing');
		});

		it('should filter out untranslated keys', function() {
			env.uuid = 'untranslated_keys';
			return room.user.say('mimiron', '@hubot activity today').then(() => {
				return delay(100);
			}).then(() => {
				let response = room.messages[room.messages.length - 1];
				expect(response).to.eql(['hubot', '@mimiron ' + i18n.__('usage.summary.day') + '\n'
				+ i18n.__('usage.performed.activity.once', i18n.__('activity.app.start'))]);
			});
		});

		it('should respond with usage for today', function() {
			env.uuid = 'today';
			return room.user.say('mimiron', '@hubot activity today').then(() => {
				return delay(100);
			}).then(() => {
				let response = room.messages[room.messages.length - 1];
				expect(response).to.eql(['hubot', '@mimiron ' + i18n.__('usage.summary.day') + '\n'
				+ i18n.__('usage.performed.activity.once', i18n.__('activity.threshold.violation.cpu')) + '\n'
				+ i18n.__('usage.performed.activity.once', i18n.__('activity.threshold.violation.memory')) + '\n'
				+ i18n.__('usage.performed.activity.once', i18n.__('activity.threshold.violation.disk')) + '\n'
				+ i18n.__('usage.performed.activity.once', i18n.__('activity.app.event')) + '\n'
				+ i18n.__('usage.performed.activity.once', i18n.__('activity.app.start')) + '\n'
				+ i18n.__('usage.performed.activity.once', i18n.__('activity.app.crash')) + '\n'
				+ i18n.__('usage.performed.activity.once', i18n.__('activity.app.logs')) + '\n'
				+ i18n.__('usage.performed.activity.once', i18n.__('activity.app.stop')) + '\n'
				+ i18n.__('usage.performed.activity.once', i18n.__('activity.app.remove')) + '\n'
				+ i18n.__('usage.performed.activity.once', i18n.__('activity.service.create')) + '\n'
				+ i18n.__('usage.performed.activity.once', i18n.__('activity.service.remove')) + '\n'
				+ i18n.__('usage.performed.activity.once', i18n.__('activity.github.deploy'))]);
			});
		});

		it('should respond with usage for the week', function() {
			env.uuid = 'week';
			return room.user.say('mimiron', '@hubot activity this week').then(() => {
				return delay(100);
			}).then(() => {
				let response = room.messages[room.messages.length - 1];
				expect(response).to.eql(['hubot', '@mimiron ' + i18n.__('usage.summary.week') + '\n'
					+ i18n.__('usage.performed.activity.multiple', 11, i18n.__('activity.threshold.violation.cpu')) + '\n'
				+ i18n.__('usage.performed.activity.multiple', 12, i18n.__('activity.threshold.violation.memory')) + '\n'
				+ i18n.__('usage.performed.activity.multiple', 13, i18n.__('activity.threshold.violation.disk')) + '\n'
				+ i18n.__('usage.performed.activity.multiple', 2, i18n.__('activity.app.event')) + '\n'
				+ i18n.__('usage.performed.activity.multiple', 3, i18n.__('activity.app.start')) + '\n'
				+ i18n.__('usage.performed.activity.multiple', 4, i18n.__('activity.app.crash')) + '\n'
				+ i18n.__('usage.performed.activity.multiple', 5, i18n.__('activity.app.logs')) + '\n'
				+ i18n.__('usage.performed.activity.multiple', 6, i18n.__('activity.app.stop')) + '\n'
				+ i18n.__('usage.performed.activity.multiple', 7, i18n.__('activity.app.remove')) + '\n'
				+ i18n.__('usage.performed.activity.multiple', 8, i18n.__('activity.service.create')) + '\n'
				+ i18n.__('usage.performed.activity.multiple', 9, i18n.__('activity.service.remove')) + '\n'
					+ i18n.__('usage.performed.activity.multiple', 10, i18n.__('activity.github.deploy'))]);
			});
		});
	});

	context('user calls `activity help`', function() {
		beforeEach(function() {
			return room.user.say('mimiron', '@hubot activity help');
		});

		it('should respond with help', function() {
			expect(room.messages.length).to.eql(2);
			let help = '\nhubot activity today - ' + i18n.__('help.activity.day') + '\n'
				+ 'hubot activity this week - ' + i18n.__('help.activity.week') + '\n';
			expect(room.messages[1]).to.eql(['hubot', '@mimiron ' + help]);
			return room.user.say('mimiron', 'yes');
		});
	});

});
