const { MongoClient, ObjectID } = require("mongodb");
const dbConnectionString = "mongodb+srv://RWUser:8YSSSCTEO4Apnfsm@cluster0.p9g9p.mongodb.net/MarQuiz-DB?retryWrites=true&w=majority"
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
	setUserConnected,
	createNewUser,
	setBuzzerState
}