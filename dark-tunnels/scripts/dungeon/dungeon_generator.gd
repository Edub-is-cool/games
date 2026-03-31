extends Node3D

const ROOM_SIZE_MIN := Vector2(8, 8)
const ROOM_SIZE_MAX := Vector2(14, 14)
const CORRIDOR_WIDTH := 4.0
const WALL_HEIGHT := 3.5
const WALL_THICKNESS := 0.3
const ROOM_COUNT := 20
const BOSS_ROOM_SIZE := Vector2(18, 18)

signal boss_defeated

var room_data: Array[Dictionary] = [] # {pos: Vector3, size: Vector2, type: String}
var nav_region: NavigationRegion3D
var floor_mat: StandardMaterial3D
var wall_mat: StandardMaterial3D
var ceiling_mat: StandardMaterial3D
var trim_mat: StandardMaterial3D

var torch_scene := preload("res://scenes/dungeon/torch.tscn")
var door_scene := preload("res://scenes/dungeon/door.tscn")
var enemy_scenes: Array[PackedScene] = [
	preload("res://scenes/enemies/slime.tscn"),            # 0: tier 0
	preload("res://scenes/enemies/enemy.tscn"),            # 1: goblin, tier 0-1
	preload("res://scenes/enemies/rat_swarm.tscn"),        # 2: tier 0
	preload("res://scenes/enemies/cave_spider.tscn"),      # 3: tier 1
	preload("res://scenes/enemies/mushroom_spore.tscn"),   # 4: tier 1
	preload("res://scenes/enemies/skeleton.tscn"),         # 5: tier 2
	preload("res://scenes/enemies/shadow_wraith.tscn"),    # 6: tier 2
	preload("res://scenes/enemies/mimic.tscn"),            # 7: tier 2 (placed separately)
	preload("res://scenes/enemies/orc.tscn"),              # 8: tier 3
	preload("res://scenes/enemies/rock_golem.tscn"),       # 9: tier 3
	preload("res://scenes/enemies/crystal_sentinel.tscn"), # 10: tier 3
	preload("res://scenes/enemies/bone_rattler.tscn"),     # 11: tier 3
]
var boss_scenes: Array[PackedScene] = [
	preload("res://scenes/enemies/boss_witch.tscn"),       # floor 1
	preload("res://scenes/enemies/boss_werewolf.tscn"),    # floor 2
	preload("res://scenes/enemies/boss.tscn"),             # floor 3 (dragon)
	preload("res://scenes/enemies/boss_colossus.tscn"),    # floor 4
	preload("res://scenes/enemies/boss_eye.tscn"),         # floor 5
	preload("res://scenes/enemies/boss_warden.tscn"),      # floor 6
	preload("res://scenes/enemies/boss_hollow_king.tscn"), # floor 7
]
var chest_scene := preload("res://scenes/items/treasure_chest.tscn")
var health_potion_scene := preload("res://scenes/items/health_potion.tscn")
var mana_potion_scene := preload("res://scenes/items/mana_potion.tscn")
var trap_spikes_scene := preload("res://scenes/dungeon/trap_spikes.tscn")
var poison_gas_scene := preload("res://scenes/dungeon/poison_gas.tscn")
var merchant_scene := preload("res://scenes/dungeon/merchant.tscn")
var weapon_scenes: Array[PackedScene] = [
	preload("res://scenes/items/weapon_sword.tscn"),
	preload("res://scenes/items/weapon_bow.tscn"),
	preload("res://scenes/items/weapon_axe.tscn"),
	preload("res://scenes/items/weapon_staff.tscn"),
]

func _init() -> void:
	# Gray cobblestone floor - weathered stone look
	floor_mat = StandardMaterial3D.new()
	floor_mat.albedo_color = Color(0.5, 0.5, 0.5)
	floor_mat.roughness = 0.92
	floor_mat.metallic = 0.02
	floor_mat.metallic_specular = 0.3
	floor_mat.albedo_texture = _generate_cobblestone_texture()
	floor_mat.normal_enabled = true
	floor_mat.normal_texture = _generate_cobblestone_normal()
	floor_mat.normal_scale = 1.2
	floor_mat.uv1_triplanar = true
	floor_mat.uv1_scale = Vector3(1.5, 1.5, 1.5)

	# Dark stone brick walls - aged masonry
	wall_mat = StandardMaterial3D.new()
	wall_mat.albedo_color = Color(0.3, 0.28, 0.26)
	wall_mat.roughness = 0.88
	wall_mat.metallic = 0.01
	wall_mat.metallic_specular = 0.25
	wall_mat.albedo_texture = _generate_brick_texture()
	wall_mat.normal_enabled = true
	wall_mat.normal_texture = _generate_brick_normal()
	wall_mat.normal_scale = 1.5
	wall_mat.uv1_triplanar = true
	wall_mat.uv1_scale = Vector3(2, 2, 2)

	# Ceiling - rough dark stone with subtle texture
	ceiling_mat = StandardMaterial3D.new()
	ceiling_mat.albedo_color = Color(0.22, 0.21, 0.2)
	ceiling_mat.roughness = 0.98
	ceiling_mat.albedo_texture = _generate_ceiling_texture()
	ceiling_mat.uv1_triplanar = true
	ceiling_mat.uv1_scale = Vector3(2, 2, 2)

	# Wall trim - chiseled stone
	trim_mat = StandardMaterial3D.new()
	trim_mat.albedo_color = Color(0.18, 0.16, 0.14)
	trim_mat.roughness = 0.7
	trim_mat.metallic = 0.05
	trim_mat.metallic_specular = 0.4

