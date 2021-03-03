round = (n) -> math.floor n + .5

fold = (items, fn) ->
	len = #items
	if len > 1
		accum = fn items[1], items[2]
		for i = 3, len
			accum = fn accum, items[i]
		accum
	else
		items[1]



preferences = {
	padding: 50
}



clump = (windows, tilearea) ->
	-- one large window on the left, window stack on the right
	padding = preferences.padding

	error "too few windows to tile (#windows < 1)" if #windows < 1
	
	spaces = for i, window in pairs windows
		{
			id: window.id
			x: math.floor(
				tilearea.x +																				-- start of area 
				( tilearea.width - 
					((fold [win.size.width for win in *windows], (a, b) ->  a + b + padding) or 0) 			-- sum all window widths, adding padding every time
				) / 2 +																						-- divide by 2 to get outside padding to center all windows
				((fold [win.size.width + padding for win in *windows[1, i - 1]], (a, b) -> a + b or 0) 	-- sum all window widths of previous windows, adding padding for each
			)
			width: tonumber window.size.width
			y: math.floor(tilearea.y + ( tilearea.height - window.size.height ) / 2)
			height: tonumber window.size.height
		}

	spaces

return (windows, area) =>
	spaces = clump [f for f in js.of(windows)], area

	array = js.new(js.global.Array)

	for space in *spaces
		a = js.new(js.global.Object)

		a[k] = v for k, v in pairs space

		array\push a

	array






--	window:
--		id: string
--		class: string
--		exe: string
--		title: string
--		status: number (-1 minimized, 1 maximized, 0 neither)
--		position:
--			x: number			y: number
--		size:
--			width: number		height: number
--		constraint:
--			x: number			y: number			offsetx: number		offsety: number
