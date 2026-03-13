import { NodeType, TextNode, parse } from 'node-html-parser';

function preserveOuterWhitespace(source: string, translated: string): string {
  const leading = source.match(/^\s*/)?.[0] ?? '';
  const trailing = source.match(/\s*$/)?.[0] ?? '';
  return `${leading}${translated}${trailing}`;
}

export function injectTranslationsIntoHtml(originalHtml: string, translatedChunks: string[]): string {
  const root = parse(originalHtml, {
    comment: true,
    blockTextElements: {
      script: true,
      noscript: true,
      style: true,
      pre: true,
    },
  });

  let translationIndex = 0;

  const walk = (node: { childNodes: any[]; nodeType: NodeType; parentNode?: { rawTagName?: string }; rawText?: string }) => {
    if (node.nodeType === NodeType.TEXT_NODE) {
      const textNode = node as TextNode;
      const parentTag = textNode.parentNode?.rawTagName?.toLowerCase();
      if (parentTag === 'style' || parentTag === 'script') {
        return;
      }

      if (textNode.rawText.trim().length === 0) {
        return;
      }

      const nextTranslated = translatedChunks[translationIndex];
      if (typeof nextTranslated !== 'string') {
        return;
      }

      textNode.rawText = preserveOuterWhitespace(textNode.rawText, nextTranslated);
      translationIndex += 1;
      return;
    }

    for (const child of node.childNodes) {
      walk(child as any);
    }
  };

  walk(root as any);
  return root.toString();
}
