extends Node3D

const DungeonMaterials := preload("res://scripts/dungeon/dungeon_materials.gd")

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
var decor_root: Node3D

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
	preload("res://scenes/items/weapon_flail.tscn"),
	preload("res://scenes/items/weapon_crossbow.tscn"),
	preload("res://scenes/items/weapon_daggers.tscn"),
	preload("res://scenes/items/weapon_warhammer.tscn"),
	preload("res://scenes/items/weapon_spear.tscn"),
]

func _init() -> void:
	var mats := DungeonMaterials.get_materials()
	floor_mat = mats["floor"]
	wall_mat = mats["wall"]
	ceiling_mat = mats["ceiling"]
	trim_mat = mats["trim"]

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
	_place_props()
	print("DungeonGenerator: Generation complete")

func _add_geometry(node: Node3D) -> void:
	if nav_region:
		nav_region.add_child(node)
	else:
		add_child(node)

# Decorative geometry lives outside the navigation region so the runtime bake
# never has to walk it — clutter should not cost pathfinding anything.
func _add_decor(node: Node3D) -> void:
	if decor_root == null or not is_instance_valid(decor_root):
		decor_root = Node3D.new()
		decor_root.name = "Decor"
		add_child(decor_root)
	decor_root.add_child(node)

# --- MESH HELPERS -------------------------------------------------------------
# The dungeon used to be built out of CSG nodes. Nothing here needs boolean
# operations, and CSG re-evaluates its brushes on the CPU, so everything is
# plain MeshInstance3D now — with a StaticBody3D only where collision matters.

func _shell(pos: Vector3, mesh: Mesh, mat: Material, collide: bool, shape: Shape3D = null, shadows: bool = true) -> Node3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	if not shadows:
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	if not collide:
		mi.position = pos
		return mi
	var body := StaticBody3D.new()
	body.position = pos
	var col := CollisionShape3D.new()
	col.shape = shape
	body.add_child(col)
	body.add_child(mi)
	return body

func _box(size: Vector3, pos: Vector3, mat: Material, collide: bool = false, shadows: bool = true) -> Node3D:
	var mesh := BoxMesh.new()
	mesh.size = size
	var shape: Shape3D = null
	if collide:
		var bs := BoxShape3D.new()
		bs.size = size
		shape = bs
	return _shell(pos, mesh, mat, collide, shape, shadows)

func _cyl(radius: float, height: float, sides: int, pos: Vector3, mat: Material, cone: bool = false, shadows: bool = true) -> Node3D:
	var mesh := CylinderMesh.new()
	mesh.top_radius = 0.0 if cone else radius
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = sides
	mesh.rings = 1
	return _shell(pos, mesh, mat, false, null, shadows)

func _sphere(radius: float, pos: Vector3, mat: Material, segments: int = 8, rings: int = 4, shadows: bool = true) -> Node3D:
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2.0
	mesh.radial_segments = segments
	mesh.rings = rings
	return _shell(pos, mesh, mat, false, null, shadows)

