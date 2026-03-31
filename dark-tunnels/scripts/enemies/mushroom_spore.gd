extends "res://scripts/enemies/enemy.gd"

var spore_timer: float = 0.0
const SPORE_COOLDOWN := 4.0
var poison_scene: PackedScene = preload("res://scenes/dungeon/poison_gas.tscn")

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

	spore_timer -= delta

	# If in range, stop and puff poison
	if distance_to_player <= attack_range:
		velocity.x = 0
		velocity.z = 0
		if spore_timer <= 0:
			_puff_spore()
			spore_timer = SPORE_COOLDOWN
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

func _puff_spore() -> void:
	var cloud := poison_scene.instantiate()
	cloud.position = global_position + Vector3(randf_range(-1, 1), 0, randf_range(-1, 1))
	get_tree().current_scene.call_deferred("add_child", cloud)
	# Visual puff - scale the cap briefly
	var cap := get_node_or_null("Cap")
	if cap:
		var tween := create_tween()
		tween.tween_property(cap, "scale", Vector3(1.3, 0.8, 1.3), 0.15)
		tween.tween_property(cap, "scale", Vector3(1, 1, 1), 0.3)
