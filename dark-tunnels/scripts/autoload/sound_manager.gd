extends Node

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS

func play_sound(type: String) -> void:
	var player := AudioStreamPlayer.new()
	player.bus = "Master"
	add_child(player)

	var stream := AudioStreamWAV.new()
	stream.mix_rate = 44100
	stream.stereo = false
	stream.format = AudioStreamWAV.FORMAT_8_BITS

	var samples: PackedByteArray
	match type:
		"hit":
			# Meaty impact - layered noise burst + low thud
			samples = _generate_impact(0.15, 44100, 120, 0.5)
		"player_hit":
			# Painful thump with body resonance
			samples = _generate_body_hit(0.2, 44100, 0.55)
		"sword":
			# Metallic swoosh + ring
			samples = _generate_sword_swing(0.18, 44100, 0.35)
		"axe":
			# Heavy chop - low thud + crack
			samples = _generate_heavy_chop(0.25, 44100, 0.5)
		"fireball":
			# Whooshing flame burst
			samples = _generate_fire(0.3, 44100, 0.45)
		"icebolt":
			# Crystalline shatter + chime
			samples = _generate_ice(0.2, 44100, 0.35)
		"lightning":
			# Electric crackle + thunder
			samples = _generate_thunder(0.25, 44100, 0.55)
		"shield":
			# Resonant hum rising
			samples = _generate_magic_hum(0.4, 44100, 350, 700, 0.35)
		"pickup":
			# Bright chime
			samples = _generate_chime(0.12, 44100, 880, 0.3)
		"gold":
			# Coin clink
			samples = _generate_coin(0.1, 44100, 0.3)
		"door":
			# Heavy stone grind
			samples = _generate_stone_grind(0.4, 44100, 0.35)
		"chest":
			# Wooden creak + latch
			samples = _generate_creak(0.25, 44100, 0.3)
		"potion":
			# Liquid gulp + cork
			samples = _generate_gulp(0.2, 44100, 0.35)
		"death":
			# Deep descending drone
			samples = _generate_death(0.7, 44100, 0.5)
		"boss_roar":
			# Massive low roar with harmonics
			samples = _generate_roar(0.6, 44100, 0.6)
		"level_up":
			# Triumphant ascending fanfare
			samples = _generate_fanfare(0.4, 44100, 0.4)
		_:
			samples = _generate_impact(0.1, 44100, 200, 0.3)

	stream.data = samples
	player.stream = stream
	player.play()
	player.finished.connect(player.queue_free)

# --- Realistic sound generators ---

func _generate_impact(dur: float, rate: int, freq: float, vol: float) -> PackedByteArray:
	var count := int(dur * rate)
	var buf := PackedByteArray()
	buf.resize(count)
	for i in range(count):
		var t := float(i) / rate
		var env := exp(-t * 20.0)  # Fast exponential decay
		var body := sin(t * freq * TAU) * 0.6
		var crack := (randf() * 2.0 - 1.0) * exp(-t * 40.0) * 0.4
		var val := (body + crack) * vol * env
		buf[i] = int(clampf((val + 1.0) * 0.5 * 255, 0, 255))
	return buf

func _generate_body_hit(dur: float, rate: int, vol: float) -> PackedByteArray:
	var count := int(dur * rate)
	var buf := PackedByteArray()
	buf.resize(count)
	for i in range(count):
		var t := float(i) / rate
		var env := exp(-t * 12.0)
		var thud := sin(t * 80 * TAU) * 0.5
		var flesh := sin(t * 180 * TAU) * 0.2 * exp(-t * 25.0)
		var noise := (randf() * 2.0 - 1.0) * 0.3 * exp(-t * 30.0)
		var val := (thud + flesh + noise) * vol * env
		buf[i] = int(clampf((val + 1.0) * 0.5 * 255, 0, 255))
	return buf

func _generate_sword_swing(dur: float, rate: int, vol: float) -> PackedByteArray:
	var count := int(dur * rate)
	var buf := PackedByteArray()
	buf.resize(count)
	for i in range(count):
		var t := float(i) / rate
		var prog := t / dur
		# Swoosh (filtered noise rising then falling)
		var swoosh_env := sin(prog * PI) * exp(-t * 5.0)
		var swoosh := (randf() * 2.0 - 1.0) * swoosh_env * 0.4
		# Metallic ring
		var ring := sin(t * 2200 * TAU) * 0.3 * exp(-t * 15.0)
		ring += sin(t * 3300 * TAU) * 0.15 * exp(-t * 20.0)
		var val := (swoosh + ring) * vol
		buf[i] = int(clampf((val + 1.0) * 0.5 * 255, 0, 255))
	return buf

