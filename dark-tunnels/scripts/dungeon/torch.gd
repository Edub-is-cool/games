extends Node3D

@onready var ember: CSGSphere3D = $Ember

var ember_timer: float = 0.0

func _ready() -> void:
	ember_timer = randf() * 6.28

func _process(delta: float) -> void:
	ember_timer += delta * 3.0
	var ex := sin(ember_timer * 0.7) * 0.04
	var ey := 1.18 + sin(ember_timer) * 0.03
	var ez := cos(ember_timer * 0.9) * 0.03
	ember.position = Vector3(ex, ey, ez)
