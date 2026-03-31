extends StaticBody3D

@export var weapon_name: String = "sword"
var collected: bool = false

func interact(_player: CharacterBody3D) -> void:
	if collected:
		return
	collected = true
	Inventory.add_weapon(weapon_name)
	SoundManager.play_sound("pickup")
	var tween := create_tween()
	tween.tween_property(self, "scale", Vector3.ZERO, 0.3)
	tween.tween_callback(queue_free)
