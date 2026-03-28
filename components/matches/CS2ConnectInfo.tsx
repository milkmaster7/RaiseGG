'use client'

import { useState } from 'react'
import { Server, Copy, CheckCircle } from 'lucide-react'

interface Props {
  serverIp:     string
  serverPort:   number
  connectToken: string
}

export function CS2ConnectInfo({ serverIp, serverPort, connectToken }: Props) {
  const [copied, setCopied] = useState(false)
  const connectString = `connect ${serverIp}:${serverPort}; password ${connectToken}`

  function copyConnect() {
    navigator.clipboard.writeText(connectString).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 bg-space-700 border border-accent-cyan/30 rounded px-2 py-1.5 text-xs font-mono text-accent-cyan truncate max-w-xs">
        <Server className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{serverIp}:{serverPort}</span>
      </div>
      <button
        onClick={copyConnect}
        title="Copy connect command"
        className="flex items-center gap-1 text-xs text-muted hover:text-white transition-colors px-2 py-1.5 rounded hover:bg-space-700"
      >
        {copied
          ? <><CheckCircle className="w-3.5 h-3.5 text-green-400" /> <span className="text-green-400">Copied</span></>
          : <><Copy className="w-3.5 h-3.5" /> Copy connect</>}
      </button>
    </div>
  )
}
