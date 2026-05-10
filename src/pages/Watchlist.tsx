import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCandidates } from '@/api'
import { getDecisionLabel } from '@/utils/score'
import type { Candidate } from '@/types'

export default function Watchlist() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCandidates()
  }, [])

  const loadCandidates = async () => {
    try {
      // Load candidates with status 'observing' or 'ready'
      const [observing, ready] = await Promise.all([
        getCandidates({ status: 'observing', limit: 50 }),
        getCandidates({ status: 'ready', limit: 50 }),
      ])
      setCandidates([...observing, ...ready])
    } catch (error) {
      console.error('Failed to load:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8">加载中...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">监测队列</h2>
        <span className="text-sm text-gray-500">
          共 {candidates.length} 个词在监测中
        </span>
      </div>

      {candidates.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">
          <p>暂无监测中的候选词</p>
          <p className="text-sm mt-2">在候选词详情页将状态改为"观察中"即可加入监测队列</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">游戏名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">分数</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">决策</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {candidates.map(candidate => (
                <tr key={candidate.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/candidates/${candidate.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {candidate.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={candidate.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{candidate.scoreTotal || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    {candidate.decision && <DecisionBadge decision={candidate.decision} />}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/candidates/${candidate.id}`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      查看详情
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <h3 className="font-medium text-blue-800 mb-2">监测队列说明</h3>
        <ul className="text-sm text-blue-600 space-y-1">
          <li>• <strong>观察中</strong>：社媒有热度但趋势不明朗，需要持续监测</li>
          <li>• <strong>准备上站</strong>：已达到上站标准，待执行</li>
          <li>• 每日 Cron 任务会自动更新候选词数据</li>
        </ul>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    observing: 'bg-blue-100 text-blue-700',
    ready: 'bg-green-100 text-green-700',
    launched: 'bg-purple-100 text-purple-700',
    abandoned: 'bg-gray-100 text-gray-700',
  }
  return (
    <span className={`px-2 py-1 rounded text-xs ${colors[status] || colors.pending}`}>
      {status}
    </span>
  )
}

function DecisionBadge({ decision }: { decision: string }) {
  const config = getDecisionLabel(decision as any)
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${config.color} ${config.textColor}`}>
      {config.label}
    </span>
  )
}