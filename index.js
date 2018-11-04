/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 Run your bot from the command line:

 clientId=<my client id> clientSecret=<my client secret> PORT=3000 node bot.js

 Note: you can test your oauth authentication locally, but to use Slash commands
 in Slack, the app must be hosted at a publicly reachable IP or host.

 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

/* Uses the slack button feature to offer a real time bot to multiple teams */
var Botkit = require('botkit');

/* Uses MomentJS for time/date manipulation */
var moment = require('moment');
moment().format();

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.PORT || !process.env.VERIFICATION_TOKEN) {
    console.log('Error: Specify CLIENT_ID, CLIENT_SECRET, VERIFICATION_TOKEN and PORT in environment');
    process.exit(1);
}

var config = {}
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}),
    };
} else {
    config = {
        json_file_store: './db_slackbutton_slash_command/',
    };
}

var controller = Botkit.slackbot(config).configureSlackApp(
    {
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        scopes: ['commands'],
    }
);

controller.setupWebserver(process.env.PORT, function (err, webserver) {
    controller.createWebhookEndpoints(controller.webserver);

    controller.createOauthEndpoints(controller.webserver, function (err, req, res) {
        if (err) {
            res.status(500).send('ERROR: ' + err);
        } else {
            res.send('Success!');
        }
    });
});


//Slash Commands
let timeTracker = {};

controller.on('slash_command', function (slashCommand, message) {
    switch (message.command) {
        case "/slacktracker": 
            //handle the `/echo` slash command. We might have others assigned to this app in the future!
            // The rules are simple: If there is no text following the command, treat it as though they had requested "help"

            // but first, let's make sure the token matches! validation baby!
            if (message.token !== process.env.VERIFICATION_TOKEN) return; //just ignore it.

            // if no text was supplied, treat it as a help command
            if (message.text === "" || message.text === "help") {
                slashCommand.replyPrivate(message,
                    "I can track your Slack usage." +
                    "Type `/slacktracker start` to start the timer." +
                    "Type `/slacktracker stop` to stop the timer & see your usage time.");
                return;
            }

            //store user_id
            const user_id = message.user_id

            // if text === start, record start time for the user
            if (message.text === "start") {
                //store user start time
                timeTracker[user_id] = moment();

                slashCommand.replyPrivate(message,
                    "Timer started.");
                return;
            }

            // if text === stop, reset start time and calc time spent
            if (message.text === "stop") {
                //first check that a timer has started
                if (!timeTracker[user_id]) {
                    slashCommand.replyPrivate(message,
                        "A timer has not been started yet. Type `/slacktracker start`."); 
                }

                //calc time spent
                const usage = moment.duration(moment().diff(start));
                const hours = usage.get('hours');
                const mins = usage.get('minutes');
                
                //reset start time
                timeTracker[user_id] = null;

                //report usage to user
                slashCommand.replyPrivate(message,
                    `You've been Slack'n for ${hours} hours and ${mins} minutes.`);
                return;
            }

            break;
        default:
            slashCommand.replyPublic(message, "I'm afraid I don't know how to " + message.command + " yet.");
    }

})
;

