const fs = require('fs')
const cp = require('child_process')
const net = require('net')
const ahk = require('./ahk.js')
const tile = require('./tile.js')
const http = require('http')

const e = require('electron')
const electron = e.remote
const ipcRenderer = e.ipcRenderer

// ControlClick, Button2, ahk_class Shell_TrayWnd

// windows:		calendar, run, settings, weather
// bar: 		workspaces, run, musicbee    weather, wifi, battery, clock, tray
// tray:		vol ----------------------
//				settings | turn off screen | close

//commands:
/*
	- per desktop:
	-	 (* windows > 2)	tile selected
	-						array horizontally
	-						array vertically
	-						clump
	-						arrange
	-   (* windows = 2)		switch windows
	- launch <app>
	- open tray
	- open notifications?
*/

let barwindow = electron.getCurrentWindow()
let bardisplay = electron.screen.getPrimaryDisplay()
let barid = barwindow.getNativeWindowHandle().readInt32LE()


let scale = bardisplay.scaleFactor

let config = {
	workspaces: 3,
	displaymargins: {top: 0, bottom: 40},
	barheight: 40,
	calendarLocale: "en-US", // en-GB for DDMMYYYY

	style: {
		fontFamily: '"Mix", "Gotham Rounded Medium"',
		fontSize: 10
	},

	tile: {
		tilearea: {
			x: bardisplay.bounds.x,
			y: bardisplay.bounds.y,
			width: bardisplay.bounds.width * scale,
			height: (bardisplay.bounds.height - 20) * scale
		},
		deltas: {					
			width:	10 * scale,		// For any window with a caption, there will be some "correct"
			height:	5 * scale,		// amount of space that the 'real' window size differs from the
			x:		-5 * scale,		// window size you see, due to window shadows. If there is a programmatic
			y: 		0				// way to calculate it given visual styles and windows with different caption
		},							// heights (e.g., Chrome) I don't know it
		tiles: [
			{
				offset: "48px",			// tile
				function: tile.lefttile
			},
			{
				offset: "12px",
				function: tile.clump
			}
		]
	}
}


let focusedwindow
let desktop
let windows = []
let ahkPid = []


// apply config to css and html

document.documentElement.style.setProperty('--bar-height', config.barheight + "px");
document.documentElement.style.setProperty('--font-family', `${config.style.fontFamily}`);
document.documentElement.style.setProperty('--font-size', config.style.fontSize + "px");





function position() { // position bar
	ahk.runSync('WinHide, ahk_class Shell_TrayWnd')					// Hide taskbar
	ahk.setMarginsWithOffsets(bardisplay, config.displaymargins)

	barwindow.setPosition(0, 0)
	barwindow.setShape([{
		x: 0,
		y: bardisplay.bounds.height - config.barheight,
		width: bardisplay.bounds.width,
		height: config.barheight
	}])
/*	ahk.runSync(
`
WinGet, IdChild, ID, ahk_pid ${process.pid}
WinGet, IdDesktop, ID, ahk_class WorkerW
DllCall("SetParent", ptr, IdChild, ptr, IdDesktop)  
`
	) // The only way I've found to stop Win + D from minimizing the bar, but it doesn't work with multiple monitors seemingly */
}

function hasWindow(display, winx) {
	let dpi = display.scaleFactor
	let {x, y, width, height} = display.bounds
	
	return (x * dpi <= winx && (x + width) * dpi >= winx)
}

function showTaskbar() {
	// Show the taskbar and try to reset the work area
	// Depends on some unknown behavior in which monitors without taskbars
	// have their margins reset somewhere along the line
	ahk.runSync('WinShow, ahk_class Shell_TrayWnd');

	let exec = 
`
WinGetPos, posX, posY, width, height, ahk_class Shell_TrayWnd
json := "{""x"":""" . posX . """,""y"":""" . posY . """,""width"":""" . width . """,""height"":""" . height . """}"
FileAppend, %json%,*
`
	let {x, y, width, height} = JSON.parse(ahk.runSync(exec))

	let displayWithTaskbar

	electron.screen.getAllDisplays().forEach((disp) => {
		if (hasWindow(disp, parseInt(x))) displayWithTaskbar = disp
	})
	
	if (displayWithTaskbar) {
		// calculates the dimensions the desktop should be from the taskbar size and position
		let {dx, dy, dwidth, dheight} = displayWithTaskbar.bounds
		let dpi = displayWithTaskbar.scaleFactor

		let rightTB = (dx + dwidth) * dpi == x + width && width < dwidth * dpi
		let leftTB = dx * dpi == x && width < dwidth * dpi
		let topTB = dy * dpi == y && width == dwidth * dpi
		let bottomTB = (dy + dheight) * dpi == y + height && width == dwidth * dpi

		ahk.setMargins({
			left: leftTB ? width : dx * dpi,
			right: rightTB ? (dwidth * dpi) - width : (dx + dwidth) * dpi ,
			top: topTB ? height : dy * dpi,
			bottom: bottomTB ? (dheight * dpi) - height : (dy + dheight) * dpi
		})
	}
}


