const mongoose=require('mongoose');
const bcrypt=require('bcryptjs');
const username=encodeURIComponent('Etherealnymph');
const password=encodeURIComponent('c=299792548');
const uri='mongodb://'+username+':'+password+'@127.0.0.1:27017/?authSource=admin';(async()=>{await mongoose.connect(uri);
const User=mongoose.model('User', new mongoose.Schema({}, {strict:false}),'users');await User.deleteMany({account:'alice'});
const hash=await bcrypt.hash('superadmin',10);await User.updateOne({account:'superadmin'},{$set:{account:'superadmin',nickname:'superadmin',passwordHash:hash,role:'superadmin'}},{upsert:true});console.log('Created/updated superadmin');process.exit(0)})().catch(e=>{console.error(e);process.exit(2)})