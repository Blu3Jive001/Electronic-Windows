let client

function sendJSON(elem) {
	client?.write(JSON.stringify(elem) + "\r\n")
}

function disconnected(widget) {
	client = null;
	widget.setNowPlaying("Reconnect to MusicBee")
}

function handleResponse(response, widget) {
	switch (response?.context) {
		case "player":
			sendJSON({
				"context": "protocol",
				"data": {
					"no_broadcast": false,
					"protocol_version": 5,
					"client_id": "test"
				}
			});
			sendJSON({"context": "playerstatus", "data": ""});
			sendJSON({
				"context": "nowplayingtrack",
				"data": ""
			});
			break;
		case "nowplayingtrack":
			sendJSON({
				"context": "nowplayingposition",
				"data": ""
			});
			widget.setNowPlaying(`${response.data.artist} – ${response.data.title}`)
			break;
		case "nowplayingposition":
			widget.setPosition(response.data.current / response.data.total)
			break;
		case "playerstatus":
			if (response.data.playerstate == "Stopped") widget.hideTrackProgress();
			if (response.data.playerstate == "Playing") widget.showTrackProgress();
			break;
		case "playerstate":
			if (response.data == "Stopped") widget.hideTrackProgress();
			if (response.data == "Playing") widget.showTrackProgress();
			break;
	}
}

ipcRenderer.on('sendMusicBeeJSON', (e, j) => { sendJSON(JSON.parse(j)) })

function connectMusicBee(widget) {
	if (client) return;

	client = net.createConnection({ port: 3232 })
	
	sendJSON({"context": "player","data": "Android"})

	let runningData = ""

	client.on('data', (data) => {
		let chunk = data.toString()
		
		if (chunk.match(/\r?\n$/) == null) {
			runningData += chunk
			return
		} else {
			chunk = runningData + chunk
			runningData = ""
		}

		for (const message of chunk.split(/\r?\n/)) {
			if (message == "") continue

			ipcRenderer.send('clientMessage', JSON.stringify({client: "MusicBee", message: message}))
			let response = JSON.parse(message)

			handleResponse(response, widget)
		}
	});
	
	client.on('end', () => {
		disconnected(widget)
		console.log('disconnected from server');
	});

	client.on('error', function (err) {
		disconnected(widget)
		console.log("MusicBee connection error:")
		console.log(err);
	});
}

let music = {
	MusicBee: {
		title: "MusicBee",
		connect: connectMusicBee
	}
}


// Configuration


config.player = music.MusicBee


let scrollInterval
let animation

function getTextWidth(text) {
    // re-use canvas object for better performance
    var canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"))
    var context = canvas.getContext("2d")
    context.font = `${config.style.fontSize}px ${config.style.fontFamily}`
    return context.measureText(text).width
}


function setNowPlaying(musicfield, np) {
	if (scrollInterval) clearInterval(scrollInterval)
	if (animation) animation.cancel()

	let textWidth = getTextWidth(np)

	if (textWidth < 150) {
		musicfield.textContent = np
	} else {
		let spaceWidth = getTextWidth(String.fromCharCode(160).repeat(10))

		musicfield.textContent = np + String.fromCharCode(160).repeat(10) + np

		let scrollTrack = () => {
			animation = musicfield.animate([
				{ transform: 'translateX(0px)' },
				{ transform: `translateX(-${textWidth + spaceWidth}px)` }
			], { 
				// timing options
				duration: textWidth * 40,
				iterations: 1
			})
		}
		window.setTimeout(scrollTrack, 4000)
		scrollInterval = window.setInterval(scrollTrack, textWidth * 40 + 10000);
	}
}

ipcRenderer.on('shownRemote', (e) => {
	sendJSON({
		"context": "nowplayinglist",
		"data": ""
	})
	sendJSON({
		"context": "nowplayingtrack",
		"data": ""
	})
	sendJSON({
		"context": "playerstatus",
		"data": ""
	})
})

class musicwidget extends HTMLElement {
	constructor() {
		super()

		let shadow = this.attachShadow({mode: 'open'});

		let style = document.createElement('link')
		style.setAttribute('rel', 'stylesheet')
		style.setAttribute('href', electron.app.getAppPath() + '\\widgets\\music\\music.css')

/*
		<svg id="trackprogress" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1">
			<circle cx="0.5" cy="0.5" r="0.2" style="stroke: currentColor; stroke-width: 0.15; stroke-opacity: 0.5; fill: none;" />
			<circle id="progressbar" cx="0.5" cy="0.5" r="0.2" style="stroke: currentColor; stroke-width: 0.15; fill: none; transform: rotate(-90deg); transform-origin: center; stroke-dasharray: 0.1 4;" />
		</svg>
*/

		let scrollbox = document.createElement('div')
		scrollbox.className = "scrollbox"

		let musicfield = document.createElement('div')
		musicfield.className = "musicfield"
		musicfield.textContent = "Connect to " + config.player.title
		scrollbox.appendChild(musicfield)

		shadow.appendChild(scrollbox)

		let progressBar = document.createElementNS('http://www.w3.org/2000/svg','svg')
		progressBar.setAttribute(		"viewBox",	"0 0 1 1")
//		progressBar.setAttribute(		"height",	"100%")
		// left margin (10) + right margin (10) + diameter of progress bar (8.4)
//		progressBar.setAttribute(		"width",	"28.4px")
		progressBar.id = "trackprogress"
		
		let backgroundCircle = document.createElementNS("http://www.w3.org/2000/svg", 'circle')
		backgroundCircle.setAttribute(	"cx",		"0.5")
		backgroundCircle.setAttribute(	"cy",		"0.5")
		backgroundCircle.setAttribute(	"r",		"0.2")
		backgroundCircle.id = "backgroundcircle"
		
		let progressCircle = document.createElementNS("http://www.w3.org/2000/svg", 'circle')
		progressCircle.setAttribute(	"cx",		"0.5")
		progressCircle.setAttribute(	"cy",		"0.5")
		progressCircle.setAttribute(	"r",		"0.2")
		progressCircle.id = "progresscircle"
		
		progressBar.appendChild(backgroundCircle)
		progressBar.appendChild(progressCircle)

		shadow.appendChild(progressBar)

		shadow.appendChild(style)

		this.addEventListener('mouseup', e => {
			if (e.button == 0) {
				if (client) {
					sendJSON({"context": "playerplaypause", "data": ""})
				} else {
					config.player.connect({
						setNowPlaying: (song) => { setNowPlaying(musicfield, song) },
						setPosition: (pos) => {
							let d = 1.2566370614359172953850573533118 // circumference of the progress bar
							progressCircle.style.strokeDasharray = d * pos + " " + 4
						},
						hideTrackProgress: () => { this.classList.remove('progressbar') },
						showTrackProgress: () => { this.classList.add('progressbar') }
					})
				}
			}
		})
	}
}

customElements.define('music-widget', musicwidget);