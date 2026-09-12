const mongoose = require('mongoose');
require('dotenv').config();

async function inspect() {
  await mongoose.connect(process.env.MONGO_URI);
  const collection = mongoose.connection.db.collection('memories');
  const allMemories = await collection.find({}).toArray();
  console.log('Total memories in collection:', allMemories.length);
  
  for (let i = 0; i < allMemories.length; i++) {
    const m = allMemories[i];
    console.log(`--- Memory #${i + 1} ---`);
    console.log('ID:', m._id);
    console.log('User field:', m.user, m.user_id, m.userId);
    console.log('Title:', m.title);
    console.log('Date:', m.memory_date, m.date);
    console.log('Media array:', JSON.stringify(m.media, null, 2));
    console.log('Other image fields:', {
      image: m.image,
      imageUrl: m.imageUrl,
      photo: m.photo,
      photos: m.photos,
      file: m.file,
      file_url: m.file_url,
      attachment: m.attachment
    });
    console.log('All Keys:', Object.keys(m));
  }
  
  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  console.log('--- Users ---');
  users.forEach(u => console.log(u._id.toString(), u.email, u.name));

  process.exit(0);
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
