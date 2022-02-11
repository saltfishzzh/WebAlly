var WebSocket = require('ws');
var fs = require('fs');
var url = require('url');
var https = require('https');
var express = require('express');
var path = require('path');
var nodemailer = require('nodemailer');
const { Client } = require('pg');
const app = express();

// const { Pool } = require('pg')
// const pool = new Pool()
// pool.connect((err, client, release) => {
//   if (err) {
//     return console.error('Error acquiring client', err.stack)
//   }
//   client.query('SELECT NOW()', (err, result) => {
//     release()
//     if (err) {
//       return console.error('Error executing query', err.stack)
//     }
//     console.log(result.rows)
//   })
// })

// Certificate
// const privateKey = fs.readFileSync('/etc/letsencrypt/live/www.cooperativetool.us/privkey.pem', 'utf8');
// const certificate = fs.readFileSync('/etc/letsencrypt/live/www.cooperativetool.us/cert.pem', 'utf8');
// const ca = fs.readFileSync('/etc/letsencrypt/live/www.cooperativetool.us/chain.pem', 'utf8');

// const credentials = {
//         key: privateKey,
//         cert: certificate,
//         ca: ca
// };

//pass in your credentials to create an https server
// const httpsServer = https.createServer(credentials, app);
// const httpsServer = https.createServer(app);
// httpsServer.listen(443, () => {
//     console.log('HTTPS Server running on port 443');
// });

// var WebSocketServer = WebSocket.Server;
// var wss = new WebSocketServer({
//     server: httpsServer
// });

// Set Up Postgresql Database and connect
// var config = { 
//     user: 'postgres',
//     host: 'localhost',
//     database: 'zhuohao',
//     password: '123456',
//     port: 5432,
// };
// var pool = new pg.Pool(config);

var configString = 'postgres​://postgres:postgres@localhost:5432/database';
const client = new Client({
    connectionString: configString
  });
  
client.connect();
async function run() {
    let createUsersTable = `
      create table if not exists users(
        email varchar,
        id serial PRIMARY KEY
      )`
    try {
      await client.query(createUsersTable);
    } catch (e) {
      console.error('problem creating users table', e);
      process.exit(1);
    }
  
    let insertNewUser = `insert into users values ($1) returning id`;
  
    try {
      let {rows} = await client.query(insertNewUser, [`${new Date()/1000}@gmail.com`]);
      console.log('created new user with id', rows[0].id);
    } catch (e) {
      console.error('problem inserting new user', e);
      process.exit(1);
    }
  
    let findAllUsers = `select * from users`;
  
    try {
      let {rows: users} = await client.query(findAllUsers);
      console.log(users);
    } catch (e) {
      console.error('problem finding all users', e);
      process.exit(1);
    }
    client.end();
  }
  
  
  run();

// Set Up Webpage Hosting
app.set("view engine", 'jade');　 
app.set('views', __dirname + '/views');
app.use(express.static(path.join(__dirname, 'public')));

// Create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'privacycooperativetool@gmail.com',
        pass: 'pct2020salt'
    },
    tls: {
        rejectUnauthorized: false
    }
  });

// SMS Service
const accountSid = 'SECRET_KEY';
const authToken = 'SECRET_KEY';
const twilioClient = require('twilio')(accountSid, authToken);

// Create WebSocket Instance
var WebSocketServer = WebSocket.Server,
wss = new WebSocketServer({ port: 8181 });
var uuid = require('node-uuid');
var clients = [];
var clientIndex = 1;

// Function to send WebSocket data
function wsSend(type, user, target, message, clientId) {
    for (var i = 0; i < clients.length; i++) {
        if (clients[i].id == clientId) {
            var clientSocket = clients[i].ws;
            try {
                clientSocket.send(JSON.stringify({
                    type: type,
                    user: user,
                    target: target,
                    message: message
                }));
            }
            catch (e) {
                console.log("Server send message to client failure, ", e);
            }
        }
    }
}

