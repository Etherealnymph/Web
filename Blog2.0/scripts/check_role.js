const mongoose = require('mongoose');

const username = encodeURIComponent('Etherealnymph');
const password = encodeURIComponent('c=299792548');
const uri = `mongodb://${username}:${password}@127.0.0.1:27017/?authSource=admin`;

async function main() {
  await mongoose.connect(uri, {});
  const userSchema = new mongoose.Schema({ nickname: String, account: String, role: String }, { strict: false });
  const User = mongoose.model('User_check', userSchema, 'users');

  const ident = process.argv[2];
  if (!ident) {
    console.error('Usage: node scripts/check_role.js <account|nickname|_id>');
    process.exit(2);
  }

  const query = (ident.length === 24 && /^[0-9a-fA-F]{24}$/.test(ident))
    ? { _id: ident }
    : { $or: [{ account: ident }, { nickname: ident }] };

  const u = await User.findOne(query).lean();
  if (!u) {
    console.log('NOT_FOUND');
    process.exit(0);
  }
  console.log(JSON.stringify({ _id: String(u._id), account: u.account, nickname: u.nickname, role: u.role || null }, null, 2));
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('ERROR', err && err.message ? err.message : err);
  process.exit(1);
});