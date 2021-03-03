const fs = require('fs')
const cp = require('child_process')

const e = require('electron')
const electron = e.remote

const ipcRenderer = e.ipcRenderer

let runwindow = electron.getCurrentWindow()
let runid = runwindow.getNativeWindowHandle().readInt32LE()

let results = document.getElementById('results')
let inputdiv = document.getElementById('input')



const debug = false



let focusLoop
let text = ""
let selection = 0	// end of selection in text, other is at caret
let caret = 0		// caret position
let selected = 0 	// selected result
/*
	{
		"name": "Discord",
		"type": "LocalApplication",
		"path": "\\AppData\\Local\\Discord\\Update.exe",
		"arguments": "--processStart Discord.exe"
	},
	{
		"name": "Movies",
		"type": "Application",
		"path": "explorer.exe",
		"arguments": "E:\\Movies"
	},
*/
let commands = require('./applications.json')
let conditionalCommands = []

function fillDiv() {
	let longestMatch
	for (let i = text.length; i > 0; i--) {
		let regex
		try {	regex = new RegExp(text.substring(i, -1), "i") }
		catch {	regex = /$^/ }
		matchingCommands = commands.concat(conditionalCommands).filter((c) => ((c.text.match(regex) != null) || (text == c.shortcut)))

		if (matchingCommands.length > 0) {
			longestMatch = i
			break
		}
	}

	let points = [...new Set([0, selection, caret, text.length, longestMatch])].sort((a, b) => a - b)
	points.unshift(0)
	inputdiv.innerHTML = ""

	for (let i = 0; i < points.length - 1; i++) {
		let segment = document.createElement('span')
		segment.textContent = String.fromCodePoint(0x200D) + text.slice(points[i], points[i + 1]).replace(/\s/g, String.fromCodePoint(0x00A0))

		let bounds = [selection, caret].sort((a, b) => a - b)

		if (points[i + 1] <= longestMatch) segment.classList.add('matching')
		if ((points[i] >= bounds[0]) && (points[i + 1] <= bounds[1])) segment.classList.add('selected')
		if (points[i + 1] == caret) segment.classList.add('caret')

		inputdiv.appendChild(segment)
		inputdiv.scrollLeft = 10000
	}
}


ipcRenderer.on('config', (e, c, barCommands) => {
	let config = JSON.parse(c)
	document.documentElement.style.setProperty('--bar-height', config.barheight + "px");
	document.documentElement.style.setProperty('--font-family', `${config.style.fontFamily}`);
	document.documentElement.style.setProperty('--font-size', config.style.fontSize + "px");

	commands = commands.concat(JSON.parse(barCommands))
})

ipcRenderer.on('show', (e, commands) => {
	ipcRenderer.send("shownDialog", runid)
	runwindow.setOpacity(1)
	runwindow.setAlwaysOnTop(true, 'pop-up-menu')
	fillDiv()

	if (focusLoop) window.clearInterval(focusLoop)

	if (!debug) {
		focusLoop = window.setInterval(() => {
			runwindow.focus()
		}, 100)
	}

	conditionalCommands = JSON.parse(commands)
})


function hideWindow() {
	if (runwindow.isVisible()) {
		text = ''
		selection = 0
		caret = 0
		results.innerHTML = ''
		results.style.opacity = 0
		conditionalCommands = []
		fillDiv()

		runwindow.setOpacity(0)
		ipcRenderer.send('closedDialog');
		if (focusLoop) {
			window.clearInterval(focusLoop)
			focusLoop = undefined
		}
	}
}

if (!debug) {
	ipcRenderer.on('closeDialog', hideWindow)
} else {
//	runwindow.webContents.openDevTools({mode: "detach"})
}


function runCommand(app) {
	hideWindow()
	switch(app.type) {
		case "Application": { cp.spawn(app.path,
									   app.arguments ? [app.arguments] : null,
									   {detached: true, stdio: 'ignore', windowsVerbatimArguments: app.arguments ? true : false})
							 	eak }
		case "LocalApplication": { cp.spawn(
									   (app.path.substring(0, 1) == "\\") ? electron.app.getPath('home') + app.path : app.path,
									   app.arguments ? [(app.arguments.substring(0, 1) == "\\") ? electron.app.getPath('home') + app.arguments : app.arguments] : null,
									   {detached: true, stdio: 'ignore', windowsVerbatimArguments: app.arguments ? true : false})
							  break }
		case "Function":	{ ipcRenderer.send("runFunction", app.funct)
							  break }
	}
}


getSelected = (offset = 0) => document.getElementById('result' + (selected + offset))

