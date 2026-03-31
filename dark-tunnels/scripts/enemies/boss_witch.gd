extends CharacterBody3D

@export var max_health: int = 240
@export var damage: int = 15
@export var speed: float = 3.0
@export var attack_range: float = 10.0
@export var detection_range: float = 20.0

var health: int
var player: CharacterBody3D
var is_dead: bool = false
var phase: int = 1
var base_speed: float
var slow_timer: float = 0.0

@onready var nav_agent: NavigationAgent3D = $NavigationAgent3D
@onready var attack_timer: Timer = $AttackTimer
@onready var special_timer: Timer = $SpecialAttackTimer

signal health_changed(new_health: int, max_health: int)
signal boss_defeated

func _ready() -> void:
	max_health = int(max_health * GameManager.get_enemy_health_mult())
	damage = int(damage * GameManager.get_enemy_damage_mult())
	health = max_health
	base_speed = speed
	GameManager.register_enemy()
	nav_agent.path_desired_distance = 5.0
	nav_agent.target_desired_distance = 5.0
	add_to_group("enemies")
	add_to_group("boss")
	SoundManager.play_sound("boss_roar")

func _physics_process(delta: float) -> void:
	if is_dead:
		return

	if slow_timer > 0:
		slow_timer -= delta
		speed = base_speed * 0.5
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

	var health_pct := float(health) / float(max_health)
	if health_pct < 0.3 and phase < 3:
		phase = 3
		base_speed = 4.0
		damage = 25
	elif health_pct < 0.6 and phase < 2:
		phase = 2
		base_speed = 3.5
		damage = 20

	# Witch keeps distance and shoots
	if distance_to_player < 4.0:
		# Run away
		var away := (global_position - player.global_position).normalized()
		away.y = 0
		velocity.x = away.x * speed
		velocity.z = away.z * speed
	elif distance_to_player <= attack_range:
		velocity.x = 0
		velocity.z = 0
		if attack_timer.is_stopped():
			_attack()
		# Face player
		var dir := (player.global_position - global_position).normalized()
		if dir.length() > 0.1:
			look_at(global_position + Vector3(dir.x, 0, dir.z), Vector3.UP)
	else:
		nav_agent.target_position = player.global_position
		var next_pos := nav_agent.get_next_path_position()
		var dir := (next_pos - global_position).normalized()
		dir.y = 0
		velocity.x = dir.x * speed
		velocity.z = dir.z * speed

	move_and_slide()

func _attack() -> void:
	attack_timer.start()
	# Shoot a magic bolt at player
	var bolt_scene := preload("res://scenes/magic/witch_bolt.tscn")
	var bolt: Node3D = bolt_scene.instantiate()
	get_tree().current_scene.add_child(bolt)
	bolt.global_position = global_position + Vector3(0, 1.5, 0)
	var dir: Vector3 = (player.global_position + Vector3(0, 1, 0) - bolt.global_position).normalized()
	bolt.direction = dir
	bolt.damage = damage

func apply_slow(duration: float) -> void:
	slow_timer = duration * 0.5

func take_damage(amount: int) -> void:
	if is_dead:
		return
	health -= amount
	health_changed.emit(health, max_health)
	SoundManager.play_sound("hit")
	if health <= 0:
		_die()

func _die() -> void:
	is_dead = true
	GameManager.on_enemy_killed(self)
	boss_defeated.emit()
	var gold_per_pile := max_health / 5
	for k in range(5):
		var loot_scene := preload("res://scenes/items/gold_pickup.tscn")
		var loot := loot_scene.instantiate()
		loot.gold_amount = gold_per_pile
		loot.position = global_position + Vector3(randf_range(-2, 2), 0, randf_range(-2, 2))
		get_tree().current_scene.call_deferred("add_child", loot)
	var tween := create_tween()
	tween.tween_property(self, "scale:y", 0.1, 1.0).set_ease(Tween.EASE_IN)
	tween.parallel().tween_property(self, "rotation:y", rotation.y + TAU * 3, 1.0)
	tween.tween_callback(queue_free)

func _on_special_attack_timer_timeout() -> void:
	if is_dead or not player:
		return
	# Only teleport if player is within detection range
	if global_position.distance_to(player.global_position) > detection_range:
		return
	# Try teleporting behind player, then to sides, then give up
	var attempts: Array[Vector3] = [
		player.global_position + player.global_basis.z * 4.0,
		player.global_position + player.global_basis.x * 4.0,
		player.global_position - player.global_basis.x * 4.0,
		player.global_position - player.global_basis.z * 4.0,
	]
	for attempt in attempts:
		var target_pos := NavigationServer3D.map_get_closest_point(
			get_world_3d().navigation_map, attempt
		)
		# Only teleport if the nav mesh point is close to our desired spot
		# (if it's far, the spot is probably inside a wall)
		if target_pos.distance_to(attempt) < 1.5:
			global_position = target_pos
			SoundManager.play_sound("shield")
			return
