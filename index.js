/* LiveCaption */

const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const defaultListenPort = 3000;

const JSONdatafile = 'livecaption-data.json';
const JSONlogfile = 'livecaption-log.json';

const ConfigLogin = 'config';
var ConfigPassword = 'config22';
const ConfigPassword_Default = 'config22';

var GlobalLogo = '';
var GlobalText = '';

const BridgeLogin = 'bridge';
var BridgePassword = 'bridge22';
const BridgePassword_Default = 'bridge22';

var Bridges = []; //array of bridges/locations available

var Clients = []; //array of people currently connected across entire service
var ConnectionLog = []; //log of same array, but entries are not deleted when they disconnect

var WordDictionary = []; //word replacement dictionary array

var configSecureRoute = require('express').Router();

app.use(bodyParser.json({ type: 'application/json' }));

configSecureRoute.use((req, res, next) => {

	// -----------------------------------------------------------------------
	// authentication middleware

	// parse login and password from headers
	const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
	const [login, password] = new Buffer.from(b64auth, 'base64').toString().split(':');

	// Verify login and password are set and correct
	if (!login || !password || login !== ConfigLogin || password !== ConfigPassword) {
		res.set('WWW-Authenticate', 'Basic realm=\'401\''); // change this
		res.status(401).send('Authentication required to access this area.'); // custom message
		return;
	}

	// -----------------------------------------------------------------------
	// Access granted...
	next();
});

var bridgeSecureRoute = require('express').Router();

bridgeSecureRoute.use((req, res, next) => {

	// -----------------------------------------------------------------------
	// authentication middleware

	// parse login and password from headers
	const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
	const [login, password] = new Buffer.from(b64auth, 'base64').toString().split(':');

	// Verify login and password are set and correct
	if (!login || !password || login !== BridgeLogin || password !== BridgePassword) {
		res.set('WWW-Authenticate', 'Basic realm=\'401\''); // change this
		res.status(401).send('Authentication required to access this area.'); // custom message
		return;
	}

	// -----------------------------------------------------------------------
	// Access granted...
	next();
});

//config page
configSecureRoute.get('/', function (req, res) {
	res.sendFile(__dirname + '/views/config.html');
});

app.use('/config', configSecureRoute);

//bridge page
bridgeSecureRoute.get('/', function (req, res) {
	res.sendFile(__dirname + '/views/bridge.html');
});

app.use('/bridge', bridgeSecureRoute);

//about page
app.get('/about', function (req, res) {
	res.sendFile(__dirname + '/views/about.html');
});

//listener page
app.get('/', function (req, res) {
	res.sendFile(__dirname + '/views/index.html');
});

//API functions
app.post('/api/bridgecontrol', function (req, res) {
	let obj = req.body;
	
	let response = '';
	
	if (obj.bridgeID) {
		let password = '';
		
		if (obj.password) {
			password = obj.password;
		}
		
		switch(obj.command) {
			case 'startlistening':
			case 'stoplistening':
			case 'senddata':
			case 'stopdata':
			case 'logoon':
			case 'logooff':
			case 'clear':
			case 'start':
			case 'stop':
				response = ControlBridge(obj.bridgeID, obj.command, password);
				break;
			default:
				response = 'invalid-command';
		}
	}
	else {
		response = 'invalid-bridgeid';
	}
	
	res.send({returnStatus: response});
});

app.post('/api/clients', function (req, res) {
	let obj = req.body;
	
	let response = '';
	
	if (obj.bridgeID) {
		let password = '';
		
		if (obj.password) {
			password = obj.password;
		}
		
		response = GetClients(obj.bridgeID, password);
	}
	else {
		response = 'invalid-bridgeid';
	}
	
	res.send({returnStatus: response});
});


//static images and libraries
app.use(express.static('views/static'));

