const { getAllRegistrations } = require('./db');
const { sendEmail } = require('./email');

// Process registrations in batches to manage memory
const BATCH_SIZE = 50;

async function processBatch(registrations, startIndex) {
  const endIndex = Math.min(startIndex + BATCH_SIZE, registrations.length);
  const batch = registrations.slice(startIndex, endIndex);
  
  for (let i = 0; i < batch.length; i++) {
    for (let j = i + 1; j < batch.length; j++) {
      const user1 = batch[i];
      const user2 = batch[j];
      
      if (user1.location === user2.location) {
        await sendEmail(user1.email, user2);
        await sendEmail(user2.email, user1);
      }
    }
  }
}

async function matchUsers() {
  try {
    console.log('Starting matching process...');
    const registrations = await getAllRegistrations();
    console.log(`Found ${registrations.length} registrations to process`);
    
    // Process in batches
    for (let i = 0; i < registrations.length; i += BATCH_SIZE) {
      console.log(`Processing batch ${i / BATCH_SIZE + 1}...`);
      await processBatch(registrations, i);
      
      // Force garbage collection between batches
      if (global.gc) {
        global.gc();
      }
    }
    
    console.log('Matching process completed successfully');
  } catch (error) {
    console.error('Error in matching process:', error);
    throw error;
  }
}

module.exports = { matchUsers }; 