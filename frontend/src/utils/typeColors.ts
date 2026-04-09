const NODE_COLORS = [
  '#3b82f6', // node-0
  '#8b5cf6', // node-1
  '#f59e0b', // node-2
  '#10b981', // node-3
  '#ec4899', // node-4
  '#06b6d4', // node-5
  '#f97316', // node-6
  '#84cc16', // node-7
]

export const NODE_TAILWIND_CLASSES: Record<number, { bg: string; text: string }> = {
  0: { bg: 'bg-node-0/20', text: 'text-node-0' },
  1: { bg: 'bg-node-1/20', text: 'text-node-1' },
  2: { bg: 'bg-node-2/20', text: 'text-node-2' },
  3: { bg: 'bg-node-3/20', text: 'text-node-3' },
  4: { bg: 'bg-node-4/20', text: 'text-node-4' },
  5: { bg: 'bg-node-5/20', text: 'text-node-5' },
  6: { bg: 'bg-node-6/20', text: 'text-node-6' },
  7: { bg: 'bg-node-7/20', text: 'text-node-7' },
}

export function getTypeColorIndex(typeName: string): number {
  let sum = 0
  for (let i = 0; i < typeName.length; i++) {
    sum += typeName.charCodeAt(i)
  }
  return sum % 8
}

export function getTypeColor(typeName: string): string {
  return NODE_COLORS[getTypeColorIndex(typeName)] ?? '#808080'
}
