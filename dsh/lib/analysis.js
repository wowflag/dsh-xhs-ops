// dsh-xhs-ops - local analysis.
// Pure functions over rows the workbench already holds (crawled or imported).
// No network, no model: every number returned here is reproducible.

const POSITIVE = ['好用', '喜欢', '回购', '种草', '太香', '爱了', '绝了', '满意', '推荐', '值得', '实用', '舒服', '好看', '惊艳', '宝藏']
const NEGATIVE = ['踩雷', '难用', '智商税', '翻车', '差评', '退货', '假货', '过敏', '闷', '不好用', '后悔', '失望', '贵', '一般般', '踩坑', '被坑', '不太行', '被割', '割韭菜', '坑人', '骗', '垃圾', '太差']
const INTENT = [
  '链接', '求', '哪里买', '多少钱', '价格', '尺寸', '尺码', '码数', '色号', '会不会',
  '怎么样', '适合', '求推荐', '怎么买', '还有吗', '同款', '有没有', '值不值', '能冲',
  '偏小', '偏大', '好搭', '怎么用', '干嘛的',
  '发我', '发个', '私我', '推荐', '靠谱', '排雷', '跟团', '报团', '小团', '抄作业', '抄我',
]
// 引流/站外导流：这类评论不回复、不互动，必要时举报。
const LEAD = [
  '加微信', '加我微信', '加我v', '加个微信', '加vx', '加VX', '加v', '加V', '微信号', 'vx号', 'wx号', '微信',
  '私我', '私聊', '扫码', '二维码', '扫一扫', '加群', '进群', '扣1', '小黄车', '橱窗',
  '代购', '招代理', '一件代发', '优惠券', '领券', '免费领', '抽奖', '淘宝', '拼多多',
  '互关', '互赞', '互粉', '秒杀', '清仓', '优惠',
]

const BUCKETS = [
  { name: '路线攻略', words: ['环线', '自驾', '行程', '路线', '攻略', '不赶路', '特种兵', '几天几晚', '流水账', '天'] },
  { name: '避坑决策', words: ['定居', '现实问题', '值不值得', '避坑', '排雷', '踩雷', '踩坑', '不推荐', '劝退', '对比'] },
  { name: '住宿探店', words: ['民宿', '酒店', '住进', '院落', '小院', '六星街', '住宿', '客栈'] },
  { name: '季节时令', words: ['冬天', '冬季', '秋日', '秋季', '春天', '春日', '夏天', '五一', '十一', '赏花', '下雪'] },
  { name: '风景种草', words: ['美到', '仙境', '震撼', '太美', '出片', '草原', '雪山', '雪景', '日照金山', '云海', '失语', '颜料盘'] },
  { name: '亲子出行', words: ['带娃', '亲子', '宝宝', '孩子', '一家'] },
  { name: '结伴跟团', words: ['跟团', '报团', '小团', '拼团', '包车', '司机'] },
  { name: '穿搭', words: ['穿搭', '通勤', '外套', '裙', '裤', '鞋', '包', '配饰', '显瘦', '叠穿'] },
  { name: '美妆', words: ['口红', '底妆', '粉底', '眼影', '腮红', '妆容', '持妆', '卸妆'] },
  { name: '护肤', words: ['护肤', '精华', '面霜', '水乳', '面膜', '空瓶', '痘痘', '毛孔', '敏感肌', '保湿'] },
  { name: '家居', words: ['收纳', '家居', '出租屋', '小户型', '好物', '清洁', '厨房', '改造'] },
  { name: '美食', words: ['早餐', '食谱', '做饭', '餐厅', '探店', '咖啡', '减脂餐', '烘焙'] },
  { name: '职场', words: ['职场', '面试', '简历', '打工人', '效率', '副业', '升职'] },
  { name: '数码', words: ['数码', '手机', '摄影', '相机', '平板', '耳机'] },
]

export function sentimentOf(text) {
  const body = typeof text === 'string' ? text : ''
  let pos = 0
  let neg = 0
  let intent = 0
  let lead = 0
  for (const word of POSITIVE) if (body.includes(word)) pos += 1
  for (const word of NEGATIVE) if (body.includes(word)) neg += 1
  for (const word of INTENT) if (body.includes(word)) intent += 1
  for (const word of LEAD) if (body.includes(word)) lead += 1
  // 优先级：引流(跳过) > 负面(先处理) > 咨询(承接) > 正面 > 中性
  if (lead > 0) return { label: '引流', score: lead }
  if (neg > pos) return { label: '负面', score: neg - pos }
  if (intent > 0) return { label: '咨询', score: intent }
  if (pos > neg) return { label: '正面', score: pos - neg }
  return { label: '中性', score: 0 }
}

