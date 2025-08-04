import { db } from './db';
import { content } from '@shared/schema';

const realContent = [
  // Netflix Originals - Popular Series
  {
    title: 'Stranger Things',
    description: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.',
    genre: 'sci-fi',
    type: 'show',
    service: 'netflix',
    serviceContentId: 'stranger-things-netflix',
    imageUrl: 'https://images.unsplash.com/photo-1594736797933-d0401ba4fae2?w=400&h=600&fit=crop',
    duration: 51,
    year: 2016,
    rating: 'TV-14'
  },
  {
    title: 'Wednesday',
    description: 'Smart, sarcastic and a little dead inside, Wednesday Addams investigates a murder spree while making new friends — and foes — at Nevermore Academy.',
    genre: 'comedy',
    type: 'show',
    service: 'netflix',
    serviceContentId: 'wednesday-netflix',
    imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop',
    duration: 45,
    year: 2022,
    rating: 'TV-14'
  },
  {
    title: 'Squid Game',
    description: 'Hundreds of cash-strapped players accept a strange invitation to compete in children\'s games. Inside, a tempting prize awaits with deadly high stakes.',
    genre: 'thriller',
    type: 'show',
    service: 'netflix',
    serviceContentId: 'squid-game-netflix',
    imageUrl: 'https://images.unsplash.com/photo-1607462109225-6b64ae2dd3cb?w=400&h=600&fit=crop',
    duration: 60,
    year: 2021,
    rating: 'TV-MA'
  },
  {
    title: 'The Crown',
    description: 'This drama follows the political rivalries and romance of Queen Elizabeth II\'s reign and the events that shaped the second half of the 20th century.',
    genre: 'drama',
    type: 'show',
    service: 'netflix',
    serviceContentId: 'the-crown-netflix',
    imageUrl: 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=400&h=600&fit=crop',
    duration: 60,
    year: 2016,
    rating: 'TV-MA'
  },
  {
    title: 'Ozark',
    description: 'A financial advisor drags his family from Chicago to the Missouri Ozarks, where he must launder $500 million in five years to appease a drug boss.',
    genre: 'crime',
    type: 'show',
    service: 'netflix',
    serviceContentId: 'ozark-netflix',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop',
    duration: 60,
    year: 2017,
    rating: 'TV-MA'
  },
  {
    title: 'Dark',
    description: 'A missing child causes four families to help each other for answers. What they discover is something far more mysterious than they ever imagined.',
    genre: 'sci-fi',
    type: 'show',
    service: 'netflix',
    serviceContentId: 'dark-netflix',
    imageUrl: 'https://images.unsplash.com/photo-1594736797933-d0401ba4fae2?w=400&h=600&fit=crop',
    duration: 60,
    year: 2017,
    rating: 'TV-MA'
  },
  // Netflix Movies
  {
    title: 'Red Notice',
    description: 'An FBI profiler pursuing the world\'s most wanted art thief becomes his reluctant partner in crime to catch an elusive crook who\'s always one step ahead.',
    genre: 'action',
    type: 'movie',
    service: 'netflix',
    serviceContentId: 'red-notice-netflix',
    imageUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop',
    duration: 118,
    year: 2021,
    rating: 'PG-13'
  },
  {
    title: 'Glass Onion: A Knives Out Mystery',
    description: 'Detective Benoit Blanc travels to Greece to peel back the layers of a mystery involving a new cast of colorful suspects.',
    genre: 'mystery',
    type: 'movie',
    service: 'netflix',
    serviceContentId: 'glass-onion-netflix',
    imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop',
    duration: 139,
    year: 2022,
    rating: 'PG-13'
  },
  // Amazon Prime Video Originals - Popular Series
  {
    title: 'The Boys',
    description: 'A group of vigilantes set out to take down corrupt superheroes who abuse their superpowers.',
    genre: 'action',
    type: 'show',
    service: 'amazon-prime',
    serviceContentId: 'the-boys-prime',
    imageUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=400&h=600&fit=crop',
    duration: 60,
    year: 2019,
    rating: 'TV-MA'
  },
  {
    title: 'The Marvelous Mrs. Maisel',
    description: 'A housewife in 1958 decides to become a stand-up comic.',
    genre: 'comedy',
    type: 'show',
    service: 'amazon-prime',
    serviceContentId: 'marvelous-mrs-maisel-prime',
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=600&fit=crop',
    duration: 50,
    year: 2017,
    rating: 'TV-14'
  },
  {
    title: 'Tom Clancy\'s Jack Ryan',
    description: 'An up-and-coming CIA analyst, Jack Ryan, is thrust into a dangerous field assignment as he uncovers a pattern in terrorist communication.',
    genre: 'thriller',
    type: 'show',
    service: 'amazon-prime',
    serviceContentId: 'jack-ryan-prime',
    imageUrl: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=400&h=600&fit=crop',
    duration: 60,
    year: 2018,
    rating: 'TV-14'
  },
  {
    title: 'The Lord of the Rings: The Rings of Power',
    description: 'Epic drama set thousands of years before the events of J.R.R. Tolkien\'s The Hobbit and The Lord of the Rings follows an ensemble cast of characters.',
    genre: 'fantasy',
    type: 'show',
    service: 'amazon-prime',
    serviceContentId: 'rings-of-power-prime',
    imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop',
    duration: 70,
    year: 2022,
    rating: 'TV-14'
  },
  {
    title: 'Invincible',
    description: 'Teen Mark Grayson inherits his father\'s superpowers and learns that his legendary dad may not be who he thought he was.',
    genre: 'animation',
    type: 'show',
    service: 'amazon-prime',
    serviceContentId: 'invincible-prime',
    imageUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=400&h=600&fit=crop',
    duration: 45,
    year: 2021,
    rating: 'TV-MA'
  },
  {
    title: 'Fleabag',
    description: 'A dry-witted woman known only as Fleabag navigates life and love in London while trying to cope with tragedy.',
    genre: 'comedy',
    type: 'show',
    service: 'amazon-prime',
    serviceContentId: 'fleabag-prime',
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=600&fit=crop',
    duration: 30,
    year: 2016,
    rating: 'TV-MA'
  },
  // Amazon Prime Movies
  {
    title: 'The Tomorrow War',
    description: 'A family man is drafted to fight in a future war where the fate of humanity relies on his ability to confront the past.',
    genre: 'sci-fi',
    type: 'movie',
    service: 'amazon-prime',
    serviceContentId: 'tomorrow-war-prime',
    imageUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop',
    duration: 140,
    year: 2021,
    rating: 'PG-13'
  },
  {
    title: 'Sound of Metal',
    description: 'A heavy-metal drummer\'s life is thrown into freefall when he begins to lose his hearing.',
    genre: 'drama',
    type: 'movie',
    service: 'amazon-prime',
    serviceContentId: 'sound-of-metal-prime',
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=600&fit=crop',
    duration: 120,
    year: 2019,
    rating: 'R'
  },
  {
    title: 'Borat Subsequent Moviefilm',
    description: 'Borat returns to America to deliver a prodigious bribe to American regime for benefit of once-glorious nation of Kazakhstan.',
    genre: 'comedy',
    type: 'movie',
    service: 'amazon-prime',
    serviceContentId: 'borat-2-prime',
    imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop',
    duration: 95,
    year: 2020,
    rating: 'R'
  }
];

export async function seedRealContent() {
  console.log('🌱 Seeding database with real Netflix and Amazon Prime content...');
  
  try {
    // Clear existing content
    await db.delete(content);
    console.log('✅ Cleared existing content');

    // Insert real content
    for (const item of realContent) {
      await db.insert(content).values(item);
    }
    
    console.log(`✅ Seeded ${realContent.length} real content items`);
    console.log('📺 Netflix content:', realContent.filter(c => c.service === 'netflix').length);
    console.log('🎬 Amazon Prime content:', realContent.filter(c => c.service === 'amazon-prime').length);
    
  } catch (error) {
    console.error('❌ Error seeding content:', error);
    throw error;
  }
}