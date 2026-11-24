# PTC 下的调用形状

仅 PTC 会话读取；native 会话直调工具，跳过本文件。

## 预置

本插件提供两个预置：`lead-ptc` 走 PTC（对应官方 `ptc`），`lead-cordis` 走创造模式（对应官方 `cordis`，工具可直调）。判别规则见主文件 §2.1，本文件只说明 PTC 调用方式。

## 调用形状只有一种

```ts
run_code({ code: "return await tools.team_task_list({})", description: "看任务板" })
```

- 直调 `team_task_list` 会被拒，报错原文是 `only run_code is callable directly`。
- `team_task_*`、`subagent`、`subagent_fork`、`send_message`、`wait_agent` 都在 system prompt 的 SDK 块中（判据见主文件 §2.2），程序内写 `await tools.xxx(args)`。
- 参数照 SDK 声明传入。工具失败抛 `ToolCallError`，用 `try/catch` 捕获即可继续执行。
- 只 `return` 或 `console.log` 所需摘要，不将完整结果原样返回上下文。

一次程序里建任务、派活：

```ts
run_code({
  code: `
    const t1 = await tools.team_task_create({ subject: "改 A 模块", description: "验收：单测全绿" })
    const t2 = await tools.team_task_create({ subject: "改 B 模块", description: "验收：单测全绿" })
    const a = await tools.subagent({ name: "mate-a", description: "A 模块", prompt: "..." })
    const b = await tools.subagent({ name: "mate-b", description: "B 模块", prompt: "..." })
    return { tasks: [t1.id, t2.id], members: [a, b] }
  `,
  description: "建两个任务并派两个成员",
})
```

`subagent` 调用立即返回名称，不等成员完成，可在同一次 `run_code` 中连续派发多个成员。

## 并发读

`team_task_list`、`team_task_get`、`list_agents` 这几个读工具并发安全，程序内可用 `Promise.all` 并发读取。

## 两项硬边界

禁止在 `run_code` 中调用 `wait_agent`：`wait_agent` 在此完全无效且 `run_code` 单次执行默认 120 秒、上限 600 秒，等待只会耗尽沙箱预算。派完活结束回合，等待成员通知唤醒。

`workflow` 工具在 `lead-ptc` 中已禁用；在 `lead-cordis` 中虽启用，但仅供创造会话自用，不用它替代派活。