//socket.io sockets
io.sockets.on('connection', function(socket) {
	// Config Sockets
	
	//Get All Bridges
	socket.on('config_bridgeroom_getall', function() {
		socket.emit('config_bridgerooms', Bridges);
	});
	
	//Return Current Global Logo
	socket.on('config_getgloballogo', function () {
		socket.emit('config_globallogo', GlobalLogo);
	});
	
	//Return Current Global Text
	socket.on('config_getglobaltext', function () {
		socket.emit('config_globaltext', GlobalText);
	});
	
	//Add New Bridge
	socket.on('config_bridgeroom_add', function (bridgeRoomObj) {
		if (bridgeRoomObj.logo === '') {
			bridgeRoomObj.logo = '';
		}
		Bridges.push(bridgeRoomObj);
		io.to('Config').emit('config_status', 'add-success');
		io.to('Config').emit('config_bridgerooms', Bridges);
		io.to('BridgeRooms').emit('bridgerooms', Bridges);
		saveFile();
	});
	
	//Update Bridge
	socket.on('config_bridgeroom_update', function (bridgeRoomObj) {
		let index = null;
		for (let i = 0; i < Bridges.length; i++) {
			if (Bridges[i].id === bridgeRoomObj.id) {
				index = i;
				break;
			}
		}
		if (index !== null) {
			Bridges.splice(index, 1);
			Bridges.push(bridgeRoomObj);
			io.to('Config').emit('config_status', 'update-success');
			io.to('BridgeRooms').emit('bridgerooms', Bridges);
			saveFile();
		}
		else {
			io.to('Config').emit('config_status', 'update-failure');
		}
	});
	
	//Delete Bridge
	socket.on('config_bridgeroom_delete', function (bridgeRoomObj) {
		let index = null;
		for (let i = 0; i < Bridges.length; i++) {
			if (Bridges[i].id === bridgeRoomObj.id) {
				index = i;
				break;
			}
		}
		if (index !== null) {
			Bridges.splice(index, 1);
			io.to('Config').emit('config_status', 'delete-success');
			io.to('BridgeRooms').emit('bridgerooms', Bridges);
			saveFile();
		}
		else {
			io.to('Config').emit('config_status', 'delete-failure');
		}
	});
	
	//Change Config Page Password
	socket.on('config_changeconfigpassword', function(oldPassword, newPassword) {
		if (oldPassword === ConfigPassword) {
			ConfigPassword = newPassword;
			saveFile();
			socket.emit('config_status', 'changeconfigpassword-success');
		}
		else {
			socket.emit('config_status', 'changeconfigpassword-failure');
		}
	});
	
	//Change Bridge Page Password
	socket.on('config_changebridgepassword', function(oldPassword, newPassword) {
		if (oldPassword === BridgePassword) {
			BridgePassword = newPassword;
			saveFile();
			socket.emit('config_status', 'changebridgepassword-success');
		}
		else {
			socket.emit('config_status', 'changebridgepassword-failure');
		}
	});
	
	//Change Global Logo
	socket.on('config_globallogo_update', function(logo) {
		GlobalLogo = logo;
		saveFile();
		socket.emit('config_status', 'globallogo_update');
	});
	
	//Change Global Text
	socket.on('config_globaltext_update', function(text) {
		GlobalText = text;
		saveFile();
		socket.emit('config_status', 'globaltext_update');
	});
	
	// Bridge Sockets
	
	// Return all bridges in the array
	socket.on('bridgerooms_getall', function () {
		let bridgeArray = GetCleanBridgeArray();
		socket.emit('bridgerooms', bridgeArray); 
	});
	
	//Authenticate a Bridge and set it in use
	socket.on('bridgerooms_authenticate', function(bridgeID, password) {
		if (GetBridgeInUse(bridgeID)) {
			socket.emit('bridgerooms_inuse', true);
		}
		else {
			let controlPassword = null;
			for (let i = 0; i < Bridges.length; i++) {
				if (Bridges[i].id === bridgeID) {
					controlPassword = Bridges[i].controlPassword;
					break;
				}
			}

			if (password === controlPassword) {
				socket.join('BridgeRooms'); // the room with all of the authenticated bridges in it
				socket.join('BridgeRoom-' + bridgeID); //this specific room that listener clients will receive data from
				socket.emit('bridgerooms_authenticated', true);
				socket.emit('bridgerooms_selectedbridge', bridgeID);
				socket.emit('word_dictionary', getWordsByBridgeID(bridgeID));
				AddClient(socket, bridgeID, 'Bridge');
				SetBridgeInUse(bridgeID, true);
				SetLogoMode(bridgeID, true);
			}
			else {
				socket.emit('bridgerooms_authenticated', false);
			}
		}
	});
	
	//Disconnect from Bridge
	socket.on('bridgerooms_disconnect', function(bridgeID) {
		SetBridgeInUse(bridgeID, false);
		SetLogoMode(bridgeID, true);
	});
	
	socket.on('announcement', function(bridgeID, text) {
		updateListener(bridgeID, 'announcement', text);
	});
	
	socket.on('redirect', function(bridgeID, url) {
		updateListener(bridgeID, 'redirect', url);
	});
	
	socket.on('gotologo', function (bridgeID, value) {
		SetLogoMode(bridgeID, value);
		updateListener(bridgeID, 'gotologo', value);
	});
	
	socket.on('keepawake', function (bridgeID, value) {
		updateListener(bridgeID, 'keepawake', value);
	});
	
	socket.on('reload', function(bridgeID, value) {
		updateListener(bridgeID, 'reload', value);
	});
	
	socket.on('clearcaptions', function(bridgeID) {
		updateListener(bridgeID, 'clearcaptions', true);
	});
	
	socket.on('newcaption', function(bridgeID, finalTranscript, interimTranscript) {
		updateCaptions(bridgeID, finalTranscript, interimTranscript);
	});
	
	socket.on('addword', function(bridgeID, strWordToReplace, strNewWord) {
		addWord(bridgeID, strWordToReplace, strNewWord);
	});
	
	socket.on('deleteword', function(bridgeID, strWord) {
		deleteWord(bridgeID, strWord);
		socket.emit('word_dictionary', getWordsByBridgeID(bridgeID));
	});
	
	// LISTENER SOCKETS
	
	//Join the selected Bridge Room
	socket.on('listener_joinbridgeroom', function(bridgeID, password) {
		for (let i = 0; i < Bridges.length; i++) {
			if (Bridges[i].id === bridgeID) {
				if (Bridges[i].observePassword === password) {
					socket.join('Listener-' + bridgeID);
					socket.emit('status', 'success');
					socket.emit('gotologo', GetLogoMode(bridgeID));
					socket.emit('bridgeinuse', GetBridgeInUse(bridgeID));
					AddClient(socket, bridgeID, 'Listener');
				}
				else {
					socket.emit('status', 'failure');
				}
				break;
			}
		}
	});
	
	//Other Sockets
	socket.on('room', function(room) {
		switch(room) {
			case 'Listeners':
				socket.join(room);
				socket.emit('bridgerooms', GetAvailableBridges());
				socket.emit('globallogo', GlobalLogo);
				socket.emit('globaltext', GlobalText);
				break;
			case 'BridgeRooms':
				socket.join(room);
				break;
			case 'Config':
				socket.join(room);
				if (ConfigPassword === ConfigPassword_Default)
				{
					socket.emit('config_passwordisdefault', true);
				}
				break;
			default:
				break;
		}
	});
	
	socket.on('disconnect', function() {
		RemoveClient(socket);
		
		io.to('Bridge').emit('client_disconnected', Clients);
	});
});

