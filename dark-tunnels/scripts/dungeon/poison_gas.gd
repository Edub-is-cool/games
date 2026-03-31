extends Area3D

@export var damage_per_tick: int = 3
@export var tick_interval: float = 0.5

var tick_timer: float = 0.0

func _ready() -> void:
	pass

func _physics_process(delta: float) -> void:
	tick_timer += delta
	if tick_timer >= tick_interval:
		tick_timer = 0.0
		for body in get_overlapping_bodies():
			if body == GameManager.player:
				body.take_damage(damage_per_tick)
