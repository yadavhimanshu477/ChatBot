'use strict';

// Messenger API integration example
// We assume you have:
// * a Wit.ai bot setup (https://wit.ai/docs/quickstart)
// * a Messenger Platform setup (https://developers.facebook.com/docs/messenger-platform/quickstart)
// You need to `npm install` the following dependencies: body-parser, express, request.
//
// 1. npm install body-parser express request
// 2. Download and install ngrok from https://ngrok.com/download
// 3. ./ngrok http 8445
// 4. WIT_TOKEN=your_access_token FB_APP_SECRET=your_app_secret FB_PAGE_TOKEN=your_page_token node examples/messenger.js
// 5. Subscribe your page to the Webhooks using verify_token and `https://<your_ngrok_io>/webhook` as callback URL.
// 6. Talk to your bot on Messenger!

const bodyParser = require('body-parser');
const crypto = require('crypto');
const express = require('express');
const fetch = require('node-fetch');
const request = require('request');
const sha256 = require('sha256');
const execPhp = require('exec-php');
const zaloMessegeFunction = require('./zaloMessegeFunction');

var MongoClient = require('mongodb').MongoClient;
global.MongoClient = MongoClient;

var db = require('./db');

let Wit = null;
let log = null;
try {
    // if running from repo
    Wit = require('../').Wit;
    log = require('../').log;
} catch (e) {
    Wit = require('node-wit').Wit;
    log = require('node-wit').log;
}

// Webserver parameter
const PORT = process.env.PORT || 8445;

// Wit.ai parameters
const WIT_TOKEN = process.env.WIT_TOKEN;

// Messenger API parameters
const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN;
if (!FB_PAGE_TOKEN) { 
    throw new Error('missing FB_PAGE_TOKEN') 
}
const FB_APP_SECRET = process.env.FB_APP_SECRET;
if (!FB_APP_SECRET) { 
    throw new Error('missing FB_APP_SECRET') 
}

let FB_VERIFY_TOKEN = null;
crypto.randomBytes(8, (err, buff) => {
    if (err) throw err;
    FB_VERIFY_TOKEN = buff.toString('hex');
    console.log(`/webhook will accept the Verify Token "${FB_VERIFY_TOKEN}"`);
});

// ----------------------------------------------------------------------------
// Messenger API specific code

// See the Send API reference
// https://developers.facebook.com/docs/messenger-platform/send-api-reference

const fbMessage = (id, text) => {
    const body = JSON.stringify({
        recipient: { id },
        message: { text },
    });
    const qs = 'access_token=' + encodeURIComponent(FB_PAGE_TOKEN);
    return fetch('https://graph.facebook.com/me/messages?' + qs, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body,
    })
    .then(rsp => rsp.json())
    .then(json => {
        if (json.error && json.error.message) {
            throw new Error(json.error.message);
        }
        return json;
    });
};

// ----------------------------------------------------------------------------
// Wit.ai bot specific code

// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState}
const sessions = {};

const findOrCreateSession = (fbid) => {
    let sessionId;
    // Let's see if we already have a session for the user fbid
    Object.keys(sessions).forEach(k => {
        if (sessions[k].fbid === fbid) {
            // Yep, got it!
            sessionId = k;
        }
    });
    if (!sessionId) {
        // No session found for user fbid, let's create a new one
        sessionId = new Date().toISOString();
        sessions[sessionId] = {fbid: fbid, context: {}};
    }
    return sessionId;
};

// Our bot actions
const actions = {
    send({sessionId}, {text}) {
        // Our bot has something to say!
        // Let's retrieve the Facebook user whose session belongs to
        const recipientId = sessions[sessionId].fbid;
        if (recipientId) {
            // Yay, we found our recipient!
            // Let's forward our bot response to her.
            // We return a promise to let our bot know when we're done sending
            return fbMessage(recipientId, text)
            .then(() => null)
            .catch((err) => {
                console.error(
                    'Oops! An error occurred while forwarding the response to',
                    recipientId,
                    ':',
                    err.stack || err
                );
            });
        } else {
            console.error('Oops! Couldn\'t find user for session:', sessionId);
            // Giving the wheel back to our bot
            return Promise.resolve()
        }
    },
    // You should implement your custom actions here
    // See https://wit.ai/docs/quickstart
};

// Setting up our bot
const wit = new Wit({
    accessToken: WIT_TOKEN,
    actions,
    logger: new log.Logger(log.INFO)
});

// Starting our webserver and putting it all together
const app = express();
app.use(({method, url}, rsp, next) => {
    rsp.on('finish', () => {
        console.log(`${rsp.statusCode} ${method} ${url}`);
    });
    next();
});
app.use(bodyParser.json({ 
    verify: verifyRequestSignature 
}));