//Sets the Bridge in use so no one else can use it
function SetBridgeInUse(bridgeID, value) {
	for (let i = 0; i < Bridges.length; i++) {
		if (Bridges[i].id === bridgeID) {
			Bridges[i].inUse = value;
			io.to('Listener-' + bridgeID).emit('bridgeinuse', value);
			break;
		}
	}
}

//Returns true/false if the bridge is currently in use
function GetBridgeInUse(bridgeID) {
	let bridgeObj = Bridges.find(function (obj) { return obj.id.toString() === bridgeID; });
	
	return bridgeObj.inUse;
}

//Adds the Listener to the global list of clients
function AddClient(socket, bridgeID, type) {
	let clientObj = {};
	
	clientObj.socketID = socket.id; //first position is always the socket ID
	clientObj.bridgeID = bridgeID;
	clientObj.issued = socket.handshake.issued;
	clientObj.address = socket.handshake.address;
	
	clientObj.roomType = type;
	
	Clients.push(clientObj);
	io.to('BridgeRoom-' + bridgeID).emit('client_connected', clientObj);
	clientObj.datetime = Date.now();
	ConnectionLog.push(clientObj);

	fs.writeFile(JSONlogfile, JSON.stringify(ConnectionLog), 'utf8', function(error) {
		if (error) { 
			console.log('error saving connection log: ' + error);
		}
	});	
}

