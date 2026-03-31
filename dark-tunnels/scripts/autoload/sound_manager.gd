extends Node

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS

func play_sound(type: String) -> void:
	var player := AudioStreamPlayer.new()
	player.bus = "Master"
	add_child(player)

	var stream := AudioStreamWAV.new()
	stream.mix_rate = 22050
	stream.stereo = false
	stream.format = AudioStreamWAV.FORMAT_8_BITS

	var samples: PackedByteArray
	match type:
		"hit":
			samples = _generate_noise(0.1, 22050, 0.4)
		"player_hit":
			samples = _generate_tone(0.15, 22050, 200, 0.5)
		"sword":
			samples = _generate_sweep(0.12, 22050, 800, 400, 0.3)
		"axe":
			samples = _generate_tone(0.2, 22050, 150, 0.5)
		"fireball":
			samples = _generate_sweep(0.2, 22050, 600, 200, 0.4)
		"icebolt":
			samples = _generate_sweep(0.15, 22050, 1200, 800, 0.3)
		"lightning":
			samples = _generate_noise(0.15, 22050, 0.6)
		"shield":
			samples = _generate_sweep(0.3, 22050, 400, 800, 0.3)
		"pickup":
			samples = _generate_sweep(0.1, 22050, 600, 1200, 0.3)
		"gold":
			samples = _generate_sweep(0.08, 22050, 1000, 1500, 0.25)
		"door":
			samples = _generate_tone(0.3, 22050, 100, 0.3)
		"chest":
			samples = _generate_sweep(0.2, 22050, 300, 600, 0.25)
		"potion":
			samples = _generate_sweep(0.15, 22050, 500, 1000, 0.3)
		"death":
			samples = _generate_sweep(0.5, 22050, 400, 80, 0.5)
		"boss_roar":
			samples = _generate_tone(0.4, 22050, 80, 0.6)
		"level_up":
			samples = _generate_sweep(0.3, 22050, 400, 1200, 0.4)
		_:
			samples = _generate_noise(0.1, 22050, 0.3)

	stream.data = samples
	player.stream = stream
	player.play()
	player.finished.connect(player.queue_free)

func _generate_tone(duration: float, sample_rate: int, freq: float, volume: float) -> PackedByteArray:
	var count := int(duration * sample_rate)
	var samples := PackedByteArray()
	samples.resize(count)
	for i in range(count):
		var t := float(i) / sample_rate
		var envelope := 1.0 - (t / duration)
		var val := sin(t * freq * TAU) * volume * envelope
		samples[i] = int((val + 1.0) * 0.5 * 255)
	return samples

func _generate_sweep(duration: float, sample_rate: int, freq_start: float, freq_end: float, volume: float) -> PackedByteArray:
	var count := int(duration * sample_rate)
	var samples := PackedByteArray()
	samples.resize(count)
	for i in range(count):
		var t := float(i) / sample_rate
		var progress := t / duration
		var freq := lerpf(freq_start, freq_end, progress)
		var envelope := 1.0 - progress
		var val := sin(t * freq * TAU) * volume * envelope
		samples[i] = int((val + 1.0) * 0.5 * 255)
	return samples

func _generate_noise(duration: float, sample_rate: int, volume: float) -> PackedByteArray:
	var count := int(duration * sample_rate)
	var samples := PackedByteArray()
	samples.resize(count)
	for i in range(count):
		var t := float(i) / sample_rate
		var envelope := 1.0 - (t / duration)
		var val := (randf() * 2.0 - 1.0) * volume * envelope
		samples[i] = int((val + 1.0) * 0.5 * 255)
	return samples