func generate() -> void:
	print("DungeonGenerator: Starting generation...")
	_generate_room_layout()
	print("DungeonGenerator: Layout done, ", room_data.size(), " rooms")
	_build_geometry()
	print("DungeonGenerator: Geometry built")
	_place_doors()
	_place_torches()
	_place_enemies()
	_place_items()
	_place_traps()
	_place_weapons()
	_place_merchant()
	print("DungeonGenerator: Generation complete")

func _add_geometry(node: Node3D) -> void:
	if nav_region:
		nav_region.add_child(node)
	else:
		add_child(node)

func _generate_room_layout() -> void:
	var rng := RandomNumberGenerator.new()
	rng.randomize()

	# Room 0: starting room
	room_data.append({
		"pos": Vector3.ZERO,
		"size": Vector2(10, 10),
		"type": "start"
	})

	var current_pos := Vector3.ZERO
	var last_dir := Vector3.RIGHT
	var all_directions := [Vector3.RIGHT, Vector3.BACK, Vector3.LEFT, Vector3.FORWARD]

	for i in range(1, ROOM_COUNT):
		var room_size := Vector2(
			rng.randf_range(ROOM_SIZE_MIN.x, ROOM_SIZE_MAX.x),
			rng.randf_range(ROOM_SIZE_MIN.y, ROOM_SIZE_MAX.y)
		)

		if i == ROOM_COUNT - 1:
			room_size = BOSS_ROOM_SIZE

		var prev_room: Dictionary = room_data[i - 1]
		var prev_sz: Vector2 = prev_room["size"]
		var prev_half := Vector2(prev_sz.x / 2.0, prev_sz.y / 2.0)
		var curr_half := Vector2(room_size.x / 2.0, room_size.y / 2.0)

		# Try directions until we find one without overlap
		var placed := false
		var try_dirs: Array[Vector3] = []

		# Prefer forward, then try perpendicular, then reverse
		try_dirs.append(last_dir)
		var perp1 := Vector3(-last_dir.z, 0, last_dir.x)
		var perp2 := Vector3(last_dir.z, 0, -last_dir.x)
		if rng.randf() < 0.5:
			try_dirs.append(perp1)
			try_dirs.append(perp2)
		else:
			try_dirs.append(perp2)
			try_dirs.append(perp1)
		try_dirs.append(-last_dir)

		for dir in try_dirs:
			if placed:
				break
			# Try a few corridor lengths
			for attempt in range(3):
				var corridor_length := rng.randf_range(10, 16) + attempt * 4.0
				var offset: Vector3
				if abs(dir.x) > 0:
					offset = dir * (prev_half.x + corridor_length + curr_half.x)
				else:
					offset = dir * (prev_half.y + corridor_length + curr_half.y)

				var candidate_pos: Vector3 = Vector3(prev_room["pos"]) + offset

				if not _check_overlap(candidate_pos, room_size, dir, corridor_length, prev_room):
					current_pos = candidate_pos
					room_data.append({
						"pos": current_pos,
						"size": room_size,
						"type": "boss" if i == ROOM_COUNT - 1 else "normal",
						"from_dir": dir,
						"corridor_length": corridor_length,
						"prev_index": i - 1
					})
					last_dir = dir
					placed = true
					break

		# Fallback: force place far away in the forward direction
		if not placed:
			var fallback_dir := last_dir
			var fallback_len := 25.0
			var offset: Vector3
			if abs(fallback_dir.x) > 0:
				offset = fallback_dir * (prev_half.x + fallback_len + curr_half.x)
			else:
				offset = fallback_dir * (prev_half.y + fallback_len + curr_half.y)
			current_pos = Vector3(prev_room["pos"]) + offset
			room_data.append({
				"pos": current_pos,
				"size": room_size,
				"type": "boss" if i == ROOM_COUNT - 1 else "normal",
				"from_dir": fallback_dir,
				"corridor_length": fallback_len,
				"prev_index": i - 1
			})

func _check_overlap(candidate_pos: Vector3, candidate_size: Vector2, dir: Vector3, corridor_length: float, prev_room: Dictionary) -> bool:
	var margin := 2.0 # Extra spacing to prevent tight fits
	var c_min_x := candidate_pos.x - candidate_size.x / 2.0 - margin
	var c_max_x := candidate_pos.x + candidate_size.x / 2.0 + margin
	var c_min_z := candidate_pos.z - candidate_size.y / 2.0 - margin
	var c_max_z := candidate_pos.z + candidate_size.y / 2.0 + margin

	# Check against all existing rooms
	for existing in room_data:
		var e_pos: Vector3 = existing["pos"]
		var e_sz: Vector2 = existing["size"]
		var e_min_x := e_pos.x - e_sz.x / 2.0
		var e_max_x := e_pos.x + e_sz.x / 2.0
		var e_min_z := e_pos.z - e_sz.y / 2.0
		var e_max_z := e_pos.z + e_sz.y / 2.0

		if c_max_x > e_min_x and c_min_x < e_max_x and c_max_z > e_min_z and c_min_z < e_max_z:
			return true

	# Check corridor against all existing rooms (except the previous room)
	var prev_pos: Vector3 = prev_room["pos"]
	var prev_sz: Vector2 = prev_room["size"]
	var corr_start: Vector3
	var corr_end: Vector3
	var half_w := CORRIDOR_WIDTH / 2.0 + margin

	if abs(dir.x) > 0.5:
		var from_edge: float = prev_pos.x + (prev_sz.x / 2.0) * signf(dir.x)
		var to_edge: float = candidate_pos.x - (candidate_size.x / 2.0) * signf(dir.x)
		var min_x := minf(from_edge, to_edge)
		var max_x := maxf(from_edge, to_edge)
		for existing in room_data:
			var e_pos2: Vector3 = existing["pos"]
			var e_sz2: Vector2 = existing["size"]
			if existing == prev_room:
				continue
			var e_min_x2 := e_pos2.x - e_sz2.x / 2.0
			var e_max_x2 := e_pos2.x + e_sz2.x / 2.0
			var e_min_z2 := e_pos2.z - e_sz2.y / 2.0
			var e_max_z2 := e_pos2.z + e_sz2.y / 2.0
			if max_x > e_min_x2 and min_x < e_max_x2 and (prev_pos.z + half_w) > e_min_z2 and (prev_pos.z - half_w) < e_max_z2:
				return true
	else:
		var from_edge: float = prev_pos.z + (prev_sz.y / 2.0) * signf(dir.z)
		var to_edge: float = candidate_pos.z - (candidate_size.y / 2.0) * signf(dir.z)
		var min_z := minf(from_edge, to_edge)
		var max_z := maxf(from_edge, to_edge)
		for existing in room_data:
			var e_pos2: Vector3 = existing["pos"]
			var e_sz2: Vector2 = existing["size"]
			if existing == prev_room:
				continue
			var e_min_x2 := e_pos2.x - e_sz2.x / 2.0
			var e_max_x2 := e_pos2.x + e_sz2.x / 2.0
			var e_min_z2 := e_pos2.z - e_sz2.y / 2.0
			var e_max_z2 := e_pos2.z + e_sz2.y / 2.0
			if max_z > e_min_z2 and min_z < e_max_z2 and (prev_pos.x + half_w) > e_min_x2 and (prev_pos.x - half_w) < e_max_x2:
				return true

	return false

