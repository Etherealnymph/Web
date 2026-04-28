const express = require('express');
const app = express();

// EJS 模板引擎
app.set('view engine', 'ejs');

// 首页
app.get('/', (req, res) => {
  res.render('init'); // 你自己的 ejs 页面
});

// 重点！云平台必须用这个端口
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('服务已启动');
});