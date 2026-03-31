extends "res://scripts/enemies/enemy.gd"

var is_dormant: bool = true
var activate_range: float = 2.5

func _ready() -> void:
	super._ready()
	# Hide combat parts, show chest parts
	_set_dormant_look(true)
	# Hide health bar when dormant
	var sprite := get_node_or_null("HealthBarSprite")
	if sprite:
		sprite.visible = false

func _set_dormant_look(dormant: bool) -> void:
	var teeth := get_node_or_null("Teeth")
	var eyes_node := get_node_or_null("MimicEyes")
	var legs := get_node_or_null("Legs")
	var tongue := get_node_or_null("Tongue")
	var lid := get_node_or_null("Lid")
	if teeth:
		teeth.visible = not dormant
	if eyes_node:
		eyes_node.visible = not dormant
	if legs:
		legs.visible = not dormant
	if tongue:
		tongue.visible = not dormant
	if lid and not dormant:
		# Open the lid
		var tw := create_tween()
		tw.tween_property(lid, "rotation_degrees:x", -110.0, 0.3)

func _activate() -> void:
	is_dormant = false
	_set_dormant_look(false)
	detection_range = 15.0
	SoundManager.play_sound("hit")
	var sprite := get_node_or_null("HealthBarSprite")
	if sprite:
		sprite.visible = true

func _physics_process(delta: float) -> void:
	if is_dead:
		return

	player = GameManager.player
	if not player:
		return

	var distance_to_player := global_position.distance_to(player.global_position)

	if is_dormant:
		if distance_to_player <= activate_range:
			_activate()
		return

	if slow_timer > 0:
		slow_timer -= delta
		speed = base_speed * 0.3
	else:
		speed = base_speed

	if not is_on_floor():
		velocity += get_gravity() * delta

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

func _drop_loot() -> void:
	# Mimics drop extra gold
	var gold_amount := randi_range(loot_gold_min, loot_gold_max)
	var loot_scene := preload("res://scenes/items/gold_pickup.tscn")
	var loot := loot_scene.instantiate()
	loot.gold_amount = gold_amount
	loot.position = global_position
	get_tree().current_scene.call_deferred("add_child", loot)
	# 30% potion drop
	if randf() < 0.3:
		var potion: PackedScene
		if randf() < 0.5:
			potion = preload("res://scenes/items/health_potion.tscn")
		else:
			potion = preload("res://scenes/items/mana_potion.tscn")
		var p := potion.instantiate()
		p.position = global_position + Vector3(randf_range(-0.5, 0.5), 0, randf_range(-0.5, 0.5))
		get_tree().current_scene.call_deferred("add_child", p)