func _build_geometry() -> void:
	for i in range(room_data.size()):
		var room: Dictionary = room_data[i]
		_build_room(room)
		_decorate_room(room)

		# Build corridor connecting to previous room
		if i > 0:
			_build_corridor(room_data[int(room["prev_index"])], room)

func _build_room(room: Dictionary) -> void:
	var pos: Vector3 = room["pos"]
	var sz: Vector2 = room["size"]
	var height := WALL_HEIGHT
	if room["type"] == "boss":
		height = 6.0

	# Floor
	var floor_box := CSGBox3D.new()
	floor_box.size = Vector3(sz.x, 0.2, sz.y)
	floor_box.position = pos
	floor_box.use_collision = true
	floor_box.material = floor_mat
	_add_geometry(floor_box)

	# Ceiling
	var ceil_box := CSGBox3D.new()
	ceil_box.size = Vector3(sz.x, 0.2, sz.y)
	ceil_box.position = pos + Vector3(0, height, 0)
	ceil_box.use_collision = true
	ceil_box.material = ceiling_mat
	_add_geometry(ceil_box)

	# Determine which walls need doorway openings
	var openings: Array[String] = []
	# Check if this room connects forward to the next room
	for j in range(room_data.size()):
		var other: Dictionary = room_data[j]
		if other.has("prev_index") and other["prev_index"] == room_data.find(room):
			var dir: Vector3 = other["from_dir"]
			openings.append(_dir_to_wall(dir))
	# Check if this room is connected from a previous room
	if room.has("from_dir"):
		var dir: Vector3 = room["from_dir"]
		openings.append(_dir_to_wall(-dir))

	# Build 4 walls, with openings where needed
	_build_wall_with_opening(pos, sz, height, "north", "north" in openings)
	_build_wall_with_opening(pos, sz, height, "south", "south" in openings)
	_build_wall_with_opening(pos, sz, height, "east", "east" in openings)
	_build_wall_with_opening(pos, sz, height, "west", "west" in openings)

func _decorate_room(room: Dictionary) -> void:
	var pos: Vector3 = room["pos"]
	var sz: Vector2 = room["size"]
	var half_x := sz.x / 2.0
	var half_z := sz.y / 2.0
	var height := WALL_HEIGHT
	if room["type"] == "boss":
		height = 6.0

	# Corner pilaster material - carved stone
	var pillar_mat := StandardMaterial3D.new()
	pillar_mat.albedo_color = Color(0.2, 0.18, 0.16)
	pillar_mat.roughness = 0.65
	pillar_mat.metallic = 0.05

	# Pillar cap material - lighter accent
	var cap_mat := StandardMaterial3D.new()
	cap_mat.albedo_color = Color(0.25, 0.22, 0.2)
	cap_mat.roughness = 0.6
	cap_mat.metallic = 0.08

	# Base trim material - dark stone molding
	var base_mat := StandardMaterial3D.new()
	base_mat.albedo_color = Color(0.15, 0.13, 0.12)
	base_mat.roughness = 0.8

	var corners := [
		pos + Vector3(-half_x + 0.2, 0, -half_z + 0.2),
		pos + Vector3(half_x - 0.2, 0, -half_z + 0.2),
		pos + Vector3(-half_x + 0.2, 0, half_z - 0.2),
		pos + Vector3(half_x - 0.2, 0, half_z - 0.2),
	]
	for cp in corners:
		# Main pillar shaft
		var pillar := CSGBox3D.new()
		pillar.size = Vector3(0.3, height, 0.3)
		pillar.position = cp + Vector3(0, height / 2.0, 0)
		pillar.material = pillar_mat
		_add_geometry(pillar)
		# Base plinth
		var base := CSGBox3D.new()
		base.size = Vector3(0.45, 0.25, 0.45)
		base.position = cp + Vector3(0, 0.22, 0)
		base.material = cap_mat
		_add_geometry(base)
		# Capital at top
		var cap := CSGBox3D.new()
		cap.size = Vector3(0.42, 0.15, 0.42)
		cap.position = cp + Vector3(0, height - 0.17, 0)
		cap.material = cap_mat
		_add_geometry(cap)

	# Floor base trim along walls (skip doorway sides)
	var openings: Array[String] = []
	for j in range(room_data.size()):
		var other: Dictionary = room_data[j]
		if other.has("prev_index") and other["prev_index"] == room_data.find(room):
			openings.append(_dir_to_wall(other["from_dir"]))
	if room.has("from_dir"):
		openings.append(_dir_to_wall(-Vector3(room["from_dir"])))

	var trim_height := 0.18
	var trim_depth := 0.12
	if "north" not in openings:
		var trim_n := CSGBox3D.new()
		trim_n.size = Vector3(sz.x - 0.6, trim_height, trim_depth)
		trim_n.position = pos + Vector3(0, trim_height / 2.0 + 0.1, -half_z + trim_depth / 2.0)
		trim_n.material = base_mat
		_add_geometry(trim_n)
	if "south" not in openings:
		var trim_s := CSGBox3D.new()
		trim_s.size = Vector3(sz.x - 0.6, trim_height, trim_depth)
		trim_s.position = pos + Vector3(0, trim_height / 2.0 + 0.1, half_z - trim_depth / 2.0)
		trim_s.material = base_mat
		_add_geometry(trim_s)
	if "east" not in openings:
		var trim_e := CSGBox3D.new()
		trim_e.size = Vector3(trim_depth, trim_height, sz.y - 0.6)
		trim_e.position = pos + Vector3(half_x - trim_depth / 2.0, trim_height / 2.0 + 0.1, 0)
		trim_e.material = base_mat
		_add_geometry(trim_e)
	if "west" not in openings:
		var trim_w := CSGBox3D.new()
		trim_w.size = Vector3(trim_depth, trim_height, sz.y - 0.6)
		trim_w.position = pos + Vector3(-half_x + trim_depth / 2.0, trim_height / 2.0 + 0.1, 0)
		trim_w.material = base_mat
		_add_geometry(trim_w)

