extends StaticBody3D

@export var item_type: String = "health_potion" # health_potion, mana_potion, key, gold
@export var amount: int = 30
var is_opened: bool = false

func interact(_player: CharacterBody3D) -> void:
	if is_opened:
		return
	is_opened = true
	_open_animation()
	SoundManager.play_sound("chest")
	match item_type:
		"health_potion":
			Inventory.add_health_potion()
			GameManager.item_collected.emit("Health Potion")
		"mana_potion":
			Inventory.add_mana_potion()
			GameManager.item_collected.emit("Mana Potion")
		"key":
			Inventory.add_key()
			GameManager.item_collected.emit("Key")
		"gold":
			Inventory.add_gold(amount)
			GameManager.item_collected.emit("Gold")

func _open_animation() -> void:
	var lid := get_node_or_null("Lid")
	if lid:
		var tween := create_tween()
		tween.tween_property(lid, "rotation:x", -PI / 2, 0.5).set_ease(Tween.EASE_OUT)
