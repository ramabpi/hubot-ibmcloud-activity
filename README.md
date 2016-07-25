# hubot-ibmcloud-activity

Script package that exposes captured IBM Cloud activity for the last day and last week for those activities that emit to the `bot.activity` identifier with the appropriate activity document.

_activity document:_
```
var activityDoc = {
	app_name: 'app_name',
	app_guid: 'app_guid',
	space_guid: 'space_guid',
	space_name: 'space_name',
	event_type: 'event_type'
};
```

## Getting Started
  * [Usage](#usage)
  * [Commands](#commands)
  * [Hubot Adapter Setup](#hubot-adapter-setup)
  * [Development](#development)
  * [License](#license)
  * [Contribute](#contribute)

## Usage <a id="usage"></a>

If you are new to Hubot visit the [getting started](https://hubot.github.com/docs/) content to get a basic bot up and running.  Next, follow these steps for adding this external script into your hubot:

1. `cd` into your hubot directory
2. Install this package via `npm install @ibm/ibmcloud-activity --save`
3. Add `@ibm/ibmcloud-activity` to your `external-scripts.json`
4. Add the necessary environment variables:
   ```
   HUBOT_AUDIT_ENDPOINT=<ElasticSearch endpoint>
   UUID=<container uuid>
   USAGE_CHART_DISABLED=<1 - to disable chart>
   ```
5. Start up your bot & off to the races!


## Commands <a id="commands"></a>

- `hubot activity help` - Show available activity commands.
- `hubot activity today` - Displays statistics of the bot activity today.
- `hubot activity this week` - Displays statistics of the bot activity this week.

## Hubot Adapter Setup <a id="hubot-adapter-setup"></a>

Hubot supports a variety of adapters to connect to popular chat clients.  For more feature rich experiences you can setup the following adapters:
- [Slack setup](./docs/adapters/slack.md)
- [Facebook Messenger setup](./docs/adapters/facebook.md)

## Development <a id="development"></a>

Please refer to the [CONTRIBUTING.md](./CONTRIBUTING.md) before starting any work.  Steps for running this script for development purposes:

### Configuration Setup

1. Create `config` folder in root of this project.
2. Create `env` in the `config` folder, with the following contents:
```
export HUBOT_AUDIT_ENDPOINT=<ElasticSearch endpoint>
export UUID=<container uuid>
export USAGE_CHART_DISABLED=<1 - to disable chart>
```
3. In order to view content in chat clients you will need to add `@ibm/hubot-ibmcloud-formatter` to your `external-scripts.json` file. Additionally, if you want to use `hubot-help` to make sure your command documentation is correct. Create `external-scripts.json` in the root of this project with the following contents:
```
[
	"hubot-help",
	"@ibm/hubot-ibmcloud-formatter"
]
```
4. Lastly, run `npm install` to obtain all the dependent node modules.

### Running Hubot with Adapters

Hubot supports a variety of adapters to connect to popular chat clients.

If you just want to use:
 - Terminal: run `npm run start`
 - [Slack: link to setup instructions](./docs/adapters/slack.md)
 - [Facebook Messenger: link to setup instructions](./docs/adapters/facebook.md)

## License <a id="license"></a>

See [LICENSE.txt](./LICENSE.txt) for license information.

## Contribute <a id="contribute"></a>

Please check out our [Contribution Guidelines](./CONTRIBUTING.md) for detailed information on how you can lend a hand.