func _torus(inner: float, outer: float, pos: Vector3, mat: Material, sides: int = 10, ring_sides: int = 5) -> Node3D:
	var mesh := TorusMesh.new()
	mesh.inner_radius = inner
	mesh.outer_radius = outer
	mesh.rings = sides
	mesh.ring_segments = ring_sides
	return _shell(pos, mesh, mat, false, null, false)

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

	# Floor — never casts shadows, it only ever receives them
	_add_geometry(_box(Vector3(sz.x, 0.2, sz.y), pos, floor_mat, true, false))
	# Ceiling
	_add_geometry(_box(Vector3(sz.x, 0.2, sz.y), pos + Vector3(0, height, 0), ceiling_mat, true, false))

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
		# Shaft, plinth and capital
		_add_decor(_box(Vector3(0.3, height, 0.3), cp + Vector3(0, height / 2.0, 0), pillar_mat))
		_add_decor(_box(Vector3(0.45, 0.25, 0.45), cp + Vector3(0, 0.22, 0), cap_mat))
		_add_decor(_box(Vector3(0.42, 0.15, 0.42), cp + Vector3(0, height - 0.17, 0), cap_mat))

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
	var trim_y := trim_height / 2.0 + 0.1
	if "north" not in openings:
		_add_decor(_box(Vector3(sz.x - 0.6, trim_height, trim_depth),
			pos + Vector3(0, trim_y, -half_z + trim_depth / 2.0), base_mat))
	if "south" not in openings:
		_add_decor(_box(Vector3(sz.x - 0.6, trim_height, trim_depth),
			pos + Vector3(0, trim_y, half_z - trim_depth / 2.0), base_mat))
	if "east" not in openings:
		_add_decor(_box(Vector3(trim_depth, trim_height, sz.y - 0.6),
			pos + Vector3(half_x - trim_depth / 2.0, trim_y, 0), base_mat))
	if "west" not in openings:
		_add_decor(_box(Vector3(trim_depth, trim_height, sz.y - 0.6),
			pos + Vector3(-half_x + trim_depth / 2.0, trim_y, 0), base_mat))

	# --- DEBRIS AND DETAIL ---
	var debris_rng := RandomNumberGenerator.new()
	debris_rng.seed = int(pos.x * 100 + pos.z * 37)

	var debris_mat := StandardMaterial3D.new()
	debris_mat.albedo_color = Color(0.3, 0.28, 0.25)
	debris_mat.roughness = 0.95

	var stain_mat := StandardMaterial3D.new()
	stain_mat.albedo_color = Color(0.12, 0.1, 0.08, 0.55)
	stain_mat.roughness = 0.98
	stain_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA

	# Scattered rubble (natural rock shapes on floor)
	var rubble_count := debris_rng.randi_range(3, 7)
	for _r in range(rubble_count):
		var rsize := debris_rng.randf_range(0.04, 0.12)
		var rx := debris_rng.randf_range(-half_x + 1, half_x - 1)
		var rz := debris_rng.randf_range(-half_z + 1, half_z - 1)
		var rtype := debris_rng.randi() % 3
		if rtype == 0:
			_add_decor(_sphere(rsize, pos + Vector3(rx, rsize * 0.5 + 0.1, rz), debris_mat, 6, 3, false))
		elif rtype == 1:
			var pebble := _sphere(rsize * 1.2, Vector3.ZERO, debris_mat, 6, 3, false)
			pebble.transform = Transform3D(
				Vector3(1.3, 0, 0), Vector3(0, 0.4, 0), Vector3(0, 0, 1.1),
				pos + Vector3(rx, rsize * 0.2 + 0.1, rz))
			_add_decor(pebble)
		else:
			var chunk := _cyl(rsize, rsize * 0.8, 5, pos + Vector3(rx, rsize * 0.4 + 0.1, rz), debris_mat, false, false)
			chunk.rotation = Vector3(debris_rng.randf_range(-0.3, 0.3), debris_rng.randf() * TAU, debris_rng.randf_range(-0.3, 0.3))
			_add_decor(chunk)

	# Floor stains (organic-shaped dark patches using flattened spheres)
	var stain_count := debris_rng.randi_range(1, 3)
	for _s in range(stain_count):
		var ssize := debris_rng.randf_range(0.3, 0.8)
		var stain := _sphere(ssize, Vector3.ZERO, stain_mat, 8, 4, false)
		stain.transform = Transform3D(
			Vector3(1.0 + debris_rng.randf_range(-0.3, 0.3), 0, 0),
			Vector3(0, 0.01, 0),
			Vector3(0, 0, 1.0 + debris_rng.randf_range(-0.3, 0.3)),
			pos + Vector3(
				debris_rng.randf_range(-half_x + 1, half_x - 1),
				0.11,
				debris_rng.randf_range(-half_z + 1, half_z - 1)))
		_add_decor(stain)

	# Wall cracks (thin dark lines on walls, 1-2 per room)
	var crack_mat := StandardMaterial3D.new()
	crack_mat.albedo_color = Color(0.06, 0.055, 0.05)
	crack_mat.roughness = 0.99
	var crack_count := debris_rng.randi_range(1, 2)
	for _c in range(crack_count):
		var crack_h := debris_rng.randf_range(0.5, 1.5)
		var wall_side := debris_rng.randi() % 4
		var crack_pos: Vector3
		match wall_side:
			0: crack_pos = pos + Vector3(debris_rng.randf_range(-half_x + 1, half_x - 1), debris_rng.randf_range(0.5, 2.5), -half_z + 0.02)
			1: crack_pos = pos + Vector3(debris_rng.randf_range(-half_x + 1, half_x - 1), debris_rng.randf_range(0.5, 2.5), half_z - 0.02)
			2: crack_pos = pos + Vector3(-half_x + 0.02, debris_rng.randf_range(0.5, 2.5), debris_rng.randf_range(-half_z + 1, half_z - 1))
			_: crack_pos = pos + Vector3(half_x - 0.02, debris_rng.randf_range(0.5, 2.5), debris_rng.randf_range(-half_z + 1, half_z - 1))
		var crack := _box(Vector3(0.015, crack_h, 0.015), crack_pos, crack_mat, false, false)
		crack.rotation.z = debris_rng.randf_range(-0.3, 0.3)
		_add_decor(crack)

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
		var size: Vector3
		var at: Vector3
		match side:
			"north":
				size = Vector3(room_size.x, height, WALL_THICKNESS)
				at = room_pos + Vector3(0, height / 2.0, -half_z)
			"south":
				size = Vector3(room_size.x, height, WALL_THICKNESS)
				at = room_pos + Vector3(0, height / 2.0, half_z)
			"east":
				size = Vector3(WALL_THICKNESS, height, room_size.y)
				at = room_pos + Vector3(half_x, height / 2.0, 0)
			_:
				size = Vector3(WALL_THICKNESS, height, room_size.y)
				at = room_pos + Vector3(-half_x, height / 2.0, 0)
		_add_geometry(_box(size, at, wall_mat, true))
		return

	# Wall with a doorway punched through the middle
	var door_height := 3.0
	var top_height := height - door_height

	match side:
		"north", "south":
			var z_offset := -half_z if side == "north" else half_z
			var seg_width := (room_size.x - opening_width) / 2.0
			if seg_width > 0.1:
				_add_geometry(_box(Vector3(seg_width, height, WALL_THICKNESS),
					room_pos + Vector3(-half_x + seg_width / 2.0, height / 2.0, z_offset), wall_mat, true))
				_add_geometry(_box(Vector3(seg_width, height, WALL_THICKNESS),
					room_pos + Vector3(half_x - seg_width / 2.0, height / 2.0, z_offset), wall_mat, true))
			if top_height > 0.1:
				_add_geometry(_box(Vector3(opening_width, top_height, WALL_THICKNESS),
					room_pos + Vector3(0, door_height + top_height / 2.0, z_offset), wall_mat, true))
		"east", "west":
			var x_offset := half_x if side == "east" else -half_x
			var side_width := (room_size.y - opening_width) / 2.0
			if side_width > 0.1:
				_add_geometry(_box(Vector3(WALL_THICKNESS, height, side_width),
					room_pos + Vector3(x_offset, height / 2.0, -half_z + side_width / 2.0), wall_mat, true))
				_add_geometry(_box(Vector3(WALL_THICKNESS, height, side_width),
					room_pos + Vector3(x_offset, height / 2.0, half_z - side_width / 2.0), wall_mat, true))
			if top_height > 0.1:
				_add_geometry(_box(Vector3(WALL_THICKNESS, top_height, opening_width),
					room_pos + Vector3(x_offset, door_height + top_height / 2.0, 0), wall_mat, true))

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

	var floor_size: Vector3
	if abs(dir.x) > 0.5:
		floor_size = Vector3(length, 0.2, CORRIDOR_WIDTH)
	else:
		floor_size = Vector3(CORRIDOR_WIDTH, 0.2, length)

	_add_geometry(_box(floor_size, mid, floor_mat, true, false))
	_add_geometry(_box(floor_size, mid + Vector3(0, WALL_HEIGHT, 0), ceiling_mat, true, false))

	var half_w := CORRIDOR_WIDTH / 2.0
	if abs(dir.x) > 0.5:
		# East-west corridor: walls on the north and south flanks
		var wall_size := Vector3(length, WALL_HEIGHT, WALL_THICKNESS)
		_add_geometry(_box(wall_size, mid + Vector3(0, WALL_HEIGHT / 2.0, -half_w), wall_mat, true))
		_add_geometry(_box(wall_size, mid + Vector3(0, WALL_HEIGHT / 2.0, half_w), wall_mat, true))
	else:
		# North-south corridor: walls on the east and west flanks
		var wall_size := Vector3(WALL_THICKNESS, WALL_HEIGHT, length)
		_add_geometry(_box(wall_size, mid + Vector3(half_w, WALL_HEIGHT / 2.0, 0), wall_mat, true))
		_add_geometry(_box(wall_size, mid + Vector3(-half_w, WALL_HEIGHT / 2.0, 0), wall_mat, true))

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

