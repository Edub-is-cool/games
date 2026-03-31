extends "res://scripts/enemies/enemy.gd"

var is_winding_up: bool = false
var windup_timer: float = 0.0
const WINDUP_TIME := 0.8

func take_damage(amount: int) -> void:
	if is_dead:
		return
	# 60% frontal damage reduction when not winding up
	if not is_winding_up and player:
		var to_player := (player.global_position - global_position).normalized()
		var forward := -global_basis.z.normalized()
		if to_player.dot(forward) > 0.3:
			amount = int(amount * 0.4)
			if amount < 1:
				amount = 1
	super.take_damage(amount)

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

	var distance_to_player := global_position.distance_to(player.global_position)

	if distance_to_player > detection_range:
		return

	if not is_on_floor():
		velocity += get_gravity() * delta

	if is_winding_up:
		velocity.x = 0
		velocity.z = 0
		windup_timer -= delta
		if windup_timer <= 0:
			_slam()
			is_winding_up = false
		move_and_slide()
		return

	if distance_to_player <= attack_range:
		velocity.x = 0
		velocity.z = 0
		if attack_timer.is_stopped():
			_start_windup()
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

func _start_windup() -> void:
	is_winding_up = true
	windup_timer = WINDUP_TIME
	# Visual telegraph - raise arms
	var arm_l := get_node_or_null("ArmLeft")
	var arm_r := get_node_or_null("ArmRight")
	if arm_l:
		var tw := create_tween()
		tw.tween_property(arm_l, "position:y", arm_l.position.y + 0.4, WINDUP_TIME * 0.8)
	if arm_r:
		var tw2 := create_tween()
		tw2.tween_property(arm_r, "position:y", arm_r.position.y + 0.4, WINDUP_TIME * 0.8)

func _slam() -> void:
	attack_timer.start()
	SoundManager.play_sound("hit")
	# Reset arms
	var arm_l := get_node_or_null("ArmLeft")
	var arm_r := get_node_or_null("ArmRight")
	if arm_l:
		var tw := create_tween()
		tw.tween_property(arm_l, "position:y", arm_l.position.y - 0.4, 0.1)
	if arm_r:
		var tw2 := create_tween()
		tw2.tween_property(arm_r, "position:y", arm_r.position.y - 0.4, 0.1)
	# Damage + knockback
	if player and global_position.distance_to(player.global_position) <= attack_range + 1.0:
		player.take_damage(damage)
		var knockback := (player.global_position - global_position).normalized() * 5.0
		player.velocity += knockback
