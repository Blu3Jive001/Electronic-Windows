const fs = require('fs')
const cp = require('child_process')
const e = require('electron')

const electron = e.remote
const ipcRenderer = e.ipcRenderer

let events = require(electron.app.getAppPath() + '\\events.json')
let calendarwindow = electron.getCurrentWindow()
let settings = {}

const {Menu, MenuItem} = electron
const menu = new Menu();

menu.append(new electron.MenuItem({label: 'Open Console', click: () => {
	calendarwindow.webContents.openDevTools({mode: "detach"}) }}))

document.getElementById("container").addEventListener('contextmenu', (e) => {
	e.preventDefault()
	menu.popup(calendarwindow)
}, false)




let now, today, actualthismonth, displayday, displaymonth

function save() {
	fs.writeFile(
			electron.app.getAppPath() + '\\events.json',
			JSON.stringify(events),
			(err) => { if (err) throw err; }
		);
}

function extendWindow() {
	calendarwindow.setShape([{
		x: 0,
		y: 0,
		width: 500,
		height: 248
	}])
	document.getElementById("container").style.width = "460px"
}

function contractWindow() {
	calendarwindow.setShape([{
		x: 0,
		y: 0,
		width: 220,
		height: 248
	}])
	document.getElementById("container").style.width = "180px"
}

function applyDay(day = {
			day: displayday.getDate(),
			month: displayday.getMonth(),
			year: displayday.getFullYear()
		}) {
	let thisday = new Date(day.year, day.month, day.day)
	displayday = thisday

	document.getElementById('heading').textContent = "Events - " + thisday
		.toLocaleString(settings.locale, {day: "numeric", month: "numeric", year: "numeric"})

	let dayevents = events[String(Number(thisday))]
	let results = document.createElement('div');
	results.setAttribute('id', 'reminders')

	if (dayevents) {
		dayevents.forEach((event, index) => {
			let reminder = document.createElement('div');				// Do I really not need jquery...
				remindertext = document.createElement('div');
				remindertime = document.createElement('div');
				removebutton = document.createElement('div');
			reminder.setAttribute('class', ( event.checked )
				? 'reminder checked'
				: 'reminder')
			remindertext.setAttribute('class', 'remindertext')
			remindertext.appendChild(document.createTextNode(event.text))
			remindertime.setAttribute('class', 'remindertime')
			remindertime.appendChild(document.createTextNode(event.when))
			removebutton.setAttribute('class', 'removebutton')
			reminder.appendChild(remindertext)
			reminder.appendChild(remindertime)
			reminder.appendChild(removebutton)

			reminder.onclick = () => {
				// toggle cross-out
				event.checked = !event.checked
				reminder.setAttribute('class', ( event.checked )
					? 'reminder checked'
					: 'reminder')

				save()
			}

			removebutton.onclick = () => {
				dayevents.splice(index, 1)

				if (dayevents.length == 0) {
					let daytile = document.getElementById('day' + (thisday.getDate() + displaymonth.getDay()))

					daytile.classList.remove('interest')
					delete events[String(Number(thisday))]
				}

				reminder.remove()
				save()
				applyDay()
			}

			results.appendChild(reminder)
		})

		document.getElementById('reminderlist').replaceChild(
			results,
			document.getElementById('reminders')
		)
	} else {
		document.getElementById('reminders').innerHTML = ""
	}

	extendWindow()
}

document.getElementById('closebutton').onclick = () => {
	contractWindow()
}

document.getElementById('addbutton').onclick = () => {
	if (events[String(Number(displayday))] == undefined) {
		events[String(Number(displayday))] = []

		let daytile = document.getElementById('day' + (displayday.getDate() + displaymonth.getDay()))
		
		if (!daytile.classList.contains('current')) daytile.classList.add('interest')
	}

	let text = document.getElementById('newtext').value
	let time = document.getElementById('newtime').value

	if (text != "") events[String(Number(displayday))].push({
		text: text,
		checked: false,
		when: time ? time : 'All day'
	})

	document.getElementById('newtext').value = ""
	document.getElementById('newtime').value = ""

	save()
	applyDay()
}

