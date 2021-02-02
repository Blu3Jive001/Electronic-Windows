const cp = require('child_process')

const ahkPath = '"C:\\Program Files\\AutoHotkey\\AutoHotkey.exe"'


let noenv = "#NoTrayIcon\n#NoEnv\nSetBatchLines, -1\n"

function runSync(script) {
	return cp.execSync(ahkPath + ' *', {input: noenv + script}).toString();
}

function run(script, datacallback) {
	let ahk = cp.spawn(ahkPath, ['*'], { cwd: __dirname, shell: true })
	ahk.stdout.on('data', datacallback)
	ahk.stderr.on('data', (data) => { console.error(`stderr: ${data}`); });
	ahk.stdin.write(noenv + script)
	ahk.stdin.end()

	return ahk
}

/*
hVirtualDesktopAccessor := DllCall("LoadLibrary", Str, "${__dirname}\\VirtualDesktopAccessor.dll", "Ptr")

GetDesktopCount := DllCall("GetProcAddress", Ptr, hVirtualDesktopAccessor, AStr, "GetDesktopCount", "Ptr")

current := DllCall(GetDesktopCount, UInt)
FileAppend, %current%,*
*/
function getDesktopCount() {
	return runSync(
`
current := DllCall(DllCall("GetProcAddress", Ptr, DllCall("LoadLibrary", Str, "${__dirname}\\VirtualDesktopAccessor.dll", "Ptr"), AStr, "GetDesktopCount", "Ptr"), UInt)
FileAppend, %current%,*

`
	);
}

function getDesktop() {
	return parseInt(runSync(
`
current := DllCall(DllCall("GetProcAddress", Ptr, DllCall("LoadLibrary", Str, "${__dirname}\\VirtualDesktopAccessor.dll", "Ptr"), AStr, "GetCurrentDesktopNumber", "Ptr"), UInt)
FileAppend, %current%,*

`
	));
}

function moveWindowToDesktop(hwnd, desktop) {
	runSync(
`
DllCall(DllCall("GetProcAddress", Ptr, DllCall("LoadLibrary", Str, "${__dirname}\\VirtualDesktopAccessor.dll", "Ptr"), AStr, "MoveWindowToDesktopNumber", "Ptr"), UInt, ${hwnd}, UInt, ${desktop})
`
	);
}

/*
hVirtualDesktopAccessor := DllCall("LoadLibrary", Str, "${__dirname}\\VirtualDesktopAccessor.dll", "Ptr")
GoToDesktopNumber := DllCall("GetProcAddress", Ptr, hVirtualDesktopAccessor, AStr, "GoToDesktopNumber", "Ptr")

DllCall(GoToDesktopNumberProc, Int, ${desktop})
*/
function setDesktop(desktop) {
	runSync(
`
DllCall(DllCall("GetProcAddress", Ptr, DllCall("LoadLibrary", Str, "${__dirname}\\VirtualDesktopAccessor.dll", "Ptr"), AStr, "GoToDesktopNumber", "Ptr"), Int, ${desktop})
`
	);
}

/*
function getWindows() {
	return JSON.parse(runSync(
`
DetectHiddenWindows, on
hVirtualDesktopAccessor := DllCall("LoadLibrary", Str, "${__dirname}\\VirtualDesktopAccessor.dll", "Ptr")
GetWindowDesktopNumber := DllCall("GetProcAddress", Ptr, hVirtualDesktopAccessor, AStr, "GetWindowDesktopNumber", "Ptr")
FileAppend, [,*
WinGet, id, List
Loop, %id%
{
	this_id := id%A_Index%
	WinGetClass, this_class, ahk_id %this_id%
	WinGetTitle, this_title, ahk_id %this_id%
	WinGet, hwnd, ID, ahk_id %this_id%

	this_title := StrReplace(this_title, "\\", "\\\\")
	this_title := StrReplace(this_title, """", "\\""")

	desktop := DllCall(GetWindowDesktopNumber, UInt, this_id)

	json := "{""title"":""" . this_title . """,""class"":""" . this_class . """,""id"":""" . this_id . """,""desktop"":" . desktop . "}"
	FileAppend, %json%,*,UTF-8

	If (A_Index != id)
	{
		FileAppend, \`,,*
	}
}
FileAppend, ],*
`
	))
}
*/

