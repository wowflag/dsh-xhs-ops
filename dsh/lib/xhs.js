// dsh-xhs-ops - Xiaohongshu web adapter.
// Read-only by design: this module never posts, comments or publishes.
//
// Two read paths, in order of reliability:
//  1. Page crawl: fetch an HTML page with the session cookie and parse the
//     `window.__INITIAL_STATE__` payload the site server-renders into it. This
//     needs no request signature, which is why it is the primary path.
//  2. JSON API probe: used only to validate a cookie (user/me).
//
// The JSON API signs requests with x-s / x-t; without a signature it answers
// with a risk-control rejection, so it is not used for data reads.

const WEB_BASE = 'https://edith.xiaohongshu.com'
const HOME = 'https://www.xiaohongshu.com'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const RISK_STATUS = new Set([401, 403, 406, 461, 471])

export function normalizeCookie(input) {
  if (typeof input !== 'string') return ''
  let value = input.trim()
  if (value === '') return ''
  value = value.replace(/^cookie\s*:\s*/i, '')
  value = value.replace(/[\r\n]+/g, ' ').trim()
  if (!value.includes('=')) {
    if (/^[A-Za-z0-9._%-]{16,}$/.test(value)) return 'web_session=' + value
    return ''
  }
  return value
}

function headers(cookie, accept) {
  return {
    'user-agent': UA,
    accept: accept || 'application/json, text/plain, */*',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
    referer: HOME + '/',
    origin: HOME,
    ...(cookie ? { cookie } : {}),
  }
}

async function requestJson(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || 15000)
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: headers(options.cookie || ''),
      signal: controller.signal,
      redirect: 'follow',
    })
    const text = await response.text()
    let json = null
    try { json = JSON.parse(text) } catch (err) { json = null }
    return { status: response.status, ok: response.ok, json, text: text.slice(0, 300) }
  } catch (err) {
    const aborted = err && (err.name === 'AbortError' || err.code === 'ABORT_ERR')
    return { status: 0, ok: false, json: null, text: aborted ? 'timeout' : String(err && err.message ? err.message : err).slice(0, 200) }
  } finally {
    clearTimeout(timer)
  }
}

async function requestHtml(url, cookie) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: headers(cookie, 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'),
      signal: controller.signal,
      redirect: 'follow',
    })
    const html = await response.text()
    return {
      status: response.status,
      ok: response.ok,
      finalUrl: response.url || url,
      html,
      loginWall: /\/login\b/i.test(String(response.url || '')) || /请登录|登录后查看|扫码登录/.test(html.slice(0, 4000)),
    }
  } catch (err) {
    const aborted = err && (err.name === 'AbortError' || err.code === 'ABORT_ERR')
    return { status: 0, ok: false, finalUrl: url, html: '', loginWall: false, error: aborted ? 'timeout' : String(err && err.message ? err.message : err).slice(0, 200) }
  } finally {
    clearTimeout(timer)
  }
}

export function parseInitialState(html) {
  if (typeof html !== 'string' || html === '') return null
  const marker = 'window.__INITIAL_STATE__'
  const at = html.indexOf(marker)
  if (at === -1) return null
  const eq = html.indexOf('=', at)
  if (eq === -1) return null
  let start = eq + 1
  while (start < html.length && /\s/.test(html[start])) start += 1
  if (html[start] !== '{') return null
  // Walk to the matching brace, ignoring braces inside strings.
  let depth = 0
  let inString = false
  let quote = ''
  let escaped = false
  for (let i = start; i < html.length; i++) {
    const ch = html[i]
    if (inString) {
      if (escaped) { escaped = false; continue }
      if (ch === '\\') { escaped = true; continue }
      if (ch === quote) { inString = false }
      continue
    }
    if (ch === '"' || ch === "'") { inString = true; quote = ch; continue }
    if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) {
        const raw = html.slice(start, i + 1)
        try {
          return JSON.parse(raw.replace(/undefined/g, 'null'))
        } catch (err) {
          return null
        }
      }
    }
  }
  return null
}

function toCount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value) : 0
  const text = String(value === undefined || value === null ? '' : value).trim().toLowerCase()
  if (text === '') return 0
  let mult = 1
  if (text.includes('w') || text.includes('万')) mult = 10000
  else if (text.includes('k')) mult = 1000
  const num = parseFloat(text.replace(/[^0-9.]/g, ''))
  return Number.isFinite(num) ? Math.round(num * mult) : 0
}

function isNoteLike(node) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return false
  const id = node.noteId || node.note_id || node.id
  if (typeof id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(id)) return false
  const title = node.displayTitle || node.display_title || node.title || node.desc
  return typeof title === 'string' && title !== ''
}

