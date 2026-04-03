/**
 * Remote filesystem implementation over SSH.
 *
 * Implements the FsOperations interface by executing filesystem commands
 * on the remote host via SSHConnectionManager. Paths that belong to
 * local config (e.g. ~/.openclaude/) are delegated to localFs.
 *
 * Feature gate: SSH_PROXY
 */

import type * as fs from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import type { SSHConnectionManager } from './SSHConnectionManager.js'
import type { FsOperations } from '../utils/fsOperations.js'

/**
 * Constructs an fs.Stats-compatible object from parsed remote stat output.
 */
function makeStats(parsed: RemoteStatResult): fs.Stats {
  const mode = parsed.mode
  const S_IFMT = 0o170000
  const S_IFREG = 0o100000
  const S_IFDIR = 0o040000
  const S_IFLNK = 0o120000
  const S_IFCHR = 0o020000
  const S_IFBLK = 0o060000
  const S_IFIFO = 0o010000
  const S_IFSOCK = 0o140000

  const fileType = mode & S_IFMT

  const stats: fs.Stats = {
    dev: parsed.dev,
    ino: parsed.ino,
    mode,
    nlink: parsed.nlink,
    uid: parsed.uid,
    gid: parsed.gid,
    rdev: 0,
    size: parsed.size,
    blksize: 4096,
    blocks: Math.ceil(parsed.size / 512),
    atimeMs: parsed.atime * 1000,
    mtimeMs: parsed.mtime * 1000,
    ctimeMs: parsed.ctime * 1000,
    birthtimeMs: parsed.mtime * 1000,
    atime: new Date(parsed.atime * 1000),
    mtime: new Date(parsed.mtime * 1000),
    ctime: new Date(parsed.ctime * 1000),
    birthtime: new Date(parsed.mtime * 1000),
    isFile: () => fileType === S_IFREG,
    isDirectory: () => fileType === S_IFDIR,
    isSymbolicLink: () => fileType === S_IFLNK,
    isBlockDevice: () => fileType === S_IFBLK,
    isCharacterDevice: () => fileType === S_IFCHR,
    isFIFO: () => fileType === S_IFIFO,
    isSocket: () => fileType === S_IFSOCK,
  } as fs.Stats

  return stats
}

type RemoteStatResult = {
  size: number
  mode: number
  mtime: number
  atime: number
  ctime: number
  uid: number
  gid: number
  ino: number
  dev: number
  nlink: number
}

function shellQuote(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'"
}

/**
 * Parse `ls -la` output into Dirent-like objects.
 * Each line looks like: drwxr-xr-x 2 user group 4096 2026-04-01 12:00 dirname
 */
function parseLsLine(line: string): { name: string; isDir: boolean; isSymlink: boolean } | null {
  // Skip total line and empty lines
  if (!line || line.startsWith('total ')) return null

  // Parse type from first character
  const typeChar = line[0]
  const isDir = typeChar === 'd'
  const isSymlink = typeChar === 'l'

  // Extract name (last field, handling spaces and symlinks)
  // For symlinks: "name -> target"
  const parts = line.split(/\s+/)
  if (parts.length < 9) return null

  let name = parts.slice(8).join(' ')
  if (isSymlink && name.includes(' -> ')) {
    name = name.split(' -> ')[0]!
  }

  // Skip . and ..
  if (name === '.' || name === '..') return null

  return { name, isDir, isSymlink }
}

export class SSHFsOperations implements FsOperations {
  private conn: SSHConnectionManager
  private remoteCwd: string
  private localFs: FsOperations
  private configDir: string

  constructor(
    conn: SSHConnectionManager,
    remoteCwd: string,
    localFs: FsOperations,
  ) {
    this.conn = conn
    this.remoteCwd = remoteCwd
    this.localFs = localFs
    this.configDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.openclaude')
  }

