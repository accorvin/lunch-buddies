async function getSlackUserIdByEmail(email) {
  try {
    const url = new URL("https://slack.com/api/users.lookupByEmail");
    url.searchParams.set("email", email);
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
      }
    });

    const data = await response.json();
    if (!data.ok) {
      console.error(`❌ Failed to lookup Slack user by email (${email}):`, data.error);
      return null;
    }
    return data.user.id;
  } catch (err) {
    console.error(`❌ Error looking up Slack user ID for ${email}:`, err);
    return null;
  }
}

async function sendSlackDM(userId, message) {
  if (!userId) {
    console.error("❌ Cannot send Slack DM: userId is null");
    return false;
  }
  try {
    console.log(`📨 Sending Slack DM to userId: ${userId}`);
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        channel: userId,
        text: message
      })
    });

    const data = await response.json();
    if (!data.ok) {
      console.error(`❌ Failed to send Slack message to ${userId}:`, data.error);
      return false;
    }
    console.log(`✅ Successfully sent Slack DM to userId: ${userId}`);
    return true;
  } catch (err) {
    console.error(`❌ Error sending Slack message to ${userId}:`, err);
    return false;
  }
}

module.exports = {
  getSlackUserIdByEmail,
  sendSlackDM
}; 