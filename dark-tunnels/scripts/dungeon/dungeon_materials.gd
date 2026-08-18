extends RefCounted

# Shared procedural stone materials for every dungeon-flavoured scene (the
# generated floors, the training arena). The texture set is expensive to build
# pixel by pixel, so it is generated once and cached for the whole session.

static var _cache: Dictionary = {}

static func get_materials() -> Dictionary:
	if not _cache.is_empty():
		return _cache

	var cobble := _generate_cobblestone_maps()
	var brick := _generate_brick_maps()
	var ceil_maps := _generate_ceiling_maps()

	# Gray cobblestone floor — weathered, worn, damp in places
	var floor_mat := StandardMaterial3D.new()
	floor_mat.albedo_color = Color(0.46, 0.44, 0.42)
	floor_mat.roughness = 1.0
	floor_mat.metallic = 0.0
	floor_mat.metallic_specular = 0.5
	floor_mat.albedo_texture = cobble["albedo"]
	floor_mat.normal_enabled = true
	floor_mat.normal_texture = cobble["normal"]
	floor_mat.normal_scale = 2.2
	floor_mat.roughness_texture = cobble["roughness"]
	floor_mat.roughness_texture_channel = BaseMaterial3D.TEXTURE_CHANNEL_RED
	floor_mat.ao_enabled = true
	floor_mat.ao_texture = cobble["ao"]
	floor_mat.ao_texture_channel = BaseMaterial3D.TEXTURE_CHANNEL_RED
	floor_mat.ao_light_affect = 0.65
	floor_mat.uv1_triplanar = true
	floor_mat.uv1_scale = Vector3(0.72, 0.72, 0.72)
	floor_mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC

	# Dark stone brick walls — aged masonry, faint glowing lichen in the cracks
	var wall_mat := StandardMaterial3D.new()
	wall_mat.albedo_color = Color(0.4, 0.38, 0.35)
	wall_mat.roughness = 1.0
	wall_mat.metallic = 0.0
	wall_mat.metallic_specular = 0.45
	wall_mat.albedo_texture = brick["albedo"]
	wall_mat.normal_enabled = true
	wall_mat.normal_texture = brick["normal"]
	wall_mat.normal_scale = 2.4
	wall_mat.roughness_texture = brick["roughness"]
	wall_mat.roughness_texture_channel = BaseMaterial3D.TEXTURE_CHANNEL_RED
	wall_mat.ao_enabled = true
	wall_mat.ao_texture = brick["ao"]
	wall_mat.ao_texture_channel = BaseMaterial3D.TEXTURE_CHANNEL_RED
	wall_mat.ao_light_affect = 0.7
	wall_mat.emission_enabled = true
	wall_mat.emission_texture = brick["emission"]
	# MULTIPLY, not the default ADD — otherwise the tint paints every pixel
	wall_mat.emission_operator = BaseMaterial3D.EMISSION_OP_MULTIPLY
	wall_mat.emission = Color(0.4, 0.95, 0.7)
	wall_mat.emission_energy_multiplier = 2.5
	wall_mat.uv1_triplanar = true
	wall_mat.uv1_scale = Vector3(0.55, 0.55, 0.55)
	wall_mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC

	# Ceiling — rough dark stone with drip stains
	var ceiling_mat := StandardMaterial3D.new()
	ceiling_mat.albedo_color = Color(0.3, 0.28, 0.26)
	ceiling_mat.roughness = 1.0
	ceiling_mat.metallic_specular = 0.35
	ceiling_mat.albedo_texture = ceil_maps["albedo"]
	ceiling_mat.normal_enabled = true
	ceiling_mat.normal_texture = ceil_maps["normal"]
	ceiling_mat.normal_scale = 0.7
	ceiling_mat.roughness_texture = ceil_maps["roughness"]
	ceiling_mat.roughness_texture_channel = BaseMaterial3D.TEXTURE_CHANNEL_RED
	ceiling_mat.uv1_triplanar = true
	ceiling_mat.uv1_scale = Vector3(0.5, 0.5, 0.5)
	ceiling_mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC

	# Wall trim — chiseled stone
	var trim_mat := StandardMaterial3D.new()
	trim_mat.albedo_color = Color(0.3, 0.27, 0.24)
	trim_mat.roughness = 0.7
	trim_mat.metallic = 0.05
	trim_mat.metallic_specular = 0.4

	_cache = {
		"floor": floor_mat,
		"wall": wall_mat,
		"ceiling": ceiling_mat,
		"trim": trim_mat,
	}
	return _cache

