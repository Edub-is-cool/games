extends CharacterBody3D

const SPEED := 5.0
const SPRINT_SPEED := 8.0
const JUMP_VELOCITY := 4.5
const MOUSE_SENSITIVITY := 0.002
const BOB_FREQ := 2.2
const BOB_AMP := 0.06
const SWAY_FREQ := 1.1
const SWAY_AMP := 0.008

@export var max_health: int = 100
@export var max_mana: int = 100

var health: int
var mana: int
var bob_timer: float = 0.0
var is_attacking: bool = false
var is_dead: bool = false

@onready var head: Node3D = $Head
@onready var camera: Camera3D = $Head/Camera3D
@onready var ray: RayCast3D = $Head/Camera3D/InteractionRay
@onready var attack_ray: RayCast3D = $Head/Camera3D/AttackRay
@onready var attack_timer: Timer = $AttackTimer
@onready var attack_cooldown: Timer = $AttackCooldown
@onready var mana_regen_timer: Timer = $ManaRegenTimer

signal health_changed(new_health: int, max_health: int)
signal mana_changed(new_mana: int, max_mana: int)
signal died

func _ready() -> void:
	max_health = int(max_health * GameManager.get_player_health_mult())
	health = max_health
	mana = max_mana + Inventory.get_mana_bonus()
	# In touch mode, keep mouse visible; otherwise the click-to-play overlay handles capture
	if GameManager.use_touch_controls:
		Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	else:
		Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	GameManager.register_player(self)
	health_changed.emit(health, max_health)
	mana_changed.emit(mana, max_mana)

func _unhandled_input(event: InputEvent) -> void:
	if is_dead:
		if event.is_action_pressed("restart"):
			Inventory.reset()
			GameManager.current_floor = 1
			GameManager.enemies_alive = 0
			get_tree().reload_current_scene()
		if event.is_action_pressed("ui_cancel"):
			Inventory.reset()
			GameManager.current_floor = 1
			GameManager.enemies_alive = 0
			get_tree().change_scene_to_file("res://scenes/ui/main_menu.tscn")
		return

	if not GameManager.use_touch_controls:
		# On web, clicking recaptures mouse if it was released
		if event is InputEventMouseButton and event.pressed and Input.get_mouse_mode() != Input.MOUSE_MODE_CAPTURED:
			Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
			return

		if event is InputEventMouseMotion and Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
			rotate_y(-event.relative.x * MOUSE_SENSITIVITY)
			head.rotate_x(-event.relative.y * MOUSE_SENSITIVITY)
			head.rotation.x = clamp(head.rotation.x, -PI / 2, PI / 2)

		if event.is_action_pressed("ui_cancel"):
			if Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
				Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
			else:
				Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)

	if event.is_action_pressed("attack") and not is_attacking and attack_cooldown.is_stopped():
		_do_attack()

	if event.is_action_pressed("interact"):
		_try_interact()

	if event.is_action_pressed("cast_spell"):
		_cast_spell()

	if event.is_action_pressed("use_health_potion"):
		if Inventory.use_health_potion(self):
			SoundManager.play_sound("potion")

	if event.is_action_pressed("use_mana_potion"):
		if Inventory.use_mana_potion(self):
			SoundManager.play_sound("potion")

	if event.is_action_pressed("cycle_spell"):
		Inventory.cycle_spell()

	if event.is_action_pressed("cycle_weapon"):
		Inventory.cycle_weapon()

	if event.is_action_pressed("weapon_1"):
		Inventory.select_weapon(0)
	if event.is_action_pressed("weapon_2"):
		Inventory.select_weapon(1)
	if event.is_action_pressed("weapon_3"):
		Inventory.select_weapon(2)
	if event.is_action_pressed("weapon_4"):
		Inventory.select_weapon(3)
	if event.is_action_pressed("weapon_5"):
		Inventory.select_weapon(4)

	if event.is_action_pressed("show_controls"):
		var hud_node := get_tree().current_scene.get_node_or_null("HUD")
		if hud_node and hud_node.has_method("toggle_controls"):
			hud_node.toggle_controls()

