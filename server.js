let app = require('express')();
let http = require('http').Server(app);
let io = require('socket.io')(http);
var User = require('./User');

const buzzer = {
	BUZZED: "buzzed",
	LOCKED: "locked",
	OPEN: "open",
}

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html')
});

http.listen(3000, () => {
	console.log('Listening on port *: 3000');
});

// TODO Transfer this data to DB 
let users = [];
let buzzerState = buzzer.OPEN;

io.on('connection', (socket) => {

	// The event that a user leaves. The user may rejoin with a new socket id.
	socket.on('disconnected', () => {
		const userBySocketId = users.find(user => user.socketId === socket.id);
		userBySocketId.connected = false;

		// emitting the same event to everyone
		const nameOfDisconnectedUser = userBySocketId.name;
		io.emit('disconnected', nameOfDisconnectedUser);
	});


	// The event that a user joins. Covered cases: a new user joins, an existing user rejoins, 
	// a user tries to join with an already present name. 
	socket.on('connected', (name) => {
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