  /**
   * Determine if a path should be handled locally.
   * Config dir, /tmp, and home dotfiles are always local.
   */
  private isLocalPath(path: string): boolean {
    if (path.startsWith(this.configDir)) return true
    if (path.startsWith('/tmp/') || path === '/tmp') return true
    // Home directory dotfiles (e.g. ~/.bashrc, ~/.ssh/)
    const home = homedir()
    if (path.startsWith(home + '/.')) return true
    // Anything under the home dir that's NOT the remote CWD subtree
    // (handles edge case where remoteCwd is under home)
    return false
  }

  private statCmd(path: string, followSymlinks: boolean): string {
    const os = this.conn.getRemoteOS()
    const q = shellQuote(path)
    if (os === 'Darwin') {
      // macOS stat: -f for format, -L to follow symlinks
      const flag = followSymlinks ? '-L' : ''
      return `stat ${flag} -f '{"size":%z,"mode":%p,"mtime":%m,"atime":%a,"ctime":%c,"uid":%u,"gid":%g,"ino":%i,"dev":%d,"nlink":%l}' ${q}`
    }
    // Linux stat: --format, -L to follow symlinks
    const flag = followSymlinks ? '-L' : ''
    return `stat ${flag} --format='{"size":%s,"mode":0x%f,"mtime":%Y,"atime":%X,"ctime":%Z,"uid":%u,"gid":%g,"ino":%i,"dev":%d,"nlink":%h}' ${q}`
  }

  private parseStatOutput(output: string): RemoteStatResult {
    try {
      const parsed = JSON.parse(output.trim())
      return {
        size: Number(parsed.size),
        mode: Number(parsed.mode),
        mtime: Number(parsed.mtime),
        atime: Number(parsed.atime),
        ctime: Number(parsed.ctime),
        uid: Number(parsed.uid),
        gid: Number(parsed.gid),
        ino: Number(parsed.ino),
        dev: Number(parsed.dev),
        nlink: Number(parsed.nlink),
      }
    } catch (e) {
      throw new Error(`Failed to parse remote stat output: ${output.trim()}`)
    }
  }

  // --- FsOperations interface implementation ---

  cwd(): string {
    return this.remoteCwd
  }

  existsSync(path: string): boolean {
    if (this.isLocalPath(path)) return this.localFs.existsSync(path)
    const result = this.conn.execSyncFull(`test -e ${shellQuote(path)} && echo Y || echo N`)
    return result.stdout.trim() === 'Y'
  }

  async stat(path: string): Promise<fs.Stats> {
    if (this.isLocalPath(path)) return this.localFs.stat(path)
    const result = await this.conn.exec(this.statCmd(path, true))
    if (result.code !== 0) {
      const err = new Error(`ENOENT: no such file or directory, stat '${path}'`) as NodeJS.ErrnoException
      err.code = 'ENOENT'
      err.errno = -2
      err.syscall = 'stat'
      err.path = path
      throw err
    }
    return makeStats(this.parseStatOutput(result.stdout))
  }

  async readdir(path: string): Promise<fs.Dirent[]> {
    if (this.isLocalPath(path)) return this.localFs.readdir(path)
    const result = await this.conn.exec(`ls -la ${shellQuote(path)}`)
    return this.parseLsOutput(result.stdout, path)
  }

  async unlink(path: string): Promise<void> {
    if (this.isLocalPath(path)) return this.localFs.unlink(path)
    await this.conn.exec(`rm ${shellQuote(path)}`)
  }

  async rmdir(path: string): Promise<void> {
    if (this.isLocalPath(path)) return this.localFs.rmdir(path)
    await this.conn.exec(`rmdir ${shellQuote(path)}`)
  }

