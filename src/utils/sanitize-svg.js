import { DOMParser } from '@xmldom/xmldom';

const svgNamespace = 'http://www.w3.org/2000/svg';
const maxSvgLength = 100_000;
const maxElements = 800;
const maxDepth = 24;

const allowedElements = new Set([
  'svg', 'g', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'path', 'text', 'tspan', 'defs', 'linearGradient', 'radialGradient',
  'stop', 'clipPath', 'title', 'desc'
]);

const paintAttributes = new Set(['fill', 'stroke']);
const paintNames = new Set([
  'none', 'currentcolor', 'transparent', 'white', 'black', 'red', 'green',
  'blue', 'yellow', 'orange', 'purple', 'pink', 'brown', 'gray', 'grey',
  'gold', 'silver', 'navy', 'teal', 'maroon', 'olive', 'lime', 'aqua',
  'fuchsia', 'coral', 'salmon', 'tomato', 'indigo', 'violet'
]);
const numericAttributes = new Set([
  'x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r',
  'x1', 'y1', 'x2', 'y2', 'stroke-width', 'stroke-miterlimit',
  'font-size', 'letter-spacing', 'word-spacing', 'textLength',
  'offset', 'stop-opacity', 'fill-opacity', 'stroke-opacity', 'opacity',
  'fx', 'fy'
]);
const allowedAttributes = new Set([
  'id', 'x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r',
  'x1', 'y1', 'x2', 'y2', 'd', 'points', 'fill', 'fill-opacity',
  'fill-rule', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'stroke-opacity', 'stroke-miterlimit', 'stroke-dasharray', 'opacity',
  'transform', 'vector-effect', 'shape-rendering', 'font-family', 'font-size',
  'font-weight', 'font-style', 'text-anchor', 'dominant-baseline',
  'letter-spacing', 'word-spacing', 'textLength', 'lengthAdjust', 'offset',
  'stop-color', 'stop-opacity', 'gradientUnits', 'gradientTransform',
  'spreadMethod', 'fx', 'fy', 'clip-path'
]);

function escapeXml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;'
  })[character]);
}

function isNumber(value) {
  return /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?(?:px|pt|em|rem|%)?$/i.test(value);
}

function isNumberList(value) {
  return /^[-+.\deE,\s]+$/.test(value);
}

function isPathData(value) {
  return /^[MmZzLlHhVvCcSsQqTtAa0-9eE+.,\-\s]+$/.test(value);
}

function isTransform(value) {
  return /^(?:(?:translate|scale|rotate|skewX|skewY|matrix)\s*\(\s*[-+.\deE,\s]+\)\s*)+$/.test(value);
}

function isColor(value) {
  const normalized = value.trim().toLowerCase();
  if (paintNames.has(normalized)) return true;
  if (/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(normalized)) return true;
  if (/^(?:rgb|rgba|hsl|hsla)\(\s*[-+.%\d,\s]+\)$/i.test(normalized)) return true;
  return false;
}

function collectIds(node, ids, depth = 0, count = { value: 0 }) {
  if (depth > maxDepth) throw new Error('Gemini devolvió un SVG demasiado anidado');
  if (node.nodeType !== 1 || node.namespaceURI !== svgNamespace || !allowedElements.has(node.localName)) return;

  count.value += 1;
  if (count.value > maxElements) throw new Error('Gemini devolvió un SVG demasiado complejo');

  const id = node.getAttribute('id');
  if (id && /^[a-z][\w-]{0,40}$/i.test(id)) ids.add(id.toLowerCase());

  for (let child = node.firstChild; child; child = child.nextSibling) {
    collectIds(child, ids, depth + 1, count);
  }
}

