import { DiscMaps } from "./maps.js";
import { DiscTables } from "./tables.js";

function inc(obj, key){
  obj[key] = (obj[key] || 0) + 1;
}

function lookup(table, count, key){
  const row = table.find(r => r.count === count);
  if(!row) return null;
  return row[key];
}

export function scoreDisc(responses){
  const most = { D:0, I:0, S:0, C:0, "*":0 };
  const least = { D:0, I:0, S:0, C:0, "*":0 };
  const flags = [];

  for(const r of responses){
    const qm = DiscMaps[r.no];
    if(!qm) { flags.push("missing_map"); continue; }
    const tMost = qm.most[String(r.most)] ?? qm.most[r.most];
    const tLeast = qm.least[String(r.least)] ?? qm.least[r.least];
    if(!tMost || !tLeast){ flags.push(`map_missing_q${r.no}`); continue; }

    inc(most, tMost);
    inc(least, tLeast);
  }

  const diff = { D: most.D - least.D, I: most.I - least.I, S: most.S - least.S, C: most.C - least.C };

  // Graph points (mengikuti VLOOKUP di Excel)
  const g1 = {
    D: lookup(DiscTables.line1, most.D, "D"),
    I: lookup(DiscTables.line1, most.I, "I"),
    S: lookup(DiscTables.line1, most.S, "S"),
    C: lookup(DiscTables.line1, most.C, "C"),
  };
  const g2 = {
    D: lookup(DiscTables.line1, least.D, "D2"),
    I: lookup(DiscTables.line1, least.I, "I2"),
    S: lookup(DiscTables.line1, least.S, "S2"),
    C: lookup(DiscTables.line1, least.C, "C2"),
  };
  const g3 = {
    D: lookup(DiscTables.line3, diff.D, "D"),
    I: lookup(DiscTables.line3, diff.I, "I"),
    S: lookup(DiscTables.line3, diff.S, "S"),
    C: lookup(DiscTables.line3, diff.C, "C"),
  };

  // Dominan berdasarkan Grafik 3 (nilai paling tinggi)
  let dominant = "D";
  let max = -Infinity;
  for(const k of ["D","I","S","C"]){
    const v = g3[k];
    if(typeof v === "number" && v > max){
      max = v; dominant = k;
    }
  }

  // Validasi total input (Excel cek D+I+S+C+* = 24)
  const totMost = most.D + most.I + most.S + most.C + most["*"];
  const totLeast = least.D + least.I + least.S + least.C + least["*"];
  if(totMost !== 24 || totLeast !== 24) flags.push("ada_kesalahan_input");

  return { most, least, diff, graph: { line1: g1, line2: g2, line3: g3 }, dominant, flags };
}