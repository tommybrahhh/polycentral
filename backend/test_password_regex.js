// Test the password regex patterns
const regex1 = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/; // Registration
const regex2 = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/; // Reset

const testPasswords = [
  'ValidPass123!',
  'ValidPass123',
  'short',
  'nouppercase1!',
  'NOLOWERCASE1!',
  'NoNumber!',
  'NoSpecial1'
];

console.log('Testing password regex patterns:');
console.log('Registration pattern (no special char required):', regex1.toString());
console.log('Reset pattern (special char required):', regex2.toString());
console.log('');

testPasswords.forEach(password => {
  const result1 = regex1.test(password);
  const result2 = regex2.test(password);
  console.log(`Password: "${password}"`);
  console.log(`  Registration: ${result1 ? '✅' : '❌'}`);
  console.log(`  Reset: ${result2 ? '✅' : '❌'}`);
  console.log('');
});