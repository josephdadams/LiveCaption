# LiveCaption
LiveCaption was written by Joseph Adams and is distributed under the MIT License.

Copyright 2019 Joseph Adams.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

It is not sold, authorized, or associated with any other company or product.

To contact the author or for more information, please visit [www.techministry.blog](http://www.techministry.blog).

## ABOUT THIS SOFTWARE
This software will run a webserver allowing the user to transcript live audio to text and relay that to many clients at once, in real time.

## INSTALLATION
1. Download the latest source code/release files from the repository.
1. Make sure Node.js is installed.
1. In the terminal, from the path you placed the release files, type: `npm install` to install any necessary dependencies/libaries.
1. Then, in the terminal, type `node index.js`. **The server will run on port 3000 by default.**

## CONFIGURATION
1. Go to the Config page on the server running *LiveCaption*: `http://127.0.0.1:3000/config` It runs on port 3000 by default.
1. You will be prompted for the Config page login. The default username is *config* and the default password is *config22*.
1. This page enables you to Add/Edit Bridges. Bridges are the "rooms" that viewers can join to view captions. You can think of them as locations or venues.
1. You can change the login password for both the Config and Bridge Control pages.
1. You have the option to set a Global Logo. There is one included in the default dataset, but if you want custom branding, upload your own logo.
1. You can set Global Text, which will appear on the landing page for viewers to see when the page first loads.

### ADDING/EDITING BRIDGES
1. Each Bridge is auto-assigned a unique ID field.
1. You can assign a custom name.
1. The control password, if populated, will require anyone wishing to control this Bridge from the Bridge control page to have to enter the password in order to take control.
1. The observe password, if populated, will require anyone wishing to view the captions to have to enter the password in order to join the room.
1. The bridge can be enabled or disabled. This is helpful if you wish to have a lot of Bridge rooms configured but not all of them always available.
1. A custom logo for the Bridge can be uploaded. This is used when you put the Bridge in Logo Mode or if a client connects when no one is controlling that particular Bridge (it's offline).
1. You can set a custom foreground text color, background color, and font.

## CONTROLLING A BRIDGE
1. **In a Google Chrome browser**, go to the Bridge page on the server running *LiveCaption*: `http://127.0.0.1:3000/bridge` It runs on Port 3000 by default. Chrome is required for Bridge Control because it is the only browser that has this client-side API to convert audio to text.
1. You will be prompted for the Bridge Page login. If you are using the default configuration, the username is **bridge** and the password is **bridge22**. This can be changed in the settings.
1. Select a Bridge from the Bridge Config box. If it requires a control password, you will need to enter it. The default dataset includes a Bridge named Bridge1 and does not include a password.
1. Click "Connect to Bridge" to connect. If a Bridge is already in use, you will receive an error message.
1. To add bridges or make changes to existing bridges like adding a logo, changing observe/control passwords, etc., either go to */config* or click the "Settings" icon under the Bridge config section.
The default username is *config* and the default password is *config22*.
1. After connecting and taking control of a Bridge room, the Logo Mode is enabled by default. To turn off the logo, simply toggle the Logo On to Logo Off.
1. When you are ready to start converting audio to text, click "Start Listening" under *Caption Config*. To stop converting, click "Stop Listening" at any time. **If your connection is not HTTPS and you are not viewing the Bridge Control page as localhost, Chrome will not be allowed to access the microphone due to the secure origin policy.
> To ignore Chrome’s secure origin policy, follow these steps.
>	* In the Chrome address bar, navigate to `chrome://flags/#unsafely-treat-insecure-origin-as-secure`.
>	* Find and enable the `Insecure origins treated as secure` section.
>	* Add any addresses you want to ignore the secure origin policy for. Remember to include the port number as well.
>	* Save and restart Chrome.
1. A box will appear on the right side of the screen that contains the transcripted audio. By default, this data will not be sent to the clients until you toggle "Do Not Send" over to "Send Data". This is helpful if you want to test the transcription process and make any necessary adjustments on the audio side before sending the text to clients. You can also continue listening to audio and transcribe it but not send the data to clients, if desired.
1. To redirect all connected clients to another page (disconnecting them from the Bridge room in the process), you can type in a URL and click "Redirect to URL". Once they're redirected, they're gone.
1. You can send a text/announcement at any time and it wil appear at the top location bar on all connected clients.
1. You can also remotely reload all listeners, which will disconnect them from your Bridge room and ask them to choose a Bridge room again.
1. There is a simple Word Dictionary function at the bottom of the page where you can enter words or phrases and the replacement words or phrases to use instead. This is helpful if your audio source is often transcribed incorrectly.

## VIEWING CAPTIONS
1. Go to the index page of the server running *LiveCaption*: `http://127.0.0.1:3000/`
1. A list of Bridges to select and join will be presented. If there is only one Bridge configured/enabled, that one will be joined automatically and no choices will be given.
1. Captions will appear in real time as the data is sent from the Bridge Control page.

## API FUNCTIONS
The software supports a few different remote control options via an API.

### USING THE API FOR BRIDGE CONTROL
There is a simple API available to access certain Bridge Control functions.

Send an HTTP POST request to `/api/bridgecontrol`, with a JSON object (Content Type of `application/json`).
The object should contain these values:
1. `bridgeID`: The unique ID of the Bridge. You can get this from the Config page if you don't know the ID.
2. `command`: The API command to send.
3. `password`: The control password. Send "" if the password is blank.

#### AVAILABLE COMMANDS
* `startlistening`: Starts listening to incoming audio.
* `stoplistening`: Stops listening to incoming audio.
* `senddata`: Sends data to connected clients (send the transcribed text).
* `stopdata`: Stops sending data.
* `logoon`: Enables Logo Mode.
* `logooff`: Disables Logo Mode.
* `clear`: Clears any text that has been transcribed.
* `start`: Performs `clear`, `logooff`, `senddata`, and `startlistening` all at the same time.
* `stop`: Performs `stoplistening`, `stopdata`, `logoon`, and `clear` all at the same time.

*Example:*
```javascript
{
	bridgeID: "5d0b9ca7f",
	command: "startlistening",
	password: "control22"
}
```

`curl -d '{"bridgeID":"5d0b9ca7f","command":"startlistening","password":"control22"}' -H "Content-Type: application/json" -X POST http://127.0.0.1:3000/api/bridgecontrol`

If the command is sent successfully, you will receive a response of `command-sent`.
Other responses can include:
* `invalid-bridgeid`: The bridgeID you sent was not found (or was not included in the request).
* `bridge-not-inuse`: The bridge you attempted to control was not currently in use/in control (No one was connected to that Bridge from the Bridge Control page).
* `invalid-command`: The command you sent was not one of the options.
* `invalid-password`: The control password you sent was incorrect.

### GETTING DATA ABOUT ACTIVE CLIENTS
Send an HTTP POST request to `/api/clients`, with a JSON object (Content Type of `application/json`);
The object should contain these values:
1. `bridgeID`: The unique ID of the Bridge. You can get this from the Config page if you don't know the ID.
3. `password`: The control password. Send "" if the password is blank.

*Example:*
```javascript
{
	bridgeID: "5d0b9ca7f",
	password: "control22"
}
```

`curl -d '{"bridgeID":"5d0b9ca7f","password":"control22"}' -H "Content-Type: application/json" -X POST http://127.0.0.1:3000/api/clients`

If the bridge ID and password are valid, the server will return JSON data about the users currently connected to the particular bridge.
Other responses can include:
* `invalid-bridgeid`: The bridgeID you sent was not found (or was not included in the request).
* `bridge-not-inuse`: The bridge you attempted to control was not currently in use/in control (No one was connected to that Bridge from the Bridge Control page).
* `invalid-password`: The control password you sent was incorrect.