# --- PROCEDURAL MATERIAL MAPS -------------------------------------------------
# Each surface gets a matched albedo / normal / roughness / AO set so torchlight
# has something to catch: damp patches go glossy, mortar recesses go dark.

static func _noise(octaves: int, freq: float, seed_val: int) -> FastNoiseLite:
	var n := FastNoiseLite.new()
	n.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	n.seed = seed_val
	n.frequency = freq
	n.fractal_octaves = octaves
	return n

static func _tex(img: Image) -> ImageTexture:
	img.generate_mipmaps()
	return ImageTexture.create_from_image(img)


static func _generate_cobblestone_maps() -> Dictionary:
	var size := 256
	var cell_size := 40
	var albedo := Image.create(size, size, true, Image.FORMAT_RGB8)
	var normal := Image.create(size, size, true, Image.FORMAT_RGB8)
	var rough := Image.create(size, size, true, Image.FORMAT_RGB8)
	var ao := Image.create(size, size, true, Image.FORMAT_RGB8)

	var grain := _noise(4, 0.09, 1337)
	var damp := _noise(3, 0.012, 24)
	var moss := _noise(3, 0.02, 991)

	for x in range(size):
		for y in range(size):
			var cell_y := y % cell_size
			var row := y / cell_size
			var col := x / cell_size
			var offset_x := x % cell_size
			if row % 2 == 1:
				offset_x = (x + cell_size / 2) % cell_size

			var g := grain.get_noise_2d(float(x), float(y))
			var wet := clampf(damp.get_noise_2d(float(x), float(y)) * 1.6 + 0.15, 0.0, 1.0)
			var mossy := clampf(moss.get_noise_2d(float(x) * 0.8, float(y) * 0.8) * 2.0 - 0.95, 0.0, 1.0)

			var c: Color
			var r_val := 0.95
			var ao_val := 1.0
			var nx := 0.5
			var ny := 0.5

			if offset_x <= 2 or cell_y <= 2:
				# Mortar channel — dark, recessed, holds moisture
				var m := 0.16 + g * 0.03
				c = Color(m, m * 0.94, m * 0.86)
				r_val = 0.72 - wet * 0.3
				ao_val = 0.35
				nx = 0.72 if offset_x <= 2 else 0.5
				ny = 0.72 if cell_y <= 2 else 0.5
			elif offset_x == 3 or cell_y == 3:
				c = Color(0.3, 0.29, 0.26)
				r_val = 0.85
				ao_val = 0.6
				nx = 0.3 if offset_x == 3 else 0.5
				ny = 0.3 if cell_y == 3 else 0.5
			elif offset_x >= cell_size - 2 or cell_y >= cell_size - 2:
				c = Color(0.34, 0.33, 0.3)
				r_val = 0.88
				ao_val = 0.55
				nx = 0.68 if offset_x >= cell_size - 2 else 0.5
				ny = 0.68 if cell_y >= cell_size - 2 else 0.5
			else:
				# Stone face — per-stone tint plus fine grain
				var stone_id := row * 7 + col
				var tone := sin(float(stone_id) * 3.7) * 0.05
				var base_r := 0.55 + tone
				var base_g := 0.535 + tone + sin(float(stone_id) * 5.1) * 0.012
				var base_b := 0.51 + tone + sin(float(stone_id) * 2.3) * 0.01
				var n := g * 0.05 + grain.get_noise_2d(float(x) * 3.0, float(y) * 3.0) * 0.02
				# Domed stones: darken and bevel toward the edges
				var edge_dist := minf(minf(float(offset_x - 3), float(cell_size - 3 - offset_x)),
					minf(float(cell_y - 3), float(cell_size - 3 - cell_y)))
				var dome := clampf(edge_dist / 8.0, 0.0, 1.0)
				var mineral := maxf(grain.get_noise_2d(float(x) * 2.0 + 400.0, float(y) * 2.0) - 0.55, 0.0) * 0.3
				c = Color(
					clampf(base_r + n + dome * 0.07 + mineral, 0.05, 1.0),
					clampf(base_g + n + dome * 0.07 + mineral, 0.05, 1.0),
					clampf(base_b + n * 0.8 + dome * 0.07 + mineral * 0.85, 0.05, 1.0))
				r_val = 0.92 - wet * 0.55 - mineral * 0.4
				ao_val = 0.55 + dome * 0.45
				nx = 0.5 + (0.5 - float(offset_x) / float(cell_size)) * (1.0 - dome) * 0.55
				ny = 0.5 + (0.5 - float(cell_y) / float(cell_size)) * (1.0 - dome) * 0.55

			# Damp sheen darkens stone slightly and greenish moss creeps in
			c = c.lerp(Color(c.r * 0.72, c.g * 0.76, c.b * 0.78), wet * 0.5)
			c = c.lerp(Color(0.19, 0.26, 0.17), mossy * 0.35)
			r_val = clampf(r_val - mossy * 0.1, 0.05, 1.0)

			var bump := grain.get_noise_2d(float(x) * 4.0, float(y) * 4.0) * 0.12
			albedo.set_pixel(x, y, c)
			normal.set_pixel(x, y, Color(clampf(nx + bump, 0, 1), clampf(ny + bump * 0.8, 0, 1), 1.0))
			rough.set_pixel(x, y, Color(r_val, r_val, r_val))
			ao.set_pixel(x, y, Color(ao_val, ao_val, ao_val))

	return {
		"albedo": _tex(albedo), "normal": _tex(normal),
		"roughness": _tex(rough), "ao": _tex(ao),
	}

