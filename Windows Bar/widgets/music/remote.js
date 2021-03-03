const fs = require('fs')
const cp = require('child_process')

const e = require('electron')
const electron = e.remote

const ipcRenderer = e.ipcRenderer

let remotewindow = electron.getCurrentWindow()

let nowPlayingPath = ""
let playingState = ""


const {Menu, MenuItem} = electron
const menu = new Menu();

menu.append(new electron.MenuItem({label: 'Open Console', click: () => {
	remotewindow.webContents.openDevTools({mode: "detach"}) }}))

document.getElementById("container").addEventListener('contextmenu', (e) => {
	e.preventDefault()
	menu.popup(remotewindow)
}, false)


function secondsToTimestamp(seconds) {
	seconds = Math.round(seconds)
	let h = Math.floor(seconds / 3600);
	let m = Math.floor((seconds % 3600) / 60);
	let s = seconds % 60;
	return [
		h,
		m > 9 ? m : (h ? '0' + m : m || '0'),
		s > 9 ? s : '0' + s
	].filter(Boolean).join(':');
}

let animation
let stampLoop

let current
let total

function setTime(c, t) {
	if (c != null) current = c
	if (t != null) total = t
	let percent = ((current / total) * 100) + '%'
	let now = Date.now()
	document.getElementById('elapsedtime').textContent = secondsToTimestamp(current / 1000)
	document.getElementById('tracklength').textContent = secondsToTimestamp(total / 1000)

	document.getElementById('elapsedbar').style.width = percent

	if (animation) animation.cancel()
	if (stampLoop) clearInterval(stampLoop)

	if (playingState === "Playing") {
		animation = document.getElementById('elapsedbar').animate([
			{ width: percent },
			{ width: "100%" }
		], { 
			duration: total - current,
			iterations: 1
		})

		stampLoop = window.setInterval(() => {
			document.getElementById('elapsedtime').textContent = secondsToTimestamp((current + (Date.now() - now)) / 1000)
		}, 1000);
	}
}


function requestPosition() {
	ipcRenderer.send('sendMusicBeeJSON', JSON.stringify({
		"context": "nowplayingposition",
		"data": ""
	}))
}

function handleResponse(response) {
//	console.log(response)
	switch (response?.context) {
		case "nowplayingtrack":
			ipcRenderer.send('sendMusicBeeJSON', JSON.stringify({
				"context": "nowplayingcover",
				"data": ""
			}))

			document.getElementById('title').textContent = response.data.title
			document.getElementById('artistalbum').textContent = response.data.artist + ' — ' + response.data.album

			nowPlayingPath = response.data.path
			break;
		case "nowplayingcover":
			if (response.data.cover) {
				document.getElementById('cover').setAttribute('src', 'data:image;base64,' + response.data.cover)
				document.getElementById('covercontainer').style.backgroundImage = `url(data:image;base64,${response.data.cover})`

			} else {
				document.getElementById('cover').setAttribute('src', 'none.png')
			}
			break;
		case "nowplayingposition":
			// response.data.current			milliseconds
			// response.data.total

			setTime(response.data.current, response.data.total)
			break
		case "playerstatus":
		case "playerstate":
			playingState = response.data?.playerstate ?? response.data

			document.getElementById('icon').style.webkitMaskImage = (playingState !== "Playing")
				? "url(play_arrow-24px.svg)"
				: "url(pause-24px.svg)"

			requestPosition()
			break
	}

}

document.getElementById('playpausebutton').addEventListener('mouseup', e => {
	if (e.button == 0) {
		ipcRenderer.send('sendMusicBeeJSON', JSON.stringify({
			"context": "playerplaypause",
			"data": ""
		}))
	}
})


ipcRenderer.on('config', (e, c) => {
	let config = JSON.parse(c)
	document.documentElement.style.setProperty('--bar-height', config.barheight + "px");
	document.documentElement.style.setProperty('--font-family', `${config.style.fontFamily}`);
	document.documentElement.style.setProperty('--font-size', config.style.fontSize + "px");
	ipcRenderer.send("shownRemote")
})

ipcRenderer.on('clientMessage', (e, m) => {
	let data = JSON.parse(m)
	let message = JSON.parse(data.message)

	if (data.client == "MusicBee") handleResponse(message)
})

ipcRenderer.send("configReady")