function sanitizeAttribute(name, value, ids) {
  if (!allowedAttributes.has(name) || value.length > 2_000) return null;
  const normalized = value.trim();

  if (name === 'id') {
    return /^[a-z][\w-]{0,40}$/i.test(normalized) ? normalized.toLowerCase() : null;
  }
  if (paintAttributes.has(name) || name === 'stop-color') {
    const reference = /^url\(\s*#([a-z][\w-]{0,40})\s*\)$/i.exec(normalized);
    if (reference) {
      return paintAttributes.has(name) && ids.has(reference[1].toLowerCase())
        ? `url(#${reference[1].toLowerCase()})`
        : null;
    }
    return isColor(normalized) ? normalized : null;
  }
  if (name === 'clip-path') {
    const reference = /^url\(\s*#([a-z][\w-]{0,40})\s*\)$/i.exec(normalized);
    return reference && ids.has(reference[1].toLowerCase())
      ? `url(#${reference[1].toLowerCase()})`
      : null;
  }
  if (numericAttributes.has(name)) {
    return isNumber(normalized) ? normalized : null;
  }
  if (name === 'd' || name === 'points' || name === 'stroke-dasharray') {
    return normalized.length <= 20_000
      && (
        (name === 'd' && isPathData(normalized))
        || (name === 'points' && isNumberList(normalized))
        || (name === 'stroke-dasharray' && (normalized === 'none' || isNumberList(normalized)))
      )
      ? normalized
      : null;
  }
  if (name === 'transform' || name === 'gradientTransform') {
    return isTransform(normalized) ? normalized : null;
  }
  if (name === 'font-family') {
    return /^[a-z\d ,_-]{1,80}$/i.test(normalized) ? normalized : null;
  }
  if (name === 'font-weight') {
    return /^(normal|bold|[1-9]00)$/i.test(normalized) ? normalized : null;
  }
  if (name === 'font-style') {
    return /^(normal|italic|oblique)$/i.test(normalized) ? normalized : null;
  }
  if (name === 'text-anchor') {
    return /^(start|middle|end)$/i.test(normalized) ? normalized : null;
  }
  if (name === 'dominant-baseline') {
    return /^(auto|middle|central|hanging|alphabetic|text-before-edge|text-after-edge)$/i.test(normalized)
      ? normalized
      : null;
  }
  if (name === 'fill-rule') {
    return /^(nonzero|evenodd)$/i.test(normalized) ? normalized : null;
  }
  if (name === 'stroke-linecap') {
    return /^(butt|round|square)$/i.test(normalized) ? normalized : null;
  }
  if (name === 'stroke-linejoin') {
    return /^(miter|round|bevel)$/i.test(normalized) ? normalized : null;
  }
  if (name === 'vector-effect') {
    return normalized === 'none' || normalized === 'non-scaling-stroke' ? normalized : null;
  }
  if (name === 'shape-rendering') {
    return /^(auto|optimizeSpeed|crispEdges|geometricPrecision)$/i.test(normalized)
      ? normalized
      : null;
  }
  if (name === 'lengthAdjust') {
    return /^(spacing|spacingAndGlyphs)$/i.test(normalized) ? normalized : null;
  }
  if (name === 'gradientUnits') {
    return /^(objectBoundingBox|userSpaceOnUse)$/i.test(normalized) ? normalized : null;
  }
  if (name === 'spreadMethod') {
    return /^(pad|reflect|repeat)$/i.test(normalized) ? normalized : null;
  }
  return null;
}

function serializeElement(node, ids, state, depth = 0, inText = false) {
  if (depth > maxDepth) throw new Error('Gemini devolvió un SVG demasiado anidado');
  if (node.nodeType === 3 || node.nodeType === 4) {
    const text = node.nodeValue ?? '';
    if (!inText && !text.trim()) return '';
    if (text.length > 3_000) throw new Error('Gemini devolvió demasiado texto dentro del SVG');
    return escapeXml(text);
  }
  if (node.nodeType !== 1 || node.namespaceURI !== svgNamespace || !allowedElements.has(node.localName)) {
    return '';
  }

  state.count += 1;
  if (state.count > maxElements) throw new Error('Gemini devolvió un SVG demasiado complejo');
  if (['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon'].includes(node.localName)) {
    state.hasArtwork = true;
  }

  const attributes = [];
  for (let index = 0; index < node.attributes.length; index += 1) {
    const attribute = node.attributes.item(index);
    if (!attribute || attribute.namespaceURI || attribute.name === 'xmlns') continue;
    const value = sanitizeAttribute(attribute.name, attribute.value, ids);
    if (value !== null) attributes.push(`${attribute.name}="${escapeXml(value)}"`);
  }

  const tagName = node.localName;
  const children = [];
  const textContext = inText || tagName === 'text' || tagName === 'tspan' || tagName === 'title' || tagName === 'desc';
  for (let child = node.firstChild; child; child = child.nextSibling) {
    children.push(serializeElement(child, ids, state, depth + 1, textContext));
  }

  return `<${tagName}${attributes.length ? ` ${attributes.join(' ')}` : ''}>${children.join('')}</${tagName}>`;
}

export function sanitizeSvg(source, size) {
  if (typeof source !== 'string' || source.length === 0 || source.length > maxSvgLength) {
    throw new Error('Gemini no devolvió un SVG válido');
  }

  const markup = source
    .trim()
    .replace(/^```(?:svg|xml)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  if (/<!DOCTYPE|<!ENTITY/i.test(markup)) {
    throw new Error('El SVG generado contiene declaraciones XML no permitidas');
  }

  const parseErrors = [];
  let document;
  try {
    document = new DOMParser({
      onError(level, message) {
        parseErrors.push(`${level}: ${message}`);
      }
    }).parseFromString(markup, 'image/svg+xml');
  } catch (error) {
    throw new Error('Gemini devolvió un SVG mal formado', { cause: error });
  }

  if (parseErrors.length > 0) throw new Error('Gemini devolvió un SVG mal formado');

  const root = document.documentElement;
  if (!root || root.localName !== 'svg' || root.namespaceURI !== svgNamespace) {
    throw new Error('Gemini no devolvió un elemento SVG raíz válido');
  }

  const ids = new Set();
  collectIds(root, ids);
  const state = { count: 0, hasArtwork: false };
  const children = [];
  for (let child = root.firstChild; child; child = child.nextSibling) {
    children.push(serializeElement(child, ids, state, 1));
  }
  if (!state.hasArtwork) throw new Error('El SVG generado no contiene ilustración');

  const { width, height } = size;
  const sanitized = `<svg xmlns="${svgNamespace}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">${children.join('')}</svg>`;
  if (sanitized.length > maxSvgLength) throw new Error('Gemini devolvió un SVG demasiado grande');

  return sanitized;
}