func _physics_process(delta: float) -> void:
	if is_dead:
		velocity = Vector3.ZERO
		move_and_slide()
		return

	if not is_on_floor():
		velocity += get_gravity() * delta

	if Input.is_action_just_pressed("jump") and is_on_floor():
		velocity.y = JUMP_VELOCITY

	# Touch controls: poll actions that _unhandled_input won't see
	if GameManager.use_touch_controls:
		if Input.is_action_just_pressed("attack") and not is_attacking and attack_cooldown.is_stopped():
			_do_attack()
		if Input.is_action_just_pressed("interact"):
			_try_interact()
		if Input.is_action_just_pressed("cast_spell"):
			_cast_spell()
		if Input.is_action_just_pressed("use_health_potion"):
			if Inventory.use_health_potion(self):
				SoundManager.play_sound("potion")
		if Input.is_action_just_pressed("use_mana_potion"):
			if Inventory.use_mana_potion(self):
				SoundManager.play_sound("potion")
		if Input.is_action_just_pressed("cycle_spell"):
			Inventory.cycle_spell()
		if Input.is_action_just_pressed("cycle_weapon"):
			Inventory.cycle_weapon()

	var input_dir := Input.get_vector("move_left", "move_right", "move_forward", "move_backward")
	var direction := (transform.basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()

	var current_speed: float = SPRINT_SPEED if Input.is_action_pressed("sprint") else SPEED

	if direction:
		velocity.x = direction.x * current_speed
		velocity.z = direction.z * current_speed
	else:
		velocity.x = move_toward(velocity.x, 0, current_speed)
		velocity.z = move_toward(velocity.z, 0, current_speed)

	# Head bob + lateral sway for realistic movement
	if is_on_floor() and direction:
		bob_timer += delta * velocity.length()
		camera.transform.origin.y = sin(bob_timer * BOB_FREQ) * BOB_AMP
		camera.transform.origin.x = sin(bob_timer * SWAY_FREQ) * SWAY_AMP
		# Subtle roll when strafing
		var strafe := input_dir.x
		camera.rotation.z = lerp(camera.rotation.z, -strafe * 0.015, delta * 5.0)
	else:
		bob_timer = 0.0
		camera.transform.origin.y = move_toward(camera.transform.origin.y, 0.0, delta * 3.0)
		camera.transform.origin.x = move_toward(camera.transform.origin.x, 0.0, delta * 3.0)
		camera.rotation.z = lerp(camera.rotation.z, 0.0, delta * 5.0)

	move_and_slide()

func _do_attack() -> void:
	is_attacking = true
	attack_cooldown.wait_time = Inventory.get_weapon_speed()
	attack_cooldown.start()
	var weapon := Inventory.current_weapon

	var stats: Dictionary = Inventory.weapon_stats[weapon]
	if stats.has("ranged") and stats["ranged"]:
		# Ranged weapons: shoot projectiles
		SoundManager.play_sound("sword")
		var tween := create_tween()
		tween.tween_property(camera, "rotation:x", camera.rotation.x - 0.05, 0.1)
		tween.tween_property(camera, "rotation:x", camera.rotation.x, 0.1)
		var arrow_scene: PackedScene = preload("res://scenes/magic/arrow.tscn")
		var shot_count := stats.get("burst", 1) as int
		for shot_i in range(shot_count):
			var arrow: Node3D = arrow_scene.instantiate()
			get_tree().current_scene.add_child(arrow)
			arrow.global_position = camera.global_position + -camera.global_basis.z * 1.0
			var spread := 0.0
			if shot_count > 1:
				spread = (float(shot_i) - float(shot_count - 1) / 2.0) * 0.08
			arrow.direction = (-camera.global_basis.z + camera.global_basis.x * spread).normalized()
			arrow.damage = int(Inventory.get_weapon_damage() * GameManager.get_player_damage_mult())
			if shot_count > 1 and shot_i < shot_count - 1:
				await get_tree().create_timer(0.1).timeout
	else:
		# Melee swing
		var swing_strength := 0.15
		if weapon == "warhammer":
			swing_strength = 0.25
		var tween := create_tween()
		tween.tween_property(camera, "rotation:x", camera.rotation.x - swing_strength, 0.1)
		tween.tween_property(camera, "rotation:x", camera.rotation.x, 0.15)

		match weapon:
			"sword", "spear":
				SoundManager.play_sound("sword")
			"axe", "flail", "warhammer":
				SoundManager.play_sound("axe")
			_:
				SoundManager.play_sound("hit")

		attack_ray.target_position = Vector3(0, 0, -Inventory.get_weapon_range())
		attack_ray.force_raycast_update()
		if attack_ray.is_colliding():
			var target = attack_ray.get_collider()
			if target.has_method("take_damage"):
				var dmg := int(Inventory.get_weapon_damage() * GameManager.get_player_damage_mult())
				target.take_damage(dmg)
				_spawn_damage_number(target.global_position, dmg)
				# Warhammer stun
				if stats.has("stun") and target.has_method("apply_slow"):
					target.apply_slow(stats["stun"])

	await attack_cooldown.timeout
	is_attacking = false

func _try_interact() -> void:
	if ray.is_colliding():
		var target = ray.get_collider()
		if target.has_method("interact"):
			target.interact(self)

func _cast_spell() -> void:
	var spell_name := Inventory.current_spell
	var stats: Dictionary = Inventory.spell_stats[spell_name]
	var cost: int = stats["mana_cost"]

	if mana < cost:
		return

	mana -= cost
	mana_changed.emit(mana, max_mana)

	match spell_name:
		"fireball":
			_shoot_projectile("res://scenes/magic/fireball.tscn", stats)
			SoundManager.play_sound("fireball")
		"icebolt":
			_shoot_projectile("res://scenes/magic/icebolt.tscn", stats)
			SoundManager.play_sound("icebolt")
		"lightning":
			_cast_lightning(stats)
			SoundManager.play_sound("lightning")
		"shield":
			Inventory.has_shield = true
			Inventory.shield_timer = stats["duration"]
			SoundManager.play_sound("shield")

func _shoot_projectile(scene_path: String, _stats: Dictionary) -> void:
	var scene: PackedScene = load(scene_path)
	var proj: Node3D = scene.instantiate()
	get_tree().current_scene.add_child(proj)
	proj.global_position = camera.global_position + -camera.global_basis.z * 1.0
	proj.direction = -camera.global_basis.z

func _cast_lightning(stats: Dictionary) -> void:
	# Instant hit on what we're looking at, then chain
	attack_ray.target_position = Vector3(0, 0, -15)
	attack_ray.force_raycast_update()
	if attack_ray.is_colliding():
		var target = attack_ray.get_collider()
		if target.has_method("take_damage"):
			target.take_damage(stats["damage"])
			_spawn_damage_number(target.global_position, stats["damage"])
			# Chain to nearby enemies
			var chain_count: int = stats["chain_count"]
			var last_pos: Vector3 = target.global_position
			var hit_targets: Array = [target]
			for _i in range(chain_count):
				var nearest := _find_nearest_enemy(last_pos, 8.0, hit_targets)
				if nearest:
					var chain_dmg: int = stats["damage"] / 2
					nearest.take_damage(chain_dmg)
					_spawn_damage_number(nearest.global_position, chain_dmg)
					_spawn_lightning_bolt(last_pos, nearest.global_position)
					last_pos = nearest.global_position
					hit_targets.append(nearest)

func _find_nearest_enemy(from: Vector3, max_range: float, exclude: Array) -> Node3D:
	var nearest: Node3D = null
	var nearest_dist := max_range
	for node in get_tree().get_nodes_in_group("enemies"):
		if node in exclude:
			continue
		if not node.has_method("take_damage"):
			continue
		var dist := from.distance_to(node.global_position)
		if dist < nearest_dist:
			nearest = node
			nearest_dist = dist
	return nearest

func _spawn_lightning_bolt(from: Vector3, to: Vector3) -> void:
	# Main bolt
	var bolt := MeshInstance3D.new()
	var imm := ImmediateMesh.new()
	bolt.mesh = imm
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.8, 0.9, 1.0)
	mat.emission_enabled = true
	mat.emission = Color(0.7, 0.85, 1.0)
	mat.emission_energy_multiplier = 8.0
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	bolt.material_override = mat
	get_tree().current_scene.add_child(bolt)
	# Jagged bolt path
	imm.surface_begin(Mesh.PRIMITIVE_LINE_STRIP)
	var segments := 6
	for seg_i in range(segments + 1):
		var t := float(seg_i) / float(segments)
		var p := from.lerp(to, t)
		if seg_i > 0 and seg_i < segments:
			p += Vector3(randf_range(-0.3, 0.3), randf_range(-0.2, 0.2), randf_range(-0.3, 0.3))
		imm.surface_add_vertex(p)
	imm.surface_end()
	# Flash light at midpoint
	var flash := OmniLight3D.new()
	flash.light_color = Color(0.7, 0.8, 1.0)
	flash.light_energy = 6.0
	flash.omni_range = 8.0
	flash.position = (from + to) / 2.0
	get_tree().current_scene.add_child(flash)
	var tween := get_tree().create_tween()
	tween.tween_property(flash, "light_energy", 0.0, 0.2)
	tween.parallel().tween_interval(0.2)
	tween.tween_callback(bolt.queue_free)
	tween.tween_callback(flash.queue_free)

