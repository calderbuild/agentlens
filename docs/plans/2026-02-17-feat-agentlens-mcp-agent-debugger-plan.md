---
title: "AgentLens - MCP Agent Session Replay & Visual Debugger"
type: feat
date: 2026-02-17
hackathon: DevDash 2026
deadline: 2026-03-01T06:00:00+08:00
team_size: 1
---

# AgentLens - MCP Agent Session Replay & Visual Debugger

## Overview

AgentLens 是一个面向 AI Agent 开发者的**实时可视化调试工具**，通过 MCP（Model Context Protocol）代理拦截 Agent 与工具之间的所有 JSON-RPC 通信，提供 trace timeline 可视化、session 录制回放、tool call 检查等能力。

**一句话定位**：AI Agent 的 Hotjar/FullStory -- 录制、回放、调试每一次 Agent 会话。

## Problem Statement

当前 AI Agent 开发的 #1 痛点是**不可观测性**：

- 65% 的组织将 Agent 监控列为首要技术挑战（PwC Agent Survey）
- 60-70% IT 时间花在手动排障（业界调研）
- Agent 失败时开发者只能看日志猜测原因，没有可视化工具
- 现有 15+ 个 observability 工具（LangSmith、Langfuse、Helicone 等）**全部是事后日志/trace**，没有实时可视化调试和会话回放

**核心差异化**：

| 维度 | LangSmith/Langfuse（现有） | AgentLens（本项目） |
|---|---|---|
| 模式 | 事后看 trace 列表 | 实时可视化 + 交互式回放 |
| 交互 | 文字日志翻页 | 动画 trace timeline + 节点点击检查 |
| 协议 | 主要绑定 LangChain | MCP-native（协议无关） |
| 体验 | 像看服务器 access log | 像看 Hotjar 用户行为回放 |

## Proposed Solution

### 架构

```
MCP Client (Claude Code/Cursor)
        |
        | stdio (stdin/stdout)
        |
  +-----------+
  | AgentLens |  <-- 代理层：拦截 + 录制所有 JSON-RPC 消息
  |   Proxy   |  --> WebSocket 推送到 Dashboard
  +-----------+
        |
        | stdio (stdin/stdout)
        |
  MCP Server (用户的工具服务)
```

### 核心组件

1. **Proxy Wrapper**：stdio 代理，作为 MCP client 和 MCP server 之间的中间人
2. **Recording Engine**：异步写入 SQLite，记录完整会话
3. **Dashboard**：Next.js + React Flow 可视化界面
4. **Replay Engine**：逐步回放已录制会话

### 用户流程

```
安装: npx agentlens -- node my-server.js
  -> 自动启动 proxy + dashboard
  -> 浏览器打开 http://localhost:6380
  -> 用户正常使用 AI Agent
  -> Dashboard 实时显示 trace timeline
  -> 会话结束后可回放调试
```

## Technical Approach

### Phase 1: Proxy Core（Day 1-4）

**目标**：实现 stdio MCP 代理，能拦截和录制所有 JSON-RPC 消息。

**任务清单**：

- [ ] 搭建项目结构（monorepo: proxy + dashboard）
  - 文件: `packages/proxy/`, `packages/dashboard/`
  - 约束: TypeScript strict mode, ESM
  - 验收: `npm run build` 无错误

- [ ] 实现 stdio proxy wrapper
  - 文件: `packages/proxy/src/proxy.ts`
  - 约束: 使用 MCP TypeScript SDK；proxy 作为父进程 spawn 真正的 MCP server 作为子进程，pipe stdin/stdout
  - 验收: `npx agentlens -- node test-server.js` 能正常透传所有 MCP 消息，Agent 行为与直连无异

- [ ] 实现 JSON-RPC 消息解析和录制
  - 文件: `packages/proxy/src/recorder.ts`
  - 约束: 异步 buffer 写入 SQLite，不阻塞 proxy 主线程；消息解析遵循 JSON-RPC 2.0 规范
  - 验收: 完整 session 可序列化为 JSON

- [ ] 设计 SQLite 数据模型
  - 文件: `packages/proxy/src/db.ts`
  - Schema:
    ```sql
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      server_command TEXT,
      started_at INTEGER,
      ended_at INTEGER,
      status TEXT -- 'active' | 'completed' | 'error'
    );
    CREATE TABLE messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT REFERENCES sessions(id),
      direction TEXT, -- 'client_to_server' | 'server_to_client'
      timestamp INTEGER,
      raw_json TEXT,
      method TEXT, -- JSON-RPC method (tools/call, etc.)
      is_error INTEGER DEFAULT 0
    );
    ```
  - 约束: payload > 10KB 自动截断存储，原始数据写入磁盘文件
  - 验收: 100 条消息的 session 查询 < 10ms