  async rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
    if (this.isLocalPath(path)) return this.localFs.rm(path, options)
    const flags = [options?.recursive ? '-r' : '', options?.force ? '-f' : ''].filter(Boolean).join('')
    await this.conn.exec(`rm ${flags ? '-' + flags.replace(/-/g, '') : ''} ${shellQuote(path)}`.replace('- ', ''))
  }

  async mkdir(path: string, options?: { mode?: number }): Promise<void> {
    if (this.isLocalPath(path)) return this.localFs.mkdir(path, options)
    const modeStr = options?.mode !== undefined ? ` -m ${options.mode.toString(8)}` : ''
    await this.conn.exec(`mkdir -p${modeStr} ${shellQuote(path)}`)
  }

  async readFile(path: string, options: { encoding: BufferEncoding }): Promise<string> {
    if (this.isLocalPath(path)) return this.localFs.readFile(path, options)
    const result = await this.conn.exec(`cat ${shellQuote(path)}`)
    if (result.code !== 0) {
      const err = new Error(`ENOENT: no such file or directory, open '${path}'`) as NodeJS.ErrnoException
      err.code = 'ENOENT'
      throw err
    }
    return result.stdout
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    if (this.isLocalPath(oldPath)) return this.localFs.rename(oldPath, newPath)
    await this.conn.exec(`mv ${shellQuote(oldPath)} ${shellQuote(newPath)}`)
  }

  statSync(path: string): fs.Stats {
    if (this.isLocalPath(path)) return this.localFs.statSync(path)
    const output = this.conn.execSync(this.statCmd(path, true))
    return makeStats(this.parseStatOutput(output))
  }

  lstatSync(path: string): fs.Stats {
    if (this.isLocalPath(path)) return this.localFs.lstatSync(path)
    const output = this.conn.execSync(this.statCmd(path, false))
    return makeStats(this.parseStatOutput(output))
  }

  readFileSync(path: string, options: { encoding: BufferEncoding }): string {
    if (this.isLocalPath(path)) return this.localFs.readFileSync(path, options)
    return this.conn.execSync(`cat ${shellQuote(path)}`)
  }

  readFileBytesSync(path: string): Buffer {
    if (this.isLocalPath(path)) return this.localFs.readFileBytesSync(path)
    const output = this.conn.execSync(`cat ${shellQuote(path)}`)
    return Buffer.from(output, 'binary')
  }

  readSync(path: string, options: { length: number }): { buffer: Buffer; bytesRead: number } {
    if (this.isLocalPath(path)) return this.localFs.readSync(path, options)
    const output = this.conn.execSync(`head -c ${options.length} ${shellQuote(path)}`)
    const buffer = Buffer.from(output, 'binary')
    return { buffer, bytesRead: buffer.length }
  }

  appendFileSync(path: string, data: string, options?: { mode?: number }): void {
    if (this.isLocalPath(path)) return this.localFs.appendFileSync(path, data, options)
    // Use printf + >> for append to handle special characters
    this.conn.execSync(`cat >> ${shellQuote(path)}`, { input: data })
  }

  copyFileSync(src: string, dest: string): void {
    if (this.isLocalPath(src) && this.isLocalPath(dest)) return this.localFs.copyFileSync(src, dest)
    this.conn.execSync(`cp ${shellQuote(src)} ${shellQuote(dest)}`)
  }

  unlinkSync(path: string): void {
    if (this.isLocalPath(path)) return this.localFs.unlinkSync(path)
    this.conn.execSync(`rm ${shellQuote(path)}`)
  }

  renameSync(oldPath: string, newPath: string): void {
    if (this.isLocalPath(oldPath)) return this.localFs.renameSync(oldPath, newPath)
    this.conn.execSync(`mv ${shellQuote(oldPath)} ${shellQuote(newPath)}`)
  }

  linkSync(target: string, path: string): void {
    if (this.isLocalPath(path)) return this.localFs.linkSync(target, path)
    this.conn.execSync(`ln ${shellQuote(target)} ${shellQuote(path)}`)
  }

  symlinkSync(target: string, path: string, type?: 'dir' | 'file' | 'junction'): void {
    if (this.isLocalPath(path)) return this.localFs.symlinkSync(target, path, type)
    this.conn.execSync(`ln -s ${shellQuote(target)} ${shellQuote(path)}`)
  }

  readlinkSync(path: string): string {
    if (this.isLocalPath(path)) return this.localFs.readlinkSync(path)
    return this.conn.execSync(`readlink ${shellQuote(path)}`).trim()
  }

  realpathSync(path: string): string {
    if (this.isLocalPath(path)) return this.localFs.realpathSync(path)
    return this.conn.execSync(`realpath ${shellQuote(path)}`).trim()
  }

  mkdirSync(dirPath: string, options?: { mode?: number }): void {
    if (this.isLocalPath(dirPath)) return this.localFs.mkdirSync(dirPath, options)
    const modeStr = options?.mode !== undefined ? ` -m ${options.mode.toString(8)}` : ''
    this.conn.execSync(`mkdir -p${modeStr} ${shellQuote(dirPath)}`)
  }

  readdirSync(path: string): fs.Dirent[] {
    if (this.isLocalPath(path)) return this.localFs.readdirSync(path)
    const output = this.conn.execSync(`ls -la ${shellQuote(path)}`)
    return this.parseLsOutput(output, path)
  }

  readdirStringSync(path: string): string[] {
    if (this.isLocalPath(path)) return this.localFs.readdirStringSync(path)
    const output = this.conn.execSync(`ls -1 ${shellQuote(path)}`)
    return output.trim().split('\n').filter(Boolean)
  }

  isDirEmptySync(path: string): boolean {
    if (this.isLocalPath(path)) return this.localFs.isDirEmptySync(path)
    const output = this.conn.execSync(`ls -A ${shellQuote(path)}`)
    return output.trim() === ''
  }

  rmdirSync(path: string): void {
    if (this.isLocalPath(path)) return this.localFs.rmdirSync(path)
    this.conn.execSync(`rmdir ${shellQuote(path)}`)
  }

  rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void {
    if (this.isLocalPath(path)) return this.localFs.rmSync(path, options)
    const flags: string[] = []
    if (options?.recursive) flags.push('r')
    if (options?.force) flags.push('f')
    const flagStr = flags.length > 0 ? `-${flags.join('')} ` : ''
    this.conn.execSync(`rm ${flagStr}${shellQuote(path)}`)
  }

  writeFileSync(
    path: string,
    content: string,
    options: { encoding: BufferEncoding; flush?: boolean; mode?: number },
  ): void {
    if (this.isLocalPath(path)) return this.localFs.writeFileSync(path, content, options)
    // Write via stdin pipe to handle arbitrary content
    this.conn.execSync(`cat > ${shellQuote(path)}`, { input: content })
    if (options.mode !== undefined) {
      this.conn.execSync(`chmod ${options.mode.toString(8)} ${shellQuote(path)}`)
    }
  }

  chmodSync(path: string, mode: number): void {
    if (this.isLocalPath(path)) return this.localFs.chmodSync(path, mode)
    this.conn.execSync(`chmod ${mode.toString(8)} ${shellQuote(path)}`)
  }

  createWriteStream(path: string): fs.WriteStream {
    // For remote files, we can't easily create a WriteStream.
    // Fall back to local fs — this is only used in a few places
    // (e.g., task output) which should always be local.
    return this.localFs.createWriteStream(path)
  }

  async readFileBytes(path: string, maxBytes?: number): Promise<Buffer> {
    if (this.isLocalPath(path)) return this.localFs.readFileBytes(path, maxBytes)
    const cmd = maxBytes !== undefined
      ? `head -c ${maxBytes} ${shellQuote(path)}`
      : `cat ${shellQuote(path)}`
    const result = await this.conn.exec(cmd)
    return Buffer.from(result.stdout, 'binary')
  }

  // --- Helpers ---

  private parseLsOutput(output: string, _parentPath: string): fs.Dirent[] {
    const lines = output.trim().split('\n')
    const entries: fs.Dirent[] = []

    for (const line of lines) {
      const parsed = parseLsLine(line)
      if (!parsed) continue

      // Construct a Dirent-like object
      const dirent = {
        name: parsed.name,
        path: _parentPath,
        parentPath: _parentPath,
        isFile: () => !parsed.isDir && !parsed.isSymlink,
        isDirectory: () => parsed.isDir,
        isSymbolicLink: () => parsed.isSymlink,
        isBlockDevice: () => false,
        isCharacterDevice: () => false,
        isFIFO: () => false,
        isSocket: () => false,
      } as fs.Dirent

      entries.push(dirent)
    }

    return entries
  }
}
