import * as k from "../../kit/iso-kit.mjs";
import { CALLOUT_CSS, calloutHtml } from "../../kit/callout.mjs";
import { foldCss, foldLayerHtml, foldLegendHtml } from "../../kit/fold.mjs";
import { BLOCKS, FORMULA, SENTENCE, VIEW } from "./model.mjs";
import { liveSource } from "./live.mjs";

const foldBlocks = BLOCKS.map(({ at, ...block }) => block);

function paperCss() {
  return BLOCKS.map((block) => {
    const shades = block.shades;
    return `.sb-paper[data-role="${block.role}"] .sb-block .iso-fill{fill:${block.fill}}.sb-paper[data-role="${block.role}"] .sb-block .iso-top{fill:${block.top}}.sb-paper[data-role="${block.role}"] .sb-block .iso-shade[data-shade="0"]{fill:${shades[0]}}.sb-paper[data-role="${block.role}"] .sb-block .iso-shade[data-shade="1"]{fill:${shades[1]}}.sb-paper[data-role="${block.role}"] .sb-block .iso-shade[data-shade="2"]{fill:${shades[2]}}.sb-paper[data-role="${block.role}"] .sb-block .iso-shade[data-shade="3"]{fill:${shades[3]}}.sb-paper[data-role="${block.role}"] .sb-lug .iso-fill,.sb-paper[data-role="${block.role}"] .sb-lug .iso-top,.sb-paper[data-role="${block.role}"] .sb-lug .iso-shade{fill:${block.edge}}`;
  }).join("");
}

export function assemble({ theme, svg, slots }) {
  const stage = `<div class="fn-stage iso-stage" data-fold-stage data-stage-fold="unfolded" tabindex="0" role="group" aria-label="Sentence blocks. Space folds the paper nets into their slots.">${svg}${foldLayerHtml({ blocks: foldBlocks, formula: FORMULA, state: "unfolded" })}${calloutHtml({ text: "Object O is what the verb acts on.", name: "object", anchor: "[data-important='object']", prefer: "above" })}</div>${foldLegendHtml(foldBlocks)}`;
  const body = k.plateHtml({
    fig: "Fig 1",
    title: "Sentence blocks",
    hint: "Space or click folds the nets",
    readout: `unfolded · ${FORMULA} · ${SENTENCE}`,
    keys: [
      { mark: "lit", label: "Subject, verb and object, one block each" },
      { mark: "raised", label: "Keyed slots on the rail" },
    ],
    caption: "Tom reads books. Unfolded, each word is a paper net large enough to read. Folded, the blocks sit in keyed slots: subject, verb, object.",
    body: stage,
  });
  const html = k.pageHtml({
    title: "Sentence blocks",
    theme,
    width: 860,
    body,
    script: liveSource({ slots, width: VIEW.w, height: VIEW.h }),
  });
  return html.replace("</head>", `<style>${foldCss()}${CALLOUT_CSS}${paperCss()}</style></head>`);
}
