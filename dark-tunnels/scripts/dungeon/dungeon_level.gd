extends Node3D

@onready var hud: CanvasLayer = $HUD
@onready var player: CharacterBody3D = $Player
@onready var generator: Node3D = $DungeonGenerator

var endless_boss_count: int = 0

func _ready() -> void:
	print("DungeonLevel: Floor ", GameManager.current_floor, " (", GameManager.game_mode, ")")
	var nav_region := $NavigationRegion3D
	generator.nav_region = nav_region
	generator.boss_defeated.connect(_on_boss_defeated)
	generator.generate()
	player.global_position = generator.get_player_spawn()
	hud.setup(player)
	# Pass minimap data
	var minimap := hud.get_node_or_null("MinimapContainer")
	if minimap and minimap.has_method("set_room_data"):
		minimap.set_room_data(generator.room_data)
	call_deferred("_bake_navigation")

func _bake_navigation() -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	await get_tree().process_frame
	var nav_region := $NavigationRegion3D
	if nav_region:
		nav_region.bake_navigation_mesh()

func _on_boss_defeated() -> void:
	await get_tree().create_timer(1.5).timeout
	# Full heal after boss
	player.health = player.max_health
	player.mana = player.max_mana + Inventory.get_mana_bonus()
	player.health_changed.emit(player.health, player.max_health)
	player.mana_changed.emit(player.mana, player.max_mana)

	if GameManager.game_mode == "campaign":
		if GameManager.current_floor < 7:
			GameManager.current_floor += 1
			GameManager.enemies_alive = 0
			SoundManager.play_sound("level_up")
			get_tree().reload_current_scene()
		else:
			get_tree().change_scene_to_packed(preload("res://scenes/dungeon/victory_room.tscn"))
	else:
		# Endless mode — stay on the same floor, spawn more enemies and next boss
		endless_boss_count += 1
		GameManager.current_floor += 1
		SoundManager.play_sound("level_up")

		# Update floor label
		var floor_label := hud.get_node_or_null("FloorLabel")
		if floor_label:
			floor_label.text = "Floor " + str(GameManager.current_floor)

		# Spawn new enemies throughout the existing dungeon
		_spawn_endless_wave()

func _spawn_endless_wave() -> void:
	var rng := RandomNumberGenerator.new()
	rng.randomize()
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

	# Spawn enemies in random rooms
	for i in range(3, generator.room_data.size() - 1):
		var room: Dictionary = generator.room_data[i]
		if room["type"] == "boss":
			continue
		if rng.randf() > 0.5:
			continue
		var pos: Vector3 = room["pos"]
		var sz: Vector2 = room["size"]
		var count := rng.randi_range(1, 2 + GameManager.current_floor / 3)
		for _j in range(count):
			var tier := clampi(rng.randi_range(0, GameManager.current_floor / 2), 0, enemy_scenes.size() - 1)
			var enemy := enemy_scenes[tier].instantiate()
			var floor_mult := 1.0 + (GameManager.current_floor - 1) * 0.15
			enemy.max_health = int(enemy.max_health * floor_mult)
			enemy.damage = int(enemy.damage * (1.0 + (GameManager.current_floor - 1) * 0.1))
			enemy.position = pos + Vector3(
				rng.randf_range(-sz.x / 3.0, sz.x / 3.0), 0,
				rng.randf_range(-sz.y / 3.0, sz.y / 3.0)
			)
			add_child(enemy)

	# Spawn new boss in the boss room
	var boss_room: Dictionary = generator.room_data[generator.room_data.size() - 1]
	var boss_pos: Vector3 = boss_room["pos"]
	var boss_idx := (GameManager.current_floor - 1) % boss_scenes.size()
	var boss := boss_scenes[boss_idx].instantiate()
	var floor_mult := 1.0 + (GameManager.current_floor - 1) * 0.2
	boss.max_health = int(boss.max_health * floor_mult)
	boss.damage = int(boss.damage * (1.0 + (GameManager.current_floor - 1) * 0.1))
	boss.position = boss_pos
	boss.boss_defeated.connect(_on_boss_defeated)
	add_child(boss)
