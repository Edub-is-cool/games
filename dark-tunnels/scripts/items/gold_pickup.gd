extends Area3D

@export var gold_amount: int = 10
var base_y: float

func _ready() -> void:
	base_y = position.y
	body_entered.connect(_on_body_entered)

func _process(_delta: float) -> void:
	position.y = base_y + sin(Time.get_ticks_msec() * 0.003) * 0.1
	rotate_y(_delta * 2.0)

func _on_body_entered(body: Node3D) -> void:
	if body == GameManager.player:
		Inventory.add_gold(gold_amount)
		SoundManager.play_sound("gold")
		queue_free()