const {Menu, MenuItem} = electron
const menu = new Menu();

menu.append(new MenuItem({label: 'Quit', click: () => {
	electron.app.quit() }}))
menu.append(new MenuItem({label: 'Reposition', click: () => {
	position()
}}))
menu.append(new electron.MenuItem({label: 'Open Console', click: () => {
	barwindow.webContents.openDevTools({mode: "detach"}) }}))
menu.append(new electron.MenuItem({label: 'Re-check tasks', click: () => {
	windows = ahk.getManagedWindows()
	initTaskbar()
	setWorkspacePopulated()
}}))

document.getElementById("bar").addEventListener('contextmenu', (e) => {
	if (e.path.find(a => a == document.getElementById("tiling")) == undefined) {
		e.preventDefault()
		menu.popup(barwindow)
	}
}, false)


ipcRenderer.on('app-close', () => {
	for (const pid of ahkPid) {
		ahk.runSync(`Process, Close, ${pid}`)
	}
	showTaskbar()
	ipcRenderer.send('closed');
});





let tasklistdiv = document.getElementById('tasks')


function getTasks() { return Array.prototype.slice.call(tasklistdiv.children) }
function getSelectedTasks() { return getTasks().filter(task => task.classList.contains('selected')) }

function compareIDs(id1, id2) { return parseInt(id1) == parseInt(id2) }

function getWindowFromTask(task) { return windows.find((win) => win.task == task) }

function checkForWindowList(e) {
	return e.dataTransfer.types.includes("application/windowlist")
}

