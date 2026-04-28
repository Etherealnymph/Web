const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const readline = require('readline');

// 数据库连接（你自己的地址，不用改）
const uri = 'mongodb://Etherealnymph:c=299792548@127.0.0.1:27017/admin';

// 终端输入工具
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 提问函数
function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  try {
    // 1. 连接数据库
    await mongoose.connect(uri);
    console.log('✅ 已连接 MongoDB\n');

    // 2. 终端输入信息
    const account = await ask('输入账号：');
    const nickname = await ask('输入昵称：');
    const password = await ask('输入密码：');
    const role = await ask('输入角色（默认 superadmin）：') || 'superadmin';

    rl.close();

    // 3. 密码哈希（核心！）
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. 保存到数据库（覆盖旧用户）
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    
    await User.deleteMany({}); // 清空旧数据
    await User.create({
      account,
      nickname,
      passwordHash,  // 保存哈希密码 ✅
      role
    });

    console.log('\n🎉 用户创建成功！');
    console.log('账号：', account);
    console.log('昵称：', nickname);
    console.log('角色：', role);
    console.log('密码已加密存储：', passwordHash.slice(0, 30) + '...');

    // 展示最终数据
    const user = await User.findOne({ account }).lean();
    console.log('\n📄 数据库中保存的用户信息：');
    console.log(JSON.stringify(user, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('错误：', err);
    process.exit(1);
  }
}

main();