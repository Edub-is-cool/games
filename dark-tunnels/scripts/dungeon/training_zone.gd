extends Node3D

const DungeonMaterials := preload("res://scripts/dungeon/dungeon_materials.gd")

@onready var hud: CanvasLayer = $HUD
@onready var player: CharacterBody3D = $Player

var current_wave: int = 0
var enemies_in_wave: int = 0
var wave_active: bool = false
var arena_center := Vector3.ZERO
var arena_size := 30.0

var enemy_scenes: Array[PackedScene] = [
	preload("res://scenes/enemies/slime.tscn"),
	preload("res://scenes/enemies/enemy.tscn"),
	preload("res://scenes/enemies/rat_swarm.tscn"),
	preload("res://scenes/enemies/cave_spider.tscn"),
	preload("res://scenes/enemies/mushroom_spore.tscn"),
	preload("res://scenes/enemies/skeleton.tscn"),
	preload("res://scenes/enemies/shadow_wraith.tscn"),
	preload("res://scenes/enemies/orc.tscn"),
	preload("res://scenes/enemies/rock_golem.tscn"),
	preload("res://scenes/enemies/crystal_sentinel.tscn"),
	preload("res://scenes/enemies/bone_rattler.tscn"),
]
var boss_scenes: Array[PackedScene] = [
	preload("res://scenes/enemies/boss_witch.tscn"),
	preload("res://scenes/enemies/boss_werewolf.tscn"),
	preload("res://scenes/enemies/boss.tscn"),
	preload("res://scenes/enemies/boss_colossus.tscn"),
	preload("res://scenes/enemies/boss_eye.tscn"),
	preload("res://scenes/enemies/boss_warden.tscn"),
	preload("res://scenes/enemies/boss_hollow_king.tscn"),
]

func _ready() -> void:
	_build_arena()
	player.global_position = Vector3(0, 1, 0)
	hud.setup(player)
	GameManager.enemy_killed.connect(_on_enemy_killed)
	call_deferred("_bake_and_start")

func _bake_and_start() -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	await get_tree().process_frame
	var nav_region := $NavigationRegion3D
	if nav_region:
		nav_region.bake_navigation_mesh()
	await get_tree().process_frame
	await get_tree().process_frame
	_start_next_wave()

func _build_arena() -> void:
	var nav_region := $NavigationRegion3D

	var mats := DungeonMaterials.get_materials()
	var floor_mat: Material = mats["floor"]
	var wall_mat: Material = mats["wall"]
	var ceil_mat: Material = mats["ceiling"]

	var half := arena_size / 2.0
	var height := 5.0

	# Floor
	var floor_box := CSGBox3D.new()
	floor_box.size = Vector3(arena_size, 0.2, arena_size)
	floor_box.use_collision = true
	floor_box.material = floor_mat
	nav_region.add_child(floor_box)

	# Ceiling
	var ceil_box := CSGBox3D.new()
	ceil_box.size = Vector3(arena_size, 0.2, arena_size)
	ceil_box.position = Vector3(0, height, 0)
	ceil_box.use_collision = true
	ceil_box.material = ceil_mat
	nav_region.add_child(ceil_box)

	# 4 walls
	var wall_data := [
		{"pos": Vector3(0, height / 2.0, -half), "size": Vector3(arena_size, height, 0.3)},
		{"pos": Vector3(0, height / 2.0, half), "size": Vector3(arena_size, height, 0.3)},
		{"pos": Vector3(-half, height / 2.0, 0), "size": Vector3(0.3, height, arena_size)},
		{"pos": Vector3(half, height / 2.0, 0), "size": Vector3(0.3, height, arena_size)},
	]
	for wd in wall_data:
		var wall := CSGBox3D.new()
		wall.size = wd["size"]
		wall.position = wd["pos"]
		wall.use_collision = true
		wall.material = wall_mat
		nav_region.add_child(wall)

	# Torches in corners and midpoints
	var torch_scene := preload("res://scenes/dungeon/torch.tscn")
	var torch_positions := [
		Vector3(-half + 1, 1.5, -half + 1),
		Vector3(half - 1, 1.5, -half + 1),
		Vector3(-half + 1, 1.5, half - 1),
		Vector3(half - 1, 1.5, half - 1),
		Vector3(0, 1.5, -half + 0.5),
		Vector3(0, 1.5, half - 0.5),
		Vector3(-half + 0.5, 1.5, 0),
		Vector3(half - 0.5, 1.5, 0),
	]
	for tp in torch_positions:
		var torch := torch_scene.instantiate()
		torch.position = tp
		add_child(torch)

	# Hanging braziers over the arena — wall torches alone leave the middle of a
	# 30m room unlit now that lighting is fully dynamic.
	for bp in [Vector3(-8, 0, -8), Vector3(8, 0, -8), Vector3(-8, 0, 8), Vector3(8, 0, 8), Vector3(0, 0, 0)]:
		_build_brazier(bp, height)

	# Place a merchant in the corner
	var merchant_scene := preload("res://scenes/dungeon/merchant.tscn")
	var merchant := merchant_scene.instantiate()
	merchant.position = Vector3(half - 3, 0, half - 3)
	add_child(merchant)

	# Give starting gold for training purchases
	if Inventory.gold < 500:
		Inventory.gold = 500
		Inventory.gold_changed.emit(Inventory.gold)

