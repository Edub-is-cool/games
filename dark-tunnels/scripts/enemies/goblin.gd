extends "res://scripts/enemies/enemy.gd"

@onready var sword_group: Node3D = $SwordHeld

func _ready() -> void:
	super._ready()
	# 35% chance to spawn with a sword
	if randf() < 0.35:
		sword_group.visible = true
		damage = int(damage * 1.4)
		attack_range += 0.3
	else:
		sword_group.visible = false
