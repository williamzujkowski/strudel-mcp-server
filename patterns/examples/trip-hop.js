// Example: Trip Hop
// Genre: Trip Hop / Downtempo
// Style: Portishead, Massive Attack, Flying Lotus
// Tempo: 90 BPM
// Key: D minor

setcps(90/60/2)

stack(
  // === DRUMS - Slow, heavy, dusty ===
  
  // Main beat - half time feel
  s("bd ~ [~ bd] ~ bd ~ ~ ~")
    .gain(0.85)
    .lpf(150)
    .room(0.3),

  // Snare - heavy with room
  s("~ ~ ~ ~ sd ~ ~ ~")
    .bank("RolandTR808")
    .gain(0.75)
    .room(0.5)
    .size(0.6),

  // Ghost snares
  s("~ ~ ~ sd:3? ~ ~ sd:2? ~")
    .bank("RolandTR808")
    .gain(0.2)
    .room(0.4),

  // Dusty hats
  s("hh*8")
    .gain(perlin.range(0.15, 0.3))
    .hpf(5000)
    .room(0.3)
    .pan(perlin.range(0.3, 0.7).slow(4)),

  // === BASS - Deep and moody ===
  note("<d1 ~ ~ d1> <~ g1 ~ ~> <a1 ~ d1 ~> <~ ~ g1 ~>")
    .s("sine")
    .gain(0.7)
    .lpf(120)
    .attack(0.02)
    .decay(0.3)
    .sustain(0.6)
    .release(0.8)
    .room(0.3),

  // === KEYS - Dark Rhodes ===
  chord("<Dm7 Gm7 Am7 Cmaj7>/4")
    .dict('ireal')
    .voicing()
    .s("gm_epiano1")
    .gain(0.25)
    .room(0.5)
    .lpf(2500)
    .delay(0.4)
    .delaytime(0.666)
    .delayfeedback(0.35),

  // === ATMOSPHERE - Dark pad ===
  chord("<Dm7 Gm7>/8")
    .dict('ireal')
    .voicing()
    .s("sawtooth")
    .attack(3)
    .sustain(0.6)
    .release(4)
    .lpf(sine.range(300, 800).slow(16))
    .lpq(0.5)
    .gain(0.12)
    .room(0.8)
    .size(0.9),

  // === TEXTURE - Vinyl crackle vibe ===
  s("hh:8*16")
    .gain(0.03)
    .hpf(8000)
    .room(0.2)
)
