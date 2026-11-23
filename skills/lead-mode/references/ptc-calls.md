# PTC 下的调用形状

只有 PTC 会话读这一份。native 会话直调工具，不用读。

## 预置

本插件有两个预置：`lead-ptc` 走 PTC（照抄官方 `ptc`），`lead-cordis` 走创造模式（照抄官方 `cordis`，工具能直调）。判是不是 PTC 的规则在主文件 §2.1，这里只讲 PTC 下怎么调。

## 调用形状只有一种

```ts
run_code({ code: "return await tools.team_task_list({})", description: "看任务板" })
```

- 直调 `team_task_list` 会被拒，报错原文是 `only run_code is callable directly`。
- `team_task_*`、`subagent`、`subagent_fork`、`send_message`、`wait_agent` 都在 system prompt 的 SDK 块里（判据见主文件 §2.2），程序里写 `await tools.xxx(args)`。
- 参数照 SDK 声明给。工具失败抛 `ToolCallError`，用 `try/catch` 捕获，可以接着跑。
- 结果只取 `return` 或 `console.log` 出来的部分。中间返回值不回上下文，别把整个结果原样 return。

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

`subagent` 调用立刻返回名字，不等成员干完。所以一次程序里连派几个没问题。

## 并发读

`team_task_list`、`team_task_get`、`list_agents` 这几个读工具是并发安全的，程序里可以用 `Promise.all` 一起读。

## 两件别做的事

`wait_agent` 本 skill 一律不用，也别写进 `run_code`：一次程序默认 120 秒、上限 600 秒，等于空转。派完活结束回合，成员的通知会回来。

`workflow` 工具在 `lead-ptc` 里已禁用；`lead-cordis` 里它是启用的，但那是给创造会话自己用的，别拿它代替派活。
