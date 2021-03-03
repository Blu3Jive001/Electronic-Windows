const wa = require('win-audio')

let slider = document.getElementById('volumeslider')
let speaker = wa.speaker

let popupOpen = false

speaker.polling(200)


			<div id="voldiv">
				<div id="volumeicon"></div>
				<input id="volumeslider" type="range" min="0" max="100" step="1">
			</div>


class volumeWidget extends HTMLElement {
	constructor() {
		super()

		let shadow = this.attachShadow({mode: 'open'});

		let style = document.createElement('link')
		style.setAttribute('rel', 'stylesheet')
		style.setAttribute('href', electron.app.getAppPath() + '\\widgets\\volume\\volume.css')

		let voldiv = document.createElement('div')
		voldiv.id = "voldiv"

		let icon = document.createElement('div')
		icon.id = "volumeicon"
//		icon.style.webkitMaskImage = 'url(res/signal_wifi_off-24px.svg)'
		voldiv.appendChild(icon)

		let slider = document.createElement('input')
		slider.id = "volumeslider"
		slider.type = "range"
		slider.min = "0"
		slider.max = "100"
		slider.step = "1"
		voldiv.appendChild(slider)

		let closebutton = document.createElement('div')
		closebutton.id = "closebutton"
		voldiv.appendChild(closebutton)

		shadow.appendChild(style)
		shadow.appendChild(voldiv)

		function updateVolume() {
			let volume = speaker.get()
			let muted = speaker.isMuted()
		
			if (muted) {
				icon.style.webkitMaskImage = "url(res/volume_off-24px.svg)"
			} else {
				icon.style.webkitMaskImage = "url(res/" + [
					"volume_off-24px.svg",
					"volume_mute-24px.svg",
					"volume_down-24px.svg",
					"volume_up-24px.svg"
				][Math.ceil(volume / 100 * 3)] + ")"
			}
		
			return volume
		}

		slider.value = updateVolume()

		speaker.events.on('change', (volume) => { slider.value = updateVolume() })
		speaker.events.on('toggle', (status) => { slider.value = updateVolume() })

		slider.oninput = () => {
			speaker.set(parseInt(slider.value))
		}

		this.addEventListener('mousewheel', (e) => {
			var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
			((delta < 0) ? speaker.decrease : speaker.increase)(Math.abs(delta) * 2)
			slider.value = updateVolume()

			e.preventDefault();
		}, false);

		icon.onclick = () => {
			if (this.classList.contains('open')) {
				(speaker.isMuted() ? speaker.unmute : speaker.mute)()
				updateVolume()
			} else { 
				this.classList.add('open')
			}
		}

		closebutton.onclick = () => { this.classList.remove("open") }
	}
}

customElements.define('volume-widget', volumeWidget);