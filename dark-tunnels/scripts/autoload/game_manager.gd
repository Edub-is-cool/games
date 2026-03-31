extends Node

@warning_ignore("UNUSED_SIGNAL")
signal player_died
signal enemy_killed(enemy: Node3D)
@warning_ignore("UNUSED_SIGNAL")
signal item_collected(item_name: String)
@warning_ignore("UNUSED_SIGNAL")
signal level_completed

var player: CharacterBody3D
var enemies_alive: int = 0
var is_paused: bool = false
var current_floor: int = 1
var game_mode: String = "campaign" # campaign, endless, training
var difficulty: String = "medium" # easy, medium, hard, impossible
var use_touch_controls: bool = false

# Difficulty modifiers
func get_player_health_mult() -> float:
	match difficulty:
		"easy": return 1.25
		"hard": return 0.75
		"impossible": return 0.75
	return 1.0

func get_player_damage_mult() -> float:
	match difficulty:
		"impossible": return 0.75
	return 1.0

func get_enemy_health_mult() -> float:
	match difficulty:
		"easy": return 0.75
		"hard": return 1.25
		"impossible": return 1.25
	return 1.0

func get_enemy_damage_mult() -> float:
	match difficulty:
		"impossible": return 1.25
	return 1.0

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS

func register_player(p: CharacterBody3D) -> void:
	player = p

func register_enemy() -> void:
	enemies_alive += 1

func on_enemy_killed(enemy: Node3D) -> void:
	enemies_alive -= 1
	enemy_killed.emit(enemy)

func pause_game() -> void:
	is_paused = true
	get_tree().paused = true

func resume_game() -> void:
	is_paused = false
	get_tree().paused = false
