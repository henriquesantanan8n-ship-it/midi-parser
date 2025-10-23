import express from "express";
import multer from "multer";
import { Midi } from "@tonejs/midi";

const app = express();
const upload = multer();

app.post("/parse-midi", upload.single("file"), (req, res) => {
  try {
    const midi = new Midi(req.file.buffer);
    const out = {
      meta: {
        bpm: midi.header.tempos?.[0]?.bpm ?? 120,
        time_sig: midi.header.timeSignatures?.[0]?.timeSignature?.join("/") ?? "4/4",
        ticks_per_beat: midi.header.ppq,
        tempo_map: (midi.header.tempos || []).map(t => [Number(t.time.toFixed(3)), Math.round(t.bpm)])
      },
      tracks: midi.tracks.map((t, i) => ({
        name: t.name || `track_${i}`,
        program: t.instrument?.number ?? 0,
        channel: t.channel ?? 0,
        notes: t.notes.map(n => ({
          p: n.midi,
          t: Number(n.time.toFixed(4)),
          d: Number(n.duration.toFixed(4)),
          v: Math.round((n.velocity ?? 0.8) * 127)
        }))
      }))
    };
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/healthz", (_req, res) => res.send("ok"));
app.listen(3000, () => console.log("MIDI parser on :3000"));