class windowTask extends HTMLElement {
	constructor(win) {
		super()

		win.task = this

		let shadow = this.attachShadow({mode: 'open'});

		let style = document.createElement('style') // external style causes FOUC, which resets scroll position when the children are permutated
		style.textContent = fs.readFileSync(electron.app.getAppPath() + '\\style\\taskbar.css').toString()
		shadow.appendChild(style)

		let titleText = document.createElement('div')
		titleText.classList = "title"
		shadow.appendChild(titleText)

		this.setTitle = (title) => {
			titleText.innerHTML = ""
			titleText.appendChild(document.createTextNode(title))
		}

		this.setTitle(win.title)
		if (win.id == focusedwindow?.id) this.classList.add("selected")

		this.draggable = true
		this.addEventListener('dragstart', (e) => {
			if (e.target.classList.contains('selected')) {
				e.dataTransfer.setData("application/windowlist",
					JSON.stringify(getSelectedTasks().map(t => getWindowFromTask(t).id)))
			} else {
				getTasks().forEach(task => task.classList.remove('selected'))
				focusedwindow = win
				this.classList.add('selected')
				ahk.runSync(`WinActivate, ahk_id ${win.id}`)
				e.dataTransfer.setData("application/windowlist",
					JSON.stringify([getWindowFromTask(e.target).id]))
			}
		})
		this.addEventListener("dragend", (e) => {
			getSelectedTasks().forEach(task => task.classList.remove('selected'))
			focusedwindow.task?.classList.add('selected')
		})
		this.addEventListener('dragleave', (e) => {
			e.preventDefault()
			e.target.classList.remove('moveToLeft')
			e.target.classList.remove('moveToRight')
		})
		this.addEventListener('dragover', (e) => {
			e.preventDefault()

			if (!checkForWindowList(e)) return false

			if (e.layerX > (e.target.getBoundingClientRect().width / 2)) {
				e.target.classList.remove('moveToLeft')
				e.target.classList.add('moveToRight')
			} else {
				e.target.classList.add('moveToLeft')
				e.target.classList.remove('moveToRight')
			}

			return true
		})
		this.addEventListener('dragenter', (e) => { 
			e.preventDefault()
			return checkForWindowList(e)
		})
		this.addEventListener('drop', (e) => {
			e.preventDefault()
			let draggedTasks = JSON.parse(e.dataTransfer.getData('application/windowlist'))
				.map(winid => windows.find((c) => compareIDs(c.id, winid)).task)

			if (!(draggedTasks.length == 1 && e.target == draggedTasks[0])) {
				let position = tasklistdiv.scrollLeft
				let newTaskList = document.createDocumentFragment();

				let tasks = getTasks().filter((task) => !draggedTasks.includes(task))

				if (e.target.classList.contains('moveToRight')) {
					tasks.splice(tasks.indexOf(e.target) + 1, 0, ...draggedTasks)
				} else {
					tasks.splice(tasks.indexOf(e.target), 0, ...draggedTasks)
				}
				tasks.forEach((task) => newTaskList.appendChild(task))

				tasklistdiv.appendChild(newTaskList)
			/*	window.setTimeout(() => {				// disgusting hack
					tasklistdiv.scrollLeft = position
				}, 5) */
			}

			e.target.classList.remove('moveToLeft')
			e.target.classList.remove('moveToRight')
		})

		this.addEventListener('click', (e) => {
			if (e.button == 0) {
				if (e.ctrlKey) {
					if (e.target.classList.contains('selected')) {
						let selected = getTasks()
							.filter((task) => task != this)
							.find((task) => task.classList.contains('selected'))
						if (selected) {
							ahk.runSync(`WinActivate, ahk_id ${selected.id}`)
							e.target.classList.remove('selected')
							return
						}
					} else {
						e.target.classList.add('selected')
					}
				} else if (e.shiftKey) {
					let selectedTasks = getSelectedTasks()
					let allTasks = getTasks()

					let indices = selectedTasks.map(t => allTasks.indexOf(t)).sort()
					let indexOfTarget = allTasks.indexOf(e.target)
					let leftmostIndex = indices[0]
					let rightmostIndex = indices[indices.length - 1]

					if ((selectedTasks.length - 1) != rightmostIndex - leftmostIndex) return // check if indices aren't continuous

					if (!selectedTasks.includes(e.target)) {
						allTasks.slice(
							(indexOfTarget < leftmostIndex) ? indexOfTarget : leftmostIndex,
							((indexOfTarget < leftmostIndex) ? rightmostIndex : indexOfTarget) + 1
						).forEach((task) => {
							task.classList.add('selected')
						})
					}
				} else {
					if (compareIDs(focusedwindow?.id, win.id)) {
						ahk.runSync(`WinMinimize, ahk_id ${win.id}`)
					} else {
						getSelectedTasks().forEach(task => task.classList.remove('selected'))
						focusedwindow = win
						this.classList.add('selected')
						ahk.runSync(`WinActivate, ahk_id ${win.id}`)
					}
				}
			}
		})
	}
}

customElements.define('window-task', windowTask);


function createTaskLabelForWindow(win) {
	tasklistdiv.appendChild(new windowTask(win))
}


let savedOrders = []

function saveOrder() {
	savedOrders[desktop] = getTasks().map(task => task.getAttribute('winid'))
}


function initTaskbar() {
	tasklistdiv.innerHTML = null
	document.getElementById('taskbar').classList.remove('scrolled')

	windows.filter(win => win.desktop == desktop)
		.sort((a, b) => {
			let indexOfA = savedOrders[desktop]?.findIndex((winid) => compareIDs(winid, a.id)) ?? -1
			let indexOfB = savedOrders[desktop]?.findIndex((winid) => compareIDs(winid, b.id)) ?? -1

			if ((indexOfA == -1) && (indexOfB == -1)) {
				return 0
			} else if ((indexOfB == -1) || (indexOfA < indexOfB)) {
				return -1
			} else {
				return 1
			}
		})
		.forEach(createTaskLabelForWindow)
}


tasklistdiv.addEventListener('mousewheel', (e) => {
		var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
		tasklistdiv.scrollLeft -= (delta * 40); // Multiplied by 40

		if (tasklistdiv.scrollLeft == 0) {
			document.getElementById('taskbar').classList.remove('scrolled')
		} else {
			document.getElementById('taskbar').classList.add('scrolled')
		}
		e.preventDefault();
}, false);





