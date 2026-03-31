extends Control

@onready var difficulty_label: Label = $VBoxContainer/DifficultyHBox/DifficultyLabel

var difficulties := ["easy", "medium", "hard", "impossible"]
var difficulty_idx := 1 # default medium

func _ready() -> void:
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	GameManager.current_floor = 1
	GameManager.enemies_alive = 0
	GameManager.is_paused = false
	Inventory.reset()
	_update_difficulty_label()

func _update_difficulty_label() -> void:
	difficulty_label.text = difficulties[difficulty_idx].capitalize()
	match difficulties[difficulty_idx]:
		"easy":
			difficulty_label.add_theme_color_override("font_color", Color(0.3, 0.9, 0.3))
		"medium":
			difficulty_label.add_theme_color_override("font_color", Color(1, 0.85, 0.2))
		"hard":
			difficulty_label.add_theme_color_override("font_color", Color(1, 0.4, 0.2))
		"impossible":
			difficulty_label.add_theme_color_override("font_color", Color(0.9, 0.1, 0.1))

func _on_difficulty_left_pressed() -> void:
	difficulty_idx = (difficulty_idx - 1) % difficulties.size()
	if difficulty_idx < 0:
		difficulty_idx = difficulties.size() - 1
	_update_difficulty_label()

func _on_difficulty_right_pressed() -> void:
	difficulty_idx = (difficulty_idx + 1) % difficulties.size()
	_update_difficulty_label()

func _start_game(mode: String) -> void:
	GameManager.game_mode = mode
	GameManager.difficulty = difficulties[difficulty_idx]
	GameManager.current_floor = 1
	get_tree().change_scene_to_file("res://scenes/ui/controls_select.tscn")

func _on_campaign_pressed() -> void:
	_start_game("campaign")

func _on_endless_pressed() -> void:
	_start_game("endless")

func _on_training_pressed() -> void:
	_start_game("training")

func _on_quit_pressed() -> void:
	get_tree().quit()