- [ ] 实现 WebSocket server（proxy 内嵌）
  - 文件: `packages/proxy/src/ws.ts`
  - 约束: 向 dashboard 推送实时消息；支持多 dashboard 客户端连接；自动重连
  - 验收: Dashboard 打开/关闭不影响 proxy 运行

### Phase 2: Dashboard 可视化（Day 5-9）

**目标**：构建可视化 Dashboard，核心是 trace timeline 和 tool call inspector。

**任务清单**：

- [ ] 搭建 Next.js 15 Dashboard 项目
  - 文件: `packages/dashboard/`
  - 约束: App Router, Tailwind CSS, 暗色主题为默认
  - 验收: `npm run dev` 可访问

- [ ] 实现 Session 列表页
  - 文件: `packages/dashboard/src/app/page.tsx`
  - 约束: 展示所有 session（活跃/已完成/错误），时间排序，基本搜索
  - 验收: 能看到 proxy 录制的 session，点击进入详情

- [ ] 实现 Trace Timeline 可视化（React Flow）
  - 文件: `packages/dashboard/src/components/TraceTimeline.tsx`
  - 约束:
    - 每个 tool call 是一个节点（显示: 工具名、状态、耗时）
    - 顺序调用为线性排列，并行调用分叉
    - 错误节点红色高亮
    - 支持缩放/平移
    - 高吞吐场景（>5 calls/sec）使用 batch render，50ms debounce
  - 验收: 10+ tool calls 的 session 可视化流畅无卡顿

- [ ] 实现 Tool Call Inspector 面板
  - 文件: `packages/dashboard/src/components/Inspector.tsx`
  - 约束:
    - 点击 timeline 节点展开详情面板
    - 显示: 完整 JSON-RPC request/response, latency, 时间戳
    - payload > 10KB 折叠，点击展开
    - JSON 语法高亮
  - 验收: 能检查任意 tool call 的完整输入输出

- [ ] 实现实时更新（WebSocket 客户端）
  - 文件: `packages/dashboard/src/hooks/useSession.ts`
  - 约束: 连接 proxy WebSocket，实时更新 timeline；断连自动重连 + 状态恢复
  - 验收: 新的 tool call 实时出现在 timeline 上

- [ ] 实现 Session 统计面板
  - 文件: `packages/dashboard/src/components/Stats.tsx`
  - 约束: 显示总 tool calls 数、总耗时、错误数、平均延迟
  - 验收: 数据实时更新

### Phase 3: Replay Engine（Day 10-12）

**目标**：实现会话回放功能，支持逐步浏览历史会话。

**任务清单**：

- [ ] 实现 Replay 控制器
  - 文件: `packages/dashboard/src/components/ReplayController.tsx`
  - 约束:
    - 时间线 scrubber（拖动到任意位置）
    - 上一步/下一步按钮
    - 快捷键: 左右箭头步进, J 跳到下一个错误
    - 当前步骤高亮对应 timeline 节点
  - 验收: 能逐步回放 20+ tool calls 的 session

- [ ] 实现步骤状态渲染
  - 文件: `packages/dashboard/src/components/TraceTimeline.tsx`（扩展）
  - 约束: 回放时 timeline 只显示到当前步骤，后续节点灰化；Inspector 面板同步显示当前步骤的 request/response
  - 验收: 步进操作 timeline 和 inspector 同步更新

- [ ] 实现 "Jump to Error" 功能
  - 文件: `packages/dashboard/src/components/ReplayController.tsx`（扩展）
  - 约束: 一键跳转到 session 中第一个/下一个错误 tool call
  - 验收: 有错误的 session 可快速定位

### Phase 4: Polish & Demo（Day 13-14）

**目标**：打磨体验，准备 demo 脚本。

**任务清单**：

- [ ] 创建示例 MCP Server（用于 demo）
  - 文件: `examples/demo-server/`
  - 约束: 简单的文件操作 MCP server，内置一个 "bug"（某个 tool 在特定条件下返回错误格式）
  - 验收: 能复现 "Agent 因为 tool 返回格式错误而失败" 的场景