app.get('/', (req, res) => {
    res.send("https server started successfully....")
    // for test purpose

    db.getConnection(function (db) {
        console.log("connected db root page : ")
        db.collection('log', function(err, collection) {
            collection.find().toArray(function(err, resulte) {

                resulte.forEach(function (resulte,iop){

                    var oaid = '1032900368143269705';
                    var fromuid = resulte.fromuid;
                    //var phone = resulte.phone;
                    var msgid = resulte.msgid;
                    var timestamp = new Date().getTime();
                    var secretkey = 'IEklE4N1I7bWqp5TOQ2F';

                    execPhp('messenger.php', (error, php, outprint) => { 
                        php.my_function_zalo(oaid, msgid, timestamp, secretkey, (err, results, output, printed) => {
                            var options = { method: 'GET',
                                url: 'https://openapi.zaloapp.com/oa/v1/getmessagestatus',
                                qs: { 
                                    oaid: oaid,
                                    msgid: msgid,
                                    timestamp: timestamp,
                                    mac: results
                                },
                                headers: { 
                                    'cache-control': 'no-cache' 
                                } 
                            };

                            request(options, function (error, response, body) {
                                if (error) throw new Error(error);
                                console.log(body);
                                console.log("connected db from log page : ")
                                if(body.data) {
                                    var insert_data = { fromuid : fromuid, time : timestamp, delivery_status : body.data.status, msgid : msgid }
                                    db.collection('delivery_status').insert({ phone:phone, msgid:msgid }, insert_data, { upsert : true });
                                }
                            
                            });
                        });
                    });
                })
            })
        })
    });
});


app.get('/zalo', (req, res) => {
    console.log("inside zalo app")

    db.getConnection(function (db) {
        console.log("connected db from zalo contact page : ")

        db.collection('zalo_contacts', function(err, collection) {
            collection.find().toArray(function(err, resulte) {

                resulte.forEach(function (resulte,iop){

                    var result = resulte;   
                    var name = result.name;
                    var phone = result.phone;
                    var oaid = '1032900368143269705';
                    var company = result.company;
                    var number = result.number;
                    var date = result.date;
                    var templateid = result.templateid;
                    var timestamp = new Date().getTime();
                    var secretkey = 'IEklE4N1I7bWqp5TOQ2F';
                    var data = '{"phone":'+phone+',"templateid":"'+templateid+'","templatedata":{"name":"'+name+'","company":"'+company+'","number":"'+number+'","date":"'+date+'"}}';

                    execPhp('messenger.php', (error, php, outprint) => { 

                        php.my_function_zalo(oaid, data, timestamp, secretkey, (err, results, output, printed) => {
                       
                            var options = { method: 'POST',
                                url: 'https://openapi.zaloapp.com/oa/v1/sendmessage/phone/cs',
                                qs: { 
                                    oaid: oaid,
                                    data: data,
                                    timestamp: timestamp,
                                    mac: results
                                },
                                headers: { 
                                    'cache-control': 'no-cache' 
                                } 
                            };

                            request(options, function (error, response, body) {
                                if (error) throw new Error(error);
                                console.log(body);
                                db.getConnection(function (db) {
                                    console.log("connected db from log page : ")
                                    var insert_data = { phone : phone, broad_msg : templateid, time : timestamp, delivery_status : body.errorMsg, msgid : body.data.msgId }
                                    db.collection('log').insert(insert_data);
                                });
                            });
                        });
                    });
                });
            });
        });

    });
});