func _dir_to_wall(dir: Vector3) -> String:
	if dir.x > 0.5: return "east"
	if dir.x < -0.5: return "west"
	if dir.z > 0.5: return "south"
	if dir.z < -0.5: return "north"
	return ""

func _build_wall_with_opening(room_pos: Vector3, room_size: Vector2, height: float, side: String, has_opening: bool) -> void:
	var half_x := room_size.x / 2.0
	var half_z := room_size.y / 2.0
	var opening_width := CORRIDOR_WIDTH

	if not has_opening:
		# Solid wall
		var wall := CSGBox3D.new()
		wall.use_collision = true
		wall.material = wall_mat
		match side:
			"north":
				wall.size = Vector3(room_size.x, height, WALL_THICKNESS)
				wall.position = room_pos + Vector3(0, height / 2.0, -half_z)
			"south":
				wall.size = Vector3(room_size.x, height, WALL_THICKNESS)
				wall.position = room_pos + Vector3(0, height / 2.0, half_z)
			"east":
				wall.size = Vector3(WALL_THICKNESS, height, room_size.y)
				wall.position = room_pos + Vector3(half_x, height / 2.0, 0)
			"west":
				wall.size = Vector3(WALL_THICKNESS, height, room_size.y)
				wall.position = room_pos + Vector3(-half_x, height / 2.0, 0)
		_add_geometry(wall)
	else:
		# Wall with doorway opening in the center
		var half_opening := opening_width / 2.0
		var door_height := 3.0

		match side:
			"north", "south":
				var z_offset := -half_z if side == "north" else half_z
				# Left section
				var left_width := (room_size.x - opening_width) / 2.0
				if left_width > 0.1:
					var left := CSGBox3D.new()
					left.size = Vector3(left_width, height, WALL_THICKNESS)
					left.position = room_pos + Vector3(-half_x + left_width / 2.0, height / 2.0, z_offset)
					left.use_collision = true
					left.material = wall_mat
					_add_geometry(left)
				# Right section
				var right_width := (room_size.x - opening_width) / 2.0
				if right_width > 0.1:
					var right := CSGBox3D.new()
					right.size = Vector3(right_width, height, WALL_THICKNESS)
					right.position = room_pos + Vector3(half_x - right_width / 2.0, height / 2.0, z_offset)
					right.use_collision = true
					right.material = wall_mat
					_add_geometry(right)
				# Top section (above doorway)
				var top_height := height - door_height
				if top_height > 0.1:
					var top := CSGBox3D.new()
					top.size = Vector3(opening_width, top_height, WALL_THICKNESS)
					top.position = room_pos + Vector3(0, door_height + top_height / 2.0, z_offset)
					top.use_collision = true
					top.material = wall_mat
					_add_geometry(top)
			"east", "west":
				var x_offset := half_x if side == "east" else -half_x
				# Left section (negative Z)
				var side_width := (room_size.y - opening_width) / 2.0
				if side_width > 0.1:
					var left := CSGBox3D.new()
					left.size = Vector3(WALL_THICKNESS, height, side_width)
					left.position = room_pos + Vector3(x_offset, height / 2.0, -half_z + side_width / 2.0)
					left.use_collision = true
					left.material = wall_mat
					_add_geometry(left)
				# Right section (positive Z)
				if side_width > 0.1:
					var right := CSGBox3D.new()
					right.size = Vector3(WALL_THICKNESS, height, side_width)
					right.position = room_pos + Vector3(x_offset, height / 2.0, half_z - side_width / 2.0)
					right.use_collision = true
					right.material = wall_mat
					_add_geometry(right)
				# Top section
				var top_height := height - door_height
				if top_height > 0.1:
					var top := CSGBox3D.new()
					top.size = Vector3(WALL_THICKNESS, top_height, opening_width)
					top.position = room_pos + Vector3(x_offset, door_height + top_height / 2.0, 0)
					top.use_collision = true
					top.material = wall_mat
					_add_geometry(top)

