/**
 * HTML Sanitization for Visual Prose Mode.
 *
 * Sanitizes HTML for safe rendering while preserving rich styling capabilities.
 * Allows: div, span, p, style, most CSS properties
 * Blocks: script, iframe, javascript: URLs, dangerous CSS
 */

/**
 * Sanitize Visual Prose HTML for safe rendering.
 * @param html - Raw HTML content
 * @param entryId - Entry ID for CSS scoping
 * @returns Sanitized and scoped HTML
 */
export function sanitizeVisualProse(html: string, entryId: string): string {
  const scopeClass = `vp-${entryId.slice(0, 8)}`;

  // Create a temporary container for parsing
  const template = document.createElement('template');
  template.innerHTML = html;

  const fragment = template.content;

  // Remove dangerous elements
  const dangerousElements = fragment.querySelectorAll(
    'script, iframe, object, embed, form, input, button, textarea, select, meta, link, base'
  );
  dangerousElements.forEach((el) => el.remove());

  // Process all elements
  const allElements = fragment.querySelectorAll('*');
  allElements.forEach((el) => {
    // Remove event handlers and dangerous attributes
    const attributesToRemove: string[] = [];

    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value.toLowerCase();

      // Remove event handlers
      if (name.startsWith('on')) {
        attributesToRemove.push(attr.name);
        return;
      }

      // Remove javascript: URLs
      if (value.includes('javascript:') || value.includes('data:text/html')) {
        attributesToRemove.push(attr.name);
        return;
      }

      // Remove dangerous href/src patterns
      if ((name === 'href' || name === 'src') && value.startsWith('javascript:')) {
        attributesToRemove.push(attr.name);
        return;
      }
    });

    attributesToRemove.forEach((name) => el.removeAttribute(name));

    // Sanitize inline styles
    if (el instanceof HTMLElement && el.style.cssText) {
      el.style.cssText = sanitizeInlineStyle(el.style.cssText);
    }
  });

  // Scope CSS in style tags
  const styleTags = fragment.querySelectorAll('style');
  styleTags.forEach((styleTag) => {
    if (styleTag.textContent) {
      styleTag.textContent = scopeCssSelectors(styleTag.textContent, scopeClass);
    }
  });

  // Convert newlines in text content to <br> tags (but not whitespace between tags)
  convertNewlinesToBr(fragment);

  // Wrap in scoped container
  const wrapper = document.createElement('div');
  wrapper.className = `${scopeClass} visual-prose-entry`;
  wrapper.appendChild(fragment);

  return wrapper.outerHTML;
}

/**
 * Convert newline characters in text nodes to <br> tags.
 * Only converts newlines in text nodes that contain actual content,
 * NOT whitespace-only nodes between HTML tags.
 */
function convertNewlinesToBr(node: Node): void {
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
  const textNodes: Text[] = [];
  
  // Elements where we should never convert newlines
  const skipElements = new Set([
    'pre', 'code', 'style', 'script', 'textarea'
  ]);
  
  // Collect text nodes that need conversion
  let textNode = walker.nextNode() as Text | null;
  while (textNode) {
    const content = textNode.textContent || '';
    
    // Skip if no newlines
    if (!content.includes('\n')) {
      textNode = walker.nextNode() as Text | null;
      continue;
    }
    
    // Skip whitespace-only nodes (these are just formatting between tags)
    if (content.trim() === '') {
      textNode = walker.nextNode() as Text | null;
      continue;
    }
    
    // Skip if inside pre, code, style, script
    let parent = textNode.parentNode as Element | null;
    let shouldSkip = false;
    while (parent) {
      const tagName = parent.tagName?.toLowerCase();
      if (tagName && skipElements.has(tagName)) {
        shouldSkip = true;
        break;
      }
      parent = parent.parentNode as Element | null;
    }
    
    if (!shouldSkip) {
      textNodes.push(textNode);
    }
    
    textNode = walker.nextNode() as Text | null;
  }
  
  // Replace newlines with <br> in each collected text node
  for (const text of textNodes) {
    const parent = text.parentNode;
    if (!parent) continue;
    
    const content = text.textContent || '';
    const parts = content.split('\n');
    
    if (parts.length <= 1) continue;
    
    // Create a fragment with text and <br> elements
    const fragment = document.createDocumentFragment();
    parts.forEach((part, index) => {
      if (index > 0) {
        fragment.appendChild(document.createElement('br'));
      }
      if (part) {
        fragment.appendChild(document.createTextNode(part));
      }
    });
    
    parent.replaceChild(fragment, text);
  }
}

/**
 * Sanitize inline CSS style string.
 */
function sanitizeInlineStyle(css: string): string {
  // Remove dangerous CSS properties
  const dangerousPatterns = [
    /position\s*:\s*(fixed|absolute)/gi,
    /z-index\s*:\s*\d+/gi,
    /expression\s*\(/gi,
    /behavior\s*:/gi,
    /-moz-binding\s*:/gi,
    /javascript\s*:/gi,
  ];

  let sanitized = css;
  dangerousPatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '');
  });

  return sanitized;
}

/**
 * Scope CSS selectors by prefixing with a class.
 */
function scopeCssSelectors(css: string, scopeClass: string): string {
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
    const scopedContent = prefixSelectorsInBlock(content, scopeClass);
    return `@media ${query}{${scopedContent}}`;
  });

  // Process regular CSS rules
  result = prefixSelectorsInBlock(result, scopeClass);

  // Restore keyframes blocks
  keyframesBlocks.forEach((block, index) => {
    result = result.replace(`__KEYFRAMES_${index}__`, block);
  });

  return result;
}

/**
 * Prefix selectors in a CSS block.
 */
function prefixSelectorsInBlock(css: string, scopeClass: string): string {
  return css.replace(/([^{}@]+?)(\{[^{}]*\})/g, (match, selectors, block) => {
    const trimmedSelectors = selectors.trim();

    // Skip if empty or starts with @ or is a placeholder
    if (
      !trimmedSelectors ||
      trimmedSelectors.startsWith('@') ||
      trimmedSelectors.startsWith('__KEYFRAMES_')
    ) {
      return match;
    }

    // Skip percentage selectors (keyframe steps)
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
          return `.${scopeClass}`;
        }

        return `.${scopeClass} ${trimmed}`;
      })
      .join(', ');

    return `${prefixedSelectors}${block}`;
  });
}

/**
 * Extract raw content from a scoped Visual Prose wrapper.
 * Useful for editing - returns the inner HTML without the wrapper.
 */
export function extractVisualProseContent(html: string): string {
  const match = html.match(/<div class="vp-[a-f0-9]+ visual-prose-entry">([\s\S]*)<\/div>$/);
  if (match) {
    return match[1];
  }
  return html;
}
