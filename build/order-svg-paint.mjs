// Keep paint attributes before geometry while preserving their values and relative order.
export function orderSvgPaint(svg) {
  return svg.replace(/<[A-Za-z][\w:.-]*(?:\s+[^<>]*?)?\s*\/?>/g, function (tag) {
    const paint = [];
    const rest = tag.replace(/\s+((?:fill|stroke)(?:-[\w-]+)?|opacity)\s*=\s*("[^"]*"|'[^']*')/g, function (attribute) {
      paint.push(attribute.trim());
      return "";
    });
    return paint.length ? rest.replace(/^(<[\w:.-]+)/, "$1 " + paint.join(" ")) : tag;
  });
}
