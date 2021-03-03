function getTime() {
	return new Date().toLocaleTimeString("en", {
		hourCycle: "h12",
		hour: "numeric",
		minute: "numeric"}).slice(0, -3)
}


class clockWidget extends HTMLElement {
	constructor() {
		super()

		let shadow = this.attachShadow({mode: 'open'});

		let style = document.createElement('link')
		style.setAttribute('rel', 'stylesheet')
		style.setAttribute('href', electron.app.getAppPath() + '\\widgets\\clock\\clock.css')

		let text = document.createElement('div')

		shadow.appendChild(text)
		shadow.appendChild(style)

		text.textContent = getTime()

		window.setInterval(() => {
			text.textContent = getTime()
		}, 2000)

		this.onclick = () => {
			ipcRenderer.send("configCalendar", JSON.stringify({
				config: JSON.stringify(config)
			}))
		}
	}
}

customElements.define('clock-widget', clockWidget);
