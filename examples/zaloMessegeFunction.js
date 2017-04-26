var db = require('./db');

module.exports = {
	getDueDate :function (uid, callback) {
		db.getConnection (function (db) {
        	console.log("connected db from zalomessageFunction page : ")

        	db.collection('zalo_contacts', function(err, collection) {
            	collection.find({"uid":uid}).toArray(function(err, resulte) {
            		resulte.forEach(function (resulte,iop){
            			var string_result = "Your Due Date is "+resulte.date;
            			console.log(resulte);
            			callback(string_result);
            		});
            	});
            });
        });
	},
}