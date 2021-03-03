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

union = (a, b) ->
    c = {}
    c[key] = val for key, val in pairs a
    c[key] = val for key, val in pairs b
    c

title =    (title) ->    setmetatable {"title": title},       { __add: union }
winclass = (winclass) -> setmetatable {"class": winclass},    { __add: union }
exe =      (exe) ->      setmetatable {"exe": exe},           { __add: union }



preferences = {
	preferredLarger: {
		-- list of window AHK classes to be larger, in order
		winclass("Chrome_WidgetWin_1") + exe("vivaldi.exe")
		winclass("Chrome_WidgetWin_1") + exe("chrome.exe")
	}

	dimensionrules: {
		mintty: x: 26, y: 26, xstep: 13, ystep: 26
	}

	paddingInner: 50, paddingOuter: 50

	bigportion: 50/100 -- approximate percent of total width to give the large window
}



checkone = (window, rule) ->
	fold [window[k] == v for k, v in pairs rule],
		(a, b) -> a and b


check = (window, list) ->
	-- the inverse of whether the window does not match ANY rule
	not fold for _, excluded in pairs list
				-- true when the window does not match every case in the operative ignore rule
				not fold [window[k] == v for k, v in pairs excluded],
					(a, b) -> a and b,
			(a, b) -> a and b


sortWindows = (windows) ->
	-- sort the windows by size
	sorted = {}
	
	for _, rule in pairs preferences.preferredLarger
		for index, win in pairs windows
			if checkone win, rule
				table.insert sorted, win
	
	for _, win in pairs windows
		unless fold for _, v in pairs sorted -- unless already in
					v == win,
				(a, b) -> a or b
			table.insert sorted, win

	sorted
		

tile = (windows, tilearea) ->
	-- one large window on the left, window stack on the right
	{ :paddingInner, :paddingOuter, :bigportion} = preferences

	error "too few windows to tile (#windows < 2)" if #windows < 2

	sorted = sortWindows windows

	totalwidth = tilearea.width - paddingOuter * 2 - paddingInner
	totalheight = tilearea.height - paddingOuter * 2 - paddingInner * (#windows - 2)
	bigwidth = round totalwidth * bigportion
	smallwidth = totalwidth - bigwidth

	constrainedwindow = fold [window for window in *sorted[2,] when do
				check window, [winclass key for key in pairs preferences.dimensionrules]],
			(a, b) -> a or b

	local constraint

	if constrainedwindow
		constraint = preferences.dimensionrules[constrainedwindow.class]
		{:xstep, :ystep, :x, :y} = constraint

		smallwidth = x + xstep * round (totalwidth * (1 - bigportion) - x) / xstep
		bigwidth = totalwidth - smallwidth

	spaces = {
		{
			id: sorted[1].id
			x: tilearea.x + paddingOuter
			y: tilearea.y + paddingOuter
			width: bigwidth
			height: tilearea.height - paddingOuter * 2
		}
	}

	heights = {}

	column = [window for window in *sorted[2,]]

	for index, window in pairs column
		if check window, [winclass key for key in pairs preferences.dimensionrules]
			constraint = preferences.dimensionrules[window.class]
			{:xstep, :ystep, :x, :y} = constraint
			
			return window.id if true
			heights[window.id] = y + ystep * round ((totalheight / (#windows - 1) - y) / ystep)

	heightOfConstrainedWindows = fold [height for _, height in pairs heights],
		(a, b) -> a + b

	remainingheight = totalheight - (heightOfConstrainedWindows or 0)

	column = [w for _, w in pairs column when not heights[w.id]]

	with height = remainingheight / #column
		for i, v in pairs column
			heights[v.id] = if (math.ceil height) < remainingheight
				remainingheight -= math.ceil height
				math.ceil height
			else
				remainingheight

	with offset = tilearea.y + paddingOuter
		for window in *sorted[2,]
			table.insert spaces, {
				id: window.id
				x: tilearea.x + paddingOuter + paddingInner + bigwidth
				width: smallwidth
				y: offset
				height: heights[window.id]
			}

			offset += paddingInner + heights[window.id]

	spaces

return (windows, area) =>
	spaces = tile [f for f in js.of(windows)], area

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