export function interactionOf(note) {
  const item = note && typeof note === 'object' ? note : {}
  return (Number(item.likes) || 0) + (Number(item.collects) || 0) + (Number(item.comments) || 0) + (Number(item.shares) || 0)
}

function bucketOf(note) {
  const haystack = (String(note.title || '') + ' ' + String(note.desc || '')).toLowerCase()
  for (const bucket of BUCKETS) {
    for (const word of bucket.words) {
      if (haystack.includes(word.toLowerCase())) return bucket.name
    }
  }
  return '其他'
}

function median(values) {
  if (values.length === 0) return 0
  const sorted = values.slice().sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid]
}

export function researchSummary(items, keyword) {
  const notes = Array.isArray(items) ? items.filter((item) => item && typeof item === 'object') : []
  const total = notes.length
  if (total === 0) {
    return { ok: false, reason: 'empty', message: '还没有笔记数据，先抓取或导入竞品笔记。' }
  }

  const scored = notes.map((note) => ({ ...note, interaction: interactionOf(note) }))
  scored.sort((a, b) => b.interaction - a.interaction)

  const values = scored.map((note) => note.interaction)
  const avg = Math.round(values.reduce((sum, n) => sum + n, 0) / total)

  const groups = new Map()
  for (const note of scored) {
    const name = bucketOf(note)
    const group = groups.get(name) || { name, count: 0, interaction: 0, likes: 0, collects: 0 }
    group.count += 1
    group.interaction += note.interaction
    group.likes += Number(note.likes) || 0
    group.collects += Number(note.collects) || 0
    groups.set(name, group)
  }
  const angles = Array.from(groups.values())
    .map((group) => ({
      name: group.name,
      count: group.count,
      avgInteraction: Math.round(group.interaction / group.count),
      collectLikeRatio: group.likes === 0 ? 0 : Math.round((group.collects / group.likes) * 100) / 100,
    }))
    .sort((a, b) => b.avgInteraction - a.avgInteraction)

  const insights = []
  const best = angles[0]
  const worst = angles[angles.length - 1]
  const caveat = (angle) => (angle.count < 3 ? '（仅 ' + angle.count + ' 篇，样本偏小）' : '')
  if (best) {
    insights.push('「' + best.name + '」角度场均互动 ' + best.avgInteraction + '，高于整体均值 ' + avg + caveat(best) + '，可优先铺 2–3 篇同角度内容。')
  }
  if (worst && angles.length > 1 && worst.avgInteraction < avg) {
    insights.push('「' + worst.name + '」角度场均互动 ' + worst.avgInteraction + '，低于均值，建议减少投入或换切入方式。')
  }
  const highCollect = angles.filter((angle) => angle.collectLikeRatio >= 0.8)
  if (highCollect.length > 0) {
    insights.push('收藏赞比 ≥ 0.8 的角度：' + highCollect.map((angle) => angle.name).join('、') + '。这类内容偏「工具型」，适合做成清单或教程。')
  }
  insights.push('样本 ' + total + ' 篇，互动中位数 ' + median(values) + '。头部与中位差距越大，说明选题分化越明显，越值得追头部角度。')

  return {
    ok: true,
    keyword: String(keyword || ''),
    total,
    avgInteraction: avg,
    medianInteraction: median(values),
    angles,
    top: scored.slice(0, 8).map((note) => ({
      id: note.id || '',
      title: note.title || '',
      author: note.author || '',
      interaction: note.interaction,
      likes: Number(note.likes) || 0,
      collects: Number(note.collects) || 0,
      comments: Number(note.comments) || 0,
      url: note.url || '',
      source: note.source || '',
    })),
    insights,
  }
}

function dayKey(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return ''
  const date = new Date(ms)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return month + '-' + day
}

