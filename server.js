let app = require('express')();
var cors = require('cors')
var bodyParser = require('body-parser');
const { MongoClient, ObjectID } = require("mongodb");
let http = require('http').Server(app);
// CORS is required
// https://socket.io/docs/v3/handling-cors/
let io = require('socket.io')(http, {
	cors: {
		methods: ["GET", "POST"]
	}
});

const {
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
} = require('./dbUtils');

const dbConnectionString = "mongodb+srv://RWUser:8YSSSCTEO4Apnfsm@cluster0.p9g9p.mongodb.net/MarQuiz-DB?retryWrites=true&w=majority"

const buzzer = {
	BUZZED: "buzzed",
	LOCKED: "locked",
	OPEN: "open",
}
app.use(cors());
app.use(bodyParser.json({limit: "50MB"}));       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({   // to support URL-encoded bodies
	limit: "50MB",  			  // to allow for large data transmission
	extended: true
}));
app.use(bodyParser.text({ limit: "50MB" }));

// TODO Endpoint only for testing, can be removed later
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html')
});

async function onStart() {
	await setAllUsersDisconnected();
}
onStart();

// Endpoint for getting all quiz data.
app.get('/quizes', async (req, res) => {
	const client = new MongoClient(dbConnectionString, { useUnifiedTopology: true });

	try {
		await client.connect();
		const database = client.db("MarQuiz-DB");

		let coll = database.collection("packs");
		const packs = await coll.find({}).toArray();

		coll = database.collection("categories");
		const categories = await coll.find({}).toArray();

		coll = database.collection("questions");
		const questions = await coll.find({}).toArray();

		packs.forEach(
			(p, p_idx) => {
				p.categories.forEach(
					(c, c_idx) => {
						const category = categories.find((cf) => cf._id == c);
						category.questions.forEach((q, q_idx) => {
							const question = questions.find((qf) => qf._id == q);
							category.questions[q_idx] = question;
						});
						packs[p_idx].categories[c_idx] = category;
					}
				)
			}
		)

		res.status(200).send({ packs });
	} catch (err) {
		console.log(err);
		res.sendStatus(400);
	} finally {
		await client.close();
	}
});


// Endpoint for getting all packs. Does not return all data anymore because of restructuring in DB.
app.get('/packs', async (req, res) => {
	const client = new MongoClient(dbConnectionString, { useUnifiedTopology: true });

	try {
		await client.connect();
		const database = client.db("MarQuiz-DB");

		const packsCollection = database.collection("packs");
		const returnData = await packsCollection.find({}).toArray();
		res.status(200).send({ returnData });
	} catch (err) {
		console.log(err);
		res.sendStatus(400);
	} finally {
		await client.close();
	}
});

app.get('/categories/:id', async (req, res) => {
	const categoryId = req.params.id;
	const client = new MongoClient(dbConnectionString, { useUnifiedTopology: true });

	try {
		await client.connect();
		const database = client.db("MarQuiz-DB");

		const categoriesCollection = database.collection("categories");
		const returnData = await categoriesCollection.findOne({ "_id": ObjectID(categoryId) });
		res.status(200).send({ returnData });
	} catch (err) {
		console.log(err);
		res.sendStatus(400);
	} finally {
		await client.close();
	}
});

app.get('/questions/:id', async (req, res) => {
	const questionsId = req.params.id;
	const question = await getQuestionById(questionsId);

	if (question) {
		res.status(200).send({ question });
	} else {
		res.sendStatus(400);
	}
});

app.post('/packs/:id', async (req, res) => {
	const packId = req.params.id;
	const newName = req.body.name;

	// there is nothing that could be updated
	if (!newName) {
		res.sendStatus(400);
		return;
	}

	await updatePackName(packId, newName);
	res.sendStatus(200);
});

app.post('/categories/:id', async (req, res) => {
	const packId = req.params.id;
	const newName = req.body.name;

	// there is nothing that could be updated
	if (!newName) {
		res.sendStatus(400);
		return;
	}

	await updateCategoryName(packId, newName);
	res.sendStatus(200);
});

app.post('/questions/:id', async (req, res) => {
	const id = req.params.id;
	const text = req.body.text;
	const audio = req.body.audio;
	const image = req.body.image;

	// there is nothing that could be updated
	if (!text && !audio && !image) {
		res.sendStatus(400);
		return;
	}

	await updateQuestion(id, text, audio, image);
	res.sendStatus(200);
});

