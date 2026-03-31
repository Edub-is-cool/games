extends "res://scripts/enemies/enemy.gd"

@onready var axe_group: Node3D = $AxeHeld

func _ready() -> void:
	super._ready()
	# 40% chance to spawn with an axe
	if randf() < 0.4:
		axe_group.visible = true
		damage = int(damage * 1.5)
		attack_range += 0.5
	else:
		axe_group.visible = false
