const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'data.json');

const defaultData = {
  users: [],
  messages: [],
  adminSettings: {
    permissions: {
      red: ['kick', 'ban', 'mute', 'mic_off', 'camera_off', 'view_details'],
      green: ['kick', 'mute', 'view_details'],
      purple: ['mute']
    },
    admins: []
  }
};

if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
  console.log('✅ File "data.json" created with default content.');
} else {
  console.log('📁 File "data.json" already exists.');
}

try {
  const data = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(data);

  const users = parsed.users || [];
  const messages = parsed.messages || [];
  const adminSettings = parsed.adminSettings || defaultData.adminSettings;

  console.log('🚀 Data loaded successfully.');
} catch (err) {
  console.error('❌ Failed to read or parse data.json:', err);
}
