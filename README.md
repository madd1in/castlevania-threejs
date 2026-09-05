# CASTLEVANIA — Shadow of the Crimson Moon

Ein Castlevania-Fan-Tribute als 2.5D-Action-Platformer, komplett in **Three.js** — kein Build-Schritt,
keine Assets, keine Abhängigkeiten außer three.js von einem CDN. Alle Grafiken (Steintexturen, Holz,
Spinnweben, Buntglas, Mondstrahlen), die gesamte Musik und alle Soundeffekte werden zur Laufzeit
prozedural erzeugt.

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

## Schwierigkeit

Im Titelbildschirm mit `←` / `→` wählbar:

| Modus | HP | Leben | Schaden | Boss-HP |
|---|---|---|---|---|
| **FLEDGLING** (Standard) | 26 | 6 | halb | 60 % |
| **HUNTER** | 20 | 4 | normal | 100 % |
| **NIGHTMARE** | 16 | 2 | ×1,6 | 135 % |

## Spielinhalt

**4 Zonen, ein durchgehendes Level (~270 Einheiten):**

1. **Courtyard** — Burghof im Gewitter unter dem blutroten Mond: Regen mit Aufschlagspritzern,
   Blitze mit Donner, wirbelndes Laub, Kisten, Stachelgrube, Aufgang zur Wehrmauer
2. **Great Hall** — Kirchenfenster mit einfallenden Mondstrahlen, Staubflocken, Kronleuchter,
   Banner, Spinnweben, Holzbalkone. Am Ende: **Zwischenboss**
3. **The Chasm** — Abgrund über festen *und* beweglichen Hängeplattformen, Medusenköpfe im Anflug
4. **Throne Room** — Rosenfenster aus Buntglas, roter Teppich, Kandelaber, polierter Boden.
   Das Tor fällt hinter dir zu: Endkampf

**Gegner:** Fledermaus (hängt schlafend, wacht auf), Zombie, Skelett (wirft Knochen),
Medusenkopf (Sinuskurve), Axe Armor, Fleaman (springt), Geist (fliegt durch Wände)
und **Bone Pillar** — ein festgewachsener Knochenturm, der Feuer in flachem Bogen spuckt.

**Zwischenboss — Giant Bat:** kreist über der Halle, **glüht kurz auf, bevor er im Sturzflug
herabstößt**, und beschwört dabei kleine Fledermäuse. Belohnung: Peitschen-Upgrade, Double Shot,
Fleisch und ein Kristall.

**Endboss — Graf Dracula:** teleportiert zwischen sechs Positionen (nie direkt neben dich),
**lädt sichtbar auf, bevor er feuert**, und bleibt nach jeder Salve fast eine Sekunde
verwundbar stehen. Bei 50 % HP wirft er Fleisch und ein großes Herz ab und geht in Phase 2.
**Seine Feuerbälle lassen sich mit der Peitsche aus der Luft schlagen.**
Während beider Bosskämpfe entzünden sich verbrauchte Arenakerzen nach und nach neu,
damit dir die Herzen nicht ausgehen.

**Subwaffen:** Dolch (1 ♥), Axt (2 ♥, Wurfbogen), Kreuz (3 ♥, Bumerang),
**Weihwasser** (3 ♥, zerschellt zu einer brennenden Lache) und **Stoppuhr** (5 ♥, friert
alle Gegner und Geschosse ein). Mit **Double / Triple Shot** wirfst du zwei bzw. drei auf einmal.

**Items aus Kerzen (peitschen!):** Herzen, großes Herz, Geldbeutel (1000 Punkte),
Fleisch (Heilung), alle Subwaffen, Schuss-Multiplikator, Peitschen-Upgrade.
Der **Kristall** löscht alle Gegner auf dem Bildschirm.

**Geheimnisse:** Zwei Mauerblöcke im Level haben feine Risse — peitsch sie ein und
du bekommst 1000 Punkte plus die versteckte Belohnung dahinter.
Alle **25 000 Punkte** gibt es ein Extraleben.

