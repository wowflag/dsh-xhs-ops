// dsh-xhs-ops - local compliance engine.
// Rule-based only: no network call, no model call, so it works while the
// account is unlinked. Categories follow the advertising-law and platform
// risk areas that most often get a Xiaohongshu note limited or removed.

const RULES = [
  {
    category: '绝对化用语',
    level: 'high',
    suggestion: '改为可验证的具体描述（如「本期对比里手感更好」），避免「最」「第一」「顶级」等排他表述',
    terms: [
      '最好', '最佳', '最高级', '最低价', '最便宜', '最划算', '最强', '最美', '最有效',
      '全网第一', '销量第一', '行业第一', '国内第一', '第一品牌',
      '国家级', '世界级', '顶级', '顶尖', '极品', '极致',
      '绝无仅有', '独一无二', '史无前例', '空前绝后', '王牌', '冠军', '天花板',
      '100%', '百分百', '绝对', '永久', '唯一', '首创', '万能', '神效', '特效',
    ],
  },
  {
    category: '医疗功效宣称',
    level: 'high',
    suggestion: '化妆品、食品笔记不得宣称疗效；改为使用感受（如「用完皮肤状态稳定」），并删除治疗类表述',
    terms: [
      '治疗', '治愈', '根治', '疗效', '药效', '处方', '药用',
      '消炎', '杀菌', '抗菌', '抗病毒', '抗癌', '降血压', '降血糖', '降血脂',
      '祛斑', '祛痘', '生发', '育发', '丰胸', '减肥', '瘦身', '燃脂',
      '无副作用', '无毒副作用', '包治', '药妆', '医疗级', '医学级',
    ],
  },
  {
    category: '引流导流',
    level: 'high',
    suggestion: '删除站外联系方式；把转化引导放到主页或专业号私信入口，正文只留互动话题',
    terms: [
      '加微信', '加vx', '加VX', '加v', '加V', '微信号', 'wx号', 'vx号',
      '私信我', '私我', '扫码', '二维码', '扫一扫',
      '主页链接', '店铺链接', '淘宝', '拼多多', '代购', '招代理', '一件代发',
      '加群', '进群', '评论区扣', '扣1', '小黄车', '橱窗',
    ],
  },
  {
    category: '虚假营销',
    level: 'medium',
    suggestion: '删除不可核验的承诺，改为客观信息（批次、渠道、成分表）',
    terms: [
      '正品保证', '假一赔十', '假一赔百', '专供', '特供', '内部渠道', '官方唯一',
      '限时秒杀', '清仓', '免费送', '抽奖', '0元', '全网最低',
      '保证有效', '立竿见影', '当天见效', '三天见效', '七天见效',
    ],
  },
  {
    category: '侵权与素材',
    level: 'medium',
    suggestion: '确认素材授权；删除「侵删」「来源网络」这类免责写法，改用自有拍摄或已授权素材',
    terms: ['转载', '侵删', '图片来源网络', '图源网络', '明星同款', '官方图', '网图'],
  },
  {
    category: '未成年人相关',
    level: 'medium',
    suggestion: '涉及未成年人的内容避免功效、身材、消费诱导表述，改为场景描述',
    terms: ['未成年', '学生党必备', '儿童专用', '宝宝专用', '小学生', '中学生'],
  },
]

const PATTERNS = [
  { category: '联系方式', level: 'high', suggestion: '删除手机号 / 社交账号，改用平台内互动', pattern: /(?<!\d)1[3-9]\d{9}(?!\d)/g },
  { category: '联系方式', level: 'high', suggestion: '删除站外社交账号', pattern: /(?:qq|QQ|vx|VX|wx|WX|微信)\s*[:：]?\s*[A-Za-z0-9_-]{5,}/g },
  { category: '站外链接', level: 'high', suggestion: '删除站外链接；平台不允许正文出现可点击外链', pattern: /https?:\/\/[^\s，。；）)]+/g },
]

const LEVEL_WEIGHT = { high: 18, medium: 10, low: 5 }

