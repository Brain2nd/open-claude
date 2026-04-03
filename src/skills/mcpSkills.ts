export function getMcpSkills(): unknown[] { return [] }

const _fetchImpl = (..._args: any[]): any => null
;(_fetchImpl as any).cache = new Map()
export const fetchMcpSkillsForClient: ((...args: any[]) => any) & { cache?: Map<any, any> } = _fetchImpl as any
