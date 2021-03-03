function tile(file) {
	return (windows, tilearea) => {
		let luatile = fengari.load(fs.readFileSync(__dirname + file).toString())()
		let table = luatile.apply(null,[windows, tilearea])
	
		return table
	}
}

// take a list of windows, return places to put them

exports.lefttile = tile("\\tile\\tile.lua")
exports.clump = tile("\\tile\\clump.lua")