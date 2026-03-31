extends "res://scripts/enemies/enemy.gd"

var rats_alive: int = 5
var jitter_timer: float = 0.0
var enraged: bool = false

func _ready() -> void:
	super._ready()
	rats_alive = 5

func take_damage(amount: int) -> void:
	super.take_damage(amount)
	# Hide a rat mesh when HP drops
	var new_alive := ceili(float(health) / float(max_health) * 5.0)
	while rats_alive > new_alive and rats_alive > 0:
		var rat_node := get_node_or_null("Rat" + str(rats_alive))
		if rat_node:
			rat_node.visible = false
		rats_alive -= 1
	# Enrage at 50% HP
	if not enraged and health <= max_health / 2:
		enraged = true
		base_speed = 6.0

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

	# Jitter visible rats
	jitter_timer += delta
	for i in range(1, 6):
		var rat := get_node_or_null("Rat" + str(i))
		if rat and rat.visible:
			var off_x := sin(jitter_timer * 8.0 + float(i) * 2.0) * 0.05
			var off_z := cos(jitter_timer * 6.0 + float(i) * 3.0) * 0.05
			rat.position.x = rat.get_meta("base_x", rat.position.x) + off_x
			rat.position.z = rat.get_meta("base_z", rat.position.z) + off_z

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
