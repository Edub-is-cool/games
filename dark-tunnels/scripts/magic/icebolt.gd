extends Area3D

var direction := Vector3.FORWARD
var speed := 18.0
var damage := 20
var slow_duration := 3.0
var lifetime := 3.0

func _ready() -> void:
	body_entered.connect(_on_body_entered)
	await get_tree().create_timer(lifetime).timeout
	if is_instance_valid(self):
		queue_free()

func _physics_process(delta: float) -> void:
	position += direction * speed * delta

func _on_body_entered(body: Node3D) -> void:
	if body.has_method("take_damage") and body != GameManager.player:
		body.take_damage(damage)
		if body.has_method("apply_slow"):
			body.apply_slow(slow_duration)
	if body != GameManager.player:
		queue_free()
