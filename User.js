class User {
	
	constructor(socketId, name) {
		this.socketId = socketId;
		this.name = name;
		
		// a new user is always created on the 'joined' event
		this.points = 0;
		this.connected = true;
	}
}

module.exports = User;