func _build_corridor(from_room: Dictionary, to_room: Dictionary) -> void:
	var from_pos: Vector3 = from_room["pos"]
	var to_pos: Vector3 = to_room["pos"]
	var dir: Vector3 = to_room["from_dir"]
	var from_size: Vector2 = from_room["size"]
	var to_size: Vector2 = to_room["size"]

	# Calculate corridor start and end points
	var start: Vector3
	var end: Vector3

	if abs(dir.x) > 0.5:
		var from_edge: float = from_pos.x + (from_size.x / 2.0) * signf(dir.x)
		var to_edge: float = to_pos.x - (to_size.x / 2.0) * signf(dir.x)
		start = Vector3(from_edge, 0, from_pos.z)
		end = Vector3(to_edge, 0, to_pos.z)
	else:
		var from_edge: float = from_pos.z + (from_size.y / 2.0) * signf(dir.z)
		var to_edge: float = to_pos.z - (to_size.y / 2.0) * signf(dir.z)
		start = Vector3(from_pos.x, 0, from_edge)
		end = Vector3(to_pos.x, 0, to_edge)

	var mid := (start + end) / 2.0
	var length: float

	if abs(dir.x) > 0.5:
		length = abs(end.x - start.x)
	else:
		length = abs(end.z - start.z)

	if length < 0.5:
		return

	# Floor
	var c_floor := CSGBox3D.new()
	c_floor.use_collision = true
	c_floor.material = floor_mat
	if abs(dir.x) > 0.5:
		c_floor.size = Vector3(length, 0.2, CORRIDOR_WIDTH)
	else:
		c_floor.size = Vector3(CORRIDOR_WIDTH, 0.2, length)
	c_floor.position = mid
	_add_geometry(c_floor)

	# Ceiling
	var c_ceil := CSGBox3D.new()
	c_ceil.use_collision = true
	c_ceil.material = ceiling_mat
	c_ceil.size = c_floor.size
	c_ceil.position = mid + Vector3(0, WALL_HEIGHT, 0)
	_add_geometry(c_ceil)

	# Walls
	var half_w := CORRIDOR_WIDTH / 2.0
	if abs(dir.x) > 0.5:
		# Corridor goes east-west, walls on north and south
		var wall_n := CSGBox3D.new()
		wall_n.size = Vector3(length, WALL_HEIGHT, WALL_THICKNESS)
		wall_n.position = mid + Vector3(0, WALL_HEIGHT / 2.0, -half_w)
		wall_n.use_collision = true
		wall_n.material = wall_mat
		_add_geometry(wall_n)

		var wall_s := CSGBox3D.new()
		wall_s.size = Vector3(length, WALL_HEIGHT, WALL_THICKNESS)
		wall_s.position = mid + Vector3(0, WALL_HEIGHT / 2.0, half_w)
		wall_s.use_collision = true
		wall_s.material = wall_mat
		_add_geometry(wall_s)
	else:
		# Corridor goes north-south, walls on east and west
		var wall_e := CSGBox3D.new()
		wall_e.size = Vector3(WALL_THICKNESS, WALL_HEIGHT, length)
		wall_e.position = mid + Vector3(half_w, WALL_HEIGHT / 2.0, 0)
		wall_e.use_collision = true
		wall_e.material = wall_mat
		_add_geometry(wall_e)

		var wall_w := CSGBox3D.new()
		wall_w.size = Vector3(WALL_THICKNESS, WALL_HEIGHT, length)
		wall_w.position = mid + Vector3(-half_w, WALL_HEIGHT / 2.0, 0)
		wall_w.use_collision = true
		wall_w.material = wall_mat
		_add_geometry(wall_w)

func _place_doors() -> void:
	for i in range(1, room_data.size()):
		var room: Dictionary = room_data[i]
		var prev: Dictionary = room_data[int(room["prev_index"])]
		var dir: Vector3 = room["from_dir"]
		var prev_pos: Vector3 = prev["pos"]
		var prev_size: Vector2 = prev["size"]

		# Place door at the exit of the previous room
		var door_pos: Vector3
		if abs(dir.x) > 0.5:
			door_pos = prev_pos + Vector3((prev_size.x / 2.0 + 0.15) * signf(dir.x), 1.5, 0)
		else:
			door_pos = prev_pos + Vector3(0, 1.5, (prev_size.y / 2.0 + 0.15) * signf(dir.z))

		var door := door_scene.instantiate()
		door.position = door_pos
		# Rotate door to face the wall opening
		if abs(dir.x) > 0.5:
			door.rotation.y = PI / 2.0
		get_parent().call_deferred("add_child", door)

