extends "res://scripts/enemies/enemy.gd"

var beam_timer: float = 3.0
var is_charging: bool = false
var charge_timer: float = 0.0
const CHARGE_TIME := 1.5
const BEAM_COOLDOWN := 3.0
var beam_visual: MeshInstance3D

func take_damage(amount: int) -> void:
	if is_dead:
		return
	# Resists magic 50%, weak to melee 150%
	# Since we can't easily distinguish, just take normal damage
	# The design intention is communicated through the game
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

	# Always face player
	var dir_to_player := (player.global_position - global_position).normalized()
	dir_to_player.y = 0
	if dir_to_player.length() > 0.1:
		look_at(global_position + dir_to_player, Vector3.UP)

	if is_charging:
		velocity.x = 0
		velocity.z = 0
		charge_timer -= delta
		# Glow brighter during charge
		var crystal := get_node_or_null("Body")
		if crystal and crystal.material:
			crystal.material.emission_energy_multiplier = lerpf(2.0, 8.0, 1.0 - (charge_timer / CHARGE_TIME))
		if charge_timer <= 0:
			_fire_beam()
			is_charging = false
			beam_timer = BEAM_COOLDOWN
			if crystal and crystal.material:
				crystal.material.emission_energy_multiplier = 2.0
		move_and_slide()
		return

	beam_timer -= delta

	if distance_to_player <= attack_range and beam_timer <= 0:
		# Start charging beam
		is_charging = true
		charge_timer = CHARGE_TIME
		SoundManager.play_sound("icebolt")
	elif distance_to_player > 8.0:
		# Reposition closer
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

func _fire_beam() -> void:
	if not player:
		return
	SoundManager.play_sound("lightning")
	# Damage player if line of sight
	var space := get_world_3d().direct_space_state
	var from := global_position + Vector3(0, 1.0, 0)
	var to := player.global_position + Vector3(0, 1.0, 0)
	var query := PhysicsRayQueryParameters3D.create(from, to)
	query.exclude = [get_rid()]
	var result := space.intersect_ray(query)
	if result and result.collider == player:
		player.take_damage(damage)
	# Visual beam
	var bolt := MeshInstance3D.new()
	var imm := ImmediateMesh.new()
	bolt.mesh = imm
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.3, 0.8, 1.0)
	mat.emission_enabled = true
	mat.emission = Color(0.3, 0.8, 1.0)
	mat.emission_energy_multiplier = 6.0
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	bolt.material_override = mat
	get_tree().current_scene.add_child(bolt)
	imm.surface_begin(Mesh.PRIMITIVE_LINE_STRIP)
	imm.surface_add_vertex(from)
	imm.surface_add_vertex(to)
	imm.surface_end()
	var tw := get_tree().create_tween()
	tw.tween_interval(0.3)
	tw.tween_callback(bolt.queue_free)