// Deletes the question identified by the given id. So far, does not delete the reference
// in the category that the question belongs to.
app.delete('/questions/:id', async (req, res) => {
	const questionId = req.params.id;
	const client = new MongoClient(dbConnectionString, { useUnifiedTopology: true });

	try {
		await client.connect();
		const database = client.db("MarQuiz-DB");

		// delete question document
		const questionsCollection = database.collection("questions");
		const deletedQuestion = await questionsCollection.findOneAndDelete({ "_id": ObjectID(questionId) });

		// delete reference to deleted question in category
		const parentCategoryId = deletedQuestion.value.parentCaregory;
		const categoriesCollection = database.collection("categories");
		await categoriesCollection.updateOne(
			{ _id: ObjectID(parentCategoryId) },
			{ $pull: { questions: questionId } }
		);

		res.sendStatus(200);
	} catch (err) {
		console.log(err);
		res.sendStatus(400);
	} finally {
		await client.close();
	}
});

// Adds the new question and also puts the reference into the given category.
// The id of the newly added question is returned.
app.post('/questions', async (req, res) => {
	const text = req.body.text;
	const audio = req.body.audio;
	const image = req.body.image;
	const categoryId = req.body.category;

	// we need to know to which category the new question should be added
	if (!categoryId) {
		res.sendStatus(400);
		return;
	}

	// we will not add empty questions
	if (!text && !audio && !image) {
		res.sendStatus(400);
		return;
	}

	const client = new MongoClient(dbConnectionString, { useUnifiedTopology: true });

	try {
		await client.connect();
		const database = client.db("MarQuiz-DB");

		// check if the category exists
		const categoriesCollection = database.collection("categories");
		const category = await categoriesCollection.findOne({ "_id": ObjectID(categoryId) });

		if (!category) {
			res.sendStatus(400);
			return;
		}

		// add the question
		const questionsCollection = database.collection("questions");
		const newDocument = buildQuestionDocument(text, audio, image, categoryId);
		const dbResult = await questionsCollection.insertOne(newDocument);
		const insertedId = dbResult.insertedId;

		if (!insertedId) {
			res.sendStatus(400);
			return;
		}

		// add the new question to the array in the category
		await categoriesCollection.updateOne(
			{ _id: ObjectID(categoryId) },
			{ $push: { questions: { $each: [insertedId.toString()] } } }
		);

		res.status(200).send({ insertedId });
	} catch (err) {
		console.log(err);
		res.sendStatus(400);
	} finally {
		await client.close();
	}
});

app.post('/categories', async (req, res) => {
	const name = req.body.name;
	const packId = req.body.pack;

	if (!name || !packId) {
		res.sendStatus(400);
		return;
	}

	const client = new MongoClient(dbConnectionString, { useUnifiedTopology: true });

	try {
		await client.connect();
		const database = client.db("MarQuiz-DB");

		// check if the pack exists
		const packsCollection = database.collection("packs");
		const pack = await packsCollection.findOne({ "_id": ObjectID(packId) });

		if (!pack) {
			res.sendStatus(400);
			return;
		}

		// add the category
		const categoriesCollection = database.collection("categories");
		const newDocument = {
			categoryName: name,
			parentPack: packId,
			questions: []
		}
		const dbResult = await categoriesCollection.insertOne(newDocument);
		const insertedId = dbResult.insertedId;

		if (!insertedId) {
			res.sendStatus(400);
			return;
		}

		// add the new category to the array in the pack
		await packsCollection.updateOne(
			{ _id: ObjectID(packId) },
			{ $push: { categories: { $each: [insertedId.toString()] } } }
		);

		res.status(200).send({ insertedId });
	} catch (err) {
		console.log(err);
		res.sendStatus(400);
	} finally {
		await client.close();
	}
});

// Adding new pack and returning id. Categories array is initially empty.
app.post('/packs', async (req, res) => {
	const packName = req.body.packName;

	if (!packName) {
		res.sendStatus(400);
		return;
	}

	const client = new MongoClient(dbConnectionString, { useUnifiedTopology: true });

	try {
		await client.connect();
		const database = client.db("MarQuiz-DB");

		const packsCollection = database.collection("packs");
		const newDocument = {
			packName: packName,
			categories: []
		}

		const dbResult = await packsCollection.insertOne(newDocument);
		const insertedId = dbResult.insertedId;

		if (!insertedId) {
			res.sendStatus(400);
			return;
		}

		res.status(200).send({ insertedId });
	} catch (err) {
		console.log(err);
		res.sendStatus(400);
	} finally {
		await client.close();
	}
});

function buildQuestionDocument(text, audio, image, categoryId) {
	const document = {
		parentCaregory: categoryId
	};
	if (text) {
		document["text"] = text;
	}
	if (audio) {
		document["audio"] = audio;
	}
	if (image) {
		document["image"] = image;
	}
	return document;
}

// For deployment in Heroku
// see https://help.heroku.com/P1AVPANS/why-is-my-node-js-app-crashing-with-an-r10-error
const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
	console.log('Listening on port *: ', PORT);
});