// Structure-agnostic collectors: XHS reshapes __INITIAL_STATE__ often, so the
// crawler walks the tree for objects that look like notes / comments / hot
// terms instead of hard-coding one path.
function walk(root, visit, limit = 60000) {
  const stack = [root]
  let seen = 0
  while (stack.length > 0 && seen < limit) {
    const node = stack.pop()
    seen += 1
    if (!node || typeof node !== 'object') continue
    visit(node)
    if (Array.isArray(node)) {
      for (const item of node) if (item && typeof item === 'object') stack.push(item)
    } else {
      for (const key of Object.keys(node)) {
        const value = node[key]
        if (value && typeof value === 'object') stack.push(value)
      }
    }
  }
}

export function collectNotes(state, limit = 60) {
  const out = []
  const seen = new Set()
  walk(state, (node) => {
    if (out.length >= limit || !isNoteLike(node)) return
    const id = String(node.noteId || node.note_id || node.id).toLowerCase()
    if (seen.has(id)) return
    seen.add(id)
    const user = node.user || node.author || {}
    const interact = node.interactInfo || node.interact_info || {}
    out.push({
      id,
      title: String(node.displayTitle || node.display_title || node.title || '').trim().slice(0, 120),
      desc: String(node.desc || '').slice(0, 300),
      author: String(user.nickname || user.nickName || user.name || ''),
      likes: toCount(interact.likedCount || interact.liked_count || node.likedCount),
      collects: toCount(interact.collectedCount || interact.collected_count || node.collectedCount),
      comments: toCount(interact.commentCount || interact.comment_count || node.commentCount),
      shares: toCount(interact.shareCount || interact.share_count || node.shareCount),
      publishedAt: Number(node.time || node.publishTime || 0) || 0,
      url: HOME + '/explore/' + id,
      source: 'crawl',
    })
  })
  return out
}

export function collectComments(state, noteId) {
  const out = []
  const seen = new Set()
  walk(state, (node) => {
    if (out.length >= 80) return
    if (!node || typeof node !== 'object' || Array.isArray(node)) return
    const content = node.content
    if (typeof content !== 'string' || content.trim() === '') return
    const user = node.userInfo || node.user_info || node.user || {}
    const id = String(node.id || node.commentId || node.comment_id || '')
    const key = id || content
    if (seen.has(key)) return
    seen.add(key)
    out.push({
      id,
      noteId: String(noteId || node.noteId || ''),
      user: String(user.nickname || user.nickName || user.name || ''),
      content: content.replace(/\s+/g, ' ').trim().slice(0, 300),
      likes: toCount(node.likeCount || node.like_count || node.likedCount),
      subCount: toCount(node.subCommentCount || node.sub_comment_count),
      createdAt: Number(node.createTime || node.create_time || 0) || 0,
      ipLocation: String(node.ipLocation || ''),
      source: 'crawl',
    })
  })
  return out
}

export function collectHotTopics(state, limit = 40) {
  const out = []
  const seen = new Set()
  walk(state, (node) => {
    if (out.length >= limit) return
    if (!node || typeof node !== 'object' || Array.isArray(node)) return
    const name = node.title || node.name || node.word || node.keyword
    const heat = node.hotValue || node.hot_value || node.viewNum || node.view_num || node.score
    if (typeof name !== 'string' || name.trim() === '' || name.length > 40) return
    if (heat === undefined || heat === null) return
    const key = name.trim()
    if (seen.has(key)) return
    // A note card also has a title; require an explicit heat field shape.
    if (node.noteId || node.note_id) return
    seen.add(key)
    out.push({ name: key, heat: toCount(heat) || Number(heat) || 0 })
  })
  return out.sort((a, b) => b.heat - a.heat)
}

function loginRequired() {
  return {
    ok: false,
    reason: 'login-required',
    message: '小红书把未登录请求重定向到登录页，页面里没有数据。请先完成账号授权，或在对话里说「登录小红书」由我在浏览器里登录后代抓。',
  }
}

function noCookie() {
  return {
    ok: false,
    reason: 'unlinked',
    message: '还没有授权账号：先在 设置 → 小红书账号 保存 Cookie，或在对话里说「登录小红书」由我代抓。',
  }
}

