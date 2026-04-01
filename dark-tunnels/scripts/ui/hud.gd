extends CanvasLayer

@onready var health_bar: ProgressBar = $MarginContainer/VBoxContainer/HealthBar
@onready var mana_bar: ProgressBar = $MarginContainer/VBoxContainer/ManaBar
@onready var interaction_label: Label = $InteractionLabel
@onready var crosshair: TextureRect = $Crosshair
@onready var damage_overlay: ColorRect = $DamageOverlay
@onready var gold_label: Label = $GoldLabel
@onready var inventory_label: Label = $InventoryLabel
@onready var weapon_label: Label = $WeaponLabel
@onready var spell_label: Label = $SpellLabel
@onready var boss_bar: ProgressBar = $BossBar
@onready var boss_name_label: Label = $BossNameLabel
@onready var death_screen: Control = $DeathScreen
@onready var shield_indicator: ColorRect = $ShieldIndicator
@onready var minimap: Control = $MinimapContainer
@onready var floor_label: Label = $FloorLabel

var player: CharacterBody3D
var room_data: Array[Dictionary] = []

func _ready() -> void:
	interaction_label.visible = false
	damage_overlay.modulate.a = 0.0
	boss_bar.visible = false
	boss_name_label.visible = false
	death_screen.visible = false
	shield_indicator.modulate.a = 0.0
	# Show touch controls or click-to-play prompt
	if GameManager.use_touch_controls:
		_show_touch_controls()
	else:
		_show_web_click_prompt()
	# Show floor number
	if GameManager.game_mode == "endless":
		floor_label.text = "Floor " + str(GameManager.current_floor)
	else:
		floor_label.text = "Floor " + str(GameManager.current_floor) + " / 7"

func setup(p: CharacterBody3D) -> void:
	player = p
	player.health_changed.connect(_on_health_changed)
	player.mana_changed.connect(_on_mana_changed)
	player.died.connect(_on_player_died)
	health_bar.max_value = player.max_health
	health_bar.value = player.health
	mana_bar.max_value = player.max_mana
	mana_bar.value = player.mana
	Inventory.gold_changed.connect(_on_gold_changed)
	Inventory.inventory_changed.connect(_on_inventory_changed)
	Inventory.weapon_changed.connect(_on_weapon_changed)
	Inventory.spell_changed.connect(_on_spell_changed)
	_on_gold_changed(Inventory.gold)
	_on_inventory_changed()
	_on_weapon_changed(Inventory.current_weapon)
	_on_spell_changed(Inventory.current_spell)

func setup_minimap(data: Array[Dictionary]) -> void:
	room_data = data
	minimap.queue_redraw()

func _process(_delta: float) -> void:
	# Update shield indicator
	if Inventory.has_shield:
		shield_indicator.modulate.a = 0.3 + sin(Time.get_ticks_msec() * 0.005) * 0.1
	else:
		shield_indicator.modulate.a = 0.0

	# Update minimap player position
	if player and minimap.visible:
		minimap.queue_redraw()

	# Check for boss in scene
	var bosses := get_tree().get_nodes_in_group("boss")
	if bosses.size() > 0:
		var boss := bosses[0]
		if not boss_bar.visible:
			boss_bar.visible = true
			boss_name_label.visible = true
			boss_bar.max_value = boss.max_health
			# Set boss name based on floor
			var floor_idx := (GameManager.current_floor - 1) % 7
			match floor_idx:
				0: boss_name_label.text = "WITCH"
				1: boss_name_label.text = "WEREWOLF"
				2: boss_name_label.text = "DRAGON"
				3: boss_name_label.text = "BONE COLOSSUS"
				4: boss_name_label.text = "ABYSSAL EYE"
				5: boss_name_label.text = "IRON WARDEN"
				6: boss_name_label.text = "HOLLOW KING"
			if not boss.health_changed.is_connected(_on_boss_health_changed):
				boss.health_changed.connect(_on_boss_health_changed)
		boss_bar.value = boss.health
	else:
		boss_bar.visible = false
		boss_name_label.visible = false

func _on_health_changed(new_health: int, max_hp: int) -> void:
	health_bar.max_value = max_hp
	health_bar.value = new_health
	_flash_damage()

func _on_mana_changed(new_mana: int, _max_mp: int) -> void:
	mana_bar.value = new_mana

func _on_gold_changed(amount: int) -> void:
	gold_label.text = str(amount) + "g"

func _on_inventory_changed() -> void:
	var parts: Array[String] = []
	if Inventory.health_potions > 0:
		parts.append("HP Pot: " + str(Inventory.health_potions))
	if Inventory.mana_potions > 0:
		parts.append("MP Pot: " + str(Inventory.mana_potions))
	if Inventory.keys > 0:
		parts.append("Keys: " + str(Inventory.keys))
	inventory_label.text = " | ".join(parts) if parts.size() > 0 else ""

func _on_weapon_changed(weapon_name: String) -> void:
	weapon_label.text = weapon_name.capitalize()

func _on_spell_changed(spell_name: String) -> void:
	spell_label.text = spell_name.capitalize()

func _on_boss_health_changed(new_health: int, _max_hp: int) -> void:
	boss_bar.value = new_health

func _flash_damage() -> void:
	damage_overlay.modulate.a = 0.35
	var tween := create_tween()
	tween.tween_property(damage_overlay, "modulate:a", 0.0, 0.5).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_EXPO)