function changeWorkspace(desktopToChangeTo) {
	document.getElementById('ws' + (desktop + 1)).classList.remove("active")
	ahk.setDesktop(desktopToChangeTo)
	document.getElementById('ws' + (desktopToChangeTo + 1)).classList.add("active")
	saveOrder()
	desktop = desktopToChangeTo
	initTaskbar()
}

class workspace extends HTMLElement {
	constructor() {
		super()

		let shadow = this.attachShadow({mode: 'open'});

		let style = document.createElement('link')
		style.setAttribute('rel', 'stylesheet')
		style.setAttribute('href', electron.app.getAppPath() + '\\style\\workspaces.css')

		shadow.appendChild(style)

		let activeindicator = document.createElement('div')
		activeindicator.setAttribute('class', 'activeindicator')

		shadow.appendChild(activeindicator)

		shadow.appendChild(document.createTextNode(this.getAttribute('symbol') ?? "?"))

		let desktopToChangeTo = this.id.match(/\d/) - 1

		this.onclick = () => { changeWorkspace(desktopToChangeTo) }
		this.addEventListener('dragover', (e) => { e.preventDefault(); return checkForWindowList(e) })
		this.addEventListener('dragenter', (e) => { e.preventDefault();  return checkForWindowList(e) })

		this.addEventListener('drop', (e) => {
			e.preventDefault()
			let draggedTasks = JSON.parse(e.dataTransfer.getData('application/windowlist'))
				.map(winid => windows.find((c) => compareIDs(c.id, winid)).task)

			draggedTasks.forEach((task) => {
				let movedWin = windows.find((c) => compareIDs(c.id, getWindowFromTask(task).id))

				ahk.moveWindowToDesktop(movedWin.id, desktopToChangeTo)
				movedWin.desktop = desktopToChangeTo.toString()

				task.remove()
				createTaskLabelForWindow(movedWin)
			})

			this.classList.add("populated")

			if (windows.filter(win => win.desktop == desktop).length == 0) {
				document.getElementById('ws' + (desktop + 1)).classList.remove("populated")
			}

			changeWorkspace(desktopToChangeTo)
		})
	}
}

customElements.define('workspace-indicator', workspace);


function setWorkspaceActive() {
	let filled = new Array(9).fill(false)

	let currentDesktop = ahk.getDesktop()

	for (let i = 0; i < config.workspaces; i++) {
		let wsi = document.getElementById('ws' + (i + 1))

		if (desktop == i) {
			wsi.classList.add("active")
		} else {
			wsi.classList.remove("active")
		}
	}

	return currentDesktop
}

function setWorkspacePopulated() {
	let filled = new Array(9).fill(false)

	windows.forEach((win) => { filled[win.desktop] = true; })

	for (let i = 0; i < config.workspaces; i++) {
		let wsi = document.getElementById('ws' + (i + 1))

		if (filled[i]) {
			wsi.classList.add("populated")
		} else {
			wsi.classList.remove("populated")
		}
	}
}





let openDialog
let dialogOpen = false

let commandFunctions = {
	"OpenTray": () => {
		ahk.runSync('DetectHiddenWindows, On\nControlClick, Button2, ahk_class Shell_TrayWnd')
	},
	"OpenNotifications": () => {
		ahk.runSync('DetectHiddenWindows, On\nControlClick, TrayButton2, ahk_class Shell_TrayWnd')
	},
	"HideTaskbar": () => {
		ahk.runSync('WinHide, ahk_class Shell_TrayWnd')
	},
	"MusicRemote": () => {
		ipcRenderer.send("configRemote", JSON.stringify({
			config: JSON.stringify(config)
		}))
	}
}

let commands = [
	{ text: "Open Tray",			shortcut: "t",	type: "Function",	funct: "OpenTray"			},
	{ text: "Open Notifications",	shortcut: "n",	type: "Function",	funct: "OpenNotifications"	},
	{ text: "Hide Taskbar",							type: "Function",	funct: "HideTaskbar"		},
]

ipcRenderer.send("configRunDialog", JSON.stringify({
	config: JSON.stringify(config),
	commands: JSON.stringify(commands)
}))

function conditionalCommands() {
	let commands = []

	if (client) commands.push({ text: "Music Remote",		type: "Function",	funct: "MusicRemote"		})

	return commands
}

