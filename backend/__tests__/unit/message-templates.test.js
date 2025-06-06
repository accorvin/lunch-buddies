const { DEFAULT_MATCH_MESSAGE, getLocationMessage, updateLocationMessage } = require('../../db');

// Helper function to generate personalized message from template
function generatePersonalizedMessage(template, buddyName, buddyEmail, location, commonDays) {
  return template
    .replace(/{location}/g, location)
    .replace(/{buddyName}/g, buddyName)
    .replace(/{buddyEmail}/g, buddyEmail)
    .replace(/{commonDays}/g, commonDays.join(', '));
}

describe('Message Template System', () => {
  // Note: The getLocationMessage and updateLocationMessage functions now include
  // fallback logic to handle cases where locationId and name don't match exactly
  // This fixes production issues where data has inconsistent casing
  test('should generate personalized message from default template', () => {
    const result = generatePersonalizedMessage(
      DEFAULT_MATCH_MESSAGE,
      'John Smith',
      'john.smith@redhat.com',
      'Boston',
      ['Monday', 'Wednesday', 'Friday']
    );

    expect(result).toContain('lunch in Boston with John Smith');
    expect(result).toContain('john.smith@redhat.com');
    expect(result).toContain('Monday, Wednesday, Friday');
    expect(result).not.toContain('{location}');
    expect(result).not.toContain('{buddyName}');
    expect(result).not.toContain('{buddyEmail}');
    expect(result).not.toContain('{commonDays}');
  });

  test('should handle custom message template', () => {
    const customTemplate = 'Hello! You have been matched with {buddyName} at {location}. Available: {commonDays}. Contact: {buddyEmail}';
    
    const result = generatePersonalizedMessage(
      customTemplate,
      'Jane Doe',
      'jane.doe@redhat.com',
      'Raleigh',
      ['Tuesday', 'Thursday']
    );

    expect(result).toBe('Hello! You have been matched with Jane Doe at Raleigh. Available: Tuesday, Thursday. Contact: jane.doe@redhat.com');
  });

  test('should handle empty common days array', () => {
    const result = generatePersonalizedMessage(
      DEFAULT_MATCH_MESSAGE,
      'Test User',
      'test@redhat.com',
      'Bangalore',
      []
    );

    expect(result).toContain('lunch in Bangalore with Test User');
    expect(result).toContain('test@redhat.com');
    expect(result).toContain('Common available days: ');
  });

  test('should handle special characters in variables', () => {
    const result = generatePersonalizedMessage(
      DEFAULT_MATCH_MESSAGE,
      'José García-López',
      'jose.garcia-lopez@redhat.com',
      'México City',
      ['Lunes', 'Miércoles']
    );

    expect(result).toContain('lunch in México City with José García-López');
    expect(result).toContain('jose.garcia-lopez@redhat.com');
    expect(result).toContain('Lunes, Miércoles');
  });

  test('should handle template with no variables', () => {
    const simpleTemplate = 'You have been matched for lunch!';
    
    const result = generatePersonalizedMessage(
      simpleTemplate,
      'John Smith',
      'john@redhat.com',
      'Boston',
      ['Monday']
    );

    expect(result).toBe('You have been matched for lunch!');
  });

  test('should handle template with partial variables', () => {
    const partialTemplate = 'Hello {buddyName}! Check your email for details.';
    
    const result = generatePersonalizedMessage(
      partialTemplate,
      'Alice Johnson',
      'alice@redhat.com',
      'Seattle',
      ['Friday']
    );

    expect(result).toBe('Hello Alice Johnson! Check your email for details.');
  });
});