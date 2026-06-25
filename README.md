# Bilibili Batch Unfollow

一个用于 Bilibili 网页端 Console 的批量取关脚本。

它会自动读取当前登录账号的关注列表，按批次调用 Bilibili 官方网页接口取关。脚本不包含任何个人主页链接、UID、Cookie 或 Token，也不会把数据发送到第三方服务。

## 功能

- 自动读取当前登录账号 UID
- 自动分页获取完整关注列表
- 并发批量取关，默认每批 3 个
- 支持中途停止
- 检测到手机号、验证码、安全校验或频控响应时自动暂停
- 运行前二次确认
- 无依赖，无需安装

## 使用方法

1. 登录 Bilibili 网页端。
2. 打开任意 `https://www.bilibili.com` 或 `https://space.bilibili.com` 页面。
3. 打开浏览器开发者工具 Console。
4. 复制 [scripts/batch-unfollow.js](scripts/batch-unfollow.js) 的全部内容并粘贴运行。
5. 确认提示后开始批量取关。

中途停止：

```js
window.__stopBiliUnfollow = true
```

## 调整速度

在脚本顶部修改：

```js
const config = {
  batchSize: 3,
  batchDelay: 500,
  fetchPageDelay: 300,
  pauseOnRisk: true
};
```

推荐范围：

- 稳妥：`batchSize: 3`, `batchDelay: 500`
- 更快：`batchSize: 5`, `batchDelay: 300`

不建议把并发调得太高，可能触发接口频控或操作失败。

如果曾经触发过手机号或安全验证，建议先使用更保守的配置：

```js
const config = {
  batchSize: 1,
  batchDelay: 1500,
  fetchPageDelay: 500,
  pauseOnRisk: true
};
```

脚本不会绕过 Bilibili 的官方安全验证。检测到类似响应时，它会停止继续取关并弹窗提醒；完成官方验证或等待限制恢复后，可以降低速度重新运行。

## 注意事项

- 取关操作不可批量撤销，请先确认自己真的需要清空或大量减少关注。
- 如果遇到接口失败，建议降低 `batchSize` 或增大 `batchDelay` 后重试。
- 该脚本只适用于当前登录账号自己的关注关系。

## License

MIT
