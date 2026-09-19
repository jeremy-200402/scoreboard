# 雀友记账微信小程序

面向麻将、扑克等线下牌局的零和计分微信小程序。每局选择一位赢家，填写赢家赢分及其他玩家的支出，系统自动补齐最后一位玩家并保存可追溯流水。

本仓库仅包含微信小程序版本，源码位于 `apps/weapp`，使用 React、TypeScript 和 Taro 开发。

## 环境要求

- Node.js 20 LTS
- npm
- 微信开发者工具

## 安装依赖

```bash
npm install
npm --prefix apps/weapp install
```

## 本地开发

```bash
npm run dev
```

然后使用微信开发者工具导入 `apps/weapp`。`project.config.json` 已将小程序目录配置为 `dist/`。

## 构建与验证

```bash
npm test
npm run typecheck
npm run build
```

## 小程序能力

- 创建 2 至 8 人牌局
- 记录赢家及每位输家的分数
- 自动补齐最后一名玩家的支出并维持总分为 0
- 查看、修改和撤销历史流水
- 结束牌局并查看最终排名
- 查看个人设备中保存的全部房间
- 使用微信本地缓存保存牌局数据