export function reviewSummary(notes, days) {
  const list = Array.isArray(notes) ? notes.filter((item) => item && typeof item === 'object') : []
  const windowDays = Number(days) > 0 ? Number(days) : 0
  const now = Date.now()
  const inRange = windowDays === 0
    ? list
    : list.filter((note) => {
      const at = Number(note.publishedAt) || 0
      return at === 0 || now - at <= windowDays * 86400000
    })

  if (inRange.length === 0) {
    return { ok: false, reason: 'empty', message: windowDays > 0 ? '所选区间内没有笔记数据。' : '还没有笔记数据，先抓取或导入。' }
  }

  const totals = { notes: inRange.length, likes: 0, collects: 0, comments: 0, shares: 0, interaction: 0 }
  for (const note of inRange) {
    totals.likes += Number(note.likes) || 0
    totals.collects += Number(note.collects) || 0
    totals.comments += Number(note.comments) || 0
    totals.shares += Number(note.shares) || 0
  }
  totals.interaction = totals.likes + totals.collects + totals.comments + totals.shares

  const averages = {
    likes: Math.round(totals.likes / totals.notes),
    collects: Math.round(totals.collects / totals.notes),
    comments: Math.round(totals.comments / totals.notes),
    interaction: Math.round(totals.interaction / totals.notes),
  }

  const ranked = inRange
    .map((note) => ({ ...note, interaction: interactionOf(note) }))
    .sort((a, b) => b.interaction - a.interaction)

  const seriesMap = new Map()
  for (const note of ranked) {
    const key = dayKey(Number(note.publishedAt) || 0)
    if (key === '') continue
    const cell = seriesMap.get(key) || { date: key, interaction: 0, notes: 0 }
    cell.interaction += note.interaction
    cell.notes += 1
    seriesMap.set(key, cell)
  }
  const series = Array.from(seriesMap.values()).sort((a, b) => (a.date < b.date ? -1 : 1))

  const collectLike = totals.likes === 0 ? 0 : Math.round((totals.collects / totals.likes) * 100) / 100
  const commentLike = totals.likes === 0 ? 0 : Math.round((totals.comments / totals.likes) * 100) / 100

  const insights = []
  if (collectLike >= 0.8) insights.push('收藏赞比 ' + collectLike + '，内容偏工具型，读者在「存起来之后用」，适合做系列清单。')
  else if (collectLike <= 0.3) insights.push('收藏赞比 ' + collectLike + '，内容偏情绪型，读者看完就走；可补一段可执行清单提升收藏。')
  else insights.push('收藏赞比 ' + collectLike + '，处于中间区间，工具性与情绪性平衡。')
  if (commentLike >= 0.15) insights.push('评论赞比 ' + commentLike + '，评论区活跃，适合在置顶评论做二次引导。')
  else insights.push('评论赞比 ' + commentLike + '，互动偏单向；下一批内容结尾加一个具体提问。')
  const top = ranked[0]
  if (top) insights.push('互动最高的是「' + (top.title || '未命名') + '」，互动 ' + top.interaction + '，可拆成 3 篇延展。')
  if (series.length >= 2) {
    const first = series[0].interaction
    const last = series[series.length - 1].interaction
    const trend = last === first ? '持平' : last > first ? '上行' : '下行'
    insights.push('首尾对比：' + series[0].date + '（' + first + '）→ ' + series[series.length - 1].date + '（' + last + '），趋势' + trend + '。')
  }

  return {
    ok: true,
    range: windowDays === 0 ? '全部' : '近 ' + windowDays + ' 天',
    totals,
    averages,
    collectLikeRatio: collectLike,
    commentLikeRatio: commentLike,
    top: ranked.slice(0, 5).map((note) => ({
      id: note.id || '',
      title: note.title || '',
      likes: Number(note.likes) || 0,
      collects: Number(note.collects) || 0,
      comments: Number(note.comments) || 0,
      interaction: note.interaction,
    })),
    bottom: ranked.slice(-3).map((note) => ({ id: note.id || '', title: note.title || '', interaction: note.interaction })),
    series,
    insights,
  }
}

