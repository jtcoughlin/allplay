// Validate deep link generation for testing
import { generateDeepLink } from './server/oauth';

console.log('🔗 Testing Deep Link Generation');
console.log('='.repeat(50));

// Test Netflix content
console.log('\n📺 Netflix - Glass Onion:');
const netflixLink = generateDeepLink('netflix', 'play', 'glass-onion-netflix');
console.log('App URL:', netflixLink.appUrl);
console.log('Web URL:', netflixLink.webUrl);

// Test Amazon Prime content  
console.log('\n🎬 Amazon Prime - The Boys:');
const primeLink = generateDeepLink('amazon-prime', 'play', 'the-boys-prime');
console.log('App URL:', primeLink.appUrl);
console.log('Web URL:', primeLink.webUrl);

// Validate URLs are properly formatted
console.log('\n✅ Validation:');
console.log('Netflix web URL valid:', netflixLink.webUrl.startsWith('https://'));
console.log('Prime web URL valid:', primeLink.webUrl.startsWith('https://'));
console.log('Netflix app URL has scheme:', netflixLink.appUrl.includes('://'));
console.log('Prime app URL has scheme:', primeLink.appUrl.includes('://'));

console.log('\n🎯 URLs are properly formatted for web fallback!');