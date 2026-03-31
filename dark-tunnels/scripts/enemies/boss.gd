extends CharacterBody3D

@export var max_health: int = 300
@export var damage: int = 25
@export var speed: float = 2.5
@export var attack_range: float = 3.5
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
	nav_agent.path_desired_distance = 2.0
	nav_agent.target_desired_distance = 2.0
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
		base_speed = 4.5
		damage = 40
	elif health_pct < 0.6 and phase < 2:
		phase = 2
		base_speed = 3.5
		damage = 30

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
	if player and global_position.distance_to(player.global_position) <= attack_range + 1.0:
		player.take_damage(damage)
		_ground_slam()

func _ground_slam() -> void:
	var tween := create_tween()
	tween.tween_property(self, "scale", Vector3(1.15, 0.85, 1.15), 0.1)
	tween.tween_property(self, "scale", Vector3(1, 1, 1), 0.2)

func apply_slow(duration: float) -> void:
	slow_timer = duration * 0.5  # Boss resists slow

func take_damage(amount: int) -> void:
	if is_dead:
		return
	health -= amount
	health_changed.emit(health, max_health)
	SoundManager.play_sound("hit")
	_flash_damage()
	if health <= 0:
		_die()

func _flash_damage() -> void:
	var csg := get_node_or_null("Body")
	if csg and csg is CSGBox3D and csg.material:
		var mat: StandardMaterial3D = csg.material
		var orig_emission := mat.emission
		mat.emission = Color(1, 0, 0, 1)
		mat.emission_energy_multiplier = 3.0
		await get_tree().create_timer(0.15).timeout
		if is_instance_valid(self) and is_instance_valid(mat):
			mat.emission = orig_emission
			mat.emission_energy_multiplier = 1.0

func _die() -> void:
	is_dead = true
	GameManager.on_enemy_killed(self)
	boss_defeated.emit()
	# Drop gold equal to max health, split into 5 piles
	var gold_per_pile := max_health / 5
	for k in range(5):
		var loot_scene := preload("res://scenes/items/gold_pickup.tscn")
		var loot := loot_scene.instantiate()
		loot.gold_amount = gold_per_pile
		loot.position = global_position + Vector3(randf_range(-2, 2), 0, randf_range(-2, 2))
		get_tree().current_scene.call_deferred("add_child", loot)
	var tween := create_tween()
	tween.tween_property(self, "scale:y", 0.1, 1.0).set_ease(Tween.EASE_IN)
	tween.parallel().tween_property(self, "rotation:y", rotation.y + TAU * 2, 1.0)
	tween.tween_callback(queue_free)

func _on_special_attack_timer_timeout() -> void:
	if is_dead or not player:
		return
	var dir := (player.global_position - global_position).normalized()
	dir.y = 0
	var tween := create_tween()
	tween.tween_property(self, "velocity", dir * speed * 4.0, 0.1)
	tween.tween_interval(0.3)
	tween.tween_property(self, "velocity", Vector3.ZERO, 0.1)
