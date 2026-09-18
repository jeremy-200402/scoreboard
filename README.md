# Scoreboard

面向麻将、扑克等线下牌局的移动端优先零和计分 Demo。每局选择一位赢家，填写赢家赢分及其他玩家的支出，系统自动补齐最后一位玩家并保存可追溯流水。

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开终端显示的本地地址即可体验。

## 微信小程序

微信小程序源码位于 `apps/weapp`，与现有网页版并存。第一次运行：

```bash
cd apps/weapp
npm install
cd ../..
npm run dev:weapp
```

然后在微信开发者工具中选择“导入项目”，项目目录选择 `apps/weapp`。`project.config.json` 已将小程序目录配置为 `dist`；开发者工具会在导入时写入所选测试号或正式 AppID，个人工具设置不会提交到 Git。

生产构建：

```bash
npm run build:weapp
```

## 验证

```bash
npm test
npm run build
npm run typecheck:weapp
npm run build:weapp
```

## MVP 能力

- 创建 2 至 8 人房间，所有玩家从 0 分开始
- 选择一位赢家，录入每位玩家本局输赢
- 最后一名未填写的输家自动补齐差额
- 自动维持房间总分为 0
- 查看、修改和撤销历史给分流水
- 结束房间并查看最终排名
- 使用 IndexedDB 保存本地数据，刷新后可继续
- 提供 Taro 微信小程序版，使用微信本地缓存保存牌局
