const electron = require('electron')
const app = electron.app

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

app.on('ready', () => {
	win = new electron.BrowserWindow({
		alwaysOnTop: false,				width: 480,
		height: 180,					frame: false,
		transparent: true,				resizable: true,
		minimizable: true,				skipTaskbar: false,
		fullscreenable: false,			backgroundColor: '#00000000',
		webPreferences: {
			nodeIntegration: true,
			enableRemoteModule: true
		}
    })

    win.loadURL(`file://${__dirname}/weather.html`)
//	win.webContents.openDevTools({mode: "detach"})
})