// Webhook setup
app.get('/webhook', (req, res) => {

    if(typeof req.query.fromuid != 'undefined') {

        console.log(req.query);
        const sender = ''+req.query.fromuid;
        const sessionId = findOrCreateSession(sender);
        const oaid = '1032900368143269705';
        const text = req.query.message;
        const secretkey = 'IEklE4N1I7bWqp5TOQ2F'
        const timestamp = new Date().getTime()

        wit.runActionsZalo(
            sessionId, // the user's current session
            text, // the user's message
            sessions[sessionId].context // the user's current session state
        ).then((context) => {

            console.log("cntext :::::::")
            console.log(context)

            console.log("context.msg :::: "+context.msg)
            console.log(context.msg)

            // Our bot did everything it has to do.
            // Now it's waiting for further messages to proceed.

            if(context.type == 'action') {
                zaloMessegeFunction.getDueDate(sender, function (msg) {
                    console.log("msg is the ::::::: ")
                    console.log(msg)

                    execPhp('messenger.php', (error, php, outprint) => {

                        php.my_function(oaid, sender, msg, timestamp, secretkey, (err, result, output, printed) => {

                            var options = { method: 'POST',
                                url: 'https://openapi.zaloapp.com/oa/v1/sendmessage/text',
                                qs: { 
                                    oaid: oaid,
                                    timestamp: timestamp,
                                    mac: result,
                                    data: '{"uid":'+sender+',"message":"'+msg+'"}' 
                                },
                                headers: {
                                    'cache-control': 'no-cache' 
                                } 
                            };

                            request(options, (error, response, body) => {
                                if (error) throw new Error(error);
                                console.log(body);
                                body = JSON.parse(body)
                                console.log("body.errorMsg is ::: "+body.errorMsg)
                                db.getConnection(function (db) {
                                    console.log("connected db from log page : ")
                                    var insert_data = { fromuid : sender, user_messege : text, bot_reply : msg, time : timestamp, delivery_status : body.errorMsg, msgid : body.data.msgId }
                                    db.collection('log').insert(insert_data);
                                });
                            });

                            console.log('Waiting for next user messages');

                            // Based on the session state, you might want to reset the session.
                            // This depends heavily on the business logic of your bot.
                            // Example:
                            // if (context['done']) {
                              delete sessions[sessionId];
                            // }

                            // Updating the user's current session state
                            //sessions[sessionId].context = context;
                        });
                    });
                })
            }
            else {
                execPhp('messenger.php', (error, php, outprint) => {

                    php.my_function(oaid, sender, context.msg, timestamp, secretkey, (err, result, output, printed) => {

                        var options = { method: 'POST',
                            url: 'https://openapi.zaloapp.com/oa/v1/sendmessage/text',
                            qs: { 
                                oaid: oaid,
                                timestamp: timestamp,
                                mac: result,
                                data: '{"uid":'+sender+',"message":"'+context.msg+'"}' 
                            },
                            headers: {
                                'cache-control': 'no-cache' 
                            } 
                        };

                        request(options, (error, response, body) => {
                            if (error) throw new Error(error);
                            console.log(body);
                            body = JSON.parse(body)
                            console.log("body.errorMsg is ::: "+body.errorMsg)
                            db.getConnection(function (db) {
                                console.log("connected db from log page : ")
                                var insert_data = { fromuid : sender, user_messege : text, bot_reply : context.msg, time : timestamp, delivery_status : body.errorMsg, msgid : body.data.msgId }
                                db.collection('log').insert(insert_data);
                            });
                        });

                        console.log('Waiting for next user messages');

                        // Based on the session state, you might want to reset the session.
                        // This depends heavily on the business logic of your bot.
                        // Example:
                        // if (context['done']) {
                          delete sessions[sessionId];
                        // }

                        // Updating the user's current session state
                        //sessions[sessionId].context = context;
                    });
                });
            }
        })
        .catch((err) => {
            console.error('Oops! Got an error from Wit: ', err.stack || err);
        });
    }

    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === FB_VERIFY_TOKEN) {
        res.send(req.query['hub.challenge']);
    } else {
        res.sendStatus(400);
    }

});

// Message handler
app.post('/webhook', (req, res) => {
    // Parse the Messenger payload
    // See the Webhook reference
    // https://developers.facebook.com/docs/messenger-platform/webhook-reference
    console.log("comming")

    console.log(req.query)
    console.log(req.body)
    const data = req.body;

    if (data.object === 'page') {
        data.entry.forEach(entry => {
            entry.messaging.forEach(event => {
                if (event.message && !event.message.is_echo) {
                    // Yay! We got a new message!
                    // We retrieve the Facebook user ID of the sender
                    const sender = event.sender.id;

                    // We retrieve the user's current session, or create one if it doesn't exist
                    // This is needed for our bot to figure out the conversation history
                    const sessionId = findOrCreateSession(sender);

                    // We retrieve the message content
                    const {text, attachments} = event.message;

                    if (attachments) {
                        // We received an attachment
                        // Let's reply with an automatic message
                        fbMessage(sender, 'Sorry I can only process text messages for now.')
                        .catch(console.error);
                    } else if (text) {
                        // We received a text message

                        // Let's forward the message to the Wit.ai Bot Engine
                        // This will run all actions until our bot has nothing left to do
                        wit.runActions(
                            sessionId, // the user's current session
                            text, // the user's message
                            sessions[sessionId].context // the user's current session state
                        ).then((context) => {
                            // Our bot did everything it has to do.
                            // Now it's waiting for further messages to proceed.
                            console.log('Waiting for next user messages');

                            // Based on the session state, you might want to reset the session.
                            // This depends heavily on the business logic of your bot.
                            // Example:
                            // if (context['done']) {
                            //   delete sessions[sessionId];
                            // }

                            // Updating the user's current session state
                            sessions[sessionId].context = context;
                        })
                        .catch((err) => {
                            console.error('Oops! Got an error from Wit: ', err.stack || err);
                        })
                    }
                } else {
                    console.log('received event', JSON.stringify(event));
                }
            });
        });
    }
    res.sendStatus(200);
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */

function verifyRequestSignature(req, res, buf) {
    var signature = req.headers["x-hub-signature"];

    if (!signature) {
        // For testing, let's log an error. In production, you should throw an
        // error.
        console.error("Couldn't validate the signature.");
    } else {
        var elements = signature.split('=');
        var method = elements[0];
        var signatureHash = elements[1];

        var expectedHash = crypto.createHmac('sha1', FB_APP_SECRET)
                        .update(buf)
                        .digest('hex');

        if (signatureHash != expectedHash) {
            throw new Error("Couldn't validate the request signature.");
        }
    }
}

var fs = require('fs');
var https = require('https');
var options = {
    key: fs.readFileSync('/var/www/botshezar.com/botshezar.com.key'),
    cert: fs.readFileSync('/var/www/botshezar.com/219c087d9f98a683.crt')
};

var httpsServer = https.createServer(options, app);
httpsServer.listen(PORT);

console.log('Listening on :' + PORT + '...');
