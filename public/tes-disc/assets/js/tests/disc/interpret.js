import { DiscInterpretation } from "./interpretation_data.js";

export function interpretDisc(score){
  const t = DiscInterpretation[score.dominant] || null;
  if(!t){
    return { dominant: score.dominant, summary: "Interpretasi belum tersedia." };
  }
  return {
    dominant: score.dominant,
    potret: t.potret || [],
    bullets: t.bullets || [],
    paragraph: t.paragraph || ""
  };
}