func _place_torches() -> void:
	var rng := RandomNumberGenerator.new()
	rng.randomize()

	for room in room_data:
		var pos: Vector3 = room["pos"]
		var sz: Vector2 = room["size"]
		var half_x := sz.x / 2.0 - 0.3
		var half_z := sz.y / 2.0 - 0.3

		# Place 2-4 torches per room on walls
		var torch_positions: Array[Vector3] = []

		# Place on walls but offset from center to avoid door openings
		torch_positions.append(pos + Vector3(-half_x, 1.5, half_z - 2))
		torch_positions.append(pos + Vector3(half_x, 1.5, -half_z + 2))

		if sz.x > 10 or sz.y > 10:
			torch_positions.append(pos + Vector3(-half_x + 2, 1.5, -half_z))
			torch_positions.append(pos + Vector3(half_x - 2, 1.5, half_z))

		# Boss room gets extra torches
		if room["type"] == "boss":
			torch_positions.append(pos + Vector3(-half_x, 1.5, -half_z + 2))
			torch_positions.append(pos + Vector3(half_x, 1.5, -half_z + 2))
			torch_positions.append(pos + Vector3(-half_x, 1.5, half_z - 2))
			torch_positions.append(pos + Vector3(half_x, 1.5, half_z - 2))

		for tp in torch_positions:
			var torch := torch_scene.instantiate()
			torch.position = tp
			get_parent().call_deferred("add_child", torch)

	# Place torches in corridors at 1/3 and 2/3 points (avoids doors at ends)
	for i in range(1, room_data.size()):
		var room: Dictionary = room_data[i]
		var prev: Dictionary = room_data[int(room["prev_index"])]
		var room_pos: Vector3 = room["pos"]
		var prev_pos: Vector3 = prev["pos"]
		var third1: Vector3 = prev_pos.lerp(room_pos, 0.33)
		var third2: Vector3 = prev_pos.lerp(room_pos, 0.66)
		var dir: Vector3 = room["from_dir"]
		var half_w := CORRIDOR_WIDTH / 2.0 - 0.3

		if abs(dir.x) > 0.5:
			var t1 := torch_scene.instantiate()
			t1.position = third1 + Vector3(0, 1.5, -half_w)
			get_parent().call_deferred("add_child", t1)
			var t2 := torch_scene.instantiate()
			t2.position = third2 + Vector3(0, 1.5, half_w)
			get_parent().call_deferred("add_child", t2)
		else:
			var t1 := torch_scene.instantiate()
			t1.position = third1 + Vector3(-half_w, 1.5, 0)
			get_parent().call_deferred("add_child", t1)
			var t2 := torch_scene.instantiate()
			t2.position = third2 + Vector3(half_w, 1.5, 0)
			get_parent().call_deferred("add_child", t2)

func _pick_enemy_scene(room_index: int, rng: RandomNumberGenerator) -> PackedScene:
	# Floor-based enemy tier system
	# Weaker enemies disappear on later floors, stronger ones appear on later floors
	var floor_num := GameManager.current_floor
	var available: Array[int] = []

	# Tier 0: Slime (floors 1-3), Rat Swarm (floors 1-4), Goblin (floors 1-4)
	if floor_num <= 3 and room_index <= 10:
		available.append(0)  # slime
	if floor_num <= 4 and room_index <= 8:
		available.append(2)  # rat swarm
	if floor_num <= 4 and room_index <= 12:
		available.append(1)  # goblin

	# Tier 1: Cave Spider (floors 2-5), Mushroom Spore (floors 2-5)
	if floor_num >= 2 and floor_num <= 5 and room_index >= 3:
		available.append(3)  # cave spider
	if floor_num >= 2 and floor_num <= 5 and room_index >= 4:
		available.append(4)  # mushroom spore

	# Tier 2: Skeleton (floors 3-6), Shadow Wraith (floors 3-7)
	if floor_num >= 3 and floor_num <= 6 and room_index >= 5:
		available.append(5)  # skeleton
	if floor_num >= 3 and room_index >= 6:
		available.append(6)  # shadow wraith

	# Tier 3: Orc (floors 4+), Rock Golem (floors 5+), Crystal Sentinel (floors 5+), Bone Rattler (floors 6+)
	if floor_num >= 4 and room_index >= 8:
		available.append(8)  # orc
	if floor_num >= 5 and room_index >= 10:
		available.append(9)  # rock golem
	if floor_num >= 5 and room_index >= 12:
		available.append(10) # crystal sentinel
	if floor_num >= 6 and room_index >= 10:
		available.append(11) # bone rattler

	# Fallback: always have at least goblins
	if available.is_empty():
		available.append(1)

	var pick: int = available[rng.randi() % available.size()]
	return enemy_scenes[pick]

func _place_enemies() -> void:
	var rng := RandomNumberGenerator.new()
	rng.randomize()

	for i in range(1, room_data.size()):
		var room: Dictionary = room_data[i]
		var pos: Vector3 = room["pos"]
		var sz: Vector2 = room["size"]

		if room["type"] == "boss":
			# Place floor-appropriate boss (cycles in endless mode)
			var floor_idx := (GameManager.current_floor - 1) % boss_scenes.size()
			var boss := boss_scenes[floor_idx].instantiate()
			# Scale boss with floor
			if GameManager.current_floor > 1:
				var floor_mult := 1.0 + (GameManager.current_floor - 1) * 0.2
				boss.max_health = int(boss.max_health * floor_mult)
				boss.damage = int(boss.damage * (1.0 + (GameManager.current_floor - 1) * 0.1))
			boss.position = pos
			boss.boss_defeated.connect(_on_boss_defeated)
			get_parent().call_deferred("add_child", boss)
			# Add 2 orc guards
			var guard1 := enemy_scenes[3].instantiate()
			guard1.position = pos + Vector3(-4, 0, -4)
			get_parent().call_deferred("add_child", guard1)
			var guard2 := enemy_scenes[3].instantiate()
			guard2.position = pos + Vector3(4, 0, 4)
			get_parent().call_deferred("add_child", guard2)
		else:
			# 1-3 enemies per room, scaling with room number
			var max_enemies := 3 if GameManager.game_mode == "campaign" else 3 + GameManager.current_floor / 3
			var enemy_count := clampi(rng.randi_range(1, 1 + i / 5), 1, max_enemies)
			for j in range(enemy_count):
				var enemy_scene := _pick_enemy_scene(i, rng)
				var enemy := enemy_scene.instantiate()
				# Scale enemy stats with floor number
				if GameManager.current_floor > 1:
					var floor_mult := 1.0 + (GameManager.current_floor - 1) * 0.15
					enemy.max_health = int(enemy.max_health * floor_mult)
					enemy.damage = int(enemy.damage * (1.0 + (GameManager.current_floor - 1) * 0.1))
				var spawn_offset := Vector3(
					rng.randf_range(-sz.x / 3.0, sz.x / 3.0),
					0,
					rng.randf_range(-sz.y / 3.0, sz.y / 3.0)
				)
				enemy.position = pos + spawn_offset
				get_parent().call_deferred("add_child", enemy)

