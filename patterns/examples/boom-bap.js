// Example: Boom Bap
// Genre: Boom Bap / Golden Era Hip Hop
// Style: DJ Premier, Alchemist, Daringer, Hit-Boy
// Tempo: 92 BPM
// Key: E minor

setcps(92/60/2)

stack(
  // === DRUMS - Hard hitting, swing ===
  
  // Main kick pattern
  s("bd ~ ~ [~ bd] sd ~ ~ ~, bd ~ ~ bd sd ~ [bd bd] ~")
    .gain(0.9)
    .lpf(200)
    .room(0.15),

  // Layered snare for crack
  s("~ ~ ~ ~ sd:3 ~ ~ ~")
    .gain(0.35)
    .hpf(200)
    .room(0.25),

  // Crispy hats
  s("[~ hh]*8")
    .gain(0.5)
    .hpf(4000)
    .room(0.2),

  // Open hat accents
  s("~ ~ oh ~ ~ ~ ~ oh:2")
    .gain(0.3)
    .room(0.35)
    .cut(1),

  // === BASS - Punchy and warm ===
  note("<e1 ~ e1 ~> <e1 a1 ~ ~> <e1 ~ b1 ~> <a1 ~ e1 ~>")
    .s("sawtooth")
    .gain(0.65)
    .lpf(180)
    .attack(0.01)
    .decay(0.15)
    .sustain(0.4)
    .release(0.3),

  // === CHOPS - Soul sample style ===
  chord("<Em7 ~ Am7 ~> <Dmaj7 ~ Gmaj7 ~>/2")
    .dict('ireal')
    .voicing()
    .s("gm_epiano1")
    .gain(0.4)
    .room(0.3)
    .lpf(3000)
    .hpf(200),

  // === STRINGS - Cinematic stabs ===
  chord("<Em7 ~ ~ ~> <~ ~ Am7 ~>/4")
    .dict('ireal')
    .voicing()
    .s("gm_strings")
    .struct("1 ~ ~ ~ ~ 1? ~ ~")
    .attack(0.1)
    .release(0.8)
    .gain(0.25)
    .room(0.4)
    .lpf(4000)
    .hpf(300),

  // === HORNS - Optional stab ===
  note("<e4 g4 a4 e4>/8")
    .s("gm_brass")
    .struct("~ ~ ~ ~ 1 ~ ~ ~")
    .gain(0.2)
    .room(0.3)
    .lpf(3500)
).swing(0.08)