func _build_brazier(at: Vector3, ceiling_height: float) -> void:
	var iron := StandardMaterial3D.new()
	iron.albedo_color = Color(0.13, 0.12, 0.11)
	iron.roughness = 0.4
	iron.metallic = 0.85

	var coal := StandardMaterial3D.new()
	coal.albedo_color = Color(1.0, 0.42, 0.06)
	coal.roughness = 0.6
	coal.emission_enabled = true
	coal.emission = Color(1.0, 0.36, 0.05)
	coal.emission_energy_multiplier = 6.0

	var hang_y := ceiling_height - 1.2

	var chain := MeshInstance3D.new()
	var chain_mesh := CylinderMesh.new()
	chain_mesh.top_radius = 0.02
	chain_mesh.bottom_radius = 0.02
	chain_mesh.height = 1.1
	chain_mesh.radial_segments = 5
	chain.mesh = chain_mesh
	chain.material_override = iron
	chain.position = at + Vector3(0, hang_y + 0.55, 0)
	add_child(chain)

	var bowl := MeshInstance3D.new()
	var bowl_mesh := CylinderMesh.new()
	bowl_mesh.top_radius = 0.55
	bowl_mesh.bottom_radius = 0.22
	bowl_mesh.height = 0.35
	bowl_mesh.radial_segments = 12
	bowl.mesh = bowl_mesh
	bowl.material_override = iron
	bowl.position = at + Vector3(0, hang_y, 0)
	add_child(bowl)

	var embers := MeshInstance3D.new()
	var ember_mesh := SphereMesh.new()
	ember_mesh.radius = 0.4
	ember_mesh.height = 0.42
	ember_mesh.radial_segments = 10
	ember_mesh.rings = 5
	embers.mesh = ember_mesh
	embers.material_override = coal
	embers.position = at + Vector3(0, hang_y + 0.12, 0)
	embers.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(embers)

	var light := OmniLight3D.new()
	light.light_color = Color(1.0, 0.72, 0.44)
	light.light_energy = 1.7
	light.light_indirect_energy = 0.0
	light.omni_range = 12.0
	light.omni_attenuation = 1.3
	light.shadow_enabled = false
	light.position = at + Vector3(0, hang_y - 0.2, 0)
	add_child(light)

func _start_next_wave() -> void:
	# 10 second delay between waves
	var label := hud.get_node_or_null("FloorLabel")
	if label:
		label.text = "Next wave in 10s..."
	await get_tree().create_timer(10.0).timeout
	current_wave += 1
	wave_active = true
	SoundManager.play_sound("level_up")

	# Update wave display
	if label:
		label.text = "Wave " + str(current_wave)

	var is_boss_wave := current_wave % 5 == 0

	if is_boss_wave:
		_spawn_boss_wave()
	else:
		_spawn_enemy_wave()

func _spawn_enemy_wave() -> void:
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	var count := 3 + current_wave
	enemies_in_wave = count

	for i in range(count):
		# Pick enemy tier based on wave
		var tier := clampi(current_wave / 3, 0, enemy_scenes.size() - 1)
		var pick := rng.randi_range(maxi(0, tier - 1), tier)
		var enemy := enemy_scenes[pick].instantiate()

		# Scale with wave number
		if current_wave > 5:
			var mult := 1.0 + (current_wave - 5) * 0.1
			enemy.max_health = int(enemy.max_health * mult)
			enemy.damage = int(enemy.damage * mult)

		var angle := randf() * TAU
		var dist := randf_range(5, arena_size / 2.0 - 2)
		enemy.position = Vector3(cos(angle) * dist, 0, sin(angle) * dist)
		call_deferred("add_child", enemy)

func _spawn_boss_wave() -> void:
	var boss_idx := (current_wave / 5 - 1) % boss_scenes.size()
	var boss := boss_scenes[boss_idx].instantiate()

	# Scale boss with wave
	if current_wave > 5:
		var mult := 1.0 + (current_wave - 5) * 0.15
		boss.max_health = int(boss.max_health * mult)
		boss.damage = int(boss.damage * mult)

	boss.position = Vector3(0, 0, -8)
	enemies_in_wave = 1

	# Also add some regular enemies
	var extras := current_wave / 5
	enemies_in_wave += extras
	call_deferred("add_child", boss)

	var rng := RandomNumberGenerator.new()
	rng.randomize()
	for i in range(extras):
		var tier := clampi(current_wave / 3, 0, enemy_scenes.size() - 1)
		var enemy := enemy_scenes[tier].instantiate()
		var angle := randf() * TAU
		enemy.position = Vector3(cos(angle) * 8, 0, sin(angle) * 8)
		call_deferred("add_child", enemy)

func _on_enemy_killed(_enemy: Node3D) -> void:
	if not wave_active:
		return
	enemies_in_wave -= 1
	if enemies_in_wave <= 0:
		wave_active = false
		# Heal player between waves
		player.health = player.max_health
		player.mana = player.max_mana + Inventory.get_mana_bonus()
		player.health_changed.emit(player.health, player.max_health)
		player.mana_changed.emit(player.mana, player.max_mana)
		# Short delay then next wave
		await get_tree().create_timer(2.0).timeout
		_start_next_wave()