func _generate_heavy_chop(dur: float, rate: int, vol: float) -> PackedByteArray:
	var count := int(dur * rate)
	var buf := PackedByteArray()
	buf.resize(count)
	for i in range(count):
		var t := float(i) / rate
		var env := exp(-t * 8.0)
		var thud := sin(t * 60 * TAU) * 0.5 * exp(-t * 15.0)
		var crack := (randf() * 2.0 - 1.0) * 0.4 * exp(-t * 25.0)
		var ring := sin(t * 800 * TAU) * 0.15 * exp(-t * 12.0)
		var val := (thud + crack + ring) * vol * env
		buf[i] = int(clampf((val + 1.0) * 0.5 * 255, 0, 255))
	return buf

func _generate_fire(dur: float, rate: int, vol: float) -> PackedByteArray:
	var count := int(dur * rate)
	var buf := PackedByteArray()
	buf.resize(count)
	var phase := 0.0
	for i in range(count):
		var t := float(i) / rate
		var prog := t / dur
		var env := sin(prog * PI * 0.7) * exp(-t * 3.0)
		# Crackling noise + low whoosh
		var whoosh := sin(t * 120 * TAU + sin(t * 30 * TAU) * 2.0) * 0.3
		var crackle := (randf() * 2.0 - 1.0) * 0.5
		# Filter the crackle based on time
		phase = phase * 0.85 + crackle * 0.15
		var val := (whoosh + phase) * vol * env
		buf[i] = int(clampf((val + 1.0) * 0.5 * 255, 0, 255))
	return buf

func _generate_ice(dur: float, rate: int, vol: float) -> PackedByteArray:
	var count := int(dur * rate)
	var buf := PackedByteArray()
	buf.resize(count)
	for i in range(count):
		var t := float(i) / rate
		var env := exp(-t * 6.0)
		# High crystalline tones
		var crystal := sin(t * 2400 * TAU) * 0.25
		crystal += sin(t * 3600 * TAU) * 0.15
		crystal += sin(t * 1800 * TAU) * 0.1
		# Shatter noise
		var shatter := (randf() * 2.0 - 1.0) * 0.3 * exp(-t * 20.0)
		var val := (crystal + shatter) * vol * env
		buf[i] = int(clampf((val + 1.0) * 0.5 * 255, 0, 255))
	return buf

func _generate_thunder(dur: float, rate: int, vol: float) -> PackedByteArray:
	var count := int(dur * rate)
	var buf := PackedByteArray()
	buf.resize(count)
	var filtered := 0.0
	for i in range(count):
		var t := float(i) / rate
		var env := exp(-t * 5.0)
		# Electric zap
		var zap := sin(t * 4000 * TAU + sin(t * 200 * TAU) * 8.0) * 0.3 * exp(-t * 15.0)
		# Thunder rumble (filtered noise)
		var noise := (randf() * 2.0 - 1.0)
		filtered = filtered * 0.92 + noise * 0.08
		var rumble := filtered * 0.5 * env
		var val := (zap + rumble) * vol
		buf[i] = int(clampf((val + 1.0) * 0.5 * 255, 0, 255))
	return buf

func _generate_magic_hum(dur: float, rate: int, f0: float, f1: float, vol: float) -> PackedByteArray:
	var count := int(dur * rate)
	var buf := PackedByteArray()
	buf.resize(count)
	for i in range(count):
		var t := float(i) / rate
		var prog := t / dur
		var freq := lerpf(f0, f1, prog)
		var env := sin(prog * PI) * 0.8 + 0.2
		env *= (1.0 - prog * 0.3)
		var val := sin(t * freq * TAU) * 0.4
		val += sin(t * freq * 1.5 * TAU) * 0.2
		val += sin(t * freq * 2.0 * TAU) * 0.1
		buf[i] = int(clampf((val * vol * env + 1.0) * 0.5 * 255, 0, 255))
	return buf

func _generate_chime(dur: float, rate: int, freq: float, vol: float) -> PackedByteArray:
	var count := int(dur * rate)
	var buf := PackedByteArray()
	buf.resize(count)
	for i in range(count):
		var t := float(i) / rate
		var env := exp(-t * 10.0)
		var val := sin(t * freq * TAU) * 0.4 + sin(t * freq * 2.0 * TAU) * 0.2
		buf[i] = int(clampf((val * vol * env + 1.0) * 0.5 * 255, 0, 255))
	return buf

func _generate_coin(dur: float, rate: int, vol: float) -> PackedByteArray:
	var count := int(dur * rate)
	var buf := PackedByteArray()
	buf.resize(count)
	for i in range(count):
		var t := float(i) / rate
		var env := exp(-t * 18.0)
		var val := sin(t * 3500 * TAU) * 0.3 + sin(t * 5200 * TAU) * 0.2
		val += (randf() * 2.0 - 1.0) * 0.15 * exp(-t * 40.0)
		buf[i] = int(clampf((val * vol * env + 1.0) * 0.5 * 255, 0, 255))
	return buf

