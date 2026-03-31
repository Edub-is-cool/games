extends CanvasLayer

# Virtual joystick state
var joystick_touch_index: int = -1
var joystick_center: Vector2
var joystick_vector: Vector2 = Vector2.ZERO
const JOYSTICK_RADIUS: float = 80.0

# Look state
var look_touch_index: int = -1
var look_last_pos: Vector2
var look_delta: Vector2 = Vector2.ZERO

# References
var joystick_bg: Control
var joystick_knob: ColorRect
var look_area: Control

func _ready() -> void:
	layer = 50
	_build_ui()

func _build_ui() -> void:
	# === LEFT SIDE: Virtual Joystick ===
	joystick_bg = Control.new()
	joystick_bg.name = "JoystickBG"
	joystick_bg.anchor_left = 0.0
	joystick_bg.anchor_top = 1.0
	joystick_bg.anchor_right = 0.0
	joystick_bg.anchor_bottom = 1.0
	joystick_bg.offset_left = 30.0
	joystick_bg.offset_top = -330.0
	joystick_bg.offset_right = 210.0
	joystick_bg.offset_bottom = -150.0
	joystick_bg.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(joystick_bg)

	var bg_circle := ColorRect.new()
	bg_circle.color = Color(1, 1, 1, 0.1)
	bg_circle.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg_circle.mouse_filter = Control.MOUSE_FILTER_IGNORE
	joystick_bg.add_child(bg_circle)

	joystick_knob = ColorRect.new()
	joystick_knob.name = "Knob"
	joystick_knob.color = Color(1, 1, 1, 0.4)
	joystick_knob.custom_minimum_size = Vector2(50, 50)
	joystick_knob.size = Vector2(50, 50)
	joystick_knob.mouse_filter = Control.MOUSE_FILTER_IGNORE
	joystick_bg.add_child(joystick_knob)
	_center_knob()

	joystick_bg.gui_input.connect(_on_joystick_input)

	# === RIGHT SIDE: Look area (transparent, covers right half) ===
	look_area = Control.new()
	look_area.name = "LookArea"
	look_area.anchor_left = 0.35
	look_area.anchor_top = 0.0
	look_area.anchor_right = 1.0
	look_area.anchor_bottom = 0.7
	look_area.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(look_area)

	var look_hint := Label.new()
	look_hint.text = "Drag to look"
	look_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	look_hint.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	look_hint.set_anchors_preset(Control.PRESET_FULL_RECT)
	look_hint.add_theme_color_override("font_color", Color(1, 1, 1, 0.15))
	look_hint.add_theme_font_size_override("font_size", 16)
	look_hint.mouse_filter = Control.MOUSE_FILTER_IGNORE
	look_area.add_child(look_hint)

	look_area.gui_input.connect(_on_look_input)

	# === ACTION BUTTONS (left side, above joystick, bigger) ===
	var btn_size := Vector2(85, 85)
	var btn_font_size := 16
	# Buttons positioned from the left edge, above joystick area
	var left_base := 30.0

	# Row 1 (top): ATK, SPELL
	_add_button_left("AttackBtn", "ATK", Color(0.9, 0.2, 0.2, 0.5),
		Vector2(left_base, -520.0), btn_size, btn_font_size, "attack")

	_add_button_left("SpellBtn", "SPELL", Color(0.3, 0.4, 0.9, 0.5),
		Vector2(left_base + 95.0, -520.0), btn_size, btn_font_size, "cast_spell")

	# Row 2: JUMP, INTERACT
	_add_button_left("JumpBtn", "JUMP", Color(0.3, 0.8, 0.3, 0.5),
		Vector2(left_base, -425.0), btn_size, btn_font_size, "jump")

	_add_button_left("InteractBtn", "INTERACT", Color(0.9, 0.8, 0.2, 0.5),
		Vector2(left_base + 95.0, -425.0), btn_size, btn_font_size, "interact")

	# Right side utility buttons (smaller, stacked)
	var sm_size := Vector2(70, 50)
	var right_x := -85.0  # from right edge

	_add_button("HPPotBtn", "HP POT", Color(0.9, 0.3, 0.3, 0.4),
		Vector2(right_x, -340.0), sm_size, 12, "use_health_potion")

	_add_button("MPPotBtn", "MP POT", Color(0.3, 0.4, 0.9, 0.4),
		Vector2(right_x, -280.0), sm_size, 12, "use_mana_potion")

	_add_button("CycWeapBtn", "WEAP", Color(0.8, 0.6, 0.2, 0.4),
		Vector2(right_x, -220.0), sm_size, 12, "cycle_weapon")

	_add_button("CycSpellBtn", "CYCL", Color(0.5, 0.5, 0.9, 0.4),
		Vector2(right_x, -160.0), sm_size, 12, "cycle_spell")

func _add_button_left(btn_name: String, text: String, color: Color,
		offset: Vector2, btn_size: Vector2, font_size: int, action: String) -> void:
	var btn := Button.new()
	btn.name = btn_name
	btn.text = text
	btn.anchor_left = 0.0
	btn.anchor_top = 1.0
	btn.anchor_right = 0.0
	btn.anchor_bottom = 1.0
	btn.offset_left = offset.x
	btn.offset_top = offset.y
	btn.offset_right = offset.x + btn_size.x
	btn.offset_bottom = offset.y + btn_size.y
	btn.add_theme_font_size_override("font_size", font_size)

	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	style.border_color = Color(1, 1, 1, 0.2)
	style.border_width_top = 1
	style.border_width_bottom = 1
	style.border_width_left = 1
	style.border_width_right = 1
	btn.add_theme_stylebox_override("normal", style)

	var pressed_style := style.duplicate()
	pressed_style.bg_color = Color(color.r + 0.2, color.g + 0.2, color.b + 0.2, 0.7)
	btn.add_theme_stylebox_override("pressed", pressed_style)
	btn.add_theme_stylebox_override("hover", style)

	btn.button_down.connect(func(): Input.action_press(action))
	btn.button_up.connect(func(): Input.action_release(action))

	add_child(btn)