class searchResult extends HTMLElement {
	constructor(command, regex) {
		super()

		let shadow = this.attachShadow({mode: 'open'});

		let style = document.createElement('link')
		style.setAttribute('rel', 'stylesheet')
		style.setAttribute('href', 'style/run.css')
		shadow.appendChild(style)

		let background = document.createElement('div')
		background.id = "background"

		let titleText = document.createElement('div')
		titleText.innerHTML = command.text.replace(
			regex,
			(match) => '<span class="bold">' + match + '</span>'
		)

		if (command.shortcut) {
			let shortcutIndicator = document.createElement('div')
			shortcutIndicator.innerHTML = command.shortcut
			shortcutIndicator.className = "shortcut"
			background.appendChild(shortcutIndicator)
		}

		this.getCommand = () => command
		this.onclick = () => runCommand(command)

		titleText.classList = "title"
		background.appendChild(titleText)
		shadow.appendChild(background)
	}
}

customElements.define('search-result', searchResult);

function search() {
	selected = 0
	if (text === '') {
		results.innerHTML = ''
		results.style.opacity = 0
	} else {
		let regex
		try {	regex = new RegExp(text, "i") }
		catch {	regex = /$^/ }
		let contents = document.createDocumentFragment();
		let index = 0
		commands.concat(conditionalCommands).filter((c) => ((c.text.match(regex) != null) || (text == c.shortcut)))
			.sort((c1, c2) => {
				if (text == c1.shortcut) {
					return -1
				} else if (text == c2.shortcut) {
					return 1
				} else {
					return c1.text.match(regex).index - c2.text.match(regex).index
				}
			})
			.forEach((command) => {
				let result = new searchResult(command, regex)
				result.id = "result" + index++
				contents.appendChild(result)
			})


		results.innerHTML = ""
		results.style.opacity = (contents.children.length == 0) ? 0 : 1
		results.appendChild(contents)
		let result = getSelected()
		if (result) { result.classList.add('selected'); result.scrollIntoView() }
	}
}


window.addEventListener('keydown', (e) => {
	//console.log(e)

	switch (e.code) {
		case "ArrowDown":
			if (getSelected(1)) {
				getSelected().classList.remove('selected')
				selected += 1
				getSelected().classList.add('selected')
				getSelected().scrollIntoView()
			}
			break
		case "ArrowUp":
			if (getSelected(-1)) {
				getSelected().classList.remove('selected')
				selected -= 1
				getSelected().classList.add('selected')
				getSelected().scrollIntoView()
			}
			break
		case "ArrowLeft":
			if (caret > 0) caret -= 1
			if (!e.shiftKey) selection = caret
			fillDiv();
			break
		case "ArrowRight":
			if (caret < text.length) caret += 1
			if (!e.shiftKey) selection = caret
			fillDiv();
			break
		case "End":
			caret = text.length
			if (!e.shiftKey) selection = text.length
			fillDiv();
			break
		case "Home":
			caret = 0
			if (!e.shiftKey) selection = 0
			fillDiv();
			break
		case "Backspace":
			if (selection != caret) {
				let bounds = [selection, caret].sort((a, b) => a - b)
				text = text.slice(0, bounds[0]) + text.slice(bounds[1], text.length)
				caret = bounds[0]
				selection = bounds[0]
			} else {
				text = text.slice(0, Math.max(caret - 1, 0)) + text.slice(caret, text.length)
				if (caret > 0) caret -= 1
				selection = caret
			}
			fillDiv();
			search()
			break
		case "Delete":
			if (selection != caret) {
				let bounds = [selection, caret].sort((a, b) => a - b)
				text = text.slice(0, bounds[0]) + text.slice(bounds[1], text.length)
				caret = bounds[0]
				selection = bounds[0]
			} else {
				text = text.slice(0, caret) + text.slice(caret + 1, text.length)
			}
			fillDiv();
			search()
			break
		case "Escape":
			hideWindow()
			break
		case "Enter":
			if (text != '' && getSelected()) {
				runCommand(getSelected().getCommand())
			} else if (text == '') {
				hideWindow()
			}
	}
	if (
		(((e.keyCode >= 48) && (e.keyCode <= 90)) ||
		(e.keyCode == 32) ||
		((e.keyCode >= 186) && (e.keyCode <= 192)) ||
		((e.keyCode >= 219) && (e.keyCode <= 222))) &&
		(e.key != "Dead")
	) {
		if (e.ctrlKey) {
			if (e.code == "KeyA") {
				selection = 0
				caret = text.length
			}
		} else {
			if (selection != caret) {
				let bounds = [selection, caret].sort((a, b) => a - b)
				text = text.slice(0, bounds[0]) + e.key + text.slice(bounds[1], text.length)
				caret = bounds[0] + 1
				selection = bounds[0] + 1
			} else {
				text = text.slice(0, caret) + e.key + text.slice(caret, text.length)
				caret += 1
				selection = caret
			}
		}
		fillDiv()
		search()
	}
})