extends Area3D

var direction := Vector3.FORWARD
var speed := 15.0
var damage := 35
var lifetime := 3.0

func _ready() -> void:
	body_entered.connect(_on_body_entered)
	# Auto-destroy after lifetime
	await get_tree().create_timer(lifetime).timeout
	if is_instance_valid(self):
		_explode()

func _physics_process(delta: float) -> void:
	position += direction * speed * delta

func _on_body_entered(body: Node3D) -> void:
	if body.has_method("take_damage") and body != GameManager.player:
		body.take_damage(damage)
	if body != GameManager.player:
		_explode()

func _explode() -> void:
	# Brief flash then remove
	var mesh := get_node_or_null("CSGSphere3D")
	if mesh:
		var tween := create_tween()
		tween.tween_property(mesh, "radius", 0.8, 0.1)
		tween.tween_callback(queue_free)
	else:
		queue_free()