static func _generate_brick_maps() -> Dictionary:
	var size := 256
	var brick_h := 24
	var brick_w := 96
	var albedo := Image.create(size, size, true, Image.FORMAT_RGB8)
	var normal := Image.create(size, size, true, Image.FORMAT_RGB8)
	var rough := Image.create(size, size, true, Image.FORMAT_RGB8)
	var ao := Image.create(size, size, true, Image.FORMAT_RGB8)
	var emission := Image.create(size, size, true, Image.FORMAT_RGB8)

	var grain := _noise(4, 0.1, 77)
	var damp := _noise(3, 0.014, 512)
	var lichen := _noise(3, 0.025, 8080)

	for y in range(size):
		var row := y / brick_h
		var y_in := y % brick_h
		for x in range(size):
			var x_off := 0 if row % 2 == 0 else 48
			var x_in := (x + x_off) % brick_w

			var g := grain.get_noise_2d(float(x), float(y))
			var wet := clampf(damp.get_noise_2d(float(x), float(y)) * 1.7 + 0.2, 0.0, 1.0)
			var lich := clampf(lichen.get_noise_2d(float(x), float(y)) * 2.4 - 1.5, 0.0, 1.0)

			var c: Color
			var r_val := 0.95
			var ao_val := 1.0
			var nx := 0.5
			var ny := 0.5

			if y_in <= 2 or x_in <= 2:
				var m := 0.13 + g * 0.025
				c = Color(m, m * 0.93, m * 0.86)
				r_val = 0.75 - wet * 0.25
				ao_val = 0.28
				nx = 0.78 if x_in <= 2 else 0.5
				ny = 0.78 if y_in <= 2 else 0.5
			elif y_in == 3 or x_in == 3:
				c = Color(0.34, 0.32, 0.29)
				r_val = 0.88
				ao_val = 0.5
				nx = 0.28 if x_in == 3 else 0.5
				ny = 0.28 if y_in == 3 else 0.5
			elif y_in >= brick_h - 2 or x_in >= brick_w - 2:
				c = Color(0.24, 0.22, 0.2)
				r_val = 0.9
				ao_val = 0.45
				nx = 0.72 if x_in >= brick_w - 2 else 0.5
				ny = 0.72 if y_in >= brick_h - 2 else 0.5
			else:
				var brick_id := row * 3 + x_in / brick_w + int(x / brick_w) * 13
				var base := 0.44 + sin(float(brick_id) * 5.3) * 0.06
				var n := g * 0.045 + grain.get_noise_2d(float(x) * 3.0, float(y) * 3.0) * 0.02
				var temp := sin(float(brick_id) * 3.3) * 0.022
				var ey := minf(float(y_in - 3), float(brick_h - 3 - y_in))
				var ex := minf(float(x_in - 3), float(brick_w - 3 - x_in))
				var bevel := clampf(minf(ey, ex) / 4.0, 0.0, 1.0)
				var v := base + n + bevel * 0.05
				c = Color(
					clampf(v + temp, 0.04, 1.0),
					clampf(v * 0.97, 0.04, 1.0),
					clampf(v * 0.9 - temp * 0.5, 0.04, 1.0))
				r_val = 0.93 - wet * 0.5
				ao_val = 0.5 + bevel * 0.5
				nx = 0.5 + (0.5 - float(x_in) / float(brick_w)) * (1.0 - bevel) * 0.4
				ny = 0.5 + (0.5 - float(y_in) / float(brick_h)) * (1.0 - bevel) * 0.6

			c = c.lerp(Color(c.r * 0.7, c.g * 0.74, c.b * 0.8), wet * 0.55)
			c = c.lerp(Color(0.16, 0.26, 0.2), lich * 0.45)
			r_val = clampf(r_val - lich * 0.15, 0.05, 1.0)

			var bump := grain.get_noise_2d(float(x) * 4.5, float(y) * 4.5) * 0.13
			albedo.set_pixel(x, y, c)
			normal.set_pixel(x, y, Color(clampf(nx + bump, 0, 1), clampf(ny + bump * 0.8, 0, 1), 1.0))
			rough.set_pixel(x, y, Color(r_val, r_val, r_val))
			ao.set_pixel(x, y, Color(ao_val, ao_val, ao_val))
			# Faint bioluminescent lichen clinging to the damp mortar
			var glow := pow(lich, 3.0) * clampf(wet, 0.0, 1.0)
			emission.set_pixel(x, y, Color(glow * 0.5, glow, glow * 0.8))

	return {
		"albedo": _tex(albedo), "normal": _tex(normal), "roughness": _tex(rough),
		"ao": _tex(ao), "emission": _tex(emission),
	}

