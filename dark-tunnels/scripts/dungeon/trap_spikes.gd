extends Area3D

@export var damage: int = 15
@export var interval: float = 2.0

var active: bool = false
var timer: float = 0.0

func _ready() -> void:
	body_entered.connect(_on_body_entered)

func _process(delta: float) -> void:
	timer += delta
	if fmod(timer, interval) < 0.5:
		if not active:
			active = true
			_raise_spikes()
	else:
		if active:
			active = false
			_lower_spikes()

func _raise_spikes() -> void:
	var spikes := get_node_or_null("Spikes")
	if spikes:
		var tween := create_tween()
		tween.tween_property(spikes, "position:y", 0.3, 0.1)

func _lower_spikes() -> void:
	var spikes := get_node_or_null("Spikes")
	if spikes:
		var tween := create_tween()
		tween.tween_property(spikes, "position:y", -0.1, 0.3)

func _on_body_entered(body: Node3D) -> void:
	if body == GameManager.player and active:
		body.take_damage(damage)

func _physics_process(_delta: float) -> void:
	if active:
		for body in get_overlapping_bodies():
			if body == GameManager.player:
				# Only damage once per activation cycle
				pass