class runWidget extends HTMLElement {
	constructor() {
		super()

		let shadow = this.attachShadow({mode: 'open'});

		let style = document.createElement('link')
		style.setAttribute('rel', 'stylesheet')
		style.setAttribute('href', electron.app.getAppPath() + '\\style\\run.css')

		shadow.appendChild(style)

		ipcRenderer.on('closedDialog', (e) => {
			dialogOpen = false
			this.classList.remove('open')
		})

		ipcRenderer.on('shownDialog', (e, id) => { dialogOpen = id })

		openDialog = () => {
			let screenPosition = this.getBoundingClientRect()

			this.classList.add('open')
			ipcRenderer.send("showRunDialog", JSON.stringify({
				x: screenPosition.x - 10, // half the padding in main.js
				y: bardisplay.bounds.height - (170 + 8), // run window height (170) + space under run input (8)
				commands: JSON.stringify(conditionalCommands())
			}))
		}

		this.onclick = openDialog
	}
}

customElements.define('run-widget', runWidget);

ipcRenderer.on('runFunction', (e, r) => {
	commandFunctions[r]()
});





function fieldMessage(message) {
//	console.log(message)
	let messageWin = message.window

	if (message.type === "WINDOWOPEN") {
		// check if the workspace is not already filled, if so then set workspace 'populated' class
		if (parseInt(messageWin.desktop) < 0) return

		if (desktop == messageWin.desktop) {
			createTaskLabelForWindow(messageWin)
		}

		if (!windows.find((win) => win.desktop == messageWin.desktop)) {
			document.getElementById('ws' + (parseInt(messageWin.desktop) + 1)).classList.add("populated")
		}

		windows.push(messageWin)
	} else if (message.type === "WINDOWCLOSE") {
		windows.find((win) => compareIDs(messageWin.id, win.id))?.task?.remove()

		let index = windows.findIndex((win) => compareIDs(messageWin.id, win.id))
		if (index >= 0) {
			let desktopOfClosedWindow = windows[index].desktop
			// check if the workspace is not already filled, if so xthen unset workspace 'populated' class
			windows.splice(index, 1)

			if (!windows.find((win) => win.desktop == desktopOfClosedWindow)) {
				document.getElementById('ws' + (parseInt(desktopOfClosedWindow) + 1)).classList.remove("populated")
			}
		}
	} else if (message.type === "WINDOWRETITLE") {
		if (messageWin.title == "") return // old title is better than none

		let winToRetitle = windows.find((win) => compareIDs(win.id, messageWin.id))
		if (winToRetitle) winToRetitle.title = messageWin.title
		
		winToRetitle?.task?.setTitle(messageWin.title)
	} else if (message.type === "WINDOWFOCUS") {
		message.trayOpen
		focusedwindow?.task?.classList.remove('selected')

		if (!compareIDs(focusedwindow?.id, messageWin.id)) focusedwindow = windows.find((win) => compareIDs(win.id, messageWin.id))

		focusedwindow?.task?.classList.add('selected')
		if ((messageWin.id == 0) && !message.trayOpen) {
				ahk.runSync(`WinActivate, ahk_id ${barid}`) // restore bar after Win + D
		}

		if (dialogOpen && !compareIDs(dialogOpen, messageWin.id)) ipcRenderer.send('closeDialog')
	} else if (message.type === "SHORTCUT") {
		switch (message.command) {
			case "run":		openDialog?.();						break;
			case "ws":		changeWorkspace(message.which);		break;
		}
	}
}

function processData(data) {
	data = data.toString()
	let pid = data.match( /AHKPID (\d+)/ )

	if (pid) {
		ahkPid.push(pid[1])
		return
	} else {
		data.split('\n').forEach((message) => {
			if (message != "") fieldMessage(JSON.parse(message))
		})
	}
}