static func _generate_ceiling_maps() -> Dictionary:
	var size := 128
	var albedo := Image.create(size, size, true, Image.FORMAT_RGB8)
	var normal := Image.create(size, size, true, Image.FORMAT_RGB8)
	var rough := Image.create(size, size, true, Image.FORMAT_RGB8)

	var grain := _noise(4, 0.12, 4242)
	var seep := _noise(3, 0.03, 606)

	for x in range(size):
		for y in range(size):
			var g := grain.get_noise_2d(float(x), float(y))
			var drip := clampf(seep.get_noise_2d(float(x) * 0.5, float(y) * 2.5) * 1.8, -1.0, 1.0)
			var v := 0.3 + g * 0.06
			var c := Color(v, v * 0.95, v * 0.88)
			# Wet seepage streaks running down the vault
			var wet := clampf(drip, 0.0, 1.0)
			c = c.lerp(Color(c.r * 0.55, c.g * 0.6, c.b * 0.68), wet * 0.7)
			albedo.set_pixel(x, y, c)
			rough.set_pixel(x, y, Color(0.98 - wet * 0.3, 0, 0))
			var bx := g * 0.07 + grain.get_noise_2d(float(x) * 3.0, float(y) * 3.0) * 0.03
			var by := grain.get_noise_2d(float(y) * 2.0, float(x) * 2.0) * 0.07
			normal.set_pixel(x, y, Color(clampf(0.5 + bx, 0, 1), clampf(0.5 + by, 0, 1), 1.0))

	return {"albedo": _tex(albedo), "normal": _tex(normal), "roughness": _tex(rough)}

