local round
round = function(n)
  return math.floor(n + .5)
end
local fold
fold = function(items, fn)
  local len = #items
  if len > 1 then
    local accum = fn(items[1], items[2])
    for i = 3, len do
      accum = fn(accum, items[i])
    end
    return accum
  else
    return items[1]
  end
end
local union
union = function(a, b)
  local c = { }
  for key, val in pairs(a) do
    c[key] = val
  end
  for key, val in pairs(b) do
    c[key] = val
  end
  return c
end
local title
title = function(title)
  return setmetatable({
    ["title"] = title
  }, {
    __add = union
  })
end
local winclass
winclass = function(winclass)
  return setmetatable({
    ["class"] = winclass
  }, {
    __add = union
  })
end
local exe
exe = function(exe)
  return setmetatable({
    ["exe"] = exe
  }, {
    __add = union
  })
end
local preferences = {
  preferredLarger = {
    winclass("Chrome_WidgetWin_1") + exe("vivaldi.exe"),
    winclass("Chrome_WidgetWin_1") + exe("chrome.exe")
  },
  dimensionrules = {
    mintty = {
      x = 26,
      y = 26,
      xstep = 13,
      ystep = 26
    }
  },
  paddingInner = 50,
  paddingOuter = 50,
  bigportion = 50 / 100
}
local checkone
checkone = function(window, rule)
  return fold((function()
    local _accum_0 = { }
    local _len_0 = 1
    for k, v in pairs(rule) do
      _accum_0[_len_0] = window[k] == v
      _len_0 = _len_0 + 1
    end
    return _accum_0
  end)(), function(a, b)
    return a and b
  end)
end
local check
check = function(window, list)
  return not fold((function()
    local _accum_0 = { }
    local _len_0 = 1
    for _, excluded in pairs(list) do
      _accum_0[_len_0] = not fold((function()
        local _accum_1 = { }
        local _len_1 = 1
        for k, v in pairs(excluded) do
          _accum_1[_len_1] = window[k] == v
          _len_1 = _len_1 + 1
        end
        return _accum_1
      end)(), function(a, b)
        return a and b
      end)
      _len_0 = _len_0 + 1
    end
    return _accum_0
  end)(), function(a, b)
    return a and b
  end)
end
local sortWindows
sortWindows = function(windows)
  local sorted = { }
  for _, rule in pairs(preferences.preferredLarger) do
    for index, win in pairs(windows) do
      if checkone(win, rule) then
        table.insert(sorted, win)
      end
    end
  end
  for _, win in pairs(windows) do
    if not (fold((function()
      local _accum_0 = { }
      local _len_0 = 1
      for _, v in pairs(sorted) do
        _accum_0[_len_0] = v == win
        _len_0 = _len_0 + 1
      end
      return _accum_0
    end)(), function(a, b)
      return a or b
    end)) then
      table.insert(sorted, win)
    end
  end
  return sorted
end
local tile
tile = function(windows, tilearea)
  local paddingInner, paddingOuter, bigportion
  paddingInner, paddingOuter, bigportion = preferences.paddingInner, preferences.paddingOuter, preferences.bigportion
  if #windows < 2 then
    error("too few windows to tile (#windows < 2)")
  end
  local sorted = sortWindows(windows)
  local totalwidth = tilearea.width - paddingOuter * 2 - paddingInner
  local totalheight = tilearea.height - paddingOuter * 2 - paddingInner * (#windows - 2)
  local bigwidth = round(totalwidth * bigportion)
  local smallwidth = totalwidth - bigwidth
  local constrainedwindow = fold((function()
    local _accum_0 = { }
    local _len_0 = 1
    for _index_0 = 2, #sorted do
      local window = sorted[_index_0]
      if (function()
        return check(window, (function()
          local _accum_1 = { }
          local _len_1 = 1
          for key in pairs(preferences.dimensionrules) do
            _accum_1[_len_1] = winclass(key)
            _len_1 = _len_1 + 1
          end
          return _accum_1
        end)())
      end)() then
        _accum_0[_len_0] = window
        _len_0 = _len_0 + 1
      end
    end
    return _accum_0
  end)(), function(a, b)
    return a or b
  end)
  local constraint
  if constrainedwindow then
    constraint = preferences.dimensionrules[constrainedwindow.class]
    local xstep, ystep, x, y
    xstep, ystep, x, y = constraint.xstep, constraint.ystep, constraint.x, constraint.y
    smallwidth = x + xstep * round((totalwidth * (1 - bigportion) - x) / xstep)
    bigwidth = totalwidth - smallwidth
  end
  local spaces = {
    {
      id = sorted[1].id,
      x = tilearea.x + paddingOuter,
      y = tilearea.y + paddingOuter,
      width = bigwidth,
      height = tilearea.height - paddingOuter * 2
    }
  }
  local heights = { }
  local column
  do
    local _accum_0 = { }
    local _len_0 = 1
    for _index_0 = 2, #sorted do
      local window = sorted[_index_0]
      _accum_0[_len_0] = window
      _len_0 = _len_0 + 1
    end
    column = _accum_0
  end
  for index, window in pairs(column) do
    if check(window, (function()
      local _accum_0 = { }
      local _len_0 = 1
      for key in pairs(preferences.dimensionrules) do
        _accum_0[_len_0] = winclass(key)
        _len_0 = _len_0 + 1
      end
      return _accum_0
    end)()) then
      constraint = preferences.dimensionrules[window.class]
      local xstep, ystep, x, y
      xstep, ystep, x, y = constraint.xstep, constraint.ystep, constraint.x, constraint.y
      if true then
        return window.id
      end
      heights[window.id] = y + ystep * round(((totalheight / (#windows - 1) - y) / ystep))
    end
  end
  local heightOfConstrainedWindows = fold((function()
    local _accum_0 = { }
    local _len_0 = 1
    for _, height in pairs(heights) do
      _accum_0[_len_0] = height
      _len_0 = _len_0 + 1
    end
    return _accum_0
  end)(), function(a, b)
    return a + b
  end)
  local remainingheight = totalheight - (heightOfConstrainedWindows or 0)
  do
    local _accum_0 = { }
    local _len_0 = 1
    for _, w in pairs(column) do
      if not heights[w.id] then
        _accum_0[_len_0] = w
        _len_0 = _len_0 + 1
      end
    end
    column = _accum_0
  end
  do
    local height = remainingheight / #column
    for i, v in pairs(column) do
      if (math.ceil(height)) < remainingheight then
        remainingheight = remainingheight - math.ceil(height)
        heights[v.id] = math.ceil(height)
      else
        heights[v.id] = remainingheight
      end
    end
  end
  do
    local offset = tilearea.y + paddingOuter
    for _index_0 = 2, #sorted do
      local window = sorted[_index_0]
      table.insert(spaces, {
        id = window.id,
        x = tilearea.x + paddingOuter + paddingInner + bigwidth,
        width = smallwidth,
        y = offset,
        height = heights[window.id]
      })
      offset = offset + (paddingInner + heights[window.id])
    end
  end
  return spaces
end
return function(self, windows, area)
  local spaces = tile((function()
    local _accum_0 = { }
    local _len_0 = 1
    for f in js.of(windows) do
      _accum_0[_len_0] = f
      _len_0 = _len_0 + 1
    end
    return _accum_0
  end)(), area)
  local array = js.new(js.global.Array)
  for _index_0 = 1, #spaces do
    local space = spaces[_index_0]
    local a = js.new(js.global.Object)
    for k, v in pairs(space) do
      a[k] = v
    end
    array:push(a)
  end
  return array
end
