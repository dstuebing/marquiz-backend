const { MongoClient, ObjectID } = require("mongodb");
const dbConnectionString = process.env.MONGODB_URI
// There is only one gameState document. It has this id.
const gameStateId = "6074963f3e99bec11178ad26";

async function getQuestionById(questionsId) {
	const client = new MongoClient(dbConnectionString, { useUnifiedTopology: true });

	try {
		await client.connect();
		const database = client.db("MarQuiz-DB");

		const questionsCollection = database.collection("questions");
		const question = await questionsCollection.findOne({ "_id": ObjectID(questionsId) });
		return question;
	} catch (err) {
		console.log(err);
		return null;
	} finally {
		await client.close();
	}
}

async function getGameState() {
	const client = new MongoClient(dbConnectionString, { useUnifiedTopology: true });

	try {
		await client.connect();
		const database = client.db("MarQuiz-DB");

		const stateCollection = database.collection("state");
		const state = await stateCollection.findOne({ "_id": ObjectID(gameStateId) });
		return state;
	} catch (err) {
		console.log(err);
		return null;
	} finally {
		await client.close();
	}
}

async function getConnectedUsers() {
	const client = new MongoClient(dbConnectionString, { useUnifiedTopology: true });

	try {
		await client.connect();
		const database = client.db("MarQuiz-DB");

		const usersCollection = database.collection("users");
		const connectedUsers = await usersCollection.find({ "connected": true }).toArray();
		return connectedUsers;
	} catch (err) {
		console.log(err);
		return null;
	} finally {
		await client.close();
	}
}

async function getAllUsers() {
	const client = new MongoClient(dbConnectionString, { useUnifiedTopology: true });

	try {
		await client.connect();
		const database = client.db("MarQuiz-DB");

		const usersCollection = database.collection("users");
		const users = await usersCollection.find({}).toArray();
		return users;
	} catch (err) {
		console.log(err);
		return null;
	} finally {
		await client.close();
	}
}

async function setAllUsersDisconnected() {
	const client = new MongoClient(dbConnectionString, { useUnifiedTopology: true });

	try {
		await client.connect();
		const database = client.db("MarQuiz-DB");

		const usersCollection = database.collection("users");

		// this option instructs the method to NOT create a document if no documents match the filter
		const options = { upsert: false };
		// how the document should be updated
		const updateDoc = {
			$set: {
				connected: false,
				socketId: ""
			},
		};

		await usersCollection.updateMany({}, updateDoc, options);
	} catch (err) {
		console.log(err);
	} finally {
		await client.close();
	}
}

async function setUserDisconnected(socketId) {
	const client = new MongoClient(dbConnectionString, { useUnifiedTopology: true });

	try {
		await client.connect();
		const database = client.db("MarQuiz-DB");

		const usersCollection = database.collection("users");

		// create a filter for document to update
		const filter = { "socketId": socketId };
		// this option instructs the method to NOT create a document if no documents match the filter
		const options = { upsert: false };
		// how the document should be updated
		const updateDoc = {
			$set: {
				connected: false,
				socketId: ""
			},
		};

		await usersCollection.updateOne(filter, updateDoc, options);
	} catch (err) {
		console.log(err);
	} finally {
		await client.close();
	}
}

async function setUserConnected(userName, newSocketId) {
	const client = new MongoClient(dbConnectionString, { useUnifiedTopology: true });

	try {
		await client.connect();
		const database = client.db("MarQuiz-DB");

		const usersCollection = database.collection("users");

		// create a filter for document to update
		const filter = { "name": userName };
		// this option instructs the method to NOT create a document if no documents match the filter
		const options = { upsert: false };
		// how the document should be updated
		const updateDoc = {
			$set: {
				connected: true,
				socketId: newSocketId
			},
		};

		await usersCollection.updateOne(filter, updateDoc, options);
	} catch (err) {
		console.log(err);
	} finally {
		await client.close();
	}
}

async function createNewUser(name, socketId) {
	const client = new MongoClient(dbConnectionString, { useUnifiedTopology: true });

	try {
		await client.connect();
		const database = client.db("MarQuiz-DB");

		const usersCollection = database.collection("users");
		const newDocument = {
			name: name,
			points: 0,
			socketId: socketId,
			connected: true
		}
		await usersCollection.insertOne(newDocument);
	} catch (err) {
		console.log(err);
	} finally {
		await client.close();
	}
}