func _place_items() -> void:
	var rng := RandomNumberGenerator.new()
	rng.randomize()

	for i in range(1, room_data.size()):
		var room: Dictionary = room_data[i]
		var pos: Vector3 = room["pos"]
		var sz: Vector2 = room["size"]

		if room["type"] == "boss":
			continue

		# Every 3rd room gets a chest (or mimic on floors 3+)
		if i % 3 == 0:
			var is_mimic := GameManager.current_floor >= 3 and rng.randf() < 0.2
			var chest: Node3D
			if is_mimic:
				chest = enemy_scenes[7].instantiate()  # mimic
				if GameManager.current_floor > 3:
					var fm := 1.0 + (GameManager.current_floor - 3) * 0.2
					chest.max_health = int(chest.max_health * fm)
			else:
				chest = chest_scene.instantiate()
			var corner := Vector3(sz.x / 3.0, 0, sz.y / 3.0)
			if rng.randf() > 0.5:
				corner.x *= -1
			if rng.randf() > 0.5:
				corner.z *= -1
			chest.position = pos + corner
			# Alternate between health and mana potions in chests (not mimics)
			if not is_mimic and chest.has_method("interact"):
				chest.item_type = "health_potion" if i % 2 == 0 else "mana_potion"
			get_parent().call_deferred("add_child", chest)

		# Scatter potions in some rooms
		if rng.randf() < 0.4:
			var potion: Node3D
			if rng.randf() < 0.5:
				potion = health_potion_scene.instantiate()
			else:
				potion = mana_potion_scene.instantiate()
			potion.position = pos + Vector3(
				rng.randf_range(-sz.x / 4.0, sz.x / 4.0),
				0,
				rng.randf_range(-sz.y / 4.0, sz.y / 4.0)
			)
			get_parent().call_deferred("add_child", potion)

func get_player_spawn() -> Vector3:
	return Vector3(room_data[0]["pos"]) + Vector3(0, 1, 0)

func _place_traps() -> void:
	var rng := RandomNumberGenerator.new()
	rng.randomize()

	for i in range(3, room_data.size()):
		var room: Dictionary = room_data[i]
		if room["type"] == "boss":
			continue
		# 30% chance of trap per room
		if rng.randf() > 0.3:
			continue
		var pos: Vector3 = room["pos"]
		var sz: Vector2 = room["size"]
		var trap_pos := pos + Vector3(
			rng.randf_range(-sz.x / 4.0, sz.x / 4.0),
			0,
			rng.randf_range(-sz.y / 4.0, sz.y / 4.0)
		)
		var trap: Node3D
		if rng.randf() < 0.6:
			trap = trap_spikes_scene.instantiate()
		else:
			trap = poison_gas_scene.instantiate()
		trap.position = trap_pos
		get_parent().call_deferred("add_child", trap)

func _place_weapons() -> void:
	# Place one weapon in rooms 3, 6, 11, and 15 (only if not already owned)
	var weapon_rooms := [3, 6, 11, 15]
	var weapon_names := ["sword", "bow", "axe", "staff"]
	for idx in range(mini(weapon_rooms.size(), weapon_scenes.size())):
		# Skip if player already owns this weapon
		if idx < weapon_names.size() and weapon_names[idx] in Inventory.owned_weapons:
			continue
		var room_idx: int = weapon_rooms[idx]
		if room_idx >= room_data.size():
			continue
		var room: Dictionary = room_data[room_idx]
		var pos: Vector3 = room["pos"]
		var weapon := weapon_scenes[idx].instantiate()
		weapon.position = pos + Vector3(0, 0, -2)
		get_parent().call_deferred("add_child", weapon)

func _place_merchant() -> void:
	# Place merchant in room 10 (middle of dungeon)
	var merchant_room_idx := mini(10, room_data.size() - 2)
	var room: Dictionary = room_data[merchant_room_idx]
	var pos: Vector3 = room["pos"]
	var merchant := merchant_scene.instantiate()
	merchant.position = pos + Vector3(3, 0, 3)
	get_parent().call_deferred("add_child", merchant)

	# Place merchant in the room right before the boss
	var pre_boss_idx := room_data.size() - 2
	if pre_boss_idx > 0 and pre_boss_idx != merchant_room_idx:
		var pre_boss_room: Dictionary = room_data[pre_boss_idx]
		var pre_pos: Vector3 = pre_boss_room["pos"]
		var merchant2 := merchant_scene.instantiate()
		merchant2.position = pre_pos + Vector3(-3, 0, -3)
		get_parent().call_deferred("add_child", merchant2)

