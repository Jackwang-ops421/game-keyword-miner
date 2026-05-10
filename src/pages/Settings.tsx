import { useState } from 'react'

export default function Settings() {
  const [settings, setSettings] = useState({
    syncFrequency: 'daily',
    defaultMinScore: 65,
    notificationsEnabled: false,
    email: '',
  })

  const handleSave = () => {
    localStorage.setItem('gkminer_settings', JSON.stringify(settings))
    alert('设置已保存')
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">设置</h2>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 space-y-6">
        {/* Sync Settings */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-4">同步设置</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                同步频率
              </label>
              <select
                value={settings.syncFrequency}
                onChange={e => setSettings({ ...settings, syncFrequency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">每天一次（北京时间 16:00）</option>
                <option value="twice">每天两次（8:00 / 20:00）</option>
                <option value="manual">仅手动同步</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                默认高分阈值
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.defaultMinScore}
                onChange={e => setSettings({ ...settings, defaultMinScore: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                分数≥此值时显示为"高分词"
              </p>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-4">通知设置</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="notifications"
                checked={settings.notificationsEnabled}
                onChange={e => setSettings({ ...settings, notificationsEnabled: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <label htmlFor="notifications" className="text-sm text-gray-700">
                启用同步完成通知
              </label>
            </div>

            {settings.notificationsEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  通知邮箱
                </label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={e => setSettings({ ...settings, email: e.target.value })}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          保存设置
        </button>
      </div>

      {/* API Info */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-4">API 端点</h3>
        <div className="space-y-2 font-mono text-sm">
          <p className="text-gray-600">
            <span className="text-gray-800">GET</span> /api/candidates - 获取候选词列表
          </p>
          <p className="text-gray-600">
            <span className="text-gray-800">POST</span> /api/candidates/import - 批量导入
          </p>
          <p className="text-gray-600">
            <span className="text-gray-800">POST</span> /api/sync - 触发同步
          </p>
          <p className="text-gray-600">
            <span className="text-gray-800">GET</span> /api/sync/logs - 同步日志
          </p>
          <p className="text-gray-600">
            <span className="text-gray-800">GET</span> /api/platforms - 平台列表
          </p>
        </div>
      </div>

      {/* About */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-2">关于</h3>
        <p className="text-sm text-gray-500">
          Game Keyword Miner v1.0 - H5小游戏出海新词挖掘工具
        </p>
        <p className="text-sm text-gray-500 mt-1">
          基于需求文档构建，自动同步游戏平台新词，辅助人工核查与决策。
        </p>
        <div className="mt-4 text-xs text-gray-400">
          <p>技术栈: React + TypeScript + Vite + Vercel Serverless + Neon PostgreSQL</p>
        </div>
      </div>
    </div>
  )
}