// Function to send email
function sendEmail(clientId, user, target, targetNumber, tileNumber, messageID) {
    console.log("Server send message to helper------------")
    let urlToSend = "https://www.cooperativetool.us/reCAPTCHA?user=" + user + "&target=" + target + "&id=" + messageID + "&tileNum=" + tileNumber + "&client=" + clientId;
    //let urlToSend = "localhost:3000/reCAPTCHA?user=" + userID + "&target=" + target + "&id=" + messageID;
    twilioClient.messages
    .create({
        body: 'Your friend Jane Doe (' + user + ') needs help with this simple task, click here to solve it for your friend:\n' + urlToSend,
        from: '+13603170909',
        to: targetNumber
    })
    .then(message => console.log("message.id", message.sid));

    var mailOptions = {
        from: 'privacycooperativetool@gmail.com',
        to: target,
        subject: 'Your friend needs help!',
        text: 'Your friend ' + user + ' needs help with this simple task, click here to solve it for your friend:\n' + urlToSend
    };
    try {
        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                console.log("error", error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
    }
    catch (e) {
        console.log("Send email fail");
    }
    console.log("requester: ", user);
    console.log("target: ", target, targetNumber);
    console.log("Message content (url): ", urlToSend);
    console.log("End of Server sending message to helper log-------------");
}

var realTimeUpdateImageCount = 0;
//var currentTaskStartTime;

// When a user is connecting...
wss.on('connection', function(ws) {
    var clientId = uuid.v4();
    var userName = "User" + clientIndex;
    clientIndex += 1;
    clients.push({
        id: clientId,
        "ws": ws,
        userName: userName
    });
    console.log('client [%s] connected-------------', clientId);
    ws.on('message', function(message) {
        //console.log("received:", message);
        decoded = JSON.parse(message);
        switch(decoded.type) {
            case "reCAPTCHA":
                console.log("reCAPTCHA new message from requester: ----------", decoded.user, decoded.userName, decoded.userStatus, decoded.target, decoded.timestamp, decoded.tileNumber);
                realTimeUpdateImageCount = 0;
                var userID = -1;
                var messageID = -1;
                //currentTaskStartTime = decoded.timestamp;
                console.log("before");
                // pool.connect().then(client=>{
                //     console.log("pool");
                    client.query('SELECT * FROM Users WHERE EMAIL = \'' + decoded.user + '\';').then(res=>{
                        client.release(); 
                        if (res.rows.length === 0) {
                            // Create a new user
                            console.log("create a new user");
                            pool.connect().then(client=>{
                                client.query('SELECT COUNT(*) FROM Users').then(res=> {
                                    client.release();
                                    userID = res.rows[0].count;
                                    console.log("create a new user", userID);
                                    let text = 'INSERT INTO Users VALUES($1, $2, $3, $4);'
                                    let values = [userID, decoded.userName, decoded.user, decoded.userStatus];
                                    pool.connect().then(client=>{
                                        client.query(text, values).then(res => {
                                            console.log(res.rows[0])
                                        })
                                        .catch(e => console.error(e.stack))
                                    })
                                })
                            })
                        }
                        else {
                            // User already created
                            userID = res.rows[0].id;
                            console.log("userID already created", userID);
                        }
                        pool.connect().then(client=>{
                            client.query('SELECT COUNT(*) FROM Messages').then(res=> {
                                client.release();
                                messageID = res.rows[0].count;
                                console.log("messageID", messageID);
                                let text = 'INSERT INTO Messages VALUES($1, $2, $3, $4, to_timestamp($5));';
                                let values = [messageID, decoded.user, decoded.target, 'reCAPTCHA', decoded.timestamp / 1000];
                                pool.connect().then(client=>{
                                    client.query(text, values).then(res => {
                                        console.log(res.rows[0])
                                    })
                                    .catch(e => console.error(e.stack))
                                })
                                console.log("userID", userID, "messageID", messageID);
                                sendEmail(clientId, decoded.user, decoded.target, decoded.targetNumber, decoded.tileNumber, messageID);
                                //console.log("decoded.message");
                                let base64img = decoded.message.replace(/^data:image\/png;base64,/, "");
                                if (!fs.existsSync("public/images")) {
                                    fs.mkdirSync("public/images");
                                }
                                fs.writeFile("public/images/" + decoded.user + "." + decoded.target + "." + messageID + ".png", base64img, 'base64', function(err) {
                                    console.log(err);
                                });
                            })
                        })
                    }).catch(e => {
                        client.release()
                        console.error('query error', e.message, e.stack)
                    })
                // }).then(()=>{
                //     console.log("Then userID", userID, "messageID", messageID);
                // });
                
                break;
            case "replyreCAPTCHA":
                // The helper's click. Send the click information to the user side
                console.log("replayreCAPTCHA, helper clicks and send to the requester", decoded.type, decoded.user, decoded.target, decoded.message, decoded.clientId);
                wsSend(decoded.type, decoded.user, decoded.target, decoded.message, decoded.clientId);
                break;
            case "realTimeUpdate":
                // When the user side is trying to update the image during solving CAPTCHA
                console.log("realTimeUpdate Server Side, update from requester", decoded.message.tileNum, decoded.message.x_num, decoded.message.y_num);
                let base64img = decoded.message.image.replace(/^data:image\/png;base64,/, "");
                if (!fs.existsSync("public/images")) {
                    fs.mkdirSync("public/images");
                }
                fs.writeFile("public/images/" + decoded.user + "." + decoded.target + "." + realTimeUpdateImageCount + ".realTimeUpdate.png", base64img, 'base64', function(err) {
                    console.log(err);
                });
                wsSend(decoded.type, decoded.user, decoded.target, {tileNum: decoded.message.tileNum, x_num:decoded.message.x_num, y_num:decoded.message.y_num, imageCount: realTimeUpdateImageCount}, decoded.helperClientId);
                realTimeUpdateImageCount = realTimeUpdateImageCount + 1;
                break;
            case "helperStarted":
                console.log("helperStarted", clientId, decoded.clientId);
                wsSend("helperStarted", "", "", clientId, decoded.clientId);
                break;
            case "success":
                console.log("success: ", decoded);
                wsSend(decoded.type, "", "", "", decoded.clientId);
                break;
            case "tryAgain":
                console.log("need to try again: ", decoded);
                wsSend(decoded.type, "", "", "", decoded.clientId);
                break;
            case "lalala":
                console.log("tileNum", decoded.tileNum);
        };
    });

});

app.get('/reCAPTCHA', function (req, res) {
    console.log("Helper opens the page server side log: -------------")
    let query = url.parse(req.url, true).query;
    console.log("Helper open page url query ", query);
    let user = query.user;
    let target = query.target;
    let id = query.id;
    let tileNumer = query.tileNum;
    let clientId = query.client;

    //wsSend("helperResponse", user, target, "", clientId);

    //console.log("clients", clients);
    let userName = '';
    pool.connect().then(client=>{
        client.query("SELECT name FROM Users WHERE EMAIL = \'" + user.toString() + "\';").then(queryRes=> {
            client.release();
            //console.log(queryRes);
            userName = queryRes.rows[0].name;
            pool.connect().then(client=>{
                client.query("SELECT time FROM messages WHERE id = " + id + ";").then(queryRes=>{
                    client.release();
                    var timestamp = queryRes.rows[0].time;
                    res.render('index.jade', {
                        user: user,
                        target: target,
                        id: id,
                        clientId: clientId,
                        userName: userName,
                        time: timestamp,
                        tileNumber: tileNumer,
                        type: "reCAPTCHA"
                    });
                })
            })
        })
    });
});
