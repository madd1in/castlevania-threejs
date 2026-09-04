# CASTLEVANIA — Shadow of the Crimson Moon

Ein Castlevania-Fan-Tribute als 2.5D-Action-Platformer, komplett in **Three.js** — kein Build-Schritt,
keine Assets, keine Abhängigkeiten außer three.js von einem CDN. Alle Grafiken (Steintexturen, Holz,
Spinnweben, Mondstrahlen), die gesamte Musik und alle Soundeffekte werden zur Laufzeit prozedural erzeugt.

## Spielen

**→ [Jetzt im Browser spielen](https://madd1in.github.io/castlevania-threejs/)**

Oder lokal: `index.html` im Browser öffnen (Doppelklick reicht — kein Server nötig).

## Steuerung

| Taste | Aktion |
|---|---|
| `A` / `D` oder `←` / `→` | Laufen |
| `↑` / `W` / `Leertaste` | Springen (halten = höher) |
| 2× Sprung | **Doppelsprung** |
| `J` oder `Z` | Peitsche |
| `K` oder `X` | Subwaffe werfen (kostet Herzen) |
| `S` / `↓` | Ducken (unter Medusenköpfen durch) |
| `S` + Sprung | Durch Holzplattform nach unten |
| `P` | Pause · `M` Musik an/aus · `R` Neustart |

Sprung mit **Coyote-Time** (kurze Gnadenfrist nach der Kante) und **Input-Buffering** —
ein etwas zu früh gedrückter Sprung geht nicht verloren.

## Spielinhalt

**4 Zonen, ein durchgehendes Level (~270 Einheiten):**

1. **Courtyard** — Burghof im Gewitter unter dem blutroten Mond: Regen, Blitze mit Donner, Kisten, Stachelgrube, Aufgang zur Wehrmauer
2. **Great Hall** — Kirchenfenster mit einfallenden Mondstrahlen, Staubflocken, Kronleuchter, Banner, Spinnweben, Holzbalkone. Am Ende: **Zwischenboss**
3. **The Chasm** — Abgrund über festen *und* beweglichen Hängeplattformen, Medusenköpfe im Anflug
4. **Throne Room** — das Tor fällt hinter dir zu, Endkampf

**Gegner:** Fledermaus (hängt schlafend, wacht auf), Zombie, Skelett (wirft Knochen),
Medusenkopf (Sinuskurve), Axe Armor, Fleaman (springt), Geist (fliegt durch Wände).

**Zwischenboss — Giant Bat:** kreist über der Halle, stößt im Sturzflug auf dich herab und
beschwört dabei kleine Fledermäuse. Belohnung: Peitschen-Upgrade, Fleisch und ein großes Herz.

**Endboss — Graf Dracula:** teleportiert zwischen sechs Positionen und feuert gefächerte Feuerbälle.
Ab 50 % HP Phase 2: schneller, fünf Feuerbälle statt drei, beschwört Fledermäuse.

**Subwaffen:** Dolch (1 ♥), Axt (2 ♥, Wurfbogen), Kreuz (3 ♥, kommt als Bumerang zurück),
**Weihwasser** (3 ♥, zerschellt zu einer brennenden Lache) und **Stoppuhr** (5 ♥, friert 4,5 s
lang alle Gegner und Geschosse ein).

**Items aus Kerzen (peitschen!):** Herzen, großes Herz, Geldbeutel (1000 Punkte),
Fleisch (Heilung), alle Subwaffen, Peitschen-Upgrade.

**Peitschen-Stufen:** Leather → Chain → Morning Star (mehr Reichweite und Schaden).

**Sonstiges:** Combo-Multiplikator bis ×5, Bestenliste in `localStorage`, 5 Leben,
5 Checkpoints, Hit-Stop bei Treffern, Knockback mit Unverwundbarkeits-Blinken,
Screenshake, Partikel und Schockwellen-Ringe, dynamische Fackel-Lichter, Parallax in
vier Ebenen, Vignette und Scanline-Grading.

## Audio

Alles per WebAudio synthetisiert — **sechs eigene Chiptune-Themen** (Titel, Courtyard, Great Hall,
Chasm, Zwischenboss, Dracula) mit Bass, Sub-Bass, Arpeggio, Lead mit Detune-Layer und
tempo-synchronem Feedback-Delay, plus Kick, Snare und Hi-Hat. Dazu rund 20 Soundeffekte
(Peitschenknall als gefilterter Rauschimpuls, Donner, Fledermaus-Schrei, Feuerball …).
Themenwechsel erfolgen taktsynchron am Loop-Anfang. `M` schaltet um.

## Struktur

```
index.html      HUD, Screens, Post-Overlays, Styles
js/core.js      Konstanten, Eingabe, Audio-Engine + Sequencer + Themen
js/world.js     Renderer, prozedurale Texturen, Level-Geometrie, Wetter, Tore, Partikel
js/entities.js  Kollision, Spieler, Peitsche, Gegner, Projektile, Items, beide Bosse
js/game.js      Spawns, Kamera, Zustandsautomat, HUD, Hauptschleife
```

---

Fan-Projekt ohne kommerzielle Absicht. *Castlevania* ist eine Marke von Konami;
dieses Spiel enthält keinerlei Original-Assets.
