# engine 改动的去向

`engine/` 是 git submodule，指向上游 `ArknightsDevs/Arknights-Universal-Engine`（固定提交 `c8af98d`）。
我们对它的改动**无法提交到那个仓**（没有上游写权限），所以：

| 位置 | 状态 |
|---|---|
| `patches/0001-engine-coop-four-seats-and-backdrop.patch` | 本 fork 里的完整 patch（`git -C engine diff` 的原文） |
| 部署树 `studio/icebreaker/engine/...` | **已应用**，那是 vendor 进去的普通文件，随镜像走 |

## patch 里的三处改动

1. `packages/render/src/renderer.js` — 战场背景：纯灰 `0x404040` → 垂直渐变 + 远处雾化（`skyBackdrop` / `applySky` / `SKY_FOG_*`），
   并新增 `backdrop` 选项：给了官方场景图就用它（`SKY_BACKDROP_INTENSITY = 0.16` 压暗），没给仍退回渐变
2. `packages/sim/src/coop.js` — `goalSeats` 支持四座位（一侧由同奇偶两座共守）、新增 `partnerOf`、
   `askProblem` / `answerCost` 用伙伴座位而非 `1 - seat`
3. `packages/net/src/host.js` — `frameCommands` 去掉 `seats !== 2` 早退与写死的 `[0, 1]`
4. `packages/ui/src/battle/coop.js` — 顶栏从「我 + 队友」泛化到 N 席：`SEAT_TAGS` / `seatRef`，
   `CoopState.sides` 逐席 `showSide`；两人局的节点与行为不变

## 怎么用

```bash
# 重新 vendor fork 到部署树、或换一份 engine 检出之后，重新打上：
git -C engine apply ../patches/0001-engine-coop-four-seats-and-backdrop.patch

# 确认已应用：
grep -c skyBackdrop engine/packages/render/src/renderer.js   # 期望 4
grep -c partnerOf  engine/packages/sim/src/coop.js           # 期望 3
```

## 为什么不做成正式 submodule fork

按 `docs/adr/0007`（引擎按 git tag 消费）与 ADR 0052（engine 是 submodule），
要让改动进 fork 的 submodule 就得 fork 引擎仓、改 `.gitmodules`、再推 19 MiB。
本轮只动了 3 个文件 162 行，先用 patch 保证不丢；真要长期维护（比如 P3 的基建会继续动引擎）
再 fork 更划算。
