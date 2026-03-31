extends "res://scripts/enemies/enemy.gd"

var summon_timer: float = 3.0
var active_summons: Array[Node] = []
const SUMMON_COOLDOWN := 6.0
const MAX_SUMMONS := 2
var summon_scenes: Array[PackedScene] = [
	preload("res://scenes/enemies/slime.tscn"),
	preload("res://scenes/enemies/skeleton.tscn"),
]
var bolt_scene: PackedScene = preload("res://scenes/magic/witch_bolt.tscn")

func _physics_process(delta: float) -> void:
	if is_dead:
		return

	if slow_timer > 0:
		slow_timer -= delta
		speed = base_speed * 0.3
	else:
		speed = base_speed

	player = GameManager.player
	if not player:
		return

	# Clean dead summons
	active_summons = active_summons.filter(func(s): return is_instance_valid(s) and not s.is_dead)

	var distance_to_player := global_position.distance_to(player.global_position)

	if distance_to_player > detection_range:
		return

	if not is_on_floor():
		velocity += get_gravity() * delta

	summon_timer -= delta

	# Try to summon if we can
	if summon_timer <= 0 and active_summons.size() < MAX_SUMMONS:
		_summon_minion()
		summon_timer = SUMMON_COOLDOWN

	# If summons alive, retreat from player
	if active_summons.size() > 0:
		if distance_to_player < 6.0:
			var away := (global_position - player.global_position).normalized()
			away.y = 0
			velocity.x = away.x * speed
			velocity.z = away.z * speed
			if away.length() > 0.1:
				look_at(global_position - away, Vector3.UP)
		else:
			velocity.x = 0
			velocity.z = 0
			var dir_to := (player.global_position - global_position).normalized()
			dir_to.y = 0
			if dir_to.length() > 0.1:
				look_at(global_position + dir_to, Vector3.UP)
	else:
		# No summons - shoot bolts and try to keep distance
		if distance_to_player <= attack_range:
			velocity.x = 0
			velocity.z = 0
			if attack_timer.is_stopped():
				_shoot_bolt()
		elif distance_to_player < 5.0:
			var away := (global_position - player.global_position).normalized()
			away.y = 0
			velocity.x = away.x * speed
			velocity.z = away.z * speed
		else:
			var dir := (player.global_position - global_position).normalized()
			dir.y = 0
			velocity.x = dir.x * speed * 0.5
			velocity.z = dir.z * speed * 0.5
			if dir.length() > 0.1:
				look_at(global_position + dir, Vector3.UP)

	move_and_slide()

func _summon_minion() -> void:
	var scene := summon_scenes[randi() % summon_scenes.size()]
	var minion := scene.instantiate()
	var angle := randf() * TAU
	var spawn_pos := global_position + Vector3(cos(angle) * 2.0, 0, sin(angle) * 2.0)
	minion.position = spawn_pos
	get_tree().current_scene.call_deferred("add_child", minion)
	active_summons.append(minion)
	SoundManager.play_sound("shield")

func _shoot_bolt() -> void:
	attack_timer.start()
	var bolt := bolt_scene.instantiate()
	get_tree().current_scene.add_child(bolt)
	bolt.global_position = global_position + Vector3(0, 1.2, 0)
	var dir := (player.global_position + Vector3(0, 1, 0) - bolt.global_position).normalized()
	bolt.direction = dir
	SoundManager.play_sound("fireball")

func _die() -> void:
	# Despawn all summons
	for s in active_summons:
		if is_instance_valid(s) and not s.is_dead:
			s.health = 0
			s._die()
	active_summons.clear()
	super._die()