func _spawn_damage_number(pos: Vector3, amount: int) -> void:
	var label := Label3D.new()
	label.text = str(amount)
	label.font_size = 28
	label.outline_size = 4
	if amount >= 40:
		label.modulate = Color(1, 0.2, 0.2)
		label.outline_modulate = Color(0.4, 0.0, 0.0)
		label.font_size = 36
	else:
		label.modulate = Color(1, 0.95, 0.3)
		label.outline_modulate = Color(0.4, 0.35, 0.0)
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.no_depth_test = true
	label.position = pos + Vector3(randf_range(-0.3, 0.3), 1.5, randf_range(-0.3, 0.3))
	get_tree().current_scene.add_child(label)
	var tween := get_tree().create_tween()
	tween.tween_property(label, "position:y", label.position.y + 1.5, 0.8)
	tween.parallel().tween_property(label, "modulate:a", 0.0, 0.8)
	tween.tween_callback(label.queue_free)

func take_damage(amount: int) -> void:
	if is_dead:
		return
	var reduction := Inventory.get_damage_reduction()
	var actual := int(amount * (1.0 - reduction))
	health -= actual
	health_changed.emit(health, max_health)
	SoundManager.play_sound("player_hit")
	if actual > 0:
		_spawn_damage_number(global_position, actual)
		_camera_shake(actual)
	if health <= 0:
		health = 0
		is_dead = true
		health_changed.emit(health, max_health)
		died.emit()
		GameManager.player_died.emit()
		SoundManager.play_sound("death")

func _camera_shake(damage_amount: int) -> void:
	var intensity := clampf(float(damage_amount) / 50.0, 0.1, 1.0)
	var shake_tween := create_tween()
	shake_tween.tween_property(camera, "rotation:z", randf_range(-0.03, 0.03) * intensity, 0.05)
	shake_tween.tween_property(camera, "rotation:z", randf_range(-0.02, 0.02) * intensity, 0.05)
	shake_tween.tween_property(camera, "rotation:z", 0.0, 0.1)

func heal(amount: int) -> void:
	health = min(health + amount, max_health)
	health_changed.emit(health, max_health)

func restore_mana(amount: int) -> void:
	mana = min(mana + amount, max_mana + Inventory.get_mana_bonus())
	mana_changed.emit(mana, max_mana)

func _on_mana_regen_timer_timeout() -> void:
	if mana < max_mana + Inventory.get_mana_bonus():
		mana = min(mana + 1, max_mana + Inventory.get_mana_bonus())
		mana_changed.emit(mana, max_mana)
