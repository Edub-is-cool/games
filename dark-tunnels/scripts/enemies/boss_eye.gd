extends "res://scripts/enemies/boss.gd"

# Phase 1: Tentacle slams. Phase 2 (50%): Gaze beam. Phase 3 (25%): Splits focus, rapid attacks.
var gaze_timer: float = 0.0
var slam_timer: float = 0.0
const GAZE_COOLDOWN := 3.0
const SLAM_COOLDOWN := 2.0
var bolt_scene: PackedScene = preload("res://scenes/magic/witch_bolt.tscn")

func _physics_process(delta: float) -> void:
	if is_dead:
		return

	if phase == 1 and health <= max_health / 2:
		phase = 2
	elif phase == 2 and health <= max_health / 4:
		phase = 3
		speed = base_speed * 1.5

	player = GameManager.player
	if not player:
		return

	if not is_on_floor():
		velocity += get_gravity() * delta

	var distance_to_player := global_position.distance_to(player.global_position)
	var dir_to := (player.global_position - global_position).normalized()
	dir_to.y = 0
	if dir_to.length() > 0.1:
		look_at(global_position + dir_to, Vector3.UP)

	slam_timer -= delta
	gaze_timer -= delta

	# Tentacle slam - melee range
	if distance_to_player <= attack_range and slam_timer <= 0:
		if attack_timer.is_stopped():
			_attack()
			slam_timer = SLAM_COOLDOWN

	# Phase 2+: Gaze beam attack
	if phase >= 2 and gaze_timer <= 0:
		_gaze_attack()
		gaze_timer = GAZE_COOLDOWN if phase == 2 else 1.5

	# Movement
	if distance_to_player > attack_range * 0.8:
		nav_agent.target_position = player.global_position
		var next_pos := nav_agent.get_next_path_position()
		var dir := (next_pos - global_position).normalized()
		dir.y = 0
		velocity.x = dir.x * speed
		velocity.z = dir.z * speed
	else:
		velocity.x = 0
		velocity.z = 0

	move_and_slide()

func _gaze_attack() -> void:
	if not player:
		return
	SoundManager.play_sound("fireball")
	var count := 1 if phase == 2 else 3
	for i in range(count):
		var bolt: Node3D = bolt_scene.instantiate() as Node3D
		get_tree().current_scene.add_child(bolt)
		bolt.global_position = global_position + Vector3(0, 1.5, 0)
		var base_dir: Vector3 = (player.global_position + Vector3(0, 1, 0) - bolt.global_position).normalized()
		if count > 1:
			var angle := (float(i) - 1.0) * 0.25
			bolt.direction = base_dir.rotated(Vector3.UP, angle)
		else:
			bolt.direction = base_dir
