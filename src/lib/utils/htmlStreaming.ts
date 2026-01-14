/**
 * StreamingHtmlRenderer - Handles incremental HTML parsing for Visual Prose Mode.
 *
 * Features:
 * - Buffers incomplete HTML tags until complete
 * - Buffers incomplete <style> blocks until </style>
 * - Scopes all CSS selectors to prevent leakage between entries
 * - Provides safe HTML output at each chunk
 */
export class StreamingHtmlRenderer {
  private buffer = '';
  private safeHtml = '';
  private scopeClass: string;

  constructor(entryId: string) {
    this.scopeClass = `vp-${entryId.slice(0, 8)}`;
  }

  /**
   * Append a chunk and return safely renderable HTML.
   */
  append(chunk: string): string {
    this.buffer += chunk;
    this.processBuffer();
    return this.getWrappedOutput();
  }

  /**
   * Finalize - flush remaining buffer.
   */
  flush(): string {
    const remaining = this.scopeCss(this.buffer);
    this.safeHtml += remaining;
    this.buffer = '';
    return this.getWrappedOutput();
  }

  /**
   * Get the raw accumulated content (for storage without wrapper).
   */
  getRawContent(): string {
    return this.safeHtml + this.buffer;
  }

  private processBuffer(): void {
    const safeEnd = this.findSafeRenderPoint();
    if (safeEnd > 0) {
      const safeChunk = this.buffer.slice(0, safeEnd);
      this.safeHtml += this.scopeCss(safeChunk);
      this.buffer = this.buffer.slice(safeEnd);
    }
  }

  private findSafeRenderPoint(): number {
    const html = this.buffer;

    // Check if we're inside an incomplete <style> block
    const styleOpenIndex = html.lastIndexOf('<style');
    const styleCloseIndex = html.lastIndexOf('</style>');
    if (styleOpenIndex > styleCloseIndex) {
      // Inside a style block - don't render any of it yet
      return styleOpenIndex;
    }

    // Find last complete tag (last '>' not inside an incomplete tag)
    let lastSafeIndex = 0;
    let inTag = false;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < html.length; i++) {
      const char = html[i];

      // Track string boundaries within tags
      if (inTag && !inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar) {
        inString = false;
        stringChar = '';
      }

      // Track tag boundaries
      if (!inString) {
        if (char === '<') {
          inTag = true;
        } else if (char === '>') {
          inTag = false;
          lastSafeIndex = i + 1;
        }
      }
    }

    // If we're currently inside a tag, don't include it
    return inTag ? lastSafeIndex : html.length;
  }

  private scopeCss(html: string): string {
    // Find all <style>...</style> blocks and prefix selectors
    return html.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, (_match, attrs, css) => {
      const scopedCss = this.prefixCssSelectors(css);
      return `<style${attrs}>${scopedCss}</style>`;
    });
  }

  private prefixCssSelectors(css: string): string {
    // Handle @keyframes specially - don't prefix the keyframe name
    let result = css;

    // Process @keyframes blocks - extract and preserve them
    const keyframesBlocks: string[] = [];
    result = result.replace(/@keyframes\s+([^\s{]+)\s*\{([\s\S]*?\})\s*\}/gi, (match) => {
      keyframesBlocks.push(match);
      return `__KEYFRAMES_${keyframesBlocks.length - 1}__`;
    });

    // Process @media queries - scope selectors inside them
    result = result.replace(/@media\s+([^{]+)\{([\s\S]*?)\}/gi, (_match, query, content) => {
      const scopedContent = this.prefixSelectorsInBlock(content);
      return `@media ${query}{${scopedContent}}`;
    });

    // Process regular CSS rules (outside of @-rules)
    result = this.prefixSelectorsInBlock(result);

    // Restore keyframes blocks
    keyframesBlocks.forEach((block, index) => {
      result = result.replace(`__KEYFRAMES_${index}__`, block);
    });

    return result;
  }

  private prefixSelectorsInBlock(css: string): string {
    // Match selector { properties } patterns
    return css.replace(/([^{}@]+?)(\{[^{}]*\})/g, (match, selectors, block) => {
      const trimmedSelectors = selectors.trim();

      // Skip if empty or starts with @ (already handled)
      if (!trimmedSelectors || trimmedSelectors.startsWith('@') || trimmedSelectors.startsWith('__KEYFRAMES_')) {
        return match;
      }

      // Skip percentage selectors (keyframe steps like "0%", "100%")
      if (/^\d+%$/.test(trimmedSelectors) || trimmedSelectors === 'from' || trimmedSelectors === 'to') {
        return match;
      }

      // Prefix each selector
      const prefixedSelectors = selectors
        .split(',')
        .map((s: string) => {
          const trimmed = s.trim();
          if (!trimmed) return s;

          // Handle :root specially
          if (trimmed === ':root') {
            return `.${this.scopeClass}`;
          }

          return `.${this.scopeClass} ${trimmed}`;
        })
        .join(', ');

      return `${prefixedSelectors}${block}`;
    });
  }

  private getWrappedOutput(): string {
    // Wrap output in scoped container
    return `<div class="${this.scopeClass} visual-prose-entry">${this.safeHtml}</div>`;
  }
}