func _add_decor_deferred(node: Node3D) -> void:
	if decor_root == null or not is_instance_valid(decor_root):
		decor_root = Node3D.new()
		decor_root.name = "Decor"
		add_child(decor_root)
	decor_root.call_deferred("add_child", node)

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
			_add_decor_deferred(torch)

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
			_add_decor_deferred(t1)
			var t2 := torch_scene.instantiate()
			t2.position = third2 + Vector3(0, 1.5, half_w)
			_add_decor_deferred(t2)
		else:
			var t1 := torch_scene.instantiate()
			t1.position = third1 + Vector3(-half_w, 1.5, 0)
			_add_decor_deferred(t1)
			var t2 := torch_scene.instantiate()
			t2.position = third2 + Vector3(half_w, 1.5, 0)
			_add_decor_deferred(t2)

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
	# Place weapons across rooms, spread evenly
	var weapon_rooms := [2, 4, 7, 9, 11, 13, 15, 17, 18]
	var weapon_names := ["sword", "bow", "axe", "staff", "flail", "crossbow", "daggers", "warhammer", "spear"]
	for idx in range(mini(weapon_rooms.size(), weapon_scenes.size())):
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

# --- SET DRESSING ---------------------------------------------------------
# Props exist mostly to break up the orange monotony of torchlight: the
# crystals and their cold accent lights are what give rooms a second colour.

