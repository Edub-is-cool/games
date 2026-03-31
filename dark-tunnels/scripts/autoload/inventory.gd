extends Node

signal gold_changed(amount: int)
signal inventory_changed
signal weapon_changed(weapon_name: String)
signal spell_changed(spell_name: String)

var gold: int = 0
var keys: int = 0
var health_potions: int = 0
var mana_potions: int = 0
var current_weapon: String = "fist" # fist, sword, axe, staff
var current_spell: String = "fireball" # fireball, icebolt, lightning, shield
var has_shield: bool = false
var shield_timer: float = 0.0

# Weapon stats: {damage, speed, range}
var weapon_stats: Dictionary = {
	"fist": {"damage": 25, "speed": 0.5, "range": 2.5},
	"sword": {"damage": 35, "speed": 0.4, "range": 2.8},
	"axe": {"damage": 55, "speed": 0.9, "range": 2.5},
	"staff": {"damage": 20, "speed": 0.5, "range": 3.0, "mana_bonus": 30},
	"bow": {"damage": 30, "speed": 0.7, "range": 50.0, "ranged": true},
	"flail": {"damage": 48, "speed": 0.7, "range": 3.2},
	"crossbow": {"damage": 50, "speed": 1.2, "range": 50.0, "ranged": true, "pierce": true},
	"daggers": {"damage": 15, "speed": 0.2, "range": 30.0, "ranged": true, "burst": 3},
	"warhammer": {"damage": 70, "speed": 1.3, "range": 2.3, "stun": 1.0},
	"spear": {"damage": 28, "speed": 0.45, "range": 4.0},
}

var spell_stats: Dictionary = {
	"fireball": {"damage": 35, "mana_cost": 20, "color": Color(1, 0.5, 0)},
	"icebolt": {"damage": 20, "mana_cost": 15, "color": Color(0.3, 0.7, 1), "slow_duration": 3.0},
	"lightning": {"damage": 45, "mana_cost": 35, "color": Color(1, 1, 0.3), "chain_count": 3},
	"shield": {"damage": 0, "mana_cost": 25, "color": Color(0.3, 1, 0.5), "duration": 8.0},
}

var owned_weapons: Array[String] = ["fist"]
var owned_spells: Array[String] = ["fireball"]

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS

func _process(delta: float) -> void:
	if has_shield:
		shield_timer -= delta
		if shield_timer <= 0:
			has_shield = false

func add_gold(amount: int) -> void:
	gold += amount
	gold_changed.emit(gold)

func spend_gold(amount: int) -> bool:
	if gold >= amount:
		gold -= amount
		gold_changed.emit(gold)
		return true
	return false

func add_key() -> void:
	keys += 1
	inventory_changed.emit()

func use_key() -> bool:
	if keys > 0:
		keys -= 1
		inventory_changed.emit()
		return true
	return false

func add_health_potion() -> void:
	health_potions += 1
	inventory_changed.emit()

func add_mana_potion() -> void:
	mana_potions += 1
	inventory_changed.emit()

func use_health_potion(player: CharacterBody3D) -> bool:
	if health_potions > 0:
		health_potions -= 1
		player.heal(40)
		inventory_changed.emit()
		return true
	return false

func use_mana_potion(player: CharacterBody3D) -> bool:
	if mana_potions > 0:
		mana_potions -= 1
		player.restore_mana(40)
		inventory_changed.emit()
		return true
	return false

func add_weapon(weapon_name: String) -> void:
	if weapon_name not in owned_weapons:
		owned_weapons.append(weapon_name)
	current_weapon = weapon_name
	weapon_changed.emit(weapon_name)
	inventory_changed.emit()

func add_spell(spell_name: String) -> void:
	if spell_name not in owned_spells:
		owned_spells.append(spell_name)
	inventory_changed.emit()

func get_weapon_damage() -> int:
	return weapon_stats[current_weapon]["damage"]

func get_weapon_speed() -> float:
	return weapon_stats[current_weapon]["speed"]

func get_weapon_range() -> float:
	return weapon_stats[current_weapon]["range"]

func get_mana_bonus() -> int:
	if weapon_stats[current_weapon].has("mana_bonus"):
		return weapon_stats[current_weapon]["mana_bonus"]
	return 0

func get_damage_reduction() -> float:
	return 0.5 if has_shield else 0.0

func cycle_spell() -> void:
	var idx := owned_spells.find(current_spell)
	idx = (idx + 1) % owned_spells.size()
	current_spell = owned_spells[idx]
	spell_changed.emit(current_spell)

func cycle_weapon() -> void:
	var idx := owned_weapons.find(current_weapon)
	idx = (idx + 1) % owned_weapons.size()
	current_weapon = owned_weapons[idx]
	weapon_changed.emit(current_weapon)

func select_weapon(index: int) -> void:
	if index >= 0 and index < owned_weapons.size():
		current_weapon = owned_weapons[index]
		weapon_changed.emit(current_weapon)

func reset() -> void:
	gold = 0
	keys = 0
	health_potions = 0
	mana_potions = 0
	current_weapon = "fist"
	current_spell = "fireball"
	has_shield = false
	shield_timer = 0.0
	owned_weapons = ["fist"]
	owned_spells = ["fireball"]
