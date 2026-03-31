extends "res://scripts/enemies/enemy.gd"

var is_hidden: bool = true
var is_retreating: bool = false
var retreat_target: Vector3
var reveal_tween: Tween

func _ready() -> void:
	super._ready()
	_go_invisible()

func _go_invisible() -> void:
	is_hidden = true
	for child in get_children():
		if child is CSGShape3D or child is CSGPrimitive3D:
			_set_mesh_alpha(child, 0.05)
	# Also hide health bar
	var sprite := get_node_or_null("HealthBarSprite")
	if sprite:
		sprite.visible = false

func _reveal() -> void:
	is_hidden = false
	if reveal_tween and reveal_tween.is_valid():
		reveal_tween.kill()
	reveal_tween = create_tween()
	for child in get_children():
		if child is CSGShape3D or child is CSGPrimitive3D:
			_set_mesh_alpha(child, 1.0)
	var sprite := get_node_or_null("HealthBarSprite")
	if sprite:
		sprite.visible = true
	SoundManager.play_sound("hit")

func _set_mesh_alpha(node: Node, alpha: float) -> void:
	if node is CSGShape3D and node.material:
		var mat: StandardMaterial3D = node.material
		if mat.transparency == BaseMaterial3D.TRANSPARENCY_ALPHA:
			mat.albedo_color.a = alpha
	for child in node.get_children():
		if child is CSGShape3D:
			_set_mesh_alpha(child, alpha)

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

	if is_hidden:
		# Stay still until player is close
		if distance_to_player <= detection_range:
			_reveal()
		return

	if not is_on_floor():
		velocity += get_gravity() * delta

	if is_retreating:
		# Run away from player
		var dir := (retreat_target - global_position).normalized()
		dir.y = 0
		velocity.x = dir.x * speed * 1.5
		velocity.z = dir.z * speed * 1.5
		if dir.length() > 0.1:
			look_at(global_position + dir, Vector3.UP)
		move_and_slide()
		if global_position.distance_to(retreat_target) < 2.0:
			is_retreating = false
			_go_invisible()
		return

	# Rush at player
	if distance_to_player <= attack_range:
		velocity.x = 0
		velocity.z = 0
		if attack_timer.is_stopped():
			_attack()
			# After attacking, retreat
			is_retreating = true
			var away := (global_position - player.global_position).normalized()
			retreat_target = global_position + away * 8.0
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