func _place_props() -> void:
	var rng := RandomNumberGenerator.new()
	rng.randomize()

	var crystal_palette := [
		{"albedo": Color(0.25, 0.6, 0.95), "light": Color(0.35, 0.65, 1.0)},   # cold blue
		{"albedo": Color(0.55, 0.3, 0.9), "light": Color(0.6, 0.35, 1.0)},     # violet
		{"albedo": Color(0.2, 0.85, 0.7), "light": Color(0.3, 0.95, 0.8)},     # sickly green
	]

	for i in range(room_data.size()):
		var room: Dictionary = room_data[i]
		var pos: Vector3 = room["pos"]
		var sz: Vector2 = room["size"]
		var half_x := sz.x / 2.0
		var half_z := sz.y / 2.0
		var height: float = 6.0 if room["type"] == "boss" else WALL_HEIGHT

		# Crystal outcrops — the cool counterpoint to all that firelight
		if room["type"] == "boss" or rng.randf() < 0.45:
			var pal: Dictionary = crystal_palette[rng.randi() % crystal_palette.size()]
			var corner := rng.randi() % 4
			var cx: float = (half_x - 1.2) * (1.0 if corner % 2 == 0 else -1.0)
			var cz: float = (half_z - 1.2) * (1.0 if corner < 2 else -1.0)
			_build_crystal_cluster(pos + Vector3(cx, 0.1, cz), pal, rng)

		# Barrels and crates against the walls
		var crate_count := rng.randi_range(0, 3)
		for _c in range(crate_count):
			var wall := rng.randi() % 4
			var along := rng.randf_range(-0.65, 0.65)
			var cp: Vector3
			match wall:
				0: cp = pos + Vector3(along * half_x, 0.1, -half_z + 0.7)
				1: cp = pos + Vector3(along * half_x, 0.1, half_z - 0.7)
				2: cp = pos + Vector3(-half_x + 0.7, 0.1, along * half_z)
				_: cp = pos + Vector3(half_x - 0.7, 0.1, along * half_z)
			if rng.randf() < 0.5:
				_build_barrel(cp, rng)
			else:
				_build_crate(cp, rng)

		# Bones left by whoever came through last
		if rng.randf() < 0.55:
			_build_bone_pile(pos + Vector3(
				rng.randf_range(-half_x + 1.5, half_x - 1.5), 0.1,
				rng.randf_range(-half_z + 1.5, half_z - 1.5)), rng)

		# Standing water — low roughness, so it mirrors the torches
		var puddle_count := rng.randi_range(0, 2)
		for _p in range(puddle_count):
			_build_puddle(pos + Vector3(
				rng.randf_range(-half_x + 1.5, half_x - 1.5), 0.105,
				rng.randf_range(-half_z + 1.5, half_z - 1.5)), rng)

		# Chains hanging from the vault — vertical interest, catches highlights
		if rng.randf() < 0.5:
			_build_chain(pos + Vector3(
				rng.randf_range(-half_x + 2.0, half_x - 2.0), height,
				rng.randf_range(-half_z + 2.0, half_z - 2.0)), rng)

