const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const collection = mongoose.connection.db.collection('memories');
  const allMemories = await collection.find({}).toArray();
  console.log(`Found ${allMemories.length} memories to inspect and migrate.`);

  let updatedCount = 0;

  for (const m of allMemories) {
    const updates = {};
    let needsUpdate = false;

    // Normalize memory_date / date
    const effectiveDate = m.memory_date || m.date || m.createdAt || new Date();
    if (!m.memory_date || isNaN(new Date(m.memory_date).getTime())) {
      updates.memory_date = new Date(effectiveDate);
      needsUpdate = true;
    }
    if (!m.date) {
      updates.date = new Date(effectiveDate);
      needsUpdate = true;
    }

    // Normalize story_text / description
    const effectiveStory = m.story_text !== undefined ? m.story_text : (m.description || '');
    if (m.story_text === undefined) {
      updates.story_text = effectiveStory;
      needsUpdate = true;
    }
    if (m.description === undefined) {
      updates.description = effectiveStory;
      needsUpdate = true;
    }

    // Normalize mood / tags / location / favorite
    if (!m.mood) {
      updates.mood = 'Joyful';
      needsUpdate = true;
    }
    if (!Array.isArray(m.tags)) {
      updates.tags = [];
      needsUpdate = true;
    }
    if (m.location_name === undefined) {
      updates.location_name = '';
      needsUpdate = true;
    }
    if (m.is_favorite === undefined) {
      updates.is_favorite = false;
      needsUpdate = true;
    }

    // Normalize media array
    if (Array.isArray(m.media) && m.media.length > 0) {
      let mediaChanged = false;
      const normalizedMedia = m.media.map((item) => {
        const copy = { ...item };
        const stored = copy.storedName || (copy.file_url ? path.basename(copy.file_url) : '');
        const fileUrl = copy.file_url || (stored ? `/uploads/memories/${stored}` : '');
        const fileName = copy.file_name || copy.originalName || stored || 'photo.jpeg';
        const originalName = copy.originalName || copy.file_name || fileName;
        const mimeType = copy.mime_type || copy.mimeType || 'image/jpeg';
        const isVideo = mimeType.startsWith('video/') || (stored && (stored.endsWith('.mp4') || stored.endsWith('.mov')));
        const isAudio = mimeType.startsWith('audio/') || (stored && (stored.endsWith('.mp3') || stored.endsWith('.wav')));
        const mediaType = copy.media_type || (isVideo ? 'video' : isAudio ? 'audio' : 'image');
        const size = copy.file_size_bytes || copy.size || 0;

        if (copy.file_url !== fileUrl || copy.storedName !== stored || copy.file_name !== fileName || copy.media_type !== mediaType) {
          mediaChanged = true;
        }

        copy.file_url = fileUrl;
        copy.file_name = fileName;
        copy.storedName = stored;
        copy.originalName = originalName;
        copy.media_type = mediaType;
        copy.mime_type = mimeType;
        copy.mimeType = mimeType;
        copy.file_size_bytes = size;
        copy.size = size;

        return copy;
      });

      if (mediaChanged) {
        updates.media = normalizedMedia;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await collection.updateOne({ _id: m._id }, { $set: updates });
      updatedCount++;
      console.log(`Updated memory: "${m.title}" (_id: ${m._id})`);
    }
  }

  console.log(`Migration complete! Updated ${updatedCount} memories.`);

  // Verify memory #1 (rockshari802's past memory)
  const user = await mongoose.connection.db.collection('users').findOne({ email: 'rockshari802@gmail.com' });
  if (user) {
    const userMems = await collection.find({ user: user._id }).toArray();
    console.log(`\nVerified memories for ${user.email} (${userMems.length} items):`);
    userMems.forEach(m => {
      console.log(`- "${m.title}" (Date: ${m.memory_date.toISOString()}):`);
      m.media?.forEach(med => {
        console.log(`    Media: file_url="${med.file_url}", storedName="${med.storedName}", file_name="${med.file_name}"`);
      });
    });
  }

  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