- [ ] 撰写 demo 脚本
  - 文件: `docs/demo-script.md`
  - 流程:
    1. 展示问题："这个 AI Agent 经常莫名其妙失败，但日志看不出为什么"
    2. 一行命令启用 AgentLens: `npx agentlens -- node demo-server.js`
    3. 运行 Agent 任务，dashboard 实时展示 trace timeline
    4. Agent 遇到 bug 失败 -- timeline 上红色节点一目了然
    5. 点击红色节点，Inspector 显示 tool 返回了错误格式
    6. 回放 session，步进到出错前一刻，对比正常和异常的 tool call
    7. 定位 root cause，修复 MCP server
    8. 再次运行 -- 一切正常，timeline 全绿

- [ ] 视觉打磨
  - 约束: 暗色主题，节点动画（新节点出现时有 fade-in），错误节点脉冲动画
  - 验收: 视觉效果专业、流畅

- [ ] 编写 README
  - 文件: `README.md`
  - 约束: Quick Start 一行命令，GIF 动图展示核心功能
  - 验收: 新用户 30 秒内理解项目价值

- [ ] 录制 demo 视频（如需要）

## 关键设计决策

### D1: 仅支持 stdio transport

**选择**: 只支持 stdio（Claude Code、大部分 MCP client 的默认方式）
**理由**: HTTP/SSE 支持需要完全不同的代理架构，2 周内无法同时做好两种。stdio 覆盖最主流的使用场景。
**风险**: 不支持纯 HTTP MCP server

### D2: 单 server 代理模式

**选择**: 每次 wrap 一个 MCP server，不做多 server 路由
**理由**: 多 server 路由大幅增加复杂度，单 server 已能覆盖调试场景（用户 wrap 需要调试的那个 server）
**配置方式**: 用户修改 MCP 配置：
```json
// 原始
{ "command": "node", "args": ["my-server.js"] }
// 启用 AgentLens
{ "command": "npx", "args": ["agentlens", "--", "node", "my-server.js"] }
```

### D3: Session = 一个 MCP 连接生命周期

**选择**: 从 MCP initialize 到连接关闭为一个 session
**理由**: 简单、明确，与 MCP 协议语义一致

### D4: 不追踪 LLM 调用成本

**选择**: 只追踪 tool call latency 和调用次数，不追踪 LLM token/cost
**理由**: MCP proxy 只能看到 tool 调用，看不到 LLM API 调用。声称能追踪成本但做不到会损害可信度。
**替代**: 显示 latency 分布图和调用频次

### D5: 命名使用 "Trace Timeline" 而非 "Decision Tree"

**选择**: 主可视化组件叫 "Trace Timeline"
**理由**: 大部分 MCP Agent trace 是线性序列，偶有并行分叉。叫 "Decision Tree" 暗示分支逻辑可视化，与实际不符。

### D6: Dashboard 仅 localhost 访问

**选择**: Dashboard 绑定 127.0.0.1，不暴露到网络
**理由**: Session 数据包含 Agent 的所有操作（文件内容、API 响应等），可能含敏感信息。Hackathon scope 不做认证。

### D7: SQLite 异步写入

**选择**: 消息先进内存 buffer，定期批量写入 SQLite
**理由**: 同步写入会阻塞 proxy，给被调试的 Agent 引入延迟（observer effect）

## Acceptance Criteria

### Functional Requirements

- [ ] `npx agentlens -- <command>` 一行命令启动 proxy + dashboard
- [ ] proxy 完全透传 MCP 消息，Agent 行为与直连无差异
- [ ] Dashboard 实时显示 trace timeline（tool call 节点 + 连线）
- [ ] 点击节点可查看完整 JSON-RPC request/response
- [ ] 错误 tool call 红色高亮
- [ ] Session 列表页展示所有录制的 session
- [ ] 已完成 session 支持逐步回放（上一步/下一步/scrubber）
- [ ] "Jump to Error" 一键跳转到错误节点

### Non-Functional Requirements

- [ ] Proxy 引入延迟 < 5ms per tool call
- [ ] Dashboard 支持 50+ tool calls 的 session 流畅渲染
- [ ] SQLite 数据库增长可控（payload 截断策略）
- [ ] 安装无需额外依赖（npx 直接运行）

## Tech Stack