function applyMonth(month) {
	let thismonth = new Date(month.year, month.index)
	let lastmonth = Reflect.construct(Date, ( month.index == 0 )
			? [month.year - 1, 11]
			: [month.year, month.index - 1])
	let nextmonth = Reflect.construct(Date, ( month.index == 11 )
			? [month.year + 1, 0]
			: [month.year, month.index + 1])

	document.getElementById('date').textContent = thismonth
		.toLocaleString('en-US', {month: "long", year: "numeric"})
		.replace(' ', ', ')

	let [daysinlastmonth, daysinthismonth] =
		[lastmonth, thismonth].map(
			(month) => new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
		)

	for (let i = 1; i < thismonth.getDay() + 1; i++) {
		with (document.getElementById('day' + i)) {
			textContent = i + daysinlastmonth - thismonth.getDay()
			setAttribute('class', 'day othermonth') }
	}

	for (let i = 1; i <= daysinthismonth; i++) {
		with (document.getElementById('day' + (i + thismonth.getDay()))) {
			textContent = i
			setAttribute('class', ( i == today.getDate() && thismonth.getTime() == actualthismonth.getTime() )
				? 'day current selected'
				: ( events[String(Number(new Date(
					thismonth.getFullYear(),
					thismonth.getMonth(),
					i)))] )
				? 'day interest'
				: 'day'
			)
			onclick = () => {
				document.getElementById('day' + (thismonth.getDay() + displayday.getDate()))
					.classList.remove('selected')
				applyDay({day: i, month: month.index, year: month.year})
				classList.add('selected')
			}
		}
	}

	for (let i = 1; i <= (42 - daysinthismonth - thismonth.getDay()); i++) {
		with (document.getElementById('day' + (i + thismonth.getDay() + daysinthismonth))) {
			textContent = i
			setAttribute('class', 'day othermonth') }
	}

/*	applyDay({month: month.index, year: month.year, day: ( thismonth.getTime() == actualthismonth.getTime() )
		? today.getDate()
		: 1
	})*/
}

function apply() {
	applyMonth({index: displaymonth.getMonth(), year: displaymonth.getFullYear()})
}


document.getElementById('prevbutton').onclick = () => {
	let month = displaymonth.getMonth()
	let year = displaymonth.getFullYear()

	displaymonth = Reflect.construct(Date, ( month == 0 )
			? [year - 1, 11]
			: [year, month - 1])

	apply()
}

document.getElementById('nextbutton').onclick = () => {
	let month = displaymonth.getMonth()
	let year = displaymonth.getFullYear()

	displaymonth = Reflect.construct(Date, ( month == 11 )
			? [year + 1, 0]
			: [year, month + 1])

	apply()
}

document.getElementById('date').onclick = () => {
	displaymonth = actualthismonth

	apply()
}


function refresh() {
	now = new Date()
	today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	actualthismonth = new Date(today.getFullYear(), today.getMonth())

	displayday = today
	displaymonth = actualthismonth

	apply()

	setTimeout(refresh,
		Number(new Date(now.getFullYear(), now.getMonth(), now.getDate())) + 86400000 - now
	)
}

refresh()


ipcRenderer.on('blur', () => { document.body.classList.remove('focus') })
ipcRenderer.on('focus', () => { document.body.classList.add('focus') })


ipcRenderer.on('calendarConfig', (e, c) => {
	let config = JSON.parse(c)
	document.documentElement.style.setProperty('--font-family', `${config.style.fontFamily}`);
	document.documentElement.style.setProperty('--font-size', config.style.fontSize + "px");
	settings.locale = config.calendarLocale
})

ipcRenderer.send("calendarConfigReady")