func _build_crystal_cluster(at: Vector3, pal: Dictionary, rng: RandomNumberGenerator) -> void:
	var crystal_mat := StandardMaterial3D.new()
	crystal_mat.albedo_color = pal["albedo"]
	crystal_mat.roughness = 0.12
	crystal_mat.metallic = 0.1
	crystal_mat.metallic_specular = 0.9
	crystal_mat.emission_enabled = true
	crystal_mat.emission = pal["light"]
	crystal_mat.emission_energy_multiplier = 0.85

	var base_mat := StandardMaterial3D.new()
	base_mat.albedo_color = Color(0.14, 0.14, 0.16)
	base_mat.roughness = 0.9

	var rock := _sphere(0.42, Vector3.ZERO, base_mat, 7, 4, false)
	rock.transform = Transform3D(Vector3(1.3, 0, 0), Vector3(0, 0.5, 0), Vector3(0, 0, 1.2), at)
	_add_decor(rock)

	var shard_count := rng.randi_range(4, 7)
	for i in range(shard_count):
		var radius := rng.randf_range(0.06, 0.13)
		var height := rng.randf_range(0.5, 1.15)
		var ang := rng.randf() * TAU
		var dist := rng.randf_range(0.0, 0.32)
		var shard := _cyl(radius, height, 6,
			at + Vector3(cos(ang) * dist, height / 2.0 + 0.05, sin(ang) * dist),
			crystal_mat, true, false)
		shard.rotation = Vector3(rng.randf_range(-0.35, 0.35), ang, rng.randf_range(-0.35, 0.35))
		_add_decor(shard)

	var light := OmniLight3D.new()
	light.light_color = pal["light"]
	light.light_energy = 2.4
	light.light_indirect_energy = 0.0
	light.omni_range = 8.5
	light.omni_attenuation = 1.6
	light.shadow_enabled = false
	light.position = at + Vector3(0, 0.8, 0)
	_add_decor(light)

func _build_barrel(at: Vector3, rng: RandomNumberGenerator) -> void:
	var wood := StandardMaterial3D.new()
	wood.albedo_color = Color(0.22, 0.14, 0.08)
	wood.roughness = 0.85
	wood.metallic_specular = 0.25
	var iron := StandardMaterial3D.new()
	iron.albedo_color = Color(0.16, 0.15, 0.14)
	iron.roughness = 0.4
	iron.metallic = 0.8

	var body := _cyl(0.28, 0.75, 12, at + Vector3(0, 0.375, 0), wood)
	body.rotation.y = rng.randf() * TAU
	_add_decor(body)
	_add_collider(at + Vector3(0, 0.375, 0), Vector3(0.5, 0.75, 0.5))

	for h in [0.18, 0.57]:
		_add_decor(_torus(0.275, 0.3, at + Vector3(0, h, 0), iron, 12, 4))

