// Animated menu backdrop: a procedural dungeon wall lit by two guttering
// torches, with embers drifting up through the haze. Entirely procedural so it
// costs nothing to ship.
shader_type canvas_item;

uniform vec2 resolution = vec2(1280.0, 720.0);
uniform float brick_scale : hint_range(2.0, 24.0) = 9.0;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	float a = hash(i);
	float b = hash(i + vec2(1.0, 0.0));
	float c = hash(i + vec2(0.0, 1.0));
	float d = hash(i + vec2(1.0, 1.0));
	return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
	float v = 0.0;
	float amp = 0.5;
	for (int i = 0; i < 5; i++) {
		v += noise(p) * amp;
		p *= 2.03;
		amp *= 0.5;
	}
	return v;
}

// Irregular flicker built from a few incommensurate sines
float flicker(float t, float seed) {
	float f = sin(t * 6.1 + seed) * 0.30;
	f += sin(t * 11.7 + seed * 2.3) * 0.18;
	f += sin(t * 19.3 + seed * 4.1) * 0.10;
	f += sin(t * 2.7 + seed) * 0.12;
	return 1.0 + f * 0.35;
}

void fragment() {
	float aspect = resolution.x / max(resolution.y, 1.0);
	vec2 uv = UV;
	vec2 p = vec2(uv.x * aspect, uv.y);

	// --- STONE BRICKWORK ---
	vec2 bp = p * brick_scale;
	float row = floor(bp.y);
	bp.x += mod(row, 2.0) * 0.5;              // running bond
	vec2 cell = vec2(floor(bp.x), row);
	vec2 f = fract(bp);

	float mortar_x = min(f.x, 1.0 - f.x);
	float mortar_y = min(f.y, 1.0 - f.y);
	float mortar = smoothstep(0.0, 0.022, mortar_x) * smoothstep(0.0, 0.045, mortar_y);

	float tint = hash(cell) * 0.16;
	vec3 stone = vec3(0.145, 0.132, 0.12) + tint * vec3(1.0, 0.9, 0.78);
	stone *= 0.5 + 0.5 * fbm(p * 42.0);        // surface grain
	vec3 mortar_col = vec3(0.03, 0.027, 0.026);
	vec3 wall = mix(mortar_col, stone, mortar);

	// Bevel: bricks catch light along their top edge, shadow along the bottom
	float bevel = smoothstep(0.0, 0.16, f.y) * (1.0 - smoothstep(0.84, 1.0, f.y));
	wall *= 0.68 + 0.48 * bevel;

	// Damp patches creeping up from the floor
	float damp = smoothstep(0.35, 1.0, fbm(p * 3.1 + vec2(0.0, TIME * 0.005)) + uv.y * 0.35);
	wall = mix(wall, wall * vec3(0.6, 0.72, 0.85), damp * 0.45);

	// --- TORCHLIGHT ---
	vec2 t1 = vec2(0.13 * aspect, 0.34);
	vec2 t2 = vec2(0.87 * aspect, 0.34);
	float f1 = flicker(TIME, 0.0);
	float f2 = flicker(TIME, 3.7);

	float d1 = length(p - t1);
	float d2 = length(p - t2);
	float l1 = f1 / (1.0 + d1 * d1 * 13.0);
	float l2 = f2 / (1.0 + d2 * d2 * 13.0);

	vec3 warm = vec3(1.0, 0.58, 0.24);
	vec3 col = wall * (vec3(0.05, 0.055, 0.08) + warm * (l1 + l2) * 1.7);

	// Flame cores blooming on the wall
	col += warm * exp(-d1 * 11.0) * f1 * 0.85;
	col += warm * exp(-d2 * 11.0) * f2 * 0.85;
	col += vec3(1.0, 0.85, 0.55) * exp(-d1 * 42.0) * f1;
	col += vec3(1.0, 0.85, 0.55) * exp(-d2 * 42.0) * f2;

	// --- EMBERS ---
	for (int i = 0; i < 14; i++) {
		float fi = float(i);
		float seed = hash(vec2(fi, 7.0));
		float side = step(0.5, hash(vec2(fi, 3.0)));
		float speed = 0.05 + seed * 0.07;
		float life = fract(TIME * speed + seed);
		vec2 base = mix(t1, t2, side);
		vec2 pos = base + vec2(
			sin(TIME * (0.6 + seed) + fi) * 0.05 * life * 4.0,
			-life * 0.55);
		float glow = exp(-length(p - pos) * 190.0) * (1.0 - life);
		col += vec3(1.0, 0.45 + seed * 0.3, 0.12) * glow * 2.2;
	}

	// --- HAZE, VIGNETTE, GRAIN ---
	float haze = fbm(p * 1.6 + vec2(TIME * 0.012, TIME * -0.008));
	col += vec3(0.10, 0.06, 0.045) * haze * (l1 + l2) * 0.9;

	float vig = 1.0 - smoothstep(0.35, 1.05, length(uv - vec2(0.5)) * 1.6);
	col *= mix(0.22, 1.0, vig);

	col += (hash(uv * 900.0 + fract(TIME) * 57.0) - 0.5) * 0.02;

	COLOR = vec4(max(col, vec3(0.0)), 1.0);
}
