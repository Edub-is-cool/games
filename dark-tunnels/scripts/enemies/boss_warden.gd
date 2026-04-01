extends "res://scripts/enemies/boss.gd"

# Phase 1: Shield blocks frontal. Phase 2 (50%): Dual wield, faster. Phase 3 (25%): Fire AoE.
var fire_timer: float = 0.0
const FIRE_COOLDOWN := 4.0

func take_damage(amount: int) -> void:
	if is_dead:
		return
	# Phase 1: frontal damage halved (shield)
	if phase == 1 and player:
		var to_player := (player.global_position - global_position).normalized()
		var forward := -global_basis.z.normalized()
		if to_player.dot(forward) > 0.2:
			amount = int(amount * 0.35)
			if amount < 1:
				amount = 1
	# Phase 3: takes more damage (cracked armor)
	if phase == 3:
		amount = int(amount * 1.4)
	super.take_damage(amount)

func _physics_process(delta: float) -> void:
	if is_dead:
		return

	if phase == 1 and health <= max_health / 2:
		phase = 2
		speed = base_speed * 1.4
		attack_range = 2.5
		# Hide shield
		var shield := get_node_or_null("Shield")
		if shield:
			shield.visible = false
		SoundManager.play_sound("hit")
	elif phase == 2 and health <= max_health / 4:
		phase = 3
		speed = base_speed * 1.2
		SoundManager.play_sound("fireball")

	player = GameManager.player
	if not player:
		return

	if not is_on_floor():
		velocity += get_gravity() * delta

	var distance_to_player := global_position.distance_to(player.global_position)

	# Phase 3: Fire AoE
	if phase == 3:
		fire_timer -= delta
		if fire_timer <= 0:
			_fire_burst()
			fire_timer = FIRE_COOLDOWN

	if distance_to_player <= attack_range:
		velocity.x = 0
		velocity.z = 0
		if attack_timer.is_stopped():
			_attack()
			if phase == 2:
				# Double hit in phase 2
				await get_tree().create_timer(0.3).timeout
				if player and not is_dead:
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

func _fire_burst() -> void:
	if not player:
		return
	# Damage player if within AoE range
	var dist := global_position.distance_to(player.global_position)
	if dist <= 5.0:
		player.take_damage(int(damage * 0.6))
	SoundManager.play_sound("fireball")
