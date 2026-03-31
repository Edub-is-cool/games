extends Area3D

var direction := Vector3.FORWARD
var speed := 18.0
var damage := 12

func _ready() -> void:
	body_entered.connect(_on_body_entered)
	await get_tree().create_timer(4.0).timeout
	if is_instance_valid(self):
		queue_free()

func _physics_process(delta: float) -> void:
	position += direction * speed * delta

func _on_body_entered(body: Node3D) -> void:
	if body == GameManager.player:
		body.take_damage(damage)
		queue_free()
	elif not body.is_in_group("enemies"):
		queue_free()
