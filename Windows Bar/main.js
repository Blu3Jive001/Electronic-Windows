const { app, BrowserWindow, screen, ipcMain } = require('electron')
// const ewc = require('ewc');

let musicRemote
let calendarApplet

app.whenReady().then(() => {
	// Create the browser window.
	let barWindow = new BrowserWindow({
		alwaysOnTop: false,				width: 1280,
		height: 800,					frame: false,
		transparent: true,				resizable: false,
		minimizable: false,				skipTaskbar: true,
		maximizable: false,				fullscreen: true,
		title: "",						focusable: false,
		backgroundColor: '#00000000',
		webPreferences: {
			nodeIntegration: true,
			enableRemoteModule: true
		}
	})

	barWindow.loadFile('bar.html')
//	barWindow.webContents.openDevTools({mode: "detach"})

//	ewc.setAcrylic(barWindow, 0x1B2025)


	let runDialog = new BrowserWindow({
		alwaysOnTop: true,				frame: false,
		thickFrame: false,				backgroundColor: '#00000000',
		width: 220,		// 200 (width) plus 20 (padding for shadow, etc.)
		height: 170,	// 120 (dialog height) plus 50 (padding for space, search bar height, etc.)
		transparent: true,				resizable: false,
		minimizable: false,				skipTaskbar: true,
		maximizable: false,				fullscreen: false,
		title: "",						focusable: true,
		show: false,					webPreferences: {
			nodeIntegration: true,
			enableRemoteModule: true
		}
	})

	runDialog.loadFile('run.html')
//	runDialog.webContents.openDevTools({mode: "detach"})

	ipcMain.on('configRemote', (e, s) => {
		let settings = JSON.parse(s)

		if (!musicRemote) {
			musicRemote = new BrowserWindow({
				alwaysOnTop: false,				frame: false,
				thickFrame: false,
				width: 220,		// 200 (width) plus 20 (padding for shadow, etc.)
				height: 280,	// 260 (height) plus 20 (padding for shadow, etc.)
				transparent: true,				resizable: false,
				minimizable: false,				skipTaskbar: false,
				maximizable: false,				fullscreen: false,
				backgroundColor: '#00000000',	focusable: true,
				title: "Music Remote",
				show: true,					webPreferences: {
					nodeIntegration: true,
					enableRemoteModule: true
				}
			})

			musicRemote.loadFile('widgets/music/remote.html')
//			musicRemote.webContents.openDevTools({mode: "detach"})

			musicRemote.on('closed', () => {
  				musicRemote = null
			})

			ipcMain.on('configReady', (e) => {
				musicRemote.webContents.send('config', settings.config)
  			})
		}
	})

	ipcMain.on('clientMessage', (e, m) => { musicRemote?.webContents.send('clientMessage', m) })
	ipcMain.on('shownRemote', (e) => { barWindow.webContents.send('shownRemote') })
	ipcMain.on('sendMusicBeeJSON', (e, f) => { barWindow.webContents.send('sendMusicBeeJSON', f) })

	ipcMain.on('configCalendar', (e, s) => {
		let settings = JSON.parse(s)

		if (!calendarApplet) {
			calendarApplet = new BrowserWindow({
				alwaysOnTop: false,				frame: false,
				thickFrame: false,
				width: 550,
				height: 300,
				transparent: true,				resizable: false,
				minimizable: true,				skipTaskbar: false,
				maximizable: false,				fullscreen: false,
				backgroundColor: '#00000000',	focusable: true,
				title: "Calendar",
				show: true,						webPreferences: {
					nodeIntegration: true,
					enableRemoteModule: true
				}
			})

			calendarApplet.loadFile('widgets/clock/calendar/calendar.html')
//			calendarApplet.webContents.openDevTools({mode: "detach"})

			calendarApplet.on('closed', () => {
  				calendarApplet = null
			})

			ipcMain.on('calendarConfigReady', (e) => {
				calendarApplet.webContents.send('calendarConfig', settings.config)
  			})
		}
	})



	ipcMain.on('configRunDialog', (e, s) => {
		let settings = JSON.parse(s)
		runDialog.webContents.send('config', settings.config, settings.commands)
	})

	ipcMain.on('closedDialog', (e) => { barWindow.webContents.send('closedDialog') })
	ipcMain.on('shownDialog', (e, s) => { barWindow.webContents.send('shownDialog', s) })
	ipcMain.on('closeDialog', (e) => { runDialog.webContents.send('closeDialog') })
	ipcMain.on('showRunDialog', (e, s) => {
		let settings = JSON.parse(s)
		runDialog.webContents.send('show', settings.commands)
	
		if (!runDialog.isVisible()) runDialog.show()
		if ((runDialog.getBounds().x != settings.x) || (runDialog.getBounds().y != settings.y)) runDialog.setPosition(settings.x, settings.y)
	})

	ipcMain.on('runFunction', (e, f) => { barWindow.webContents.send('runFunction', f) })



	barWindow.on('close', (e) => {
		if (barWindow) {
			e.preventDefault()
			barWindow.webContents.send('app-close')
		}
	})

	ipcMain.on('closed', _ => {
		app.quit();
		runDialog = null;
		barWindow = null;
		musicRemote = null;
		calendarApplet = null;
	});
})