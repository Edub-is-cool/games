extends Node3D

const ACTIVE_DIST := 26.0        # beyond this, the torch stops animating
const SPARK_DIST := 14.0         # beyond this, sparks are hidden
const SHADOW_DIST := 10.0        # a torch must be at least this close to be considered
const MAX_SHADOW_TORCHES := 2    # ...and only the nearest few actually pay for shadows

# Shadow-casting omni lights are by far the most expensive thing in the scene,
# and their cost is unbounded if every torch in a room casts. Instead all
# torches register here and the nearest couple to the player get the budget.
static var _all: Array = []
static var _budget_timer: float = 0.0

@onready var ember: MeshInstance3D = $Ember
@onready var flame: MeshInstance3D = $Flame
@onready var flame_outer: MeshInstance3D = $FlameOuter
@onready var flame_core: MeshInstance3D = $FlameCore
@onready var torch_light: OmniLight3D = $TorchLight
@onready var glow_light: OmniLight3D = $GlowLight
@onready var sparks: CPUParticles3D = $Sparks

var ember_timer: float = 0.0
var flicker_seed: float = 0.0
var base_energy: float = 2.8
var base_glow_energy: float = 1.0
var cull_timer: float = 0.0
var active: bool = true
# The flame meshes are authored pre-stretched, so animation has to multiply
# these rather than assign scale outright
var flame_base: Vector3
var flame_outer_base: Vector3
var flame_core_base: Vector3

func _ready() -> void:
	ember_timer = randf() * TAU
	flicker_seed = randf() * 100.0
	base_energy = torch_light.light_energy
	base_glow_energy = glow_light.light_energy
	flame_base = flame.scale
	flame_outer_base = flame_outer.scale
	flame_core_base = flame_core.scale
	_all.append(self)
	# Stagger the culling checks so they don't all land on the same frame
	cull_timer = randf() * 0.4

func _exit_tree() -> void:
	_all.erase(self)

func _process(delta: float) -> void:
	# One torch drives the shared shadow budget for all of them
	if _all.size() > 0 and _all[0] == self:
		_tick_shadow_budget(delta)

	cull_timer -= delta
	if cull_timer <= 0.0:
		cull_timer = 0.4
		_update_culling()
	if not active:
		return

	ember_timer += delta * 3.0
	var t := ember_timer + flicker_seed

	# Layered sine "noise" — irregular enough to read as a real guttering flame
	var flicker := sin(t * 6.1) * 0.32
	flicker += sin(t * 11.3 + 1.7) * 0.18
	flicker += sin(t * 19.7 + 4.1) * 0.09
	flicker += sin(t * 2.3) * 0.12

	torch_light.light_energy = base_energy * clampf(1.0 + flicker * 0.42, 0.55, 1.45)
	glow_light.light_energy = base_glow_energy * clampf(1.0 + flicker * 0.3, 0.6, 1.4)

	# The light source drifts slightly with the flame
	torch_light.position.x = sin(t * 4.3) * 0.025
	torch_light.position.z = 0.05 + cos(t * 3.1) * 0.02

	# Flame body breathes and leans
	var pulse := 1.0 + flicker * 0.12
	flame.scale = flame_base * Vector3(pulse, 1.0 + flicker * 0.2, pulse)
	flame_outer.scale = flame_outer_base * Vector3(1.0 + flicker * 0.09, 1.0 + flicker * 0.26, 1.0 + flicker * 0.09)
	flame_core.scale = flame_core_base * Vector3(1.0 - flicker * 0.08, 1.0 + flicker * 0.3, 1.0 - flicker * 0.08)
	flame.position.x = sin(t * 3.7) * 0.012
	flame_outer.position.x = sin(t * 3.7 + 0.4) * 0.018
	flame_outer.rotation.z = sin(t * 2.6) * 0.09

	var ex := sin(ember_timer * 0.7) * 0.04
	var ey := 1.18 + sin(ember_timer) * 0.03
	var ez := cos(ember_timer * 0.9) * 0.03
	ember.position = Vector3(ex, ey, ez)

func _update_culling() -> void:
	var player := GameManager.player
	if not is_instance_valid(player):
		return
	var d := global_position.distance_to(player.global_position)
	active = d < ACTIVE_DIST
	var want_sparks := d < SPARK_DIST
	if sparks.emitting != want_sparks:
		sparks.emitting = want_sparks
		sparks.visible = want_sparks

	if not active:
		# Park the lights at their nominal brightness while dormant
		torch_light.light_energy = base_energy
		glow_light.light_energy = base_glow_energy

static func _tick_shadow_budget(delta: float) -> void:
	_budget_timer -= delta
	if _budget_timer > 0.0:
		return
	_budget_timer = 0.35

	var player := GameManager.player
	if not is_instance_valid(player):
		return
	var origin := player.global_position

	var candidates: Array = []
	for t in _all:
		if not is_instance_valid(t):
			continue
		var d: float = t.global_position.distance_to(origin)
		if d < SHADOW_DIST:
			candidates.append({"torch": t, "dist": d})
		elif t.torch_light.shadow_enabled:
			t.torch_light.shadow_enabled = false

	candidates.sort_custom(func(a, b): return a["dist"] < b["dist"])
	for i in range(candidates.size()):
		var light: OmniLight3D = candidates[i]["torch"].torch_light
		var want: bool = i < MAX_SHADOW_TORCHES
		if light.shadow_enabled != want:
			light.shadow_enabled = want
