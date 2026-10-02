import { TopologyLayoutLink, TopologyLayoutNode } from '@/types/ai-noc';

/** จัดเฉพาะตำแหน่งตามเส้นที่มีอยู่ ไม่สร้างหรือเดาสายเชื่อมใหม่ */
export function arrangeTopology(nodes: TopologyLayoutNode[], links: TopologyLayoutLink[]): TopologyLayoutNode[] {
  const adjacency = new Map(nodes.map((n) => [n.deviceId, new Set<string>()]));
  for (const link of links) {
    adjacency.get(link.source)?.add(link.target);
    adjacency.get(link.target)?.add(link.source);
  }
  const roots = [...nodes].sort((a, b) =>
    (adjacency.get(b.deviceId)?.size ?? 0) - (adjacency.get(a.deviceId)?.size ?? 0) || a.deviceId.localeCompare(b.deviceId));
  const visited = new Set<string>();
  const result: TopologyLayoutNode[] = [];
  let row = 0;
  for (const root of roots) {
    if (visited.has(root.deviceId)) continue;
    let level = [root.deviceId];
    visited.add(root.deviceId);
    while (level.length) {
      const next: string[] = [];
      level.forEach((deviceId, i) => {
        result.push({ deviceId, x: 40 + (i % 7) * 210, y: 40 + (row + Math.floor(i / 7)) * 110 });
        for (const peer of [...(adjacency.get(deviceId) ?? [])].sort()) {
          if (!adjacency.has(peer) || visited.has(peer)) continue;
          visited.add(peer);
          next.push(peer);
        }
      });
      row += Math.ceil(level.length / 7);
      level = next;
    }
  }
  return result;
}
