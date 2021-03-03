const electronMain = require('electron')
const http = require('http')

const electron = electronMain.remote
const {Menu, MenuItem} = electron

const menu = new Menu();

menu.append(new MenuItem({label: 'Quit', click: () => {
		electron.app.quit()
	}}))
menu.append(new MenuItem({label: 'Reload', click: () => {
		window.location.reload()
	}}))
menu.append(
	new electron.MenuItem({
		label: 'Open Console',
		click: () => {electron.getCurrentWindow().webContents.openDevTools({mode: "detach"})}
	}))

window.addEventListener('contextmenu', (e) => {
	e.preventDefault()
	menu.popup(electron.getCurrentWindow())
}, false)





const place = "Bedford, England"
const body = document.getElementById('container')

//	0                    1                    2                    3                    4                    5                    6                    7                    8                    9                    10
let condicons = [
	"storm",             "storm",             "storm",             "storm",             "storm",             "snow",              "showers",           "snow",              "showers",	         "showers",           "showers",
                         "showers",           "showers",           "snow",              "snow",              "snow",              "snow",              "snow",              "snow",              "fog",               "fog",
                         "fog",               "fog",               "windy",             "windy",             "snow",              "overcast",          "few-clouds-night",  "few-clouds",        "few-clouds-night",  "few-clouds",
                         "clear-night",       "clear",             "clear-night",       "clear",             "snow",              "clear",             "storm",             "storm",             "storm",             "showers-scattered",
                         "snow",              "snow",              "snow",              "few-clouds",        "storm",             "snow",              "storm"
]

condicons[3200] = "severe-alert"

function getWeather(callback) {
	let url = `http://weather.service.msn.com/find.aspx?src=outlook&weadegreetype=F&culture=en-US&weasearchstr=${encodeURIComponent(place)}`
	
	http.get(url, (resp) => {
		let data = '';
	
		// A chunk of data has been recieved.
		resp.on('data', (chunk) => { data += chunk; });
		
		resp.on('end', () => { callback(data); });
	
	}).on("error", (err) => {
	  console.log("Error fetching weather: " + err.message);
	});
}

function updateWeather(data) {
	getWeather((xml) => {
		let wea = new DOMParser().parseFromString(xml, "text/xml")
		console.log(wea)
		let temperature = wea.getElementsByTagName('current')[0].getAttribute('temperature')
		let code = wea.getElementsByTagName('current')[0].getAttribute('skycode')
		let condition = wea.getElementsByTagName('current')[0].getAttribute('skytext')
		let city = wea.getElementsByTagName('weather')[0].getAttribute('weatherlocationname').match(/([^,]+),/)[1]

		document.getElementById("conditiontext").textContent = condition
		document.getElementById("temp").textContent = temperature + "°"
		document.getElementById("place").textContent = city

		document.getElementById("weathericon").src = "icons/weather-" + condicons[code] + "-symbolic.svg"
		
		switch (condicons[code]) {
			case 'clear-night':
			case 'few-clouds-night':
				body.style.backgroundColor = "#183048"
				break;
			case 'few-clouds':
			case 'overcast':
			case 'showers':
			case 'showers-scattered':
				body.style.backgroundColor = "#68758e"
				break;
			case 'snow':
				body.style.backgroundColor = "#6fc3ff"
				break;
			default:
				body.style.backgroundColor = "#42baea"
		}
	})
}

updateWeather()
window.setInterval(updateWeather, 60000)