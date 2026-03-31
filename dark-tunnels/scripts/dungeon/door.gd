extends AnimatableBody3D

@export var is_locked: bool = false
var is_open: bool = false
var _base_position: Vector3

func _ready() -> void:
	_base_position = position

func interact(_player: CharacterBody3D) -> void:
	if is_locked:
		if Inventory.use_key():
			is_locked = false
			SoundManager.play_sound("chest")
		else:
			return
	if is_open:
		_close()
	else:
		_open()

func unlock() -> void:
	is_locked = false

func _open() -> void:
	is_open = true
	SoundManager.play_sound("door")
	var tween := create_tween()
	tween.tween_property(self, "position:y", _base_position.y + 3.0, 0.8).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_QUAD)

func _close() -> void:
	is_open = false
	SoundManager.play_sound("door")
	var tween := create_tween()
	tween.tween_property(self, "position:y", _base_position.y, 0.8).set_ease(Tween.EASE_IN).set_trans(Tween.TRANS_QUAD)