//Removes the listener from the global list of clients
function RemoveClient(socket) {	
	let socketID = socket.id;
	let index = null;
	
	let bridgeID = null;
	
	for (let i = 0; i < Clients.length; i++) {
		if (Clients[i].socketID === socketID) {
			index = i;
			bridgeID = Clients[i].bridgeID;

			if (Clients[i].roomType === 'Bridge') {
				SetBridgeInUse(bridgeID, false);
			}
			
			break;
		}
	}
	
	if (index !== null) {
		Clients.splice(index, 1);
		io.to('BridgeRoom-' + bridgeID).emit('client_disconnected', socketID);
	}
}

//Sets the bridge in logo mode
function SetLogoMode(bridgeID, value) {
	for (let i = 0; i < Bridges.length; i++) {
		if (Bridges[i].id === bridgeID) {
			Bridges[i].logoMode = value;
			break;
		}
	}
}

//Returns whether the bridge is in logo mode or not
function GetLogoMode(bridgeID) {
	let logoMode = false;
	
	for (let i = 0; i < Bridges.length; i++) {
		if (Bridges[i].id === bridgeID) {
			logoMode = Bridges[i].logoMode;
			break;
		}
	}

	return logoMode;
}

//Updates all listeners with the latest command (announcement, redirect, etc.)
function updateListener(bridgeID, mode, text) {
	io.to('Listener-' + bridgeID).emit(mode, text);
}

//Updates all listeners with the latest caption text
function updateCaptions(bridgeID, finalTranscript, interimTranscript) {
	io.to('Listener-' + bridgeID).emit('caption', finalTranscript, interimTranscript);
}

//Adds the word to the Word Dictionary Array
function addWord(bridgeID, strWordToReplace, strNewWord) {
	let dictionaryObj = {};
	dictionaryObj.bridgeID = bridgeID;
	dictionaryObj.word = strWordToReplace;
	dictionaryObj.replaceWord = strNewWord;
	WordDictionary.push(dictionaryObj);
	saveFile();
}

function deleteWord(bridgeID, word) {
	let index = null;
	for (let i = 0; i < WordDictionary.length; i++) {
		if ((WordDictionary[i].word === word) && (WordDictionary[i].bridgeID === bridgeID)) {
			index = i;
			break;
		}
	}

	if (index !== null) {
		WordDictionary.splice(index, 1);
		saveFile();
	}
}

function getWordsByBridgeID(bridgeID)
{
	let wordArray = [];
	
	for (let i = 0; i < WordDictionary.length; i++) {
		if (WordDictionary[i].bridgeID === bridgeID) {
			let wordObj = {};
			wordObj.word = WordDictionary[i].word;
			wordObj.replaceWord = WordDictionary[i].replaceWord;
			wordArray.push(wordObj);
		}
	}
	
	return wordArray;
}

function startUp() {
	http.listen(defaultListenPort, function () {
		console.log('LiveCaption Server listening on port:' + defaultListenPort);
	});
}

//Loads settings from memory on first startup
function loadFile() {
	try {
		let rawdata = fs.readFileSync(JSONdatafile); 
		let myJson = JSON.parse(rawdata); 

		Bridges = myJson.Bridges;
		ConfigPassword = myJson.ConfigPassword;
		BridgePassword = myJson.BridgePassword;
		GlobalLogo = myJson.GlobalLogo;
		GlobalText = myJson.GlobalText;
		WordDictionary = myJson.WordDictionary;
	}
	catch (error) {
		Bridges = [];
		ConfigPassword = ConfigPassword_Default;
		BridgePassword = BridgePassword_Default;
		GlobalLogo = null;
		GlobalText = '';
		WordDictionary = [];
	}
}

