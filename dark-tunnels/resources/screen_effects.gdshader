// Full-screen grade applied over the 3D view: vignette, warm/cool split-tone,
// a whisper of chromatic aberration at the edges, and animated grain.
shader_type canvas_item;

uniform sampler2D screen_tex : hint_screen_texture, filter_linear_mipmap;

uniform float vignette_strength : hint_range(0.0, 2.0) = 0.85;
uniform float vignette_softness : hint_range(0.1, 2.0) = 0.65;
uniform float aberration : hint_range(0.0, 6.0) = 1.4;
uniform float grain_amount : hint_range(0.0, 0.2) = 0.028;
uniform float shadow_tint_amount : hint_range(0.0, 1.0) = 0.3;
uniform vec3 shadow_tint : source_color = vec3(0.16, 0.24, 0.45);
uniform vec3 highlight_tint : source_color = vec3(1.0, 0.87, 0.72);
uniform float damage_flash : hint_range(0.0, 1.0) = 0.0;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void fragment() {
	vec2 uv = SCREEN_UV;
	vec2 centered = uv - vec2(0.5);
	float dist = length(centered) * 1.4142;

	// Lenses smear colour apart toward the edge of the frame
	float ab = aberration * dist * dist * 0.002;
	vec3 col;
	col.r = texture(screen_tex, uv + centered * ab).r;
	col.g = texture(screen_tex, uv).g;
	col.b = texture(screen_tex, uv - centered * ab).b;

	// Split-tone: cool the shadows, warm the highlights
	float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
	vec3 graded = col * mix(shadow_tint * 2.0, highlight_tint, smoothstep(0.0, 0.55, luma));
	col = mix(col, graded, shadow_tint_amount);

	// Vignette
	float vig = smoothstep(1.0, 1.0 - vignette_softness, dist);
	col *= mix(1.0, vig, vignette_strength);

	// Animated film grain, heavier in the dark where banding shows
	float g = hash(uv * vec2(1024.0, 1024.0) + fract(TIME) * 91.7) - 0.5;
	col += g * grain_amount * (1.35 - luma);

	// Hit feedback bleeds red in from the frame edges only — the HUD already
	// does a flat flash, so this must stay out of the middle of the screen
	col = mix(col, vec3(0.5, 0.02, 0.02), damage_flash * smoothstep(0.3, 1.0, dist) * 0.7);

	COLOR = vec4(max(col, vec3(0.0)), 1.0);
}
