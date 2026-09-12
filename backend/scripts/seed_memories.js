const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Memory = require('../models/Memory');
const User = require('../models/User');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  let user = await User.findOne({ email: 'test@example.com' });
  if (!user) {
    user = await User.findOne({});
  }

  if (!user) {
    console.log('No user found');
    process.exit(1);
  }

  console.log('Seeding memories for user:', user.email, 'ID:', user._id);

  // Ensure uploads/memories exists
  const memoriesDir = path.join(__dirname, '..', 'uploads', 'memories');
  if (!fs.existsSync(memoriesDir)) {
    fs.mkdirSync(memoriesDir, { recursive: true });
  }

  // Copy sample image files if available in uploads/
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  const availableFiles = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png'));

  const sampleMedia = [];
  availableFiles.slice(0, 4).forEach((file, idx) => {
    const src = path.join(uploadsDir, file);
    const destName = `seed-memory-${idx + 1}-${file}`;
    const dest = path.join(memoriesDir, destName);
    if (!fs.existsSync(dest) && fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dest);
    }
    sampleMedia.push({
      file_url: `/uploads/memories/${destName}`,
      file_name: destName,
      media_type: 'image',
      file_size_bytes: fs.existsSync(dest) ? fs.statSync(dest).size : 50000,
      mime_type: 'image/jpeg',
    });
  });

  if (sampleMedia.length === 0) {
    sampleMedia.push({
      file_url: '/uploads/memories/1787245780675-78990939.jpeg',
      file_name: '1787245780675-78990939.jpeg',
      media_type: 'image',
      file_size_bytes: 17735,
      mime_type: 'image/jpeg',
    });
  }

  // Clean old seeded memories for this user
  await Memory.deleteMany({ user: user._id });

  // Today's date components
  const now = new Date();

  // 1. "On This Day" Throwback: Exactly 2 years ago today
  const throwbackDate = new Date(now);
  throwbackDate.setFullYear(now.getFullYear() - 2);

  await Memory.create({
    user: user._id,
    title: 'Sunrise Over the Grand Canyon South Rim',
    story_text: 'Woke up at 4:30 AM to watch the first golden rays light up the canyon ridge. The quiet was breathtaking, with cold crisp winds giving way to warm amber light. One of the most tranquil mornings ever experienced.',
    memory_date: throwbackDate,
    mood: 'Nostalgic',
    location_name: 'Grand Canyon, Arizona',
    tags: ['Milestone', 'Travel', 'Nature'],
    is_favorite: true,
    media: [
      sampleMedia[0] || sampleMedia[0],
      sampleMedia[1] || sampleMedia[0],
    ],
  });

  // 2. Recent 2026 Memory: Tokyo Exploration
  const tokyoDate = new Date('2026-06-18T14:30:00.000Z');
  await Memory.create({
    user: user._id,
    title: 'Tokyo Shibuya Crossing & TeamLab Planets',
    story_text: 'Navigating the vibrant neon streets of Shibuya at twilight followed by the immersive water installations at TeamLab Planets. Authentic ramen in an alleyway stall topped off the night.',
    memory_date: tokyoDate,
    mood: 'Adventurous',
    location_name: 'Tokyo, Japan',
    tags: ['Travel', 'Adventure', 'Food'],
    is_favorite: true,
    media: [
      sampleMedia[2] || sampleMedia[0],
      sampleMedia[3] || sampleMedia[0],
      sampleMedia[1] || sampleMedia[0],
    ],
  });

  // 3. Family Milestone Memory: 2026 Family Reunion
  const familyDate = new Date('2026-02-14T18:00:00.000Z');
  await Memory.create({
    user: user._id,
    title: 'Family Reunion & Golden Anniversary Celebration',
    story_text: 'Three generations gathered together under one roof by the snow-capped mountains. Shared childhood stories, grilled by the outdoor firepit, and made a toast to lifelong togetherness.',
    memory_date: familyDate,
    mood: 'Joyful',
    location_name: 'Lake Tahoe, CA',
    tags: ['Family', 'Celebration', 'Milestone'],
    is_favorite: false,
    media: [
      sampleMedia[0],
      sampleMedia[1] || sampleMedia[0],
    ],
  });

  // 4. Sealed Digital Time Capsule (Future Locked until 2028)
  const futureLockDate = new Date('2028-01-01T00:00:00.000Z');
  await Memory.create({
    user: user._id,
    title: 'Future Self: 2028 Life Aspirations & Letter',
    story_text: 'A personal reflection letter written in 2026 detailing current hopes, core principles, predictions about AI & career trajectory, and questions for myself 2 years from now.',
    memory_date: new Date('2026-08-01T12:00:00.000Z'),
    mood: 'Accomplished',
    location_name: 'San Francisco, CA',
    tags: ['Reflections', 'Future', 'Career'],
    is_favorite: false,
    lock_until_date: futureLockDate,
    media: [
      sampleMedia[0],
    ],
  });

  console.log('Successfully seeded 4 memories (including Throwback and Locked Capsule)!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