//Saves settings to a local storage file for later recalling
function saveFile() {
	//removes the Bridges In Use property before saving, this is only a runtime property
	let TempBridges = [];
	for (let i = 0; i < Bridges.length; i++) {
		TempBridges.push(Bridges[i]);
		TempBridges[i].inUse = false;
	}
	
	var myJson = {
		ConfigPassword: ConfigPassword,
		BridgePassword: BridgePassword,
		GlobalLogo: GlobalLogo,
		GlobalText: GlobalText,
		Bridges: TempBridges,
		WordDictionary: WordDictionary
	};

	fs.writeFileSync(JSONdatafile, JSON.stringify(myJson), 'utf8', function(error) {
		if (error) { 
			console.log('error: ' + error);
		}
		else {
			console.log('file saved');
		}
	});
}

//Returns the bridge data based on the provided bridgeID
function GetBridge(bridgeID) {
	let bridgeObj = null;
	
	for (let i = 0; i < Bridges.length; i++) {
		if (Bridges[i].id === bridgeID) {
			bridgeObj = Bridges[i];
		}
	}
	
	return bridgeObj;
}

//Builds an array of current Bridges but only with the ID and Name, so no passwords and other data are sent unncessarily
function GetCleanBridgeArray() {
	let bridgeArray = [];
	
	for (let i = 0; i < Bridges.length; i++) {
		if (Bridges[i].enabled) {
			let bridgeObj = {};
			bridgeObj.id = Bridges[i].id;
			bridgeObj.name = Bridges[i].name;
			bridgeObj.logo = Bridges[i].logo;
			bridgeObj.inUse = Bridges[i].inUse;
			if (Bridges[i].controlPassword !== '') {
				bridgeObj.requiresPassword = true;
			}
			else {
				bridgeObj.requiresPassword = false;
			}
			bridgeArray.push(bridgeObj);
		}
	}
	
	return bridgeArray;
}

//Builds an array of bridges that are enabled
function GetAvailableBridges() {
	let bridgeArray = [];
	
	for (let i = 0; i < Bridges.length; i++) {
		if (Bridges[i].enabled) {
			let bridgeObj = {};
			bridgeObj.id = Bridges[i].id;
			bridgeObj.name = Bridges[i].name;
			bridgeObj.logo = Bridges[i].logo;
			bridgeObj.logoMode = Bridges[i].logoMode;
			bridgeObj.inUse = Bridges[i].inUse;
			bridgeObj.foregroundColor = Bridges[i].foregroundColor;
			bridgeObj.backgroundColor = Bridges[i].backgroundColor;
			bridgeObj.font = Bridges[i].font;
			if (Bridges[i].observePassword !== '') {
				bridgeObj.requiresPassword = true;
			}
			else {
				bridgeObj.requiresPassword = false;
			}
			bridgeArray.push(bridgeObj);
		}
	}
	
	return bridgeArray;
}

//API control - sends the specified command to the bridge room
function ControlBridge(bridgeID, command, password) {
	let bridgeObj = GetBridge(bridgeID);
	
	if (bridgeObj) {
		if (bridgeObj.controlPassword === password) {
			if (GetBridgeInUse(bridgeID)) {
				io.to('BridgeRoom-' + bridgeID).emit('bridge_control', command);
				return 'command-sent';
			}
			else {
				return 'bridge-not-inuse';
			}
		}
		else {
			return 'invalid-password';
		}
	}
	else {
		return 'invalid-bridgeid';
	}
}

function GetClients(bridgeID, password) {
	let bridgeObj = GetBridge(bridgeID);
	
	if (bridgeObj) {
		if (bridgeObj.controlPassword === password) {
			if (GetBridgeInUse(bridgeID)) {
				return Clients.filter(function(client) {
					return client.bridgeID === bridgeID;
				});
			}
			else {
				return 'bridge-not-inuse';
			}
		}
		else {
			return 'invalid-password';
		}
	}
	else {
		return 'invalid-bridgeid';
	}
}

loadFile();
startUp();