| 组件 | 技术 | 理由 |
|---|---|---|
| Proxy | TypeScript + MCP SDK | 官方 SDK，类型安全 |
| DB | better-sqlite3 | 零配置，嵌入式，Node.js 原生 |
| Real-time | WebSocket (ws) | 轻量，无需 Socket.io 的额外抽象 |
| Dashboard | Next.js 15 (App Router) | 最新版，SSR + API routes 一体 |
| 可视化 | React Flow | Agent workflow 可视化的事实标准 |
| 样式 | Tailwind CSS | 快速迭代，vibe coding 友好 |
| JSON 高亮 | react-json-view-lite | 轻量 JSON 展示组件 |

## 项目结构

```
agentlens/
  packages/
    proxy/
      src/
        index.ts          # CLI 入口
        proxy.ts          # stdio proxy 核心
        recorder.ts       # 消息录制引擎
        db.ts             # SQLite 数据模型
        ws.ts             # WebSocket server
      package.json
    dashboard/
      src/
        app/
          page.tsx        # Session 列表
          session/
            [id]/
              page.tsx    # Session 详情（timeline + inspector）
        components/
          TraceTimeline.tsx
          Inspector.tsx
          ReplayController.tsx
          Stats.tsx
          SessionList.tsx
        hooks/
          useSession.ts   # WebSocket 连接 + 状态管理
          useReplay.ts    # 回放逻辑
      package.json
  examples/
    demo-server/
      index.ts            # demo 用 MCP server
  docs/
    demo-script.md
  package.json              # monorepo root (npm workspaces)
  README.md
```

## Risk Analysis & Mitigation

| 风险 | 可能性 | 影响 | 缓解方案 |
|---|---|---|---|
| stdio proxy 实现复杂度超预期 | 中 | 高 | 参考 MCP Inspector 的 proxy 架构（已开源）|
| React Flow 在大量节点时性能差 | 低 | 中 | 50ms debounce + batch render + 虚拟化 |
| MCP SDK v2 breaking changes | 低 | 高 | 锁定 v1.x（v2 预计 Q1 2026 但 v1 仍受支持）|
| demo 日 Agent 行为不可复现 | 中 | 高 | 使用自制 demo-server，完全可控的 bug 场景 |
| SQLite 在高吞吐下瓶颈 | 低 | 中 | 内存 buffer + 批量写入，测试极限吞吐 |

## Dependencies & Prerequisites

- Node.js >= 18
- MCP TypeScript SDK v1.x (`@modelcontextprotocol/sdk`)
- 一个 MCP client（Claude Code / Cursor / 任何支持 MCP 的工具）用于测试
- npx 全局可用

## 时间线

| Phase | 天数 | 核心交付 |
|---|---|---|
| Phase 1: Proxy Core | Day 1-4 | stdio proxy + 消息录制 + SQLite + WebSocket |
| Phase 2: Dashboard | Day 5-9 | Session 列表 + Trace Timeline + Inspector + 实时更新 |
| Phase 3: Replay | Day 10-12 | 回放控制器 + 步骤状态 + Jump to Error |
| Phase 4: Polish | Day 13-14 | Demo server + 视觉打磨 + README + demo 脚本 |

## References & Research

### 竞品分析

- [LangSmith](https://smith.langchain.com) - LangChain 的 observability 平台，事后 trace
- [Langfuse](https://langfuse.com) - 开源 LLM observability，事后日志
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector) - 官方 MCP 测试工具（基础 UI）
- [MCP Interceptor](https://thomasgauvin.com/writing/learning-how-mcp-works-by-reading-logs-and-building-mcp-interceptor/) - MCP 消息日志代理
- [Braintrust](https://www.braintrust.dev) - AI observability + 评估平台
- [Helicone](https://helicone.ai) - LLM 请求日志

### 技术参考

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - 官方 SDK
- [MCP Inspector 架构分析](https://glama.ai/blog/2025-07-24-how-mcp-inspector-works-a-simple-look-at-its-architecture-and-setup) - proxy 架构参考
- [React Flow AI Workflow Editor](https://reactflow.dev/ui/templates/ai-workflow-editor) - 可视化模板
- [MCP 协议规范](https://modelcontextprotocol.io/docs/sdk) - 协议文档

### 市场数据

- AI Agent 市场 2025 年 $7.84B，2030 年预计 $52.62B（CAGR 49.6%）
- 65% 组织将 Agent 监控列为首要技术挑战
- MCP 已成为行业标准（Anthropic + OpenAI + Google 共推，Linux Foundation 托管）
