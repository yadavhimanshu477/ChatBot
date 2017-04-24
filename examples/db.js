var MongoClient = require('mongodb').MongoClient

module.exports = {
	getConnection :function(callback) {
		MongoClient.connect('mongodb://localhost:27017/Test_shztch', function (err, db) {
			if (err) throw err
			callback(db)
		})
	},
}