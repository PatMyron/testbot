var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.listen((process.env.PORT || 3000));

// Server frontpage
app.get('/', function (req, res) {
    res.send('This is TestBot Server');
});

// Facebook Webhook
app.get('/webhook', function (req, res) {
    if (req.query['hub.verify_token'] === 'EAAWWpxUBMGoBAI5pY8qaqKnqdm4gM1dx5eBJATX5qM7srP74zWsGPzW3PMAsVEFCQxiw0BuMRyeR4rHCINkZAx2jskAWHGn70Hsi9qyjATrGsQnsCzGXFtJgt8fbxZCvZCMoxioZC12MvJr3tZBIAgCTDu3aYZCIEtdXD2dNpVNQZDZD') {
        res.send(req.query['hub.challenge']);
    } else {
        res.send('Invalid verify token');
    }
});

// handler receiving messages
app.post('/webhook', function (req, res) {
    var events = req.body.entry[0].messaging;
    for (var i = 0; i < events.length; i++) {
        var event = events[i];
        if (event.message && event.message.attachments && event.message.attachments[0] && event.message.attachments[0].payload && event.message.attachments[0].payload.coordinates) {
            var urlBase = "http://api.wunderground.com/api/57fd25cc02e9da86/conditions/forecast/alert/q/";
            var lat = event.message.attachments[0].payload.coordinates.lat;
            var lon = event.message.attachments[0].payload.coordinates.long;
            var totUrl = urlBase + String(lat) + "," + String(lon) + ".json";

            request({
                url: totUrl,
                json: true
            }, function (error, response, body) {

                if (!error && response.statusCode === 200) {
                    var rain = body.current_observation.precip_1hr_metric;
                    if (rain > 0) {
                        sendMessage(event.sender.id, {text: "It's gonna rain. Grab an umbrella!"});
                    } else {
                        sendMessage(event.sender.id, {text: "No rain ahead!"});
                    }
                } else {
                    sendMessage(event.sender.id, {text: "Sorry. Weather server error..."});
                    console.log('weather error: ', error);
                }
            })
        } else {
            sendMessage(event.sender.id, {text: "Hi. Send your location"});
        }
        events = []
    }
    req.body.entry[0].messaging = [];
    res.sendStatus(200);
});

// generic function sending messages
function sendMessage(recipientId, message) {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: recipientId},
            message: message
        }
    }, function (error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
}
