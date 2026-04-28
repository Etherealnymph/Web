const mongoose = require('mongoose')

const username = encodeURIComponent('Etherealnymph')
const password = encodeURIComponent('c=299792548')
const uri = `mongodb://${username}:${password}@127.0.0.1:27017/admin`

async function run() {
  await mongoose.connect(uri)
  console.log('✅ 已连接数据库')

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users')
  const allUsers = await User.find({}).lean()

  console.log('\n📂 【数据库中所有用户】：')
  console.log(JSON.stringify(allUsers, null, 2))

  mongoose.disconnect()
}
run().catch(console.error)