function getWindows() {
	try {
		a = runSync(
`
DetectHiddenWindows, on
hVirtualDesktopAccessor := DllCall("LoadLibrary", Str, "${__dirname}\\VirtualDesktopAccessor.dll", "Ptr")
GetWindowDesktopNumber := DllCall("GetProcAddress", Ptr, hVirtualDesktopAccessor, AStr, "GetWindowDesktopNumber", "Ptr")
json := "["
WinGet, id, List
Loop, %id%
{
	this_id := id%A_Index%
	WinGetClass, this_class, ahk_id %this_id%
	WinGetTitle, this_title, ahk_id %this_id%
    WinGet, this_exe, ProcessName, ahk_id %this_id% 
    WinGet, this_status, MinMax, ahk_id %this_id%
    WinGetPos, this_x, this_y, this_width, this_height, ahk_id %this_id%

	this_title := StrReplace(this_title, "\\", "\\\\")
	this_title := StrReplace(this_title, """", "\\""")

	VarSetCapacity(rc, 16)
    DllCall("GetClientRect", "uint", this_id, "uint", &rc)
    cw := NumGet(rc, 8, "int")
    ch := NumGet(rc, 12, "int")

	desktop := DllCall(GetWindowDesktopNumber, UInt, this_id)

	json .= "{""id"":""" . this_id . ""","
	json .= """desktop"":""" . desktop . ""","
	json .= """class"":""" . this_class . ""","
	json .= """exe"":""" . this_exe . ""","
	json .= """status"":""" . this_status . ""","
	json .= """title"":""" . this_title . ""","
	json .= """position"":{""x"":""" . this_x . """,""y"":""" . this_y . """},"
	json .= """size"":{""width"":""" . this_width . """,""height"":""" . this_height . """},"
	json .= """clientsize"":{""width"":""" . cw . """,""height"":""" . ch . """}}"

	If (A_Index != id)
		json .= ","
}
json .= "]"
FileAppend, %json%,*,UTF-8
`
		)
		return JSON.parse(a)
	} catch(e) {
		console.log(e, a)
	}
}

function setMargins(dimensions, callback) {
	let {left, top, right, bottom} = dimensions
	runSync(
`
VarSetCapacity( area, 16, 0 )
NumPut(${left}, area, 0, "Uint") 
NumPut(${top}, area, 4, "Uint")
NumPut(${right}, area, 8, "Uint")
NumPut(${bottom}, area, 12, "Uint")
DllCall("SystemParametersInfo", "uint", 0x2F, "uint", 0, "uint", &area, "uint", 0)
`
	)
	callback?.();
}

function setMarginsWithOffsets(display, offsets, callback) {
	let dpi = display.scaleFactor
	let {x, y, width, height} = display.bounds
	let {top, bottom} = offsets

	setMargins({
		left: x * dpi,	right: (x + width) * dpi,
		top: (y + top) * dpi, bottom: (y + height - bottom) * dpi 
	}, callback)
}





exports.getDesktop = getDesktop
exports.run = run
exports.runSync = runSync
exports.setDesktop = setDesktop
exports.setMargins = setMargins
exports.setMarginsWithOffsets = setMarginsWithOffsets
exports.moveWindowToDesktop = moveWindowToDesktop

exports.getManagedWindows = () => {
	let windows = getWindows()
	let mw = []

	windows.forEach((window) => {
		if (window.desktop != -1) mw.push(window)
	})

	return mw
}

exports.setWorkspace = () => {

}