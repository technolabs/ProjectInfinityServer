var admin = require("firebase-admin"),
    request = require("request"),
    UserModel = require("./models/UserModel"),
    serviceAccount = require("./serviceAccountKey.json");
var CONSTANT = require("./util/Constant");

var FIREBASE = {
    init: function() {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: CONSTANT.DATABASE_URL
        });
    },
    verifyIdToken: function(idToken, cb) {
        if (!idToken || idToken == "") {
            cb({ "status": false, 'message': "Token Not Found" });
            return;
        }
        admin.auth().verifyIdToken(idToken).then(function(decodedToken) {
            //console.log(decodedToken);
            FIREBASE.getByUidFromLocal({}, function(rs) {
                // console.log(rs.result);
                if (rs.status) {
                    decodedToken["__id"] = rs.result._id;
                    decodedToken["currentLocation"] = rs.result.currentLocation;
                }
                cb({ "status": true, 'result': decodedToken });
            }, decodedToken.uid, decodedToken.email);
        }).catch(function(error) {
            cb({ "status": false, 'result': error });
        });
    },
    sendNotification: function(msgBody, cb) {
        request({
            url: "http://fcm.googleapis.com/fcm/send",
            method: "POST",
            json: true,
            headers: {
                "authorization": "",
                "content-type": "application/json",
            },
            body: msgBody
        }, function(error, response, body) {
            cb(body);
        });
    },
    sendPushNotification: function(tokens, payload, cb) {
        admin.messaging().sendToDevice(tokens, payload).then(function(response) {
            cb({ status: true, result: response });
        }).catch(function(error) {
            cb({ status: false, result: error });
        });
    },
    getByUidFromLocal: function(req, cb, uid, email) {
        if (req.error) {
            res.status(403).json(req.error);
            return;
        }
        if (!uid) {
            uid = req["me"].uid;
        }
        var dd = { "uid": uid };
        if (email) {
            var t = [];
            t.push(dd);
            var regex = new RegExp(["^", email, "$"].join(""), "i");
            t.push({ "email": regex });
            dd = { "$or": t };
        }
        UserModel.findOne(dd, function(err, result) {
            if (err || !result) {
                cb({ status: false, result: err });
            } else {
                cb({ status: true, result: result });
            }
        });
    },
    getByUidFromFirebase: function(uid, cb) {
        admin.auth().getUser(uid).then(function(record) {
            cb({ status: true, result: record });
        }).catch(function(error) {
            cb({ status: false, result: error });
        });
    },
    createNewUser:function(d, cb) {
        admin.auth().createUser({
            email: d.email,
            emailVerified: false,
            password: d.password,
            displayName: d.displayName,
            photoURL: d.photoURL,
            disabled: false
        }).then(function(userRecord) {
            cb({ status: true, result: userRecord.providerData });
        }).catch(function(error) {
            cb({ status: false, result: error });
        });
    },
    updateUser:function(user,cb){
        admin.auth().updateUser(user.uid, {
          photoURL: user.photoURL
        }).then(function(userRecord) {
           cb(true,userRecord.toJSON())
        }).catch(function(error) {
           cb(false,error)
        });
    }
};

FIREBASE.init();

module.exports = FIREBASE;
