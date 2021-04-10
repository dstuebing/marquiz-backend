let app = require('express')();
var cors = require('cors')
const { MongoClient, ObjectID } = require("mongodb");
let http = require('http').Server(app);
// CORS is required
// https://socket.io/docs/v3/handling-cors/
let io = require('socket.io')(http, {
	cors: {
		methods: ["GET", "POST"]
	}
});
var User = require('./User');

const dbConnectionString = "mongodb+srv://RWUser:8YSSSCTEO4Apnfsm@cluster0.p9g9p.mongodb.net/MarQuiz-DB?retryWrites=true&w=majority"

const buzzer = {
	BUZZED: "buzzed",
	LOCKED: "locked",
	OPEN: "open",
}
app.use(cors());

// TODO Endpoint only for testing, can be removed later
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html')
});

// Endpoint for getting all quiz data.
app.get('/quizes', async (req, res) => {
	const client = new MongoClient(dbConnectionString, { useUnifiedTopology: true });

	try {
		await client.connect();
		const database = client.db("MarQuiz-DB");

		const collection = database.collection("quizPacks");
		const returnData = await collection.find({}).toArray();
		res.status(200).send({ returnData });
	} catch (err) {
		console.log(err);
		res.sendStatus(400);
	} finally {
		await client.close();
	}
});

// Deletes the question identified by the given id. So far, does not delete the reference
// in the category that the question belongs to.
app.delete('/questions/:id', async (req, res) => {
	const questionId = req.params.id;
	const client = new MongoClient(dbConnectionString, { useUnifiedTopology: true });

	try {
		await client.connect();
		const database = client.db("MarQuiz-DB");

		const questionsCollection = database.collection("questions");
		await questionsCollection.deleteOne({ "_id": ObjectID(questionId) });
		res.sendStatus(200);
	} catch (err) {
		console.log(err);
		res.sendStatus(400);
	} finally {
		await client.close();
	}
});

// For deployment in Heroku
// see https://help.heroku.com/P1AVPANS/why-is-my-node-js-app-crashing-with-an-r10-error
const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
	console.log('Listening on port *: ', PORT);
});

// TODO Transfer this data to DB 
let users = [];
let buzzerState = buzzer.OPEN;

io.on('connection', (socket) => {

	// The event that a user leaves. The user may rejoin with a new socket id.
	socket.on('disconnect', () => {
		const userBySocketId = users.find(user => user.socketId === socket.id);
		if (userBySocketId) {
			// remove from user array
			users = users.filter(user => user.socketId !== socket.id)

			console.log("User disconnected: ", userBySocketId.name)

			userBySocketId.connected = false;

			// emitting the same event to everyone
			const nameOfDisconnectedUser = userBySocketId.name;
			io.emit('disconnected', nameOfDisconnectedUser);
		}
	});


	// The event that a user joins. Covered cases: a new user joins, an existing user rejoins, 
	// a user tries to join with an already present name. 
	socket.on('connected', (name) => {

		// Replay connected and pointsChanged events for each already connected user to sender only
		users.forEach((user) => {
			socket.emit("connected", user.name);
			socket.emit("pointsChanged", user.points)
		})

		console.log("User connected: ", name)
		const existingUserWithSameName = users.find(user => user.name === name);
		if (existingUserWithSameName) {

			if (existingUserWithSameName.connected) {
				// another user tries to join with the same name as a connected user
				// TODO emit event that tells the sender to enter a different name

			} else {
				// a user joins with the name of a disconnected user (i.e. he is rejoining)
				existingUserWithSameName.connected = true;
				// rejoining changed the socket id
				existingUserWithSameName.socketId = socket.id;
				// emitting the same event to everyone
				io.emit('connected', name);
			}

		} else {
			// not existing user with this name must be created and added
			const user = new User(socket.id, name);
			users.push(user);
			// emitting the same event to everyone
			io.emit('connected', name);
		}
	});


	// The event that a user presses the buzzer. Action only required if buzzer was open.
	socket.on('buzz', () => {
		if (buzzerState === buzzer.OPEN) {
			buzzerState = buzzer.BUZZED;

			// emitting the same event to everyone
			const buzzingUserBySocketId = users.find(user => user.socketId === socket.id);
			const nameOfBuzzingUser = buzzingUserBySocketId.name;
			io.emit('buzz', nameOfBuzzingUser);
		}
	});


	// The event that the buzzer is locked. 
	socket.on('buzzLock', () => {
		buzzerState = buzzer.LOCKED;
		io.emit('buzzLock');
	});


	// The event that the buzzer is set to open. Can be used to unlock the 
	// locked buzzer or to reset the buzzer after buzzing.
	socket.on('buzzOpen', () => {
		buzzerState = buzzer.OPEN;
		io.emit('buzzOpen');
	});


	// The event that the points were changed for a user.
	// Parameters are the name of the user whose points should be 
	// changed and the new amount of points.
	socket.on('pointsChanged', (name, newPoints) => {
		const userByName = users.find(user => user.name === name);
		userByName.points = newPoints;
		io.emit('pointsChanged', name, newPoints);
	});

});