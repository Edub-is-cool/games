extends "res://scripts/enemies/boss.gd"

# Phase 1: Summons shadows, teleports. Phase 2 (60%): Melee + projectiles.
# Phase 3 (30%): Rapid teleport assault. Phase 4 (10%): Desperate frenzy.
var teleport_timer: float = 4.0
var summon_timer: float = 5.0
var projectile_timer: float = 0.0
var active_summons: Array[Node] = []
const MAX_SUMMONS := 3
var bolt_scene: PackedScene = preload("res://scenes/magic/witch_bolt.tscn")
var minion_scenes: Array[PackedScene] = [
	preload("res://scenes/enemies/skeleton.tscn"),
	preload("res://scenes/enemies/orc.tscn"),
]

func _physics_process(delta: float) -> void:
	if is_dead:
		return

	# Phase transitions
	if phase == 1 and health <= int(max_health * 0.6):
		phase = 2
		speed = base_speed * 1.3
	elif phase == 2 and health <= int(max_health * 0.3):
		phase = 3
		speed = base_speed * 2.0
	elif phase == 3 and health <= int(max_health * 0.1):
		phase = 4
		speed = base_speed * 2.5

	player = GameManager.player
	if not player:
		return

	if not is_on_floor():
		velocity += get_gravity() * delta

	active_summons = active_summons.filter(func(s): return is_instance_valid(s) and not s.is_dead)

	teleport_timer -= delta
	summon_timer -= delta
	projectile_timer -= delta

	var distance_to_player := global_position.distance_to(player.global_position)

	# Teleport
	var tp_cooldown := 4.0 if phase <= 2 else 1.5
	if teleport_timer <= 0:
		_teleport()
		teleport_timer = tp_cooldown

	# Phase 1: Summon minions
	if phase == 1 and summon_timer <= 0 and active_summons.size() < MAX_SUMMONS:
		_summon()
		summon_timer = 5.0

	# Phase 2+: Shoot projectiles
	if phase >= 2:
		var proj_cd := 2.0 if phase == 2 else 0.8
		if projectile_timer <= 0:
			_shoot_bolts()
			projectile_timer = proj_cd

	# Melee in phase 2+
	if phase >= 2 and distance_to_player <= attack_range:
		velocity.x = 0
		velocity.z = 0
		if attack_timer.is_stopped():
			_attack()
	elif phase == 1:
		# Phase 1: Keep distance
		if distance_to_player < 6.0:
			var away := (global_position - player.global_position).normalized()
			away.y = 0
			velocity.x = away.x * speed
			velocity.z = away.z * speed
		else:
			velocity.x = 0
			velocity.z = 0
			var dir_to := (player.global_position - global_position).normalized()
			dir_to.y = 0
			if dir_to.length() > 0.1:
				look_at(global_position + dir_to, Vector3.UP)
	else:
		nav_agent.target_position = player.global_position
		var next_pos := nav_agent.get_next_path_position()
		var dir := (next_pos - global_position).normalized()
		dir.y = 0
		velocity.x = dir.x * speed
		velocity.z = dir.z * speed
		if dir.length() > 0.1:
			look_at(global_position + dir, Vector3.UP)

	move_and_slide()

func _teleport() -> void:
	if not player:
		return
	var angle := randf() * TAU
	var dist := randf_range(4, 7)
	var new_pos := player.global_position + Vector3(cos(angle) * dist, 0, sin(angle) * dist)
	new_pos.y = global_position.y
	global_position = new_pos
	SoundManager.play_sound("shield")

func _summon() -> void:
	var scene := minion_scenes[randi() % minion_scenes.size()]
	var minion := scene.instantiate()
	var angle := randf() * TAU
	minion.position = global_position + Vector3(cos(angle) * 3.0, 0, sin(angle) * 3.0)
	get_tree().current_scene.call_deferred("add_child", minion)
	active_summons.append(minion)
	SoundManager.play_sound("shield")

func _shoot_bolts() -> void:
	if not player:
		return
	SoundManager.play_sound("fireball")
	var count := 1 if phase <= 2 else 3
	for i in range(count):
		var bolt: Node3D = bolt_scene.instantiate() as Node3D
		get_tree().current_scene.add_child(bolt)
		bolt.global_position = global_position + Vector3(0, 2.0, 0)
		var base_dir: Vector3 = (player.global_position + Vector3(0, 1, 0) - bolt.global_position).normalized()
		if count > 1:
			var angle := (float(i) - 1.0) * 0.3
			bolt.direction = base_dir.rotated(Vector3.UP, angle)
		else:
			bolt.direction = base_dir

func _die() -> void:
	for s in active_summons:
		if is_instance_valid(s) and not s.is_dead:
			s.health = 0
			s._die()
	active_summons.clear()
	super._die()
