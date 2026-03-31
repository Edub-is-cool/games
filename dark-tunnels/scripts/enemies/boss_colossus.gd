extends "res://scripts/enemies/boss.gd"

# Phase 1: Slow sweeps. Phase 2 (50%): Spawns bone projectiles. Phase 3 (25%): Faster.
var phase: int = 1
var projectile_timer: float = 0.0
const PROJECTILE_COOLDOWN := 2.0
var bolt_scene: PackedScene = preload("res://scenes/magic/skeleton_arrow.tscn")

func _physics_process(delta: float) -> void:
	if is_dead:
		return

	# Phase transitions
	if phase == 1 and health <= max_health / 2:
		phase = 2
		speed = base_speed * 0.8
	elif phase == 2 and health <= max_health / 4:
		phase = 3
		speed = base_speed * 1.8
		attack_range = 3.0

	player = GameManager.player
	if not player:
		return

	var distance_to_player := global_position.distance_to(player.global_position)

	if not is_on_floor():
		velocity += get_gravity() * delta

	# Phase 2+: Shoot bone projectiles
	if phase >= 2:
		projectile_timer -= delta
		if projectile_timer <= 0:
			_shoot_bones()
			projectile_timer = PROJECTILE_COOLDOWN

	if distance_to_player <= attack_range:
		velocity.x = 0
		velocity.z = 0
		if attack_timer.is_stopped():
			_attack()
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

func _shoot_bones() -> void:
	if not player:
		return
	SoundManager.play_sound("sword")
	for i in range(3):
		var arrow := bolt_scene.instantiate()
		get_tree().current_scene.add_child(arrow)
		arrow.global_position = global_position + Vector3(0, 2.5, 0)
		var angle_offset := (float(i) - 1.0) * 0.3
		var base_dir := (player.global_position - global_position).normalized()
		var rot := Transform3D().rotated(Vector3.UP, angle_offset)
		arrow.direction = rot * base_dir
		arrow.damage = int(damage * 0.5)
