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
local preferences = {
  padding = 50
}
local clump
clump = function(windows, tilearea)
  local padding = preferences.padding
  if #windows < 1 then
    error("too few windows to tile (#windows < 1)")
  end
  local spaces
  do
    local _accum_0 = { }
    local _len_0 = 1
    for i, window in pairs(windows) do
      _accum_0[_len_0] = {
        id = window.id,
        x = math.floor(tilearea.x + (tilearea.width - ((fold((function()
          local _accum_1 = { }
          local _len_1 = 1
          for _index_0 = 1, #windows do
            local win = windows[_index_0]
            _accum_1[_len_1] = win.size.width
            _len_1 = _len_1 + 1
          end
          return _accum_1
        end)(), function(a, b)
          return a + b + padding
        end)) or 0)) / 2 + ((fold((function()
          local _accum_1 = { }
          local _len_1 = 1
          local _max_0 = i - 1
          for _index_0 = 1, _max_0 < 0 and #windows + _max_0 or _max_0 do
            local win = windows[_index_0]
            _accum_1[_len_1] = win.size.width + padding
            _len_1 = _len_1 + 1
          end
          return _accum_1
        end)(), function(a, b)
          return a + b
        end)) or 0)),
        width = tonumber(window.size.width),
        y = math.floor(tilearea.y + (tilearea.height - window.size.height) / 2),
        height = tonumber(window.size.height)
      }
      _len_0 = _len_0 + 1
    end
    spaces = _accum_0
  end
  return spaces
end
return function(self, windows, area)
  local spaces = clump((function()
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
