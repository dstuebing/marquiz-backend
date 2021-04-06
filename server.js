let app = require('express')();
var cors = require('cors')
let http = require('http').Server(app);
// CORS is required
// https://socket.io/docs/v3/handling-cors/
let io = require('socket.io')(http, {
	cors: {
		methods: ["GET", "POST"]
	}
});
var User = require('./User');

app.use(cors());

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html')
});

// For deployment in Heroku
// see https://help.heroku.com/P1AVPANS/why-is-my-node-js-app-crashing-with-an-r10-error
const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
    console.log('Listening on port *: ', PORT);
});

// TODO Transfer this data to DB 
let users = [];

io.on('connection', (socket) => {
	console.log("New connection established")

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
		console.log("User connected: ", name)
		const existingUserWithSameName = users.find(user => user.name === name);
		if(existingUserWithSameName){
			
			if(existingUserWithSameName.connected){
				// another user tries to join with the same name as a connected user
				// TODO emit event that tells the sender to enter a different name
				
			}else{
				// a user joins with the name of a disconnected user (i.e. he is rejoining)
				existingUserWithSameName.connected = true;
				// rejoining changed the socket id
				existingUserWithSameName.socketId = socket.id;
				// emitting the same event to everyone
				io.emit('connected', name);
			}

		}else{
			// not existing user with this name must be created and added
			const user = new User(socket.id, name);
			users.push(user);	
			// emitting the same event to everyone
			io.emit('connected', name);
		}		
	});
    
});