// 抢前排 / 截流: rank comments on a competitor note by how actionable they are.
export function rankForSeize(comments, noteTitle) {
  const list = Array.isArray(comments) ? comments.filter((item) => item && item.content) : []
  if (list.length === 0) return { ok: false, reason: 'empty', message: '还没有评论数据。' }

  const now = Date.now()
  const rows = list.map((comment) => {
    const sentiment = sentimentOf(comment.content)
    const likes = Number(comment.likes) || 0
    const createdAt = Number(comment.createdAt) || 0
    const ageHours = createdAt > 0 ? Math.max(0, (now - createdAt) / 3600000) : 999
    const intentScore = sentiment.label === '咨询' ? 55 : sentiment.label === '负面' ? 25 : sentiment.label === '引流' ? 0 : 15
    const freshScore = ageHours <= 24 ? 25 : ageHours <= 72 ? 15 : 5
    const spaceScore = likes <= 3 ? 20 : likes <= 20 ? 10 : 0
    const score = Math.min(100, intentScore + freshScore + spaceScore)
    return {
      ...comment,
      sentiment: sentiment.label,
      opportunity: score,
      reason: sentiment.label === '咨询'
        ? '咨询意图明确，回复即可承接'
        : sentiment.label === '负面'
          ? '负面反馈，适合提供解决方案建立信任'
          : sentiment.label === '引流'
            ? '引流/广告，不回复不互动'
            : '泛互动，适合补充信息',
      ageHours: ageHours === 999 ? null : Math.round(ageHours),
    }
  })

  rows.sort((a, b) => b.opportunity - a.opportunity)
  const likes = list.map((comment) => Number(comment.likes) || 0)
  const advice = [
    '先在 24 小时内回复高意向评论：平台会把新回复推到评论区靠前位置。',
    '回复里不放联系方式，只给信息增量（路线、用车、住宿标准、人均），避免被判定导流。',
    '同一篇爆文下不要连续刷评论；一条有价值的长回复比多条短回复更安全。',
    '把高频问题整理成下一篇笔记，标题直接用问题句式。',
  ]

  return {
    ok: true,
    noteTitle: String(noteTitle || ''),
    total: list.length,
    avgLikes: Math.round(likes.reduce((sum, n) => sum + n, 0) / (likes.length || 1)),
    maxLikes: Math.max.apply(null, likes.concat([0])),
    sentiment: countByLabel(rows),
    opportunities: rows.slice(0, 15),
    advice,
  }
}

// 关键词监测: filter imported/ crawled comments by keyword and rank by heat.
export function rankForMonitor(comments, keywords) {
  const list = Array.isArray(comments) ? comments.filter((item) => item && item.content) : []
  const words = (Array.isArray(keywords) ? keywords : String(keywords || '').split(/[,，\s]+/))
    .map((word) => String(word || '').trim())
    .filter((word) => word !== '')

  const scored = list.map((comment) => {
    const sentiment = sentimentOf(comment.content)
    return { ...comment, sentiment: sentiment.label, hits: words.filter((word) => comment.content.includes(word)) }
  })
  const matched = words.length === 0 ? scored : scored.filter((comment) => comment.hits.length > 0)
  matched.sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0))

  const byLabel = countByLabel(matched)
  const total = matched.length
  return {
    ok: true,
    keywords: words,
    total,
    scanned: list.length,
    sentiment: byLabel,
    items: matched.slice(0, 30),
    insights: total === 0
      ? ['没有命中关键词的评论。换一个更短的词，或先导入更多评论。']
      : [
        '命中 ' + total + ' 条（共扫描 ' + list.length + ' 条）。',
        '咨询类 ' + byLabel['咨询'] + ' 条，优先回复这批，转化意图最强。',
        '负面类 ' + byLabel['负面'] + ' 条，先处理再谈增长。',
        byLabel['引流'] > 0 ? '引流/广告类 ' + byLabel['引流'] + ' 条，不回复不互动。' : '',
      ].filter((line) => line !== ''),
  }
}

function countByLabel(rows) {
  const out = { 正面: 0, 负面: 0, 中性: 0, 咨询: 0, 引流: 0 }
  for (const row of rows) out[row.sentiment] = (out[row.sentiment] || 0) + 1
  return out
}

const TEMPLATES = {
  '种草测评': ['先说结论', '使用场景', '真实体验', '适合谁', '互动提问'],
  '干货教程': ['为什么需要', '步骤拆解', '避坑提醒', '结果对比', '互动提问'],
  '避坑清单': ['踩过的坑', '正确做法', '判断标准', '省钱建议', '互动提问'],
  '日常 vlog': ['开场钩子', '时间线', '高光片段', '小遗憾', '互动提问'],
  '对比横评': ['对比对象', '维度拆解', '结论表', '按需选择', '互动提问'],
}

