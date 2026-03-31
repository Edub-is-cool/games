extends Node3D

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
	preload("res://scenes/enemies/skeleton.tscn"),
	preload("res://scenes/enemies/orc.tscn"),
]
var boss_scenes: Array[PackedScene] = [
	preload("res://scenes/enemies/boss_witch.tscn"),
	preload("res://scenes/enemies/boss_werewolf.tscn"),
	preload("res://scenes/enemies/boss.tscn"),
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
	# Wait for nav bake
	await get_tree().process_frame
	await get_tree().process_frame
	_start_next_wave()

func _build_arena() -> void:
	var nav_region := $NavigationRegion3D

	var floor_mat := StandardMaterial3D.new()
	floor_mat.albedo_color = Color(0.35, 0.3, 0.27)
	floor_mat.roughness = 0.9
	floor_mat.metallic_specular = 0.25

	var wall_mat := StandardMaterial3D.new()
	wall_mat.albedo_color = Color(0.4, 0.35, 0.3)
	wall_mat.roughness = 0.85
	wall_mat.metallic_specular = 0.2

	var ceil_mat := StandardMaterial3D.new()
	ceil_mat.albedo_color = Color(0.25, 0.22, 0.2)
	ceil_mat.roughness = 0.95

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


func _start_next_wave() -> void:
	current_wave += 1
	wave_active = true
	SoundManager.play_sound("level_up")

	# Update wave display
	var wave_label := hud.get_node_or_null("FloorLabel")
	if wave_label:
		wave_label.text = "Wave " + str(current_wave)

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
