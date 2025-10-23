import express from "express";
import multer from "multer";
import MidiPkg from "@tonejs/midi"; // CommonJS -> importa como default
const { Midi } = MidiPkg;           // e destrutura o Midi

const app = express();
const upload = multer();

// endpoint para conversão do MIDI em JSON
app.post("/parse-midi", upload.single("file"), (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: "Envie um arquivo .mid no campo 'file' (form-data)." });
    }

    const midi = new Midi(req.file.buffer);

    const out = {
      meta: {
        bpm: midi.header.tempos?.[0]?.bpm ?? 120,
        time_sig:
          midi.header.timeSignatures?.[0]?.timeSignature?.join("/") ?? "4/4",
        ticks_per_beat: midi.header.ppq,
        tempo_map: (midi.header.tempos || []).map(t => [
          Number(t.time.toFixed(3)),
          Math.round(t.bpm),
        ]),
      },
      tracks: midi.tracks.map((t, i) => ({
        name: t.name || `track_${i}`,
        program: t.instrument?.number ?? 0,
        channel: t.channel ?? 0,
        notes: t.notes.map(n => ({
          p: n.midi,                               // pitch (0–127)
          t: Number(n.time.toFixed(4)),            // início (segundos)
          d: Number(n.duration.toFixed(4)),        // duração (segundos)
          v: Math.round((n.velocity ?? 0.8) * 127) // velocity 0–127
        })),
      })),
    };

    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// healthcheck
app.get("/healthz", (_req, res) => res.send("ok"));

// escuta em 0.0.0.0 para funcionar no container
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`MIDI parser on :${PORT}`);
});