func _generate_stone_grind(dur: float, rate: int, vol: float) -> PackedByteArray:
	var count := int(dur * rate)
	var buf := PackedByteArray()
	buf.resize(count)
	var filtered := 0.0
	for i in range(count):
		var t := float(i) / rate
		var prog := t / dur
		var env := sin(prog * PI)
		var noise := (randf() * 2.0 - 1.0)
		filtered = filtered * 0.95 + noise * 0.05
		var grind := filtered * 0.6 + sin(t * 60 * TAU) * 0.2
		buf[i] = int(clampf((grind * vol * env + 1.0) * 0.5 * 255, 0, 255))
	return buf

func _generate_creak(dur: float, rate: int, vol: float) -> PackedByteArray:
	var count := int(dur * rate)
	var buf := PackedByteArray()
	buf.resize(count)
	for i in range(count):
		var t := float(i) / rate
		var prog := t / dur
		var env := sin(prog * PI * 0.8) * exp(-t * 2.0)
		# Creaking = FM synthesis
		var creak := sin(t * 300 * TAU + sin(t * 5 * TAU) * 4.0) * 0.4
		creak += sin(t * 450 * TAU + sin(t * 7 * TAU) * 3.0) * 0.2
		var click := (randf() * 2.0 - 1.0) * 0.3 * exp(-t * 30.0)
		buf[i] = int(clampf(((creak + click) * vol * env + 1.0) * 0.5 * 255, 0, 255))
	return buf

func _generate_gulp(dur: float, rate: int, vol: float) -> PackedByteArray:
	var count := int(dur * rate)
	var buf := PackedByteArray()
	buf.resize(count)
	for i in range(count):
		var t := float(i) / rate
		# Liquid bubble sound
		var bubble_freq := 400.0 + sin(t * 8.0 * TAU) * 200.0
		var env := exp(-t * 5.0)
		var liquid := sin(t * bubble_freq * TAU) * 0.3
		# Cork pop at start
		var pop := sin(t * 1200 * TAU) * 0.4 * exp(-t * 40.0)
		buf[i] = int(clampf(((liquid + pop) * vol * env + 1.0) * 0.5 * 255, 0, 255))
	return buf

func _generate_death(dur: float, rate: int, vol: float) -> PackedByteArray:
	var count := int(dur * rate)
	var buf := PackedByteArray()
	buf.resize(count)
	var filtered := 0.0
	for i in range(count):
		var t := float(i) / rate
		var prog := t / dur
		var freq := lerpf(250, 40, prog * prog)
		var env := 1.0 - prog * 0.7
		var drone := sin(t * freq * TAU) * 0.4
		drone += sin(t * freq * 0.5 * TAU) * 0.3
		var noise := (randf() * 2.0 - 1.0)
		filtered = filtered * 0.96 + noise * 0.04
		var rumble := filtered * 0.2 * env
		buf[i] = int(clampf(((drone + rumble) * vol * env + 1.0) * 0.5 * 255, 0, 255))
	return buf

func _generate_roar(dur: float, rate: int, vol: float) -> PackedByteArray:
	var count := int(dur * rate)
	var buf := PackedByteArray()
	buf.resize(count)
	var filtered := 0.0
	for i in range(count):
		var t := float(i) / rate
		var prog := t / dur
		var env := sin(prog * PI * 0.6) * exp(-t * 1.5)
		# Deep growl with harmonics
		var growl := sin(t * 55 * TAU + sin(t * 3 * TAU) * 2.0) * 0.35
		growl += sin(t * 110 * TAU) * 0.2
		growl += sin(t * 165 * TAU) * 0.1
		# Rumble noise
		var noise := (randf() * 2.0 - 1.0)
		filtered = filtered * 0.93 + noise * 0.07
		var val := (growl + filtered * 0.3) * vol * env
		buf[i] = int(clampf((val + 1.0) * 0.5 * 255, 0, 255))
	return buf

func _generate_fanfare(dur: float, rate: int, vol: float) -> PackedByteArray:
	var count := int(dur * rate)
	var buf := PackedByteArray()
	buf.resize(count)
	# Three ascending notes
	var notes := [440.0, 554.0, 660.0, 880.0]
	for i in range(count):
		var t := float(i) / rate
		var prog := t / dur
		var note_idx := mini(int(prog * notes.size()), notes.size() - 1)
		var freq: float = notes[note_idx]
		var note_t := fmod(prog * notes.size(), 1.0)
		var env := (1.0 - note_t * 0.3) * (1.0 - prog * 0.2)
		var val := sin(t * freq * TAU) * 0.35
		val += sin(t * freq * 2.0 * TAU) * 0.15
		val += sin(t * freq * 3.0 * TAU) * 0.08
		buf[i] = int(clampf((val * vol * env + 1.0) * 0.5 * 255, 0, 255))
	return buf