**Peitschen-Stufen:** Leather → Chain → Morning Star (mehr Reichweite und Schaden).

**Sonstiges:** Gewitter mit gezeichneten, verästelten Blitzbögen und Sternschnuppen,
schwingende Kronleuchter und Banner, Schutt und Geröll auf dem Boden,
Boss-Intro mit Namenstafel und Musik-Sting, Combo-Multiplikator bis ×5,
Bestenliste in `localStorage`, 5 Checkpoints, Hit-Stop bei Treffern, Knockback mit
Unverwundbarkeits-Blinken, Screenshake, Partikel und Schockwellen-Ringe, Glut an den Fackeln,
dynamische Fackel-Lichter, Parallax in vier Ebenen, Vignette und Scanline-Grading.
Bei wenig HP pulsiert der Bildschirmrand rot, ein Herzschlag setzt ein und die Musik
verdichtet sich.

## Audio

Alles per WebAudio synthetisiert — **acht eigene Chiptune-Themen** (Titel, Courtyard, Great Hall,
Chasm, Zwischenboss, Dracula, Victory, Game Over) mit Bass, Sub-Bass, Arpeggio, Lead mit
Detune-Layer und tempo-synchronem Feedback-Delay, Kirchenorgel-Pads in den Boss-Themen,
Kick, Snare, Hi-Hat und Tom-Fills am Phrasenende. Bei niedriger Gesundheit schaltet die Engine
in einen „Danger"-Modus: tiefe Drone, doppelte Hi-Hat-Dichte, durchgehende Fills.
Jedes Zonen-Thema hat zusätzlich eine **Gegenmelodie**, das Lead bekommt ein sanft
einschwingendes **Vibrato**, und unter allem liegt ein **Ambience-Bett** — Wind
im Freien, tiefes Hallenrauschen drinnen, mit langsamen Böen. Beim Zonenwechsel
spielt ein kurzes Jingle. Dazu rund 25 Soundeffekte (Peitschenknall als gefilterter
Rauschimpuls, Donner, Fledermaus-Schrei, Kristall-Arpeggio, Herzschlag …).
Themenwechsel erfolgen taktsynchron am Loop-Anfang. `M` schaltet um.

## Performance

Die Szene besteht aus vielen hundert kleinen Boxen. Beim Start werden alle
unbeweglichen davon pro Material zu je einem Mesh zusammengebacken, die Parallax-Ebenen
komplett abgeflacht und die Matrizen eingefroren; Partikel laufen über einen einzigen
`InstancedMesh`. Das drückt die Draw Calls von rund 190 auf etwa 110 und die
Objektzahl im Szenengraph von über 1000 auf rund 560.

Dazu kommt eine **adaptive Auflösung**: Die Renderskalierung wird laufend an die
gemessene Frame-Zeit angepasst (0,55× bis 2×), damit auch auf HiDPI-Displays
flüssige Bildraten herauskommen. Die aktuelle Rate steht im HUD.
Im Thronsaal fiel die Renderzeit dadurch von 14,1 ms auf 6,3 ms bei doppelter
Pixeldichte.

## Struktur

```
index.html      HUD, Screens, Post-Overlays, Styles
js/core.js      Konstanten, Schwierigkeitsgrade, Eingabe, Audio-Engine + Sequencer + Themen
js/world.js     Renderer, prozedurale Texturen, Level-Geometrie, Wetter, Tore, Partikel
js/entities.js  Kollision, Spieler, Peitsche, Gegner, Projektile, Items, beide Bosse
js/game.js      Spawns, Kamera, Zustandsautomat, HUD, Hauptschleife
```

---

Fan-Projekt ohne kommerzielle Absicht. *Castlevania* ist eine Marke von Konami;
dieses Spiel enthält keinerlei Original-Assets.
