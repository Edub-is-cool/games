extends Area3D

@export var potion_type: String = "health" # health, mana
@export var amount: int = 25
@export var bob_speed: float = 2.0
@export var bob_height: float = 0.15

var base_y: float

func _ready() -> void:
	base_y = position.y
	body_entered.connect(_on_body_entered)

func _process(delta: float) -> void:
	position.y = base_y + sin(Time.get_ticks_msec() * 0.001 * bob_speed) * bob_height
	rotate_y(delta * 1.5)

func _on_body_entered(body: Node3D) -> void:
	if body == GameManager.player:
		match potion_type:
			"health":
				Inventory.add_health_potion()
			"mana":
				Inventory.add_mana_potion()
		SoundManager.play_sound("pickup")
		GameManager.item_collected.emit(potion_type.capitalize() + " Potion")
		queue_free()