function hookAHK() {
	ahk.run(
`
DetectHiddenWindows, on
pid := DllCall("GetCurrentProcessId")
FileAppend, AHKPID %pid%,*,UTF-8
hVirtualDesktopAccessor := DllCall("LoadLibrary", Str, "${__dirname}\\VirtualDesktopAccessor.dll", "Ptr")
GetWindowDesktopNumber := DllCall("GetProcAddress", Ptr, hVirtualDesktopAccessor, AStr, "GetWindowDesktopNumber", "Ptr")

DllCall("RegisterShellHookWindow", UInt, A_ScriptHwnd)
MsgNum := DllCall("RegisterWindowMessage", Str, "SHELLHOOK")
OnMessage(MsgNum, "ShellMessage")

ShellMessage( wP, lP )
{
	Critical
	global GetWindowDesktopNumber
	if (wP = 1)
	{
		WinGetClass, this_class, ahk_id %lP%
		WinGetTitle, this_title, ahk_id %lP%
		WinGet, this_exe, ProcessName, ahk_id %lP% 
		WinGet, this_status, MinMax, ahk_id %lP%
		WinGetPos, this_x, this_y, this_width, this_height, ahk_id %lP%

		this_title := StrReplace(this_title, "\\", "\\\\")
		this_title := StrReplace(this_title, """", "\\""")

		desktop := DllCall(GetWindowDesktopNumber, UInt, lP)

		json := "{""type"": ""WINDOWOPEN"", ""window"": {""id"":""" . lP . ""","
		json .= """desktop"":""" . desktop . ""","
		json .= """class"":""" . this_class . ""","
		json .= """exe"":""" . this_exe . ""","
		json .= """status"":""" . this_status . ""","
		json .= """title"":""" . this_title . ""","
		json .= """position"":{""x"":""" . this_x . """,""y"":""" . this_y . """},"
		json .= """size"":{""width"":""" . this_width . """,""height"":""" . this_height . """}}}"

		FileAppend, %json%\`n,*,UTF-8
	}
	else if (wP = 6)
	{
		WinGetTitle, this_title, ahk_id %lP%

		this_title := StrReplace(this_title, "\\", "\\\\")
		this_title := StrReplace(this_title, """", "\\""")

		json := "{""type"": ""WINDOWRETITLE"", ""window"": {""id"":""" . lP . """, ""title"":""" . this_title . """}}"

		FileAppend, %json%\`n,*,UTF-8
	}
	else if (wp = 32772)
	{
		WinGetTitle, this_title, ahk_id %lP%
		WinGetClass, this_class, ahk_id %lP%
		WinGet, this_exe, ProcessName, ahk_id %lP% 

		this_title := StrReplace(this_title, "\\", "\\\\")
		this_title := StrReplace(this_title, """", "\\""")

		DetectHiddenWindows, off
		tray_open := WinExist("ahk_class NotifyIconOverflowWindow") ? "true" : "false"
		DetectHiddenWindows, on

		json := "{""type"": ""WINDOWFOCUS"", ""trayOpen"": " . tray_open . ", ""window"": {""id"":""" . lP . """, ""title"":""" . this_title . """, ""class"":""" . this_class . """, ""exe"":""" . this_exe . """}}"

		FileAppend, %json%\`n,*,UTF-8
	}
	else
	{
		; json := "{""lP"":""" . lP . """, ""wP"":""" . wP . """}"
		; FileAppend, %json%\`n,*,UTF-8
	}
}

#r::
	json := "{""type"": ""SHORTCUT"", ""command"": ""run""}"
	FileAppend, %json%\`n,*,UTF-8
return
!+F1::
	json := "{""type"": ""SHORTCUT"", ""command"": ""ws"", ""which"": 0}"
	FileAppend, %json%\`n,*,UTF-8
return
!+F2::
	json := "{""type"": ""SHORTCUT"", ""command"": ""ws"", ""which"": 1}"
	FileAppend, %json%\`n,*,UTF-8
return
!+F3::
	json := "{""type"": ""SHORTCUT"", ""command"": ""ws"", ""which"": 2}"
	FileAppend, %json%\`n,*,UTF-8
return

`,		processData)		

	// Messages that do not call for more information can be processed here for lower latency

	let message = parseInt(ahk.runSync(
`
DllCall("RegisterShellHookWindow", UInt, ahk_id ${barid})
MsgNum := DllCall("RegisterWindowMessage", Str, "SHELLHOOK")

FileAppend, %MsgNum%,*,UTF-8
`	))
	
	barwindow.hookWindowMessage(message, (wP, lP) => {
		wP = wP.readInt32LE(), lP = lP.readInt32LE()

//		console.log(wP, lP)

		if (wP == 2) {
			fieldMessage({type: "WINDOWCLOSE", window: {id: lP}})
		}
	})
}





window.addEventListener("load", () => {
	position()
	
	windows = ahk.getManagedWindows()
	desktop = setWorkspaceActive()
	focusedwindow = windows.find((win) => compareIDs(win.id, ahk.runSync(
`
a := WinExist("A")
FileAppend, %a%,*,UTF-8
`
	)))

	setWorkspacePopulated()
	initTaskbar()

	window.setInterval(setWorkspaceActive, 5000) // refresh for virtual desktop change from Win + Tab or other

	hookAHK()
});