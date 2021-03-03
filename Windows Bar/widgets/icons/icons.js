const defaultColor = "#C5C8A8" 
const alertColor = "#D85774"
const unknownColor = "#BACCAC"

class tasksButton extends HTMLElement {
	constructor() {
		super()

		let shadow = this.attachShadow({mode: 'open'});

		let style = document.createElement('link')
		style.setAttribute('rel', 'stylesheet')
		style.setAttribute('href', electron.app.getAppPath() + '\\widgets\\icons\\icons.css')

		let icon = document.createElement('div')

		icon.id = "icon"

		shadow.appendChild(icon)
		shadow.appendChild(style)

		this.onclick = () => {
			if (this.classList.contains('visible')) {
				this.classList.remove('visible')
			} else { 
				this.classList.add('visible')
			}
		}
	}
}

customElements.define('tasks-button', tasksButton);





class wifiWidget extends HTMLElement {
	constructor() {
		super()

		let shadow = this.attachShadow({mode: 'open'});

		let style = document.createElement('link')
		style.setAttribute('rel', 'stylesheet')
		style.setAttribute('href', electron.app.getAppPath() + '\\widgets\\icons\\icons.css')

		let icon = document.createElement('div')

		icon.id = "icon"
		icon.style.webkitMaskImage = 'url(res/signal_wifi_off-24px.svg)'

		shadow.appendChild(icon)
		shadow.appendChild(style)

		window.setInterval(() => {
			cp.exec("netsh wlan show interfaces", (err, out) => {
				let strength = out.match(/(\d+)%/)?.[1] ?? 0
				let ssid = out.match(/SSID[\s]*:\s([^\n]*)/)?.[1] ?? "Not connected"

				let level = Math.round(parseInt(strength) / 100 * 4)

				icon.style.webkitMaskImage = `url(res/signal_wifi_${level}_bar-24px.svg)`
				this.title = ssid
			})
		}, 2000)
	}
}

customElements.define('wifi-widget', wifiWidget);





/*
<svg id="batterymeter" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
	<defs>
		<clipPath id="batmask">
			<rect x="2" y="5" width="12" height="6" rx="1" ry="1" style="fill: #fff; stroke: none"/>
		</clipPath>
	</defs>

	<rect x="1" y="4" width="14" height="8" rx="2" ry="2" style="fill: none; stroke: #fff; stroke-width: 1px;"/>
	<rect id="batteryfill" x="2" y="5" width="12" height="6" style="fill: #fff;" clip-path="url(#batmask)" />
</svg>
*/

class batteryWidget extends HTMLElement {
	constructor() {
		super()

		let shadow = this.attachShadow({mode: 'open'});

		let style = document.createElement('link')
		style.setAttributeNS(null, 'rel', 'stylesheet')
		style.setAttributeNS(null, 'href', electron.app.getAppPath() + '\\widgets\\icons\\icons.css')

		let icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
		icon.setAttributeNS(null, 'width', "16")
		icon.setAttributeNS(null, 'height', "16")

		let defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
		let batteryMask = document.createElementNS('http://www.w3.org/2000/svg','clipPath')
		batteryMask.id = "batmask"
		
		let rect = document.createElementNS('http://www.w3.org/2000/svg','rect') // mask to resize as a meter
		rect.setAttributeNS(null, 'x', '3')
		rect.setAttributeNS(null, 'y', '6')
		rect.setAttributeNS(null, 'width', "10") // 0 - 10
		rect.setAttributeNS(null, 'height', "4")
		rect.setAttributeNS(null, 'rx', "1")
		rect.setAttributeNS(null, 'ry', "1")
		rect.setAttributeNS(null, 'style', `fill: ${defaultColor}; stroke: none`)

		batteryMask.appendChild(rect)
		defs.appendChild(batteryMask)
		icon.appendChild(defs)

		let outline = document.createElementNS('http://www.w3.org/2000/svg', 'rect') // outline of battery

		outline.setAttributeNS(null, 'x', "1")
		outline.setAttributeNS(null, 'y', "4")
		outline.setAttributeNS(null, 'width', "14")
		outline.setAttributeNS(null, 'height', "8")
		outline.setAttributeNS(null, 'rx', "2")
		outline.setAttributeNS(null, 'ry', "2")
		outline.setAttributeNS(null, 'style', `fill: none; stroke: ${defaultColor}; stroke-width: 1.2px;`)

		let contents = document.createElementNS('http://www.w3.org/2000/svg', 'rect') // 'contents' of battery in a battery icon

		contents.setAttributeNS(null, 'id', "batteryfill")
		contents.setAttributeNS(null, 'x', "3")
		contents.setAttributeNS(null, 'y', "6")
		contents.setAttributeNS(null, 'width', "10")
		contents.setAttributeNS(null, 'height', "4")
		contents.setAttributeNS(null, 'style', `fill: ${defaultColor};`)
		contents.setAttributeNS(null, 'clip-path', "url(#batmask)")

		icon.appendChild(outline)
		icon.appendChild(contents)

		let text = document.createElement('div')
		text.id = "text"
		text.textContent = "???"

		shadow.appendChild(icon)
		shadow.appendChild(text)
		shadow.appendChild(style)

		window.setInterval(() => {
			cp.exec("WMIC PATH Win32_Battery Get BatteryStatus, EstimatedChargeRemaining", (err, out) => {
				let status = parseInt(out.match(/([\d]+)[\s]*([\d]+)/)?.[1])
				let charge = parseInt(out.match(/([\d]+)[\s]*([\d]+)/)?.[2])

				if ((charge == undefined) || (status == undefined)) {
					outline.setAttributeNS(null, 'style', `fill: none; stroke: ${unknownColor}; stroke-width: 1px;`)
					rect.setAttributeNS(null, 'width', "0")
					return
				} else {
					if (charge < 20) {
						outline.setAttributeNS(null, 'style', `fill: none; stroke: ${alertColor}; stroke-width: 1px;`)
						contents.setAttributeNS(null, 'style', `fill: ${alertColor};`)
					} else {
						outline.setAttributeNS(null, 'style', `fill: none; stroke: ${defaultColor}; stroke-width: 1px;`)
						contents.setAttributeNS(null, 'style', `fill: ${defaultColor};`)
					}
					rect.setAttributeNS(null, 'width', ((charge / 100) * 10).toString())
				}

				text.textContent = `${charge}%`
				this.title = `${charge}% and ${
					["Not Present", "discharging", "idle", "charging"][parseInt(status)] ?? "Unknown"
				}`
			})
		}, 2000)
	}
}

customElements.define('battery-widget', batteryWidget);