// A note page only renders its server data when the URL carries `xsec_token`;
// a bare /explore/<id> redirects to the 404 page. Accept either a full URL
// copied from the address bar or a bare id, and report `need-token` for the
// latter instead of pretending the note is gone.
export async function crawlNotePage(cookie, input) {
  if (!cookie) return noCookie()
  const raw = String(input === undefined || input === null ? '' : input).trim()
  const id = extractNoteId(raw)
  let url = ''
  if (/^https?:\/\//i.test(raw) && raw.includes('xsec_token=')) url = raw
  else if (id) url = HOME + '/explore/' + id
  else return { ok: false, reason: 'no-note', message: '没有识别到笔记链接或 ID，请粘贴笔记页的完整链接。' }

  const page = await requestHtml(url, cookie)
  if (page.error) return { ok: false, reason: 'network', message: '请求失败：' + page.error }
  if (page.loginWall) return loginRequired()
  if (/\/404|error_code=/.test(String(page.finalUrl))) {
    return {
      ok: false,
      reason: 'need-token',
      noteId: id,
      message: '笔记页需要 xsec_token：请复制笔记页地址栏里的完整链接（形如 /explore/xxx?xsec_token=...&xsec_source=pc_search），或小红书 App 的分享链接。',
    }
  }
  const state = parseInitialState(page.html)
  if (!state) {
    return { ok: false, reason: 'parse', message: '页面里没有解析到初始化数据（HTTP ' + page.status + '）。这条笔记可能已删除或仅登录可见。' }
  }
  const notes = collectNotes(state, 5).filter((note) => id === '' || note.id === id.toLowerCase())
  const comments = collectComments(state, id)
  if (notes.length === 0 && comments.length === 0) {
    return { ok: false, reason: 'empty', message: '页面数据里没有这篇笔记的正文或评论。' }
  }
  const note = notes[0] || { id, title: '', likes: 0, collects: 0, comments: 0 }
  return { ok: true, note, comments, noteTitle: note.title, status: page.status }
}

export async function crawlProfilePage(cookie, userId) {
  if (!cookie) return noCookie()
  if (!userId) return { ok: false, reason: 'no-user', message: '缺少用户 ID，请在设置里填写主页链接。' }
  const url = HOME + '/user/profile/' + encodeURIComponent(userId)
  const page = await requestHtml(url, cookie)
  if (page.error) return { ok: false, reason: 'network', message: '请求失败：' + page.error }
  if (page.loginWall) return loginRequired()
  const state = parseInitialState(page.html)
  if (!state) return { ok: false, reason: 'parse', message: '页面里没有解析到初始化数据（HTTP ' + page.status + '）。' }
  const notes = collectNotes(state, 60)
  if (notes.length === 0) {
    return { ok: false, reason: 'empty', message: '主页页面里没有笔记数据。可能是私密账号，或页面改为前端渲染。' }
  }
  return { ok: true, notes, userId, status: page.status }
}

export async function crawlExplorePage(cookie) {
  if (!cookie) return noCookie()
  const page = await requestHtml(HOME + '/explore', cookie)
  if (page.error) return { ok: false, reason: 'network', message: '请求失败：' + page.error }
  if (page.loginWall) return loginRequired()
  const state = parseInitialState(page.html)
  if (!state) return { ok: false, reason: 'parse', message: '首页没有解析到初始化数据（HTTP ' + page.status + '）。' }
  const notes = collectNotes(state, 40)
  const topics = collectHotTopics(state, 40)
  if (notes.length === 0 && topics.length === 0) {
    return { ok: false, reason: 'empty', message: '首页数据里没有推荐笔记或热词。' }
  }
  return { ok: true, notes, topics, status: page.status }
}

export async function crawlSearchPage(cookie, keyword) {
  if (!cookie) return noCookie()
  if (!keyword) return { ok: false, reason: 'no-keyword', message: '请填写关键词。' }
  const url = HOME + '/search_result?keyword=' + encodeURIComponent(keyword) + '&source=web_search_result_notes'
  const page = await requestHtml(url, cookie)
  if (page.error) return { ok: false, reason: 'network', message: '请求失败：' + page.error }
  if (page.loginWall) return loginRequired()
  const state = parseInitialState(page.html)
  if (!state) return { ok: false, reason: 'parse', message: '搜索页没有解析到初始化数据（HTTP ' + page.status + '）。' }
  const notes = collectNotes(state, 40)
  const topics = collectHotTopics(state, 20)
  if (notes.length === 0 && topics.length === 0) {
    return {
      ok: false,
      reason: 'client-rendered',
      message: '搜索页是前端渲染，服务端返回的 HTML 里没有结果。请在对话里说「抓取关键词：' + keyword + '」，我用浏览器打开后把结果写回工作台。',
      keyword,
    }
  }
  return { ok: true, notes, topics, keyword, status: page.status }
}

function classify(res) {
  if (res.status === 0) return { reason: 'network', message: '网络请求失败：' + res.text }
  if (RISK_STATUS.has(res.status)) {
    return { reason: 'risk', message: '接口返回风控校验（HTTP ' + res.status + '）。Cookie 可能有效，但 JSON 接口需要签名；页面抓取路径不受影响。' }
  }
  if (!res.ok) return { reason: 'http', message: '接口返回 HTTP ' + res.status + '：' + res.text }
  if (!res.json) return { reason: 'parse', message: '返回内容不是 JSON：' + res.text }
  if (res.json && res.json.success === false) {
    return { reason: 'api', message: '接口拒绝：' + String(res.json.msg || res.json.code || 'unknown') }
  }
  return null
}

export async function probeAccount(cookie) {
  const res = await requestJson(WEB_BASE + '/api/sns/web/v2/user/me', { cookie })
  const problem = classify(res)
  if (problem) {
    return { ok: false, reason: problem.reason, message: problem.message, status: res.status, cookieAccepted: res.status !== 0 && res.status !== 401 }
  }
  const data = (res.json && res.json.data) || {}
  const user = data.user || data
  const nickname = String(user.nickname || user.nick_name || user.name || '')
  const userId = String(user.user_id || user.userid || user.id || '')
  if (nickname === '' && userId === '') {
    return { ok: false, reason: 'empty', message: '接口返回成功但没有账号信息。', status: res.status }
  }
  return { ok: true, status: res.status, user: { nickname, userId, redId: String(user.red_id || '') } }
}

export function extractNoteId(input) {
  const text = typeof input === 'string' ? input.trim() : ''
  if (text === '') return ''
  const byPath = text.match(/(?:explore|discovery\/item|note|search_result)\/([0-9a-fA-F]{24})/)
  if (byPath) return byPath[1].toLowerCase()
  const loose = text.match(/\b([0-9a-fA-F]{24})\b/)
  return loose ? loose[1].toLowerCase() : ''
}

export function extractUserId(input) {
  const text = typeof input === 'string' ? input.trim() : ''
  if (text === '') return ''
  const byPath = text.match(/\/user\/profile\/([0-9a-zA-Z]{16,32})/)
  if (byPath) return byPath[1]
  const loose = text.match(/\b([0-9a-f]{24})\b/)
  return loose ? loose[1] : ''
}

export function normalizeImportedComment(raw, noteTitle) {
  const item = raw && typeof raw === 'object' ? raw : {}
  return {
    id: String(item.id || ''),
    noteId: String(item.noteId || item.note_id || ''),
    noteTitle: String(noteTitle || item.noteTitle || item.note || '').slice(0, 80),
    user: String(item.user || item.用户 || item.author || ''),
    content: String(item.content || item.评论 || item.text || item.comment || '').replace(/\s+/g, ' ').trim().slice(0, 300),
    likes: toCount(item.likes || item.赞 || item.likeCount),
    subCount: toCount(item.subCount || item.回复 || 0),
    createdAt: Number(item.createdAt || item.time || 0) || 0,
    ipLocation: String(item.ipLocation || ''),
    source: 'import',
  }
}

export function normalizeImportedNote(raw) {
  const item = raw && typeof raw === 'object' ? raw : {}
  const id = String(item.id || item.noteId || '').toLowerCase()
  return {
    id,
    title: String(item.title || item.标题 || '').trim().slice(0, 120),
    desc: String(item.desc || item.正文 || '').slice(0, 400),
    author: String(item.author || item.作者 || ''),
    likes: toCount(item.likes || item.赞 || item.liked),
    collects: toCount(item.collects || item.收藏),
    comments: toCount(item.comments || item.评论),
    shares: toCount(item.shares || item.分享),
    publishedAt: Number(item.publishedAt || item.time || 0) || 0,
    url: String(item.url || (id ? HOME + '/explore/' + id : '')),
    source: 'import',
  }
}

export const PUBLISH_CHECKLIST = [
  '标题已定稿（建议 20 字内）',
  '正文前 3 行给出结论或钩子',
  '话题标签 3–5 个，与内容强相关',
  '封面为 3:4 竖图，文字不超过两行',
  '合规自检无高风险项',
  '图片与素材已确认授权',
  '定位 / @ 提醒按需添加',
]

export function buildDraftPackage(note, settings = {}) {
  const item = note && typeof note === 'object' ? note : {}
  const tags = Array.isArray(item.tags)
    ? item.tags.map((tag) => String(tag).replace(/^#/, '').trim()).filter((tag) => tag !== '')
    : []
  const creatorUrl = typeof settings.creatorUrl === 'string' && settings.creatorUrl !== ''
    ? settings.creatorUrl
    : 'https://creator.xiaohongshu.com/publish/publish'
  const title = String(item.title || '').trim()
  const body = String(item.body || '')
  return {
    title,
    body,
    tags,
    noteType: String(item.noteType || '图文'),
    checklist: PUBLISH_CHECKLIST.slice(),
    charCount: { title: title.length, body: body.length, tags: tags.length },
    links: { creator: creatorUrl, explore: HOME + '/explore' },
    submitMode: 'draft-manual',
    instructions: [
      '1. 打开创作服务平台发布页',
      '2. 把标题、正文、话题标签逐项粘贴',
      '3. 上传封面与配图',
      '4. 先存草稿，人工确认后发布',
    ],
  }
}