function collectHits(text) {
  const hits = []
  for (const rule of RULES) {
    for (const term of rule.terms) {
      let from = 0
      for (;;) {
        const at = text.indexOf(term, from)
        if (at === -1) break
        hits.push({
          term,
          start: at,
          end: at + term.length,
          category: rule.category,
          level: rule.level,
          suggestion: rule.suggestion,
        })
        from = at + term.length
      }
    }
  }
  for (const rule of PATTERNS) {
    const re = new RegExp(rule.pattern.source, rule.pattern.flags)
    let match
    while ((match = re.exec(text)) !== null) {
      hits.push({
        term: match[0],
        start: match.index,
        end: match.index + match[0].length,
        category: rule.category,
        level: rule.level,
        suggestion: rule.suggestion,
      })
      if (match[0].length === 0) re.lastIndex += 1
    }
  }
  return hits
}

// Overlapping matches are merged into one span, keeping the highest-priority
// rule and the text that span actually covers, so "全网最低价" is reported (and
// rewritten) as one phrase instead of leaving an orphan "价" behind.
function dedupe(hits, text) {
  const sorted = hits.slice().sort((a, b) => (a.start - b.start) || ((b.end - b.start) - (a.end - a.start)))
  const out = []
  for (const hit of sorted) {
    const last = out[out.length - 1]
    if (last && hit.start < last.end) {
      last.end = Math.max(last.end, hit.end)
      if (!last.categories.includes(hit.category)) last.categories.push(hit.category)
      if ((LEVEL_WEIGHT[hit.level] || 0) > (LEVEL_WEIGHT[last.level] || 0)) {
        last.level = hit.level
      }
      if (hit.term.length > last.term.length) {
        last.category = hit.category
        last.suggestion = hit.suggestion
      }
      if (typeof text === 'string') last.term = text.slice(last.start, last.end)
      continue
    }
    out.push({ ...hit, categories: [hit.category] })
  }
  return out
}

export function checkCompliance(text) {
  const body = typeof text === 'string' ? text : ''
  if (body.trim() === '') {
    return {
      ok: false,
      reason: 'empty',
      message: '没有可检测的文案',
      score: 100,
      level: 'safe',
      summary: { high: 0, medium: 0, low: 0 },
      hits: [],
      checkedAt: Date.now(),
    }
  }

  const hits = dedupe(collectHits(body), body)
  const summary = { high: 0, medium: 0, low: 0 }
  let deductions = 0
  for (const hit of hits) {
    summary[hit.level] = (summary[hit.level] || 0) + 1
    deductions += LEVEL_WEIGHT[hit.level] || 0
  }
  const score = Math.max(0, Math.min(100, 100 - deductions))
  let level = 'safe'
  if (summary.high > 0) level = 'high'
  else if (summary.medium > 0) level = 'medium'
  else if (summary.low > 0) level = 'low'

  return {
    ok: true,
    score,
    level,
    textLength: body.length,
    summary,
    hits,
    checkedAt: Date.now(),
  }
}

// One-click rewrite: replace the riskiest spans with a reviewable marker and
// list every substitution, so the user edits before publishing. Overlapping
// hits are merged first, otherwise a shorter term leaves an orphan fragment.
export function rewriteCompliance(text) {
  const result = checkCompliance(text)
  if (!result.ok) return { ...result, text: typeof text === 'string' ? text : '' }

  const spans = []
  for (const hit of result.hits) {
    const last = spans[spans.length - 1]
    if (last && hit.start <= last.end) {
      last.end = Math.max(last.end, hit.end)
      if (!last.terms.includes(hit.term)) last.terms.push(hit.term)
      if (LEVEL_WEIGHT[hit.level] > LEVEL_WEIGHT[last.level]) last.level = hit.level
      if (!last.categories.includes(hit.category)) last.categories.push(hit.category)
      continue
    }
    spans.push({
      start: hit.start,
      end: hit.end,
      level: hit.level,
      terms: [hit.term],
      categories: [hit.category],
    })
  }

  let out = typeof text === 'string' ? text : ''
  for (let i = spans.length - 1; i >= 0; i--) {
    const span = spans[i]
    const marker = '【已删除「' + span.terms.join(' / ') + '」】'
    out = out.slice(0, span.start) + marker + out.slice(span.end)
  }

  return {
    ...result,
    text: out,
    applied: spans.map((span) => ({
      terms: span.terms,
      categories: span.categories,
      level: span.level,
    })),
  }
}

export function ruleCatalog() {
  return RULES.map((rule) => ({ category: rule.category, level: rule.level, count: rule.terms.length }))
}
