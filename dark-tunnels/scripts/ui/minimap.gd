extends Control

var room_data: Array[Dictionary] = []
var map_scale := 1.5
var map_center := Vector2(75, 75)

func _draw() -> void:
	if room_data.is_empty():
		return

	# Draw background with border
	draw_rect(Rect2(0, 0, 150, 150), Color(0.02, 0.02, 0.04, 0.6))
	draw_rect(Rect2(0, 0, 150, 150), Color(0.3, 0.25, 0.2, 0.3), false, 1.0)

	var player_pos := Vector2.ZERO
	if GameManager.player:
		player_pos = Vector2(GameManager.player.global_position.x, GameManager.player.global_position.z)

	# Draw corridors first (behind rooms)
	for i in range(room_data.size()):
		var room: Dictionary = room_data[i]
		if room.has("prev_index"):
			var prev: Dictionary = room_data[int(room["prev_index"])]
			var pos: Vector3 = room["pos"]
			var prev_pos: Vector3 = prev["pos"]
			var screen_pos := _world_to_map(Vector2(pos.x, pos.z), player_pos)
			var prev_screen := _world_to_map(Vector2(prev_pos.x, prev_pos.z), player_pos)
			draw_line(prev_screen, screen_pos, Color(0.3, 0.28, 0.35, 0.4), 3.0)

	# Draw rooms
	for i in range(room_data.size()):
		var room: Dictionary = room_data[i]
		var pos: Vector3 = room["pos"]
		var sz: Vector2 = room["size"]
		var screen_pos := _world_to_map(Vector2(pos.x, pos.z), player_pos)
		var screen_size := Vector2(sz.x, sz.y) * map_scale

		var fill_color: Color
		var border_color: Color
		match room["type"]:
			"boss":
				fill_color = Color(0.5, 0.12, 0.1, 0.5)
				border_color = Color(0.7, 0.2, 0.15, 0.5)
			"start":
				fill_color = Color(0.12, 0.4, 0.15, 0.5)
				border_color = Color(0.2, 0.55, 0.25, 0.5)
			_:
				fill_color = Color(0.2, 0.2, 0.28, 0.45)
				border_color = Color(0.35, 0.35, 0.45, 0.35)

		draw_rect(Rect2(screen_pos - screen_size / 2, screen_size), fill_color)
		draw_rect(Rect2(screen_pos - screen_size / 2, screen_size), border_color, false, 1.0)

	# Player indicator - small diamond shape
	var p := map_center
	var pts := PackedVector2Array([
		p + Vector2(0, -4), p + Vector2(3, 0),
		p + Vector2(0, 4), p + Vector2(-3, 0)
	])
	draw_colored_polygon(pts, Color(0.2, 0.9, 0.3, 0.9))
	draw_polyline(pts + PackedVector2Array([pts[0]]), Color(1, 1, 1, 0.5), 1.0)

func _world_to_map(world_pos: Vector2, player_pos: Vector2) -> Vector2:
	return map_center + (world_pos - player_pos) * map_scale

func set_room_data(data: Array[Dictionary]) -> void:
	room_data = data
