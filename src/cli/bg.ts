export async function psHandler(..._args: any[]): Promise<void> { process.stderr.write('No background sessions\n') }
export async function logsHandler(..._args: any[]): Promise<void> {}
export async function attachHandler(..._args: any[]): Promise<void> {}
export async function killHandler(..._args: any[]): Promise<void> {}
export async function handleBgFlag(..._args: any[]): Promise<void> {}
