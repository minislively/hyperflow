export const FIXTURE_SIZES = [100, 300, 1000];

export function createGridFixture(count, options = {}) {
  const gap = options.gap ?? 24;
  const nodeWidth = options.nodeWidth ?? 96;
  const nodeHeight = options.nodeHeight ?? 56;
  const columns = options.columns ?? Math.ceil(Math.sqrt(count));

  return Array.from({ length: count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);

    return {
      id: index + 1,
      x: column * (nodeWidth + gap),
      y: row * (nodeHeight + gap),
      width: nodeWidth,
      height: nodeHeight,
    };
  });
}

export function getFixture(size) {
  return createGridFixture(size);
}

export function getDefaultViewport(width = 960, height = 540) {
  return {
    x: 0,
    y: 0,
    width,
    height,
    zoom: 1,
  };
}
