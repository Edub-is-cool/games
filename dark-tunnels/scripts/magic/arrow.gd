extends Area3D

var direction := Vector3.FORWARD
var speed := 25.0
var damage := 30
var initialized := false

func _ready() -> void:
	body_entered.connect(_on_body_entered)
	await get_tree().create_timer(3.0).timeout
	if is_instance_valid(self):
		queue_free()

func _physics_process(delta: float) -> void:
	position += direction * speed * delta
	# Slight gravity drop for realism
	direction.y -= delta * 0.4
	# Point arrow in travel direction
	if direction.length() > 0.01:
		look_at(global_position + direction, Vector3.UP)

func _on_body_entered(body: Node3D) -> void:
	if body.has_method("take_damage") and body != GameManager.player:
		body.take_damage(damage)
	if body != GameManager.player:
		queue_free()