func _build_crate(at: Vector3, rng: RandomNumberGenerator) -> void:
	var wood := StandardMaterial3D.new()
	wood.albedo_color = Color(0.26, 0.17, 0.09)
	wood.roughness = 0.9
	var frame := StandardMaterial3D.new()
	frame.albedo_color = Color(0.17, 0.11, 0.06)
	frame.roughness = 0.9

	var sz := rng.randf_range(0.45, 0.65)
	var yaw := rng.randf() * TAU
	var box := _box(Vector3(sz, sz, sz), at + Vector3(0, sz / 2.0, 0), wood)
	box.rotation.y = yaw
	_add_decor(box)
	_add_collider(at + Vector3(0, sz / 2.0, 0), Vector3(sz, sz, sz))

	# Battens across the lid so it doesn't read as a bare cube
	for axis in [true, false]:
		var batten := _box(
			Vector3(sz * 1.02, 0.05, 0.05) if axis else Vector3(0.05, 0.05, sz * 1.02),
			at + Vector3(0, sz - 0.03, 0), frame, false, false)
		batten.rotation.y = yaw
		_add_decor(batten)

func _add_collider(at: Vector3, size: Vector3) -> void:
	var body := StaticBody3D.new()
	body.position = at
	var col := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	col.shape = shape
	body.add_child(col)
	_add_geometry(body)

func _build_bone_pile(at: Vector3, rng: RandomNumberGenerator) -> void:
	var bone_mat := StandardMaterial3D.new()
	bone_mat.albedo_color = Color(0.66, 0.63, 0.55)
	bone_mat.roughness = 0.7
	bone_mat.metallic_specular = 0.3

	var skull := _sphere(0.11, at + Vector3(0, 0.11, 0), bone_mat, 8, 5)
	skull.rotation.y = rng.randf() * TAU
	_add_decor(skull)
	_add_decor(_box(Vector3(0.13, 0.05, 0.1), at + Vector3(0, 0.04, 0.03), bone_mat, false, false))

	for i in range(rng.randi_range(3, 5)):
		var ang := rng.randf() * TAU
		var rib := _cyl(0.02, rng.randf_range(0.22, 0.4), 5,
			at + Vector3(cos(ang) * rng.randf_range(0.15, 0.45), 0.03, sin(ang) * rng.randf_range(0.15, 0.45)),
			bone_mat, false, false)
		rib.rotation = Vector3(PI / 2.0, rng.randf() * TAU, 0)
		_add_decor(rib)

func _build_puddle(at: Vector3, rng: RandomNumberGenerator) -> void:
	# There are no screen-space reflections in the compatibility renderer, so a
	# puddle sells itself with a tight specular highlight rather than a mirror:
	# dark, mostly transparent, and very smooth.
	var water := StandardMaterial3D.new()
	water.albedo_color = Color(0.06, 0.07, 0.08, 0.5)
	water.roughness = 0.04
	water.metallic = 0.2
	water.metallic_specular = 1.0
	water.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	water.disable_receive_shadows = true
	water.cull_mode = BaseMaterial3D.CULL_BACK

	var radius := rng.randf_range(0.5, 1.1)
	var puddle := _cyl(radius, 0.02, 16, Vector3.ZERO, water, false, false)
	puddle.transform = Transform3D(
		Vector3(1.0 + rng.randf_range(-0.3, 0.3), 0, 0),
		Vector3(0, 1, 0),
		Vector3(0, 0, 1.0 + rng.randf_range(-0.3, 0.3)),
		at)
	_add_decor(puddle)

func _build_chain(at: Vector3, rng: RandomNumberGenerator) -> void:
	var iron := StandardMaterial3D.new()
	iron.albedo_color = Color(0.14, 0.13, 0.12)
	iron.roughness = 0.35
	iron.metallic = 0.9
	iron.metallic_specular = 0.7

	var links := rng.randi_range(4, 9)
	for i in range(links):
		var link := _torus(0.035, 0.06, at + Vector3(0, -0.1 - i * 0.09, 0), iron, 6, 4)
		link.rotation = Vector3(PI / 2.0, 0, 0) if i % 2 == 0 else Vector3(PI / 2.0, PI / 2.0, 0)
		_add_decor(link)

	if rng.randf() < 0.4:
		var hook := _torus(0.07, 0.11, at + Vector3(0, -0.15 - links * 0.09, 0), iron, 8, 4)
		hook.rotation = Vector3(PI / 2.0, 0, 0)
		_add_decor(hook)

func _on_boss_defeated() -> void:
	boss_defeated.emit()
