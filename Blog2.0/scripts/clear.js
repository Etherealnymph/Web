const mongoose = require('mongoose')

const username = encodeURIComponent('Etherealnymph')
const password = encodeURIComponent('c=299792548')
const uri = `mongodb://${username}:${password}@127.0.0.1:27017/admin`

async function run(){
  await mongoose.connect(uri)
  const User = mongoose.model('User', new mongoose.Schema({}, { strict:false }), 'users')

  // 查找所有 superadmin
  const supers = await User.find({ role: 'superadmin' }).lean()
  if (!supers || supers.length === 0) {
    console.log('No superadmin users found.')
    process.exit(0)
  }

  console.log('Found superadmin accounts:')
  supers.forEach(u => console.log(' -', u.account || u._id, '|', u.nickname || ''))

  // ✅ 直接删除，不是降级！
  const res = await User.deleteMany({ role: 'superadmin' })

  console.log(`✅ Deleted ${res.deletedCount} superadmin user(s) permanently.`)
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(2) })