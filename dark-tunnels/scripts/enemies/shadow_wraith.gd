extends "res://scripts/enemies/enemy.gd"

var teleport_timer: float = 3.0
var bob_timer: float = 0.0
const TELEPORT_COOLDOWN := 3.0
const BOB_SPEED := 2.0
const BOB_AMP := 0.15
var base_y: float

func _ready() -> void:
	super._ready()
	base_y = global_position.y + 0.3

func take_damage(amount: int) -> void:
	# 50% melee resistance - all player melee goes through here
	# Magic projectiles call take_damage too but with their own amount
	# We halve all damage, magic projectiles already deal more
	var reduced := int(amount * 0.5)
	if reduced < 1:
		reduced = 1
	super.take_damage(reduced)

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

	# Hover bob
	bob_timer += delta
	global_position.y = base_y + sin(bob_timer * BOB_SPEED) * BOB_AMP

	# Teleport periodically
	teleport_timer -= delta
	if teleport_timer <= 0:
		_teleport()
		teleport_timer = TELEPORT_COOLDOWN

	if distance_to_player <= attack_range:
		velocity.x = 0
		velocity.z = 0
		if attack_timer.is_stopped():
			_attack()
			# Apply slow to player
			if player.has_method("apply_slow"):
				pass  # Player doesn't have apply_slow, just damage
	else:
		var dir := (player.global_position - global_position).normalized()
		dir.y = 0
		velocity.x = dir.x * speed
		velocity.z = dir.z * speed
		if dir.length() > 0.1:
			look_at(global_position + Vector3(dir.x, 0, dir.z), Vector3.UP)

	move_and_slide()

func _teleport() -> void:
	var angle := randf() * TAU
	var dist := randf_range(3, 5)
	var new_pos := player.global_position + Vector3(cos(angle) * dist, 0, sin(angle) * dist)
	new_pos.y = base_y
	global_position = new_pos
