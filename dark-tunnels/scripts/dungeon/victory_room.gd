extends Node3D

func _ready() -> void:
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	_build_room()
	_animate_celebration()

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel") or event.is_action_pressed("restart"):
		get_tree().change_scene_to_file("res://scenes/ui/main_menu.tscn")

func _build_room() -> void:
	# Golden floor
	var floor_mat := StandardMaterial3D.new()
	floor_mat.albedo_color = Color(0.8, 0.65, 0.2)
	floor_mat.metallic = 0.8
	floor_mat.roughness = 0.3

	var floor_box := CSGBox3D.new()
	floor_box.size = Vector3(16, 0.2, 16)
	floor_box.use_collision = true
	floor_box.material = floor_mat
	add_child(floor_box)

	# Walls
	var wall_mat := StandardMaterial3D.new()
	wall_mat.albedo_color = Color(0.6, 0.5, 0.25)
	wall_mat.metallic = 0.5
	wall_mat.roughness = 0.4

	for data in [
		Vector3(0, 3, -8),   # north
		Vector3(0, 3, 8),    # south
		Vector3(-8, 3, 0),   # west
		Vector3(8, 3, 0),    # east
	]:
		var wall := CSGBox3D.new()
		if abs(data.z) > 7:
			wall.size = Vector3(16, 6, 0.3)
		else:
			wall.size = Vector3(0.3, 6, 16)
		wall.position = data
		wall.use_collision = true
		wall.material = wall_mat
		add_child(wall)

	# Ceiling
	var ceil_box := CSGBox3D.new()
	ceil_box.size = Vector3(16, 0.2, 16)
	ceil_box.position = Vector3(0, 6, 0)
	ceil_box.use_collision = true
	ceil_box.material = wall_mat
	add_child(ceil_box)

	# Golden trophy pillar in center
	var pillar_mat := StandardMaterial3D.new()
	pillar_mat.albedo_color = Color(1, 0.85, 0.3)
	pillar_mat.emission_enabled = true
	pillar_mat.emission = Color(1, 0.8, 0.2)
	pillar_mat.emission_energy_multiplier = 2.0
	pillar_mat.metallic = 1.0
	pillar_mat.roughness = 0.1

	var pillar := CSGCylinder3D.new()
	pillar.radius = 0.4
	pillar.height = 2.0
	pillar.position = Vector3(0, 1.0, 0)
	pillar.material = pillar_mat
	add_child(pillar)

	# Trophy on top
	var trophy := CSGSphere3D.new()
	trophy.radius = 0.4
	trophy.position = Vector3(0, 2.4, 0)
	trophy.material = pillar_mat
	add_child(trophy)

	# Celebration lights - ring of colored lights
	var colors := [
		Color(1, 0.3, 0.3),
		Color(0.3, 1, 0.3),
		Color(0.3, 0.3, 1),
		Color(1, 1, 0.3),
		Color(1, 0.3, 1),
		Color(0.3, 1, 1),
	]
	for k in range(6):
		var angle := k * TAU / 6.0
		var light := OmniLight3D.new()
		light.position = Vector3(cos(angle) * 5, 3, sin(angle) * 5)
		light.light_color = colors[k]
		light.light_energy = 4.0
		light.omni_range = 10.0
		light.name = "CelebLight" + str(k)
		add_child(light)

	# Main bright light
	var main_light := OmniLight3D.new()
	main_light.position = Vector3(0, 5, 0)
	main_light.light_color = Color(1, 0.95, 0.8)
	main_light.light_energy = 3.0
	main_light.omni_range = 15.0
	add_child(main_light)

func _animate_celebration() -> void:
	# Rotate the celebration lights continuously
	var tween := create_tween().set_loops()
	tween.tween_callback(_rotate_lights)
	tween.tween_interval(0.05)

func _rotate_lights() -> void:
	for k in range(6):
		var light := get_node_or_null("CelebLight" + str(k))
		if light:
			var angle := k * TAU / 6.0 + Time.get_ticks_msec() * 0.001
			light.position = Vector3(cos(angle) * 5, 3 + sin(Time.get_ticks_msec() * 0.002) * 0.5, sin(angle) * 5)
