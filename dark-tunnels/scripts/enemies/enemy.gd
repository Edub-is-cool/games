extends CharacterBody3D

@export var max_health: int = 50
@export var damage: int = 10
@export var speed: float = 3.0
@export var attack_range: float = 2.0
@export var detection_range: float = 12.0
@export var loot_gold_min: int = 5
@export var loot_gold_max: int = 15

var health: int
var player: CharacterBody3D
var is_dead: bool = false
var base_speed: float
var slow_timer: float = 0.0

@onready var nav_agent: NavigationAgent3D = $NavigationAgent3D
@onready var attack_timer: Timer = $AttackTimer

signal health_changed(new_health: int, max_health: int)

func _ready() -> void:
	max_health = int(max_health * GameManager.get_enemy_health_mult())
	damage = int(damage * GameManager.get_enemy_damage_mult())
	health = max_health
	base_speed = speed
	GameManager.register_enemy()
	nav_agent.path_desired_distance = 1.5
	nav_agent.target_desired_distance = 1.5
	add_to_group("enemies")
	_add_health_bar()

func _physics_process(delta: float) -> void:
	if is_dead:
		return

	# Handle slow effect
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

func _attack() -> void:
	attack_timer.start()
	if player and global_position.distance_to(player.global_position) <= attack_range + 0.5:
		player.take_damage(damage)

func apply_slow(duration: float) -> void:
	slow_timer = duration

func take_damage(amount: int) -> void:
	if is_dead:
		return
	health -= amount
	health_changed.emit(health, max_health)
	SoundManager.play_sound("hit")
	if health <= 0:
		_die()

func _add_health_bar() -> void:
	var bar := ProgressBar.new()
	bar.max_value = max_health
	bar.value = max_health
	bar.show_percentage = false
	bar.custom_minimum_size = Vector2(60, 6)
	bar.size = Vector2(60, 6)
	bar.name = "HealthBarUI"
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.5, 0.1, 0.7, 1)
	style.corner_radius_top_left = 1
	style.corner_radius_top_right = 1
	style.corner_radius_bottom_right = 1
	style.corner_radius_bottom_left = 1
	bar.add_theme_stylebox_override("fill", style)

	var sub := SubViewport.new()
	sub.size = Vector2i(60, 6)
	sub.transparent_bg = true
	sub.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	sub.name = "HealthViewport"
	sub.add_child(bar)

	var sprite := Sprite3D.new()
	sprite.texture = sub.get_texture()
	sprite.pixel_size = 0.015
	sprite.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	sprite.position = Vector3(0, 2.0, 0)
	sprite.name = "HealthBarSprite"

	add_child(sub)
	add_child(sprite)
	health_changed.connect(_on_health_bar_update)

func _on_health_bar_update(new_hp: int, _max_hp: int) -> void:
	var vp := get_node_or_null("HealthViewport")
	if vp:
		var bar := vp.get_node_or_null("HealthBarUI")
		if bar:
			bar.value = new_hp

func _die() -> void:
	is_dead = true
	GameManager.on_enemy_killed(self)
	_drop_loot()
	var tween := create_tween()
	tween.tween_property(self, "scale", Vector3(1, 0.1, 1), 0.3)
	tween.tween_callback(queue_free)

func _drop_loot() -> void:
	var gold_amount := randi_range(loot_gold_min, loot_gold_max)
	var loot_scene := preload("res://scenes/items/gold_pickup.tscn")
	var loot := loot_scene.instantiate()
	loot.gold_amount = gold_amount
	loot.position = global_position
	get_tree().current_scene.call_deferred("add_child", loot)
	# Chance to drop a potion
	if randf() < 0.2:
		var potion: PackedScene
		if randf() < 0.5:
			potion = preload("res://scenes/items/health_potion.tscn")
		else:
			potion = preload("res://scenes/items/mana_potion.tscn")
		var p := potion.instantiate()
		p.position = global_position + Vector3(randf_range(-0.5, 0.5), 0, randf_range(-0.5, 0.5))
		get_tree().current_scene.call_deferred("add_child", p)
