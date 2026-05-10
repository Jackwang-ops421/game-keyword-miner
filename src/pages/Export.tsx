import { useState } from 'react'
import { getCandidates, exportCSV } from '@/api'
import { calculateKeywordScore, getDecisionLabel } from '@/utils/score'

export default function Export() {
  const [loading, setLoading] = useState(false)
  const [exportType, setExportType] = useState<'csv' | 'markdown'>('csv')

  const handleExportCSV = async () => {
    setLoading(true)
    try {
      const candidates = await getCandidates({ limit: 1000 })

      // Build CSV content
      const headers = ['ID', '游戏名', '来源平台', '发布时间', '发现时间', '状态', '分数', '决策', '备注']
      const rows = candidates.map((c: any) => {
        const score = calculateKeywordScore({
          publishedAt: c.publishedAt,
          discoveredAt: c.discoveredAt,
          playableInBrowser: c.canEmbed,
        })
        return [
          c.id,
          c.name,
          c.sourcePlatform,
          c.publishedAt || '',
          c.discoveredAt,
          c.status,
          score.totalScore,
          score.decision,
          c.notes || '',
        ]
      })

      const csvContent = [
        headers.join(','),
        ...rows.map((row: any[]) =>
          row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n')

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `game-keywords-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      alert('导出失败')
    } finally {
      setLoading(false)
    }
  }

  const handleExportMarkdown = async () => {
    setLoading(true)
    try {
      const candidates = await getCandidates({ limit: 100 })

      // Filter high score candidates
      const topCandidates = candidates
        .map((c: any) => ({
          ...c,
          score: calculateKeywordScore({
            publishedAt: c.publishedAt,
            discoveredAt: c.discoveredAt,
            playableInBrowser: c.canEmbed,
          }),
        }))
        .filter((c: any) => c.score.totalScore >= 65)
        .sort((a: any, b: any) => b.score.totalScore - a.score.totalScore)

      // Build markdown
      const today = new Date().toISOString().slice(0, 10)
      let md = `# 游戏关键词日报 - ${today}\n\n`

      md += `## 概览\n\n`
      md += `- 总候选词: ${candidates.length}\n`
      md += `- 高分词(≥65): ${topCandidates.length}\n`
      md += `- 立即上站: ${topCandidates.filter((c: any) => c.score.decision === 'immediate_launch').length}\n`
      md += `- 快速做页: ${topCandidates.filter((c: any) => c.score.decision === 'quick_page').length}\n\n`

      if (topCandidates.length > 0) {
        md += `## 高分词列表\n\n`
        md += `| 游戏名 | 来源 | 分数 | 决策 | 备注 |\n`
        md += `|--------|------|------|------|------|\n`

        for (const c of topCandidates) {
          const label = getDecisionLabel(c.score.decision).label
          md += `| ${c.name} | ${c.sourcePlatform} | ${c.score.totalScore} | ${label} | ${c.notes || '-'} |\n`
        }
      }

      md += `\n---\n*由 Game Keyword Miner 自动生成*\n`

      // Download
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `game-keyword-report-${today}.md`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      alert('导出失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">导出中心</h2>

      <div className="grid gap-6 md:grid-cols-2">
        {/* CSV Export */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📊</span>
            <div>
              <h3 className="font-semibold text-gray-800">CSV 候选词表</h3>
              <p className="text-sm text-gray-500">导出所有候选词的完整数据</p>
            </div>
          </div>
          <ul className="text-sm text-gray-500 space-y-1 mb-4">
            <li>• 包含所有字段</li>
            <li>• 可用 Excel 打开</li>
            <li>• 支持批量编辑后回导</li>
          </ul>
          <button
            onClick={handleExportCSV}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition"
          >
            {loading ? '导出中...' : '下载 CSV'}
          </button>
        </div>

        {/* Markdown Export */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📝</span>
            <div>
              <h3 className="font-semibold text-gray-800">Markdown 日报</h3>
              <p className="text-sm text-gray-500">导出高分候选词的格式化报告</p>
            </div>
          </div>
          <ul className="text-sm text-gray-500 space-y-1 mb-4">
            <li>• 仅包含 65 分以上高分词</li>
            <li>• 包含概览统计</li>
            <li>• 适合每日汇报</li>
          </ul>
          <button
            onClick={handleExportMarkdown}
            disabled={loading}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition"
          >
            {loading ? '导出中...' : '下载 Markdown'}
          </button>
        </div>
      </div>

      {/* Export Preview */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-4">导出格式预览</h3>
        <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <pre>{`ID,游戏名,来源平台,发布时间,发现时间,状态,分数,决策,备注
1,Nomad Idle,itch.io,2024-01-15,2024-01-15,pending,86,immediate_launch,热门独立游戏
2,Dark Loop,gamejolt,2024-01-14,2024-01-14,observing,67,quick_page,需观察趋势`}</pre>
        </div>
      </div>
    </div>
  )
}