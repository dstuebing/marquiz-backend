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

module.exports = {
	getQuestionById,
	getGameState,
	getConnectedUsers
}