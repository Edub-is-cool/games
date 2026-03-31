extends Control

func _ready() -> void:
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)

func _start() -> void:
	if GameManager.game_mode == "training":
		get_tree().change_scene_to_file("res://scenes/dungeon/training_zone.tscn")
	else:
		get_tree().change_scene_to_file("res://scenes/dungeon/dungeon_level.tscn")

func _on_keyboard_pressed() -> void:
	GameManager.use_touch_controls = false
	_start()

func _on_touch_pressed() -> void:
	GameManager.use_touch_controls = true
	_start()
