extends StaticBody3D

var shop_open: bool = false

func interact(_player: CharacterBody3D) -> void:
	if shop_open:
		return
	shop_open = true
	SoundManager.play_sound("chest")
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	_show_shop()

func _show_shop() -> void:
	var shop := CanvasLayer.new()
	shop.name = "ShopUI"
	shop.layer = 10
	shop.process_mode = Node.PROCESS_MODE_ALWAYS

	var panel := Panel.new()
	panel.name = "Panel"
	panel.set_anchors_preset(Control.PRESET_CENTER)
	panel.custom_minimum_size = Vector2(400, 350)
	panel.offset_left = -200
	panel.offset_top = -175
	panel.offset_right = 200
	panel.offset_bottom = 175
	shop.add_child(panel)

	var vbox := VBoxContainer.new()
	vbox.name = "VBox"
	vbox.set_anchors_preset(Control.PRESET_FULL_RECT)
	vbox.offset_left = 20
	vbox.offset_top = 20
	vbox.offset_right = -20
	vbox.offset_bottom = -20
	panel.add_child(vbox)

	var title := Label.new()
	title.text = "~ MERCHANT ~"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 24)
	vbox.add_child(title)

	var gold_label := Label.new()
	gold_label.text = "Gold: " + str(Inventory.gold)
	gold_label.name = "GoldLabel"
	gold_label.add_theme_font_size_override("font_size", 18)
	vbox.add_child(gold_label)

	vbox.add_child(HSeparator.new())

	_add_shop_item(vbox, gold_label, "Health Potion", 20, func():
		Inventory.add_health_potion()
	)
	_add_shop_item(vbox, gold_label, "Mana Potion", 20, func():
		Inventory.add_mana_potion()
	)
	_add_shop_item(vbox, gold_label, "Ice Bolt Spell", 80, func():
		Inventory.add_spell("icebolt")
	)
	_add_shop_item(vbox, gold_label, "Lightning Spell", 120, func():
		Inventory.add_spell("lightning")
	)
	_add_shop_item(vbox, gold_label, "Shield Spell", 100, func():
		Inventory.add_spell("shield")
	)
	_add_shop_item(vbox, gold_label, "+25 Max Health", 60, func():
		var p := GameManager.player
		if p:
			p.max_health += 25
			p.health += 25
			p.health_changed.emit(p.health, p.max_health)
	)

	vbox.add_child(HSeparator.new())

	var close_btn := Button.new()
	close_btn.text = "Close Shop"
	close_btn.pressed.connect(func():
		shop.queue_free()
		shop_open = false
		Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
	)
	vbox.add_child(close_btn)

	get_tree().current_scene.add_child(shop)

func _add_shop_item(parent: VBoxContainer, gold_label: Label, item_name: String, cost: int, buy_callback: Callable) -> void:
	var hbox := HBoxContainer.new()
	var label := Label.new()
	label.text = item_name + " - " + str(cost) + "g"
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hbox.add_child(label)

	var btn := Button.new()
	btn.text = "Buy"
	btn.pressed.connect(func():
		if Inventory.spend_gold(cost):
			buy_callback.call()
			SoundManager.play_sound("gold")
			gold_label.text = "Gold: " + str(Inventory.gold)
	)
	hbox.add_child(btn)
	parent.add_child(hbox)