async function updateUserPoints(userName, newPointsCount) {
	const client = new MongoClient(dbConnectionString, { useUnifiedTopology: true });

	try {
		await client.connect();
		const database = client.db("MarQuiz-DB");

		const usersCollection = database.collection("users");

		// create a filter for document to update
		const filter = { "name": userName };
		// this option instructs the method to NOT create a document if no documents match the filter
		const options = { upsert: false };
		// how the document should be updated
		const updateDoc = {
			$set: {
				points: newPointsCount
			},
		};

		await usersCollection.updateOne(filter, updateDoc, options);
	} catch (err) {
		console.log(err);
	} finally {
		await client.close();
	}
}

async function updatePackName(id, newName) {
	const client = new MongoClient(dbConnectionString, { useUnifiedTopology: true });

	try {
		await client.connect();
		const database = client.db("MarQuiz-DB");

		const packsCollection = database.collection("packs");

		// create a filter for document to update
		const filter = { "_id": ObjectID(id) };
		// this option instructs the method to NOT create a document if no documents match the filter
		const options = { upsert: false };
		// how the document should be updated
		const updateDoc = {
			$set: {
				packName: newName
			},
		};

		await packsCollection.updateOne(filter, updateDoc, options);
	} catch (err) {
		console.log(err);
	} finally {
		await client.close();
	}
}

async function updateCategoryName(id, newName) {
	const client = new MongoClient(dbConnectionString, { useUnifiedTopology: true });

	try {
		await client.connect();
		const database = client.db("MarQuiz-DB");

		const categoriesCollection = database.collection("categories");

		// create a filter for document to update
		const filter = { "_id": ObjectID(id) };
		// this option instructs the method to NOT create a document if no documents match the filter
		const options = { upsert: false };
		// how the document should be updated
		const updateDoc = {
			$set: {
				categoryName: newName
			},
		};

		await categoriesCollection.updateOne(filter, updateDoc, options);
	} catch (err) {
		console.log(err);
	} finally {
		await client.close();
	}
}

async function updateQuestion(id, text, audio, image) {
	const client = new MongoClient(dbConnectionString, { useUnifiedTopology: true });

	try {
		await client.connect();
		const database = client.db("MarQuiz-DB");

		const questionsCollection = database.collection("questions");

		// create a filter for document to update
		const filter = { "_id": ObjectID(id) };
		// this option instructs the method to NOT create a document if no documents match the filter
		const options = { upsert: false };
		// how the document should be updated
		const questionUpdate = {};
		if (text) {
			questionUpdate["text"] = text;
		}
		if (audio) {
			questionUpdate["audio"] = audio;
		}
		if (image) {
			questionUpdate["image"] = image;
		}
		const updateDoc = {
			$set: questionUpdate
		};

		await questionsCollection.updateOne(filter, updateDoc, options);
	} catch (err) {
		console.log(err);
	} finally {
		await client.close();
	}
}

// New buzzer state should be buzzed, locked, or open.
async function setBuzzerState(newBuzzerState) {
	const client = new MongoClient(dbConnectionString, { useUnifiedTopology: true });

	try {
		await client.connect();
		const database = client.db("MarQuiz-DB");

		const stateCollection = database.collection("state");

		// create a filter for document to update
		const filter = { "_id": ObjectID(gameStateId) };
		// this option instructs the method to NOT create a document if no documents match the filter
		const options = { upsert: false };
		// how the document should be updated
		const updateDoc = {
			$set: {
				buzzer:
					newBuzzerState,
			},
		};

		await stateCollection.updateOne(filter, updateDoc, options);
	} catch (err) {
		console.log(err);
	} finally {
		await client.close();
	}
}

module.exports = {
	getQuestionById,
	getGameState,
	getConnectedUsers,
	getAllUsers,
	setUserDisconnected,
	setAllUsersDisconnected,
	setUserConnected,
	createNewUser,
	updateUserPoints,
	updatePackName,
	updateCategoryName,
	updateQuestion,
	setBuzzerState
}