func _add_button(btn_name: String, text: String, color: Color,
		offset: Vector2, btn_size: Vector2, font_size: int, action: String) -> void:
	var btn := Button.new()
	btn.name = btn_name
	btn.text = text
	btn.anchor_left = 1.0
	btn.anchor_top = 1.0
	btn.anchor_right = 1.0
	btn.anchor_bottom = 1.0
	btn.offset_left = offset.x
	btn.offset_top = offset.y
	btn.offset_right = offset.x + btn_size.x
	btn.offset_bottom = offset.y + btn_size.y
	btn.add_theme_font_size_override("font_size", font_size)

	# Style the button background
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	style.border_color = Color(1, 1, 1, 0.2)
	style.border_width_top = 1
	style.border_width_bottom = 1
	style.border_width_left = 1
	style.border_width_right = 1
	btn.add_theme_stylebox_override("normal", style)

	var pressed_style := style.duplicate()
	pressed_style.bg_color = Color(color.r + 0.2, color.g + 0.2, color.b + 0.2, 0.7)
	btn.add_theme_stylebox_override("pressed", pressed_style)
	btn.add_theme_stylebox_override("hover", style)

	btn.button_down.connect(func(): Input.action_press(action))
	btn.button_up.connect(func(): Input.action_release(action))

	add_child(btn)

func _center_knob() -> void:
	var bg_size := joystick_bg.size
	joystick_knob.position = Vector2(
		(bg_size.x - joystick_knob.size.x) / 2.0,
		(bg_size.y - joystick_knob.size.y) / 2.0
	)

func _on_joystick_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed:
			joystick_touch_index = event.index
			joystick_center = joystick_bg.global_position + joystick_bg.size / 2.0
			_update_joystick(event.position)
		elif event.index == joystick_touch_index:
			joystick_touch_index = -1
			joystick_vector = Vector2.ZERO
			_center_knob()
			_release_movement()
	elif event is InputEventScreenDrag and event.index == joystick_touch_index:
		_update_joystick(event.position)
	# Also handle mouse for testing on desktop
	elif event is InputEventMouseButton:
		if event.pressed:
			joystick_touch_index = 0
			joystick_center = joystick_bg.global_position + joystick_bg.size / 2.0
			_update_joystick(joystick_bg.get_local_mouse_position())
		else:
			joystick_touch_index = -1
			joystick_vector = Vector2.ZERO
			_center_knob()
			_release_movement()
	elif event is InputEventMouseMotion and joystick_touch_index == 0:
		_update_joystick(joystick_bg.get_local_mouse_position())

func _update_joystick(local_pos: Vector2) -> void:
	var bg_size := joystick_bg.size
	var center := bg_size / 2.0
	var diff := local_pos - center
	var dist := diff.length()
	if dist > JOYSTICK_RADIUS:
		diff = diff.normalized() * JOYSTICK_RADIUS
	joystick_vector = diff / JOYSTICK_RADIUS
	joystick_knob.position = center + diff - joystick_knob.size / 2.0
	_apply_movement()

func _apply_movement() -> void:
	# Release all first
	_release_movement()
	# Then press what's needed
	if joystick_vector.x < -0.3:
		Input.action_press("move_left", abs(joystick_vector.x))
	elif joystick_vector.x > 0.3:
		Input.action_press("move_right", joystick_vector.x)
	if joystick_vector.y < -0.3:
		Input.action_press("move_forward", abs(joystick_vector.y))
	elif joystick_vector.y > 0.3:
		Input.action_press("move_backward", joystick_vector.y)

func _release_movement() -> void:
	Input.action_release("move_left")
	Input.action_release("move_right")
	Input.action_release("move_forward")
	Input.action_release("move_backward")

func _on_look_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed:
			look_touch_index = event.index
			look_last_pos = event.position
		elif event.index == look_touch_index:
			look_touch_index = -1
			look_delta = Vector2.ZERO
	elif event is InputEventScreenDrag and event.index == look_touch_index:
		look_delta = event.position - look_last_pos
		look_last_pos = event.position
		_apply_look()
	# Mouse fallback for desktop testing
	elif event is InputEventMouseButton:
		if event.pressed:
			look_touch_index = 0
			look_last_pos = event.position
		else:
			look_touch_index = -1
			look_delta = Vector2.ZERO
	elif event is InputEventMouseMotion and look_touch_index == 0:
		look_delta = event.relative
		_apply_look()

func _apply_look() -> void:
	var player := GameManager.player
	if not player or player.is_dead:
		return
	var sensitivity := 0.004
	player.rotate_y(-look_delta.x * sensitivity)
	var head: Node3D = player.get_node("Head")
	head.rotate_x(-look_delta.y * sensitivity)
	head.rotation.x = clamp(head.rotation.x, -PI / 2, PI / 2)
	look_delta = Vector2.ZERO
