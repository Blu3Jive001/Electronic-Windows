let condicons = [
			"storm",             "storm",             "storm",             "storm",             "storm",             "snow",              "showers",           "snow",              "showers",	         "showers",           "showers",
                                 "showers",           "showers",           "snow",              "snow",              "snow",              "snow",              "snow",              "snow",              "fog",               "fog",
                                 "fog",               "fog",               "windy",             "windy",             "snow",              "overcast",          "few-clouds-night",  "few-clouds",        "few-clouds-night",  "few-clouds",
                                 "clear-night",       "clear",             "clear-night",       "clear",             "snow",              "clear",             "storm",             "storm",             "storm",             "showers-scattered",
                                 "snow",              "snow",              "snow",              "few-clouds",        "storm",             "snow",              "storm"
]

function getWeather(callback) {
	let url = 'http://weather.service.msn.com/find.aspx?src=outlook&weadegreetype=F&culture=en-US&weasearchstr=Plant%20City%2C%20Florida'
	
	http.get(url, (resp) => {
		let data = '';
	
		// A chunk of data has been recieved.
		resp.on('data', (chunk) => { data += chunk; });
		
		resp.on('end', () => { callback(data); });
	
	}).on("error", (err) => {
	  console.log("Error fetching weather: " + err.message);
	});
}


class weatherWidget extends HTMLElement {
	constructor() {
		super()

		let shadow = this.attachShadow({mode: 'open'});

		let style = document.createElement('link')
		style.setAttribute('rel', 'stylesheet')
		style.setAttribute('href', electron.app.getAppPath() + '\\widgets\\weather\\weather.css')

		let icon = document.createElement('img')
		icon.id = "icon"

		let conditionDiv = document.createElement('div')
		conditionDiv.id = "condition"

		shadow.appendChild(icon)
		shadow.appendChild(conditionDiv)
		shadow.appendChild(style)

		let updateWeather = () => {
			getWeather((xml) => {
				let wea = new DOMParser().parseFromString(xml, "text/xml")
				let temperature = wea.getElementsByTagName('current')[0].getAttribute('temperature')
				let code = wea.getElementsByTagName('current')[0].getAttribute('skycode')
				let condition = wea.getElementsByTagName('current')[0].getAttribute('skytext')

				conditionDiv.textContent = `${temperature}° and ${condition}`
				icon.src = "res/weather-" + condicons[code] + "-symbolic.svg"
			
				switch (condicons[code]) {
					case 'clear-night':
					case 'few-clouds-night':
						this.className = "night"
						break;
					case 'few-clouds':
					case 'overcast':
					case 'showers':
					case 'showers-scattered':
						this.className = "rainy"
						break;
					case 'snow':
						this.className = "snowy"
						break;
					default:
						this.className = ""
				}
			})
		}

		updateWeather()
		window.setInterval(updateWeather, 10 * 60 * 1000)
	}
}

customElements.define('weather-widget', weatherWidget);