func show_interaction(text: String) -> void:
	interaction_label.text = text
	interaction_label.visible = true

func hide_interaction() -> void:
	interaction_label.visible = false

func _on_player_died() -> void:
	damage_overlay.modulate.a = 0.6
	death_screen.visible = true

func toggle_controls() -> void:
	var existing := get_node_or_null("ControlsPanel")
	if existing:
		existing.queue_free()
		return

	var panel := Panel.new()
	panel.name = "ControlsPanel"
	panel.set_anchors_preset(Control.PRESET_CENTER)
	panel.custom_minimum_size = Vector2(420, 400)
	panel.offset_left = -210
	panel.offset_top = -200
	panel.offset_right = 210
	panel.offset_bottom = 200

	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.04, 0.03, 0.06, 0.92)
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.border_color = Color(0.4, 0.15, 0.12, 0.5)
	style.corner_radius_top_left = 6
	style.corner_radius_top_right = 6
	style.corner_radius_bottom_left = 6
	style.corner_radius_bottom_right = 6
	style.content_margin_left = 5.0
	style.content_margin_top = 5.0
	style.content_margin_right = 5.0
	style.content_margin_bottom = 5.0
	panel.add_theme_stylebox_override("panel", style)

	var label := RichTextLabel.new()
	label.set_anchors_preset(Control.PRESET_FULL_RECT)
	label.offset_left = 20
	label.offset_top = 20
	label.offset_right = -20
	label.offset_bottom = -20
	label.bbcode_enabled = true
	label.text = """[color=#cc2020][b]CONTROLS[/b][/color]

[color=#aa8855][b]Movement[/b][/color]
  [color=#bbbbbb]WASD[/color] - Move
  [color=#bbbbbb]Space[/color] - Jump
  [color=#bbbbbb]Shift[/color] - Sprint
  [color=#bbbbbb]Mouse[/color] - Look

[color=#aa8855][b]Combat[/b][/color]
  [color=#bbbbbb]Left Click[/color] - Melee attack
  [color=#bbbbbb]Right Click[/color] - Cast spell
  [color=#bbbbbb]1/2/3/4[/color] - Select weapon
  [color=#bbbbbb]Z[/color] - Cycle weapon
  [color=#bbbbbb]Tab[/color] - Cycle spell

[color=#aa8855][b]Items[/b][/color]
  [color=#bbbbbb]E[/color] - Interact (doors, chests, merchant)
  [color=#bbbbbb]Q[/color] - Use health potion
  [color=#bbbbbb]F[/color] - Use mana potion

[color=#aa8855][b]Other[/b][/color]
  [color=#bbbbbb]H[/color] - Toggle this help
  [color=#bbbbbb]R[/color] - Restart (when dead)
  [color=#bbbbbb]Esc[/color] - Release mouse

[color=#666666][i]Press H to close[/i][/color]"""
	label.add_theme_color_override("default_color", Color(0.65, 0.6, 0.55, 0.9))
	label.add_theme_font_size_override("normal_font_size", 14)
	panel.add_child(label)
	add_child(panel)

func _show_touch_controls() -> void:
	var touch_scene: PackedScene = load("res://scenes/ui/touch_controls.tscn")
	var touch_ui := touch_scene.instantiate()
	add_child(touch_ui)
	# For touch mode, capture mouse immediately (no click-to-play needed)
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)

func _show_web_click_prompt() -> void:
	var click_layer := CanvasLayer.new()
	click_layer.name = "ClickToPlayLayer"
	click_layer.layer = 100
	click_layer.process_mode = Node.PROCESS_MODE_ALWAYS

	var overlay := Panel.new()
	overlay.name = "WebClickPrompt"
	overlay.anchor_right = 1.0
	overlay.anchor_bottom = 1.0
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP

	var bg := ColorRect.new()
	bg.color = Color(0.01, 0.01, 0.02, 0.85)
	bg.anchor_right = 1.0
	bg.anchor_bottom = 1.0
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	overlay.add_child(bg)

	var vbox := VBoxContainer.new()
	vbox.set_anchors_preset(Control.PRESET_CENTER)
	vbox.offset_left = -150
	vbox.offset_top = -50
	vbox.offset_right = 150
	vbox.offset_bottom = 50
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.mouse_filter = Control.MOUSE_FILTER_IGNORE
	overlay.add_child(vbox)

	var title := Label.new()
	title.text = "Click to Play"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 42)
	title.add_theme_color_override("font_color", Color(0.9, 0.9, 0.9, 0.9))
	title.add_theme_color_override("font_shadow_color", Color(0.4, 0.1, 0.05, 0.5))
	title.add_theme_constant_override("shadow_offset_x", 2)
	title.add_theme_constant_override("shadow_offset_y", 2)
	title.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vbox.add_child(title)

	var hint := Label.new()
	hint.text = "Left click to capture mouse"
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint.add_theme_font_size_override("font_size", 14)
	hint.add_theme_color_override("font_color", Color(0.5, 0.5, 0.5, 0.6))
	hint.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vbox.add_child(hint)

	overlay.gui_input.connect(func(event: InputEvent):
		if event is InputEventMouseButton and event.pressed:
			Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
			click_layer.queue_free()
	)

	click_layer.add_child(overlay)
	add_child(click_layer)