// Emits the current game state and the info for each connected user via the given socket.
async function sendGameState(socket) {
	const state = await getGameState();
	socket.emit("game_state", state);

	const users = await getConnectedUsers();
	users.forEach((user) => {
		socket.emit("pointsChanged", user.name, user.points);
	});
}






// ### SOCKET EVENTS ###
io.on('connection', (socket) => {

	// The event that a user leaves. The user may rejoin with a new socket id.
	socket.on('disconnect', async () => {
		// only connected users can disconnect
		const users = await getConnectedUsers();
		const userBySocketId = users.find(user => user.socketId === socket.id);
		if (userBySocketId) {
			// DB access
			await setUserDisconnected(socket.id);
			// console output and emitting the same event to everyone
			const nameOfDisconnectedUser = userBySocketId.name;
			console.log("User disconnected: ", nameOfDisconnectedUser);
			io.emit('disconnected', nameOfDisconnectedUser);
		}
	});

	// The event that someone requests the current game state.
	socket.on('game_state', async () => {
		await sendGameState(socket);
	});

	// The event that a user joins. Covered cases: a new user joins, an existing user rejoins, 
	// a user tries to join with an already present name. 
	socket.on('connected', async (name) => {
		// new player (sender) needs the current game state
		await sendGameState(socket);
		// check if a user with the given name already exists
		const users = await getAllUsers();
		const existingUserWithSameName = users.find(user => user.name === name);
		if (existingUserWithSameName) {
			if (existingUserWithSameName.connected) {
				// another user tries to join with the same name as a connected user
				// emit event that tells the sender to enter a different name
				socket.emit('nameAlreadyTaken', name);
			} else {
				// a user joins with the name of a disconnected user (i.e. he is rejoining)
				// rejoining changed the socket id
				await setUserConnected(name, socket.id);
				// console output and emitting the same event to everyone
				console.log("User connected: ", name);
				io.emit('connected', name);
			}
		} else {
			// not existing user with this name must be created and added
			await createNewUser(name, socket.id);
			// console output and emitting the same event to everyone
			console.log("User connected: ", name);
			io.emit('connected', name);
		}
	});

	// The event that a user presses the buzzer. Action only required if buzzer was open.
	socket.on('buzz', async () => {
		const state = await getGameState();
		if (state.buzzer === buzzer.OPEN) {
			// only connected users can buzz
			const users = await getConnectedUsers();
			const buzzingUserBySocketId = users.find(user => user.socketId === socket.id);
			if (buzzingUserBySocketId) {
				await setBuzzerState(buzzer.BUZZED);
				// console output and emitting the same event to everyone
				const nameOfBuzzingUser = buzzingUserBySocketId.name;
				console.log("User buzzed: ", nameOfBuzzingUser);
				io.emit('buzz', nameOfBuzzingUser);
			}
		}
	});

	// The event that the buzzer is locked. 
	socket.on('buzzLock', async () => {
		await setBuzzerState(buzzer.LOCKED);
		// console output and emitting the same event to everyone
		console.log("Buzzer was locked!");
		io.emit('buzzLock');
	});

	// The event that the buzzer is set to open. Can be used to unlock the 
	// locked buzzer or to reset the buzzer after buzzing.
	socket.on('buzzOpen', async () => {
		await setBuzzerState(buzzer.OPEN);
		// console output and emitting the same event to everyone
		console.log("Buzzer is open!");
		io.emit('buzzOpen');
	});

	// The event that the points were changed for a user.
	// Parameters are the name of the user whose points should be 
	// changed and the new amount of points.
	socket.on('pointsChanged', async (name, newPoints) => {
		await updateUserPoints(name, newPoints);
		// console output and emitting the same event to everyone
		console.log("User points updated: ", name);
		io.emit('pointsChanged', name, newPoints);
	});

	// Events for presenting question to players
	socket.on('showText', async (questionId) => {
		const question = await getQuestionById(questionId);
		if (question && question.text) {
			// console output and emitting the same event to everyone
			console.log("Text of question now shown", questionId);
			io.emit('showText', question.text);
		}
	});
	socket.on('showImage', async (questionId) => {
		const question = await getQuestionById(questionId);
		if (question && question.image) {
			// console output and emitting the same event to everyone
			console.log("Image of question now shown", questionId);
			io.emit('showImage', question.image);
		}
	});
	socket.on('playAudio', async (questionId) => {
		const question = await getQuestionById(questionId);
		if (question && question.audio) {
			// console output and emitting the same event to everyone
			console.log("Audio of question now played", questionId);
			io.emit('playAudio', question.audio);
		}
	});
});