export function composeDraft(input) {
  const data = input && typeof input === 'object' ? input : {}
  const title = String(data.title || '').trim()
  const template = TEMPLATES[data.template] ? data.template : '种草测评'
  const points = String(data.points || '')
    .split(/[\n、,，;；]+/)
    .map((point) => point.trim())
    .filter((point) => point !== '')
  const tags = String(data.tags || '')
    .split(/[\s,，#]+/)
    .map((tag) => tag.trim())
    .filter((tag) => tag !== '')
  const type = String(data.type || '图文')

  if (title === '' && points.length === 0) {
    return { ok: false, reason: 'empty', message: '至少填一个标题或一条要点。' }
  }

  const structure = TEMPLATES[template].slice()
  const lines = []
  lines.push(points.length > 0 ? points[0] + '，这是我最近的真实感受。' : title + '，整理成一篇可以直接抄的版本。')
  lines.push('')
  lines.push('【' + structure[1] + '】')
  const bodyPoints = points.length > 0 ? points : ['用完最大的感受是省事', '细节比想象中好', '价格在可接受区间']
  for (let i = 0; i < bodyPoints.length; i++) {
    lines.push((i + 1) + '. ' + bodyPoints[i])
  }
  lines.push('')
  lines.push('【' + structure[3] + '】')
  lines.push('适合想少走弯路的人；如果你更在意即时效果，可以再等等看。')
  lines.push('')
  lines.push('【' + structure[4] + '】')
  lines.push('你更想看哪一种对比？评论区告我，我下一篇拆开写。')

  const body = lines.join('\n')
  const normalizedTags = tags.length > 0 ? tags : ['好物分享', '真实测评']
  return {
    ok: true,
    template,
    noteType: type,
    title: title === '' ? (points[0] || '未命名草稿').slice(0, 20) : title,
    body,
    tags: normalizedTags,
    structure,
    charCount: { title: title.length, body: body.length, tags: normalizedTags.length },
    note: '模板生成，可直接改；要更贴合账号人设，让助手在这版基础上重写。',
  }
}

// ============================================================================
// 评论运营：回复策略 + 评论混动（v0.3 新增）
// 纯本地、零网络、零模型依赖——与上面的分析函数同一哲学：可复现、可审计。
// 回复只生成「草稿 + 一键复制」，绝不自动发送；发送由人粘贴到平台完成。
// ============================================================================

// 人设（persona）预设。每个账号可绑定一套人设，回复统一按人设语气生成。
const PERSONAS = {
  专业顾问: {
    tone: '克制、有据、分点',
    open: '这个问题问得好。',
    close: '有具体需求可以私我，我按你的情况给建议。',
    taboo: ['保证', '绝对', '最', '100%'],
    fallback: '这个点我建议你结合自己的情况判断，别只看单一维度。',
  },
  亲切姐妹: {
    tone: '口语、带 emoji 节奏、像朋友',
    open: '姐妹这个我懂！',
    close: '还有不懂的随时问我呀～',
    taboo: ['亲', '在吗', '加微信'],
    fallback: '可以先去主页看看我之前的分享，有问题再问我～',
  },
  干货老司机: {
    tone: '简洁、直给、给结论',
    open: '直接说结论：',
    close: '更多细节我主页有合集，自取。',
    taboo: ['广告', '引流', '联系方式'],
    fallback: '一句话：看你的预算和频率，选 X 更省心。',
  },
  品牌官方: {
    tone: '礼貌、正式、引导到官方渠道',
    open: '感谢关注。',
    close: '售后与咨询请走官方私信入口，我们会有专人跟进。',
    taboo: ['亲', '宝宝', '加微信', '私下交易'],
    fallback: '您的问题已记录，稍后官方账号会与您联系。',
  },
}

// 五类评论 → 回复模板（key 与 sentimentOf 的 label 对齐：咨询/负面/正面/中性/引流）。
// 每个模板是一段「策略 + 骨架」，生成时填入评论要点。
// 负面内部再细分「质疑」与「差评」：质疑=讲道理澄清，差评=危机公关共情。
const REPLY_STRATEGIES = {
  咨询: {
    label: '咨询类',
    goal: '承接转化意图，给信息增量，引导到私信/主页',
    template: (comment, persona) => {
      const p = PERSONAS[persona] || PERSONAS['专业顾问']
      return [
        p.open,
        '你问的「' + (truncate(comment, 24)) + '」——我先给你个直接答案：',
        '1. 先看你的预算和频率；',
        '2. 再定规格，这样不容易踩坑。',
        p.close,
      ].join('\n')
    },
    caution: '回复里不放联系方式、不放外链，转化引导放私信入口。',
  },
  负面: {
    label: '负面类（质疑/差评）',
    goal: '先共情、再澄清或担责、给方案，绝不争对错',
    template: (comment, persona) => {
      const p = PERSONAS[persona] || PERSONAS['品牌官方']
      // 差评（含退货/踩雷/难用等）走危机公关；质疑（含贵/一般般/值不值）走事实澄清。
      const isComplaint = /(退货|踩雷|难用|假货|过敏|翻车|差评|被坑|被割|太差|垃圾|骗)/.test(comment)
      if (isComplaint) {
        return [
          '抱歉给你带来不好的体验。',
          '你说的「' + (truncate(comment, 20)) + '」我记下了，这不是我们想要的结果。',
          '麻烦私我具体订单/情况，我会帮你处理，不让你白吃亏。',
        ].join('\n')
      }
      return [
        '你提到「' + (truncate(comment, 20)) + '」，我补充下背景，避免误解：',
        '我写的是我实际遇到的情况，不代表所有人；如果你的场景不同，结果会不一样。',
        '方便的话说下你的具体情况，我帮你判断。',
      ].join('\n')
    },
    caution: '负面公开处先表态、私下再解决；禁止「你理解错了」这类甩锅话术，也禁止抬杠。',
  },
  正面: {
    label: '夸赞类',
    goal: '巩固好感，埋互动钩子，引导二次互动',
    template: (comment, persona) => {
      const p = PERSONAS[persona] || PERSONAS['亲切姐妹']
      return [
        p.open + ' 谢谢喜欢～',
        '能帮到你我就没白写。你是在挑「' + (truncate(comment, 16)) + '」吗？',
        '后续我还会更这个系列，可以蹲一下。',
      ].join('\n')
    },
    caution: '别只回「谢谢」，要埋一个让对方继续互动的钩子。',
  },
  引流: {
    label: '引流/广告类',
    goal: '识别站外导流与竞品拉客，不互动、不回复、必要时举报',
    template: () => '',
    caution: '引流评论不回复、不点赞，避免被判定为共谋导流；明显刷屏可举报。',
  },
  中性: {
    label: '中性/泛互动类',
    goal: '补充信息增量，把路人变关注',
    template: (comment, persona) => {
      const p = PERSONAS[persona] || PERSONAS['干货老司机']
      return [
        p.open,
        '补一个你可能关心的点：' + (truncate(comment, 16)) + '这块，很多人忽略了「频率」这个变量。',
        '感兴趣的话可以看我主页同系列。',
      ].join('\n')
    },
    caution: '中性评论机会分低，可用一句话补充增量，不必每条都回。',
  },
}

function truncate(text, max) {
  const s = String(text || '').trim()
  return s.length > max ? s.slice(0, max) + '…' : s
}

// 回复策略：对一批评论（已抓取/已导入）生成回复草稿。
// 每个草稿带：情绪分类、策略、回复文本、合规风险词、复制就绪标记。
export function replyStrategies(comments, options) {
  const list = Array.isArray(comments) ? comments.filter((item) => item && item.content) : []
  const opts = options && typeof options === 'object' ? options : {}
  const persona = PERSONAS[opts.persona] ? opts.persona : '专业顾问'
  if (list.length === 0) return { ok: false, reason: 'empty', message: '还没有评论数据，先去「评论·热点」抓取或导入评论。' }

  const rows = list.map((comment) => {
    const sentiment = sentimentOf(comment.content).label
    const strategy = REPLY_STRATEGIES[sentiment] || REPLY_STRATEGIES['中性']
    const reply = strategy.template(comment.content, persona)
    return {
      content: comment.content,
      user: comment.user || '',
      likes: Number(comment.likes) || 0,
      sentiment,
      strategy: strategy.label,
      goal: strategy.goal,
      reply,
      skip: reply === '',
      caution: strategy.caution,
    }
  })

  const skipped = rows.filter((row) => row.skip).length
  const ready = rows.filter((row) => !row.skip)

  return {
    ok: true,
    persona,
    personaTone: PERSONAS[persona].tone,
    total: list.length,
    ready: ready.length,
    skipped,
    sentiment: countByLabel(rows),
    replies: ready,
    skipNote: skipped > 0 ? '有 ' + skipped + ' 条引流/广告类评论已跳过，不建议回复。' : '',
  }
}

// 评论混动：真人感节奏 + 舆论监测分级。
// 「混动」= 让回复看起来像真人运营：有节奏、有取舍、有监测，而非机械全回。
export function hybridEngine(comments, options) {
  const list = Array.isArray(comments) ? comments.filter((item) => item && item.content) : []
  const opts = options && typeof options === 'object' ? options : {}
  if (list.length === 0) return { ok: false, reason: 'empty', message: '还没有评论数据。' }

  // —— 1. 回复节奏规划（真人感）——
  // 关键：不要一次性回完所有评论。按「回复比例」抽样，并给出间隔建议。
  const replyRatio = opts.replyRatio != null ? Number(opts.replyRatio) : 0.6
  const ratio = Math.max(0.1, Math.min(1, replyRatio))
  const scored = list.map((comment) => {
    const sentiment = sentimentOf(comment.content).label
    // 优先回复：咨询 > 负面 > 正面 > 中性 > 引流(不回)
    const priority = { 咨询: 5, 负面: 4, 正面: 2, 中性: 1, 引流: 0 }[sentiment] || 1
    return { ...comment, sentiment, priority }
  })

  // 引流/广告一律不回（混动的第一条铁律）
  const actionable = scored.filter((row) => row.priority > 0)
  const shouldReply = actionable
    .sort((a, b) => b.priority - a.priority)
    .slice(0, Math.max(1, Math.round(actionable.length * ratio)))

  // 间隔建议：按评论总量给出「每 N 分钟回一条」的节奏，并加随机抖动
  const perIntervalMin = shouldReply.length === 0 ? 30 : Math.max(2, Math.round(60 / shouldReply.length))
  const jitter = Math.max(1, Math.round(perIntervalMin * 0.3))

  // —— 2. 舆论监测分级告警 ——
  const alerts = []
  const negative = scored.filter((row) => row.sentiment === '负面')
  const leads = scored.filter((row) => row.sentiment === '咨询')
  const ads = scored.filter((row) => row.sentiment === '引流')
  const competitive = scored.filter((row) => {
    const t = String(row.content || '')
    return /(别买|不如|某某家|他家|竞品|换个|更便宜|被坑|割韭菜)/.test(t)
  })

  if (negative.length >= 3) {
    alerts.push({ level: 'high', type: '负面聚集', count: negative.length, advice: '负面评论 ≥3 条，先处理负面再做增长；逐条用「差评」模板共情+担责，别群发同一句话。' })
  } else if (negative.length === 1) {
    alerts.push({ level: 'medium', type: '单条负面', count: 1, advice: '出现 1 条负面，优先回复并私下解决，避免发酵。' })
  }
  if (competitive.length > 0) {
    alerts.push({ level: 'medium', type: '竞品/导流干扰', count: competitive.length, advice: '检测到疑似竞品拉客或引导换店的评论，不回复、不互动，必要时举报。' })
  }
  if (ads.length > 0) {
    alerts.push({ level: 'low', type: '引流广告', count: ads.length, advice: '识别到引流/广告评论 ' + ads.length + ' 条，已标记跳过。' })
  }
  if (alerts.length === 0) {
    alerts.push({ level: 'none', type: '无异常', count: 0, advice: '评论区健康，按正常节奏回复即可。' })
  }

  return {
    ok: true,
    total: list.length,
    actionable: actionable.length,
    shouldReplyCount: shouldReply.length,
    replyRatio: ratio,
    rhythm: {
      perIntervalMin,
      jitterMin: jitter,
      suggestion: '每 ' + perIntervalMin + ' 分钟回一条（±' + jitter + ' 分钟随机抖动），共回 ' + shouldReply.length + ' 条；不要连续刷，一条有价值的长回复优于多条短回复。',
    },
    queue: shouldReply.slice(0, 30).map((row) => ({
      content: row.content,
      sentiment: row.sentiment,
      priority: row.priority,
      likes: Number(row.likes) || 0,
    })),
    alerts,
    skipAds: ads.length,
  }
}