func _generate_cobblestone_texture() -> ImageTexture:
	var size := 128
	var img := Image.create(size, size, false, Image.FORMAT_RGB8)
	img.fill(Color(0.38, 0.36, 0.34))
	# Irregular cobblestones with varied sizes
	var stone_rng := RandomNumberGenerator.new()
	stone_rng.seed = 42
	for x in range(size):
		for y in range(size):
			var cell_x := x % 32
			var cell_y := y % 32
			var row := y / 32
			var col := x / 32
			# Offset alternating rows
			var offset_x := cell_x
			if row % 2 == 1:
				offset_x = (x + 12) % 32

			# Mortar gaps
			if offset_x <= 1 or cell_y <= 1:
				var mortar_shade := 0.14 + stone_rng.randf() * 0.04
				img.set_pixel(x, y, Color(mortar_shade, mortar_shade * 0.95, mortar_shade * 0.9))
			elif offset_x == 2 or cell_y == 2:
				# Edge shadow
				img.set_pixel(x, y, Color(0.28, 0.27, 0.25))
			else:
				var stone_id := row * 4 + col
				var base_val := 0.35 + sin(float(stone_id) * 3.7) * 0.04
				# Per-pixel noise for surface grain
				var noise_val := sin(float(x) * 0.8 + float(y) * 1.3) * 0.015
				noise_val += sin(float(x) * 2.1 - float(y) * 0.7) * 0.01
				var g := base_val + noise_val
				# Slight warm/cool variation per stone
				var warm := sin(float(stone_id) * 7.1) * 0.02
				img.set_pixel(x, y, Color(g + warm, g, g - warm * 0.5))
	return ImageTexture.create_from_image(img)

func _generate_cobblestone_normal() -> ImageTexture:
	var size := 128
	var img := Image.create(size, size, false, Image.FORMAT_RGB8)
	# Flat normal as base
	img.fill(Color(0.5, 0.5, 1.0))
	for x in range(size):
		for y in range(size):
			var cell_x := x % 32
			var cell_y := y % 32
			var row := y / 32
			var offset_x := cell_x
			if row % 2 == 1:
				offset_x = (x + 12) % 32

			var nx := 0.5
			var ny := 0.5

			# Mortar grooves - inset
			if offset_x <= 1:
				nx = 0.7  # slant toward right
			elif offset_x == 2:
				nx = 0.3  # slant toward left (edge)
			elif offset_x >= 30:
				nx = 0.7
			if cell_y <= 1:
				ny = 0.7
			elif cell_y == 2:
				ny = 0.3
			elif cell_y >= 30:
				ny = 0.7

			# Subtle surface bumps
			var bump := sin(float(x) * 1.5 + float(y) * 2.0) * 0.03
			img.set_pixel(x, y, Color(nx + bump, ny + bump, 1.0))
	return ImageTexture.create_from_image(img)

func _generate_brick_texture() -> ImageTexture:
	var size := 128
	var img := Image.create(size, size, false, Image.FORMAT_RGB8)
	img.fill(Color(0.24, 0.22, 0.2))
	var brick_rng := RandomNumberGenerator.new()
	brick_rng.seed = 99
	for y in range(size):
		var row := y / 16
		var y_in_brick := y % 16
		for x in range(size):
			var x_offset := 0 if row % 2 == 0 else 32
			var x_shifted := (x + x_offset) % 64
			var brick_col := x_shifted / 64

			if y_in_brick <= 1 or x_shifted <= 1:
				# Deep mortar
				var shade := 0.08 + sin(float(x + y) * 0.3) * 0.02
				img.set_pixel(x, y, Color(shade, shade * 0.9, shade * 0.85))
			elif y_in_brick == 2 or x_shifted == 2:
				# Inner edge highlight
				img.set_pixel(x, y, Color(0.28, 0.26, 0.24))
			elif y_in_brick >= 14 or x_shifted >= 62:
				# Opposite edge shadow
				img.set_pixel(x, y, Color(0.18, 0.17, 0.15))
			else:
				var brick_id := row * 2 + brick_col
				var base_val := 0.23 + sin(float(brick_id) * 5.3) * 0.03
				# Surface grain
				var grain := sin(float(x) * 1.2 + float(y) * 0.7) * 0.012
				grain += sin(float(x) * 3.1 + float(y) * 1.9) * 0.008
				var g := base_val + grain
				# Slight color variation per brick (some warmer, some cooler)
				var temp := sin(float(brick_id) * 3.3) * 0.025
				img.set_pixel(x, y, Color(g + temp, g * 0.96, g * 0.92 - temp * 0.5))
	return ImageTexture.create_from_image(img)

func _generate_brick_normal() -> ImageTexture:
	var size := 128
	var img := Image.create(size, size, false, Image.FORMAT_RGB8)
	img.fill(Color(0.5, 0.5, 1.0))
	for y in range(size):
		var row := y / 16
		var y_in_brick := y % 16
		for x in range(size):
			var x_offset := 0 if row % 2 == 0 else 32
			var x_shifted := (x + x_offset) % 64
			var nx := 0.5
			var ny := 0.5

			# Mortar groove normals
			if x_shifted <= 1:
				nx = 0.75
			elif x_shifted == 2:
				nx = 0.3
			elif x_shifted >= 62:
				nx = 0.7
			if y_in_brick <= 1:
				ny = 0.75
			elif y_in_brick == 2:
				ny = 0.3
			elif y_in_brick >= 14:
				ny = 0.7

			# Surface roughness bumps
			var bump_x := sin(float(x) * 2.3 + float(y) * 1.1) * 0.04
			var bump_y := sin(float(x) * 1.1 + float(y) * 2.7) * 0.04
			img.set_pixel(x, y, Color(nx + bump_x, ny + bump_y, 1.0))
	return ImageTexture.create_from_image(img)

func _generate_ceiling_texture() -> ImageTexture:
	var size := 64
	var img := Image.create(size, size, false, Image.FORMAT_RGB8)
	img.fill(Color(0.1, 0.09, 0.08))
	for x in range(size):
		for y in range(size):
			var noise := sin(float(x) * 0.9 + float(y) * 1.4) * 0.015
			noise += sin(float(x) * 2.6 - float(y) * 0.5) * 0.01
			var g := 0.1 + noise
			img.set_pixel(x, y, Color(g, g * 0.95, g * 0.9))
	return ImageTexture.create_from_image(img)

func _on_boss_defeated() -> void:
	boss_defeated.emit()
