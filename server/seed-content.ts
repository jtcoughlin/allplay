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
    serviceContentId: '80057281',
    directUrl: 'https://www.netflix.com/title/80057281',
    imageUrl: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
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
    serviceContentId: '81231974',
    directUrl: 'https://www.netflix.com/title/81231974',
    imageUrl: 'https://image.tmdb.org/t/p/w500/9PFonBhy4cQy7Jz20NpMygczOkv.jpg',
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
    serviceContentId: '81040344',
    directUrl: 'https://www.netflix.com/title/81040344',
    imageUrl: 'https://image.tmdb.org/t/p/w500/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg',
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
    serviceContentId: '80025678',
    directUrl: 'https://www.netflix.com/title/80025678',
    imageUrl: 'https://image.tmdb.org/t/p/w500/4g5gK5eGWZg8swIZl6eX2AoJp8S.jpg',
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
    serviceContentId: '80117552',
    directUrl: 'https://www.netflix.com/watch/80117552',
    imageUrl: 'https://image.tmdb.org/t/p/w500/m73QjSFgKQ05OKyZbIJqYklAc4G.jpg',
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
    serviceContentId: '80100172',
    directUrl: 'https://www.netflix.com/title/80100172',
    imageUrl: 'https://image.tmdb.org/t/p/w500/aOIuZAjPaRIE6CMzbazvcHuHXDc.jpg',
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
    serviceContentId: '81161626',
    directUrl: 'https://www.netflix.com/title/81161626',
    imageUrl: 'https://image.tmdb.org/t/p/w500/lAXONuqg41NwUMuzMiFvicDET9Y.jpg',
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
    serviceContentId: '81458416',
    directUrl: 'https://www.netflix.com/watch/81458416',
    imageUrl: 'https://image.tmdb.org/t/p/w500/vDGr1YdrlfbU9wxTOdpf3zChmv9.jpg',
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
    serviceContentId: 'B0875JNV76',
    directUrl: 'https://app.primevideo.com/detail?gti=amzn1.dv.gti.b0875jnv76',
    imageUrl: 'https://image.tmdb.org/t/p/w500/stTEycfG9928HYGEISBFaG1ngjM.jpg',
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
    serviceContentId: 'B077RMZL8J',
    directUrl: 'https://app.primevideo.com/detail?gti=amzn1.dv.gti.b077rmzl8j',
    imageUrl: 'https://image.tmdb.org/t/p/w500/zS7fQiOZiKCVH2vlYSiIsFWW8hh.jpg',
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
    serviceContentId: 'B07GC2KLBY',
    directUrl: 'https://app.primevideo.com/detail?gti=amzn1.dv.gti.b07gc2klby',
    imageUrl: 'https://image.tmdb.org/t/p/w500/q7HidVGjVSdJOlGcnr7tjjW2eLq.jpg',
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
    serviceContentId: 'B0B5SV1RTM',
    directUrl: 'https://app.primevideo.com/detail?gti=amzn1.dv.gti.b0b5sv1rtm',
    imageUrl: 'https://image.tmdb.org/t/p/w500/mYLOqiStMxDK3fYZFirgrMt8z5d.jpg',
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
    serviceContentId: 'B00BQJMRWI',
    directUrl: 'https://app.primevideo.com/detail?gti=amzn1.dv.gti.b00bqjmrwi',
    imageUrl: 'https://image.tmdb.org/t/p/w500/yf5IuMW6GHghu39kxA0oFx7Bxmj.jpg',
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
    serviceContentId: 'B01LTYIXS6',
    directUrl: 'https://app.primevideo.com/detail?gti=amzn1.dv.gti.b01ltyixs6',
    imageUrl: 'https://image.tmdb.org/t/p/w500/27vEYsRKa3eAniwmoccOoluEXQ1.jpg',
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
    serviceContentId: 'B096L2ZDX9',
    directUrl: 'https://app.primevideo.com/detail?gti=amzn1.dv.gti.b096l2zdx9',
    imageUrl: 'https://image.tmdb.org/t/p/w500/34nDCQZwaEvsy4CFO5hkGRFDCVU.jpg',
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
    serviceContentId: 'B08P7Q7FZR',
    directUrl: 'https://app.primevideo.com/detail?gti=amzn1.dv.gti.b08p7q7fzr',
    imageUrl: 'https://image.tmdb.org/t/p/w500/7SudKRdLaCGHjlSkjCMMLx9w9Pg.jpg',
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
    serviceContentId: 'B08MD4QZ9K',
    directUrl: 'https://app.primevideo.com/detail?gti=amzn1.dv.gti.b08md4qz9k',
    imageUrl: 'https://image.tmdb.org/t/p/w500/eduqODhEITMm4KTlFdYdXa5IOtR.jpg',
    duration: 95,
    year: 2020,
    rating: 'R'
  },
  // YouTube TV Live Content
  {
    title: 'ABC World News Tonight',
    description: 'America\'s most-watched evening news program, delivering the day\'s biggest stories with David Muir.',
    genre: 'news',
    type: 'show',
    service: 'youtube-tv',
    serviceContentId: 'Cy-DXnSXdY0',
    directUrl: 'https://tv.youtube.com/watch/Cy-DXnSXdY0?vp=0gEEEgIwAQ%3D%3D',
    imageUrl: '/attached_assets/image_1754436760814.png',
    duration: 30,
    year: 2024,
    rating: 'TV-G',
    isLive: true
  },
  {
    title: 'Good Morning America',
    description: 'Start your day with the latest news, weather, and inspiring stories from across America.',
    genre: 'news',
    type: 'show',
    service: 'youtube-tv',
    serviceContentId: 'gma-live',
    directUrl: 'https://tv.youtube.com/watch/gma-live',
    imageUrl: '/attached_assets/image_1754436760814.png',
    duration: 180,
    year: 2024,
    rating: 'TV-G',
    isLive: true
  },
  {
    title: 'The Tonight Show Starring Jimmy Fallon',
    description: 'Late-night comedy with celebrity interviews, musical performances, and hilarious sketches.',
    genre: 'comedy',
    type: 'show',
    service: 'youtube-tv',
    serviceContentId: 'tonight-show-live',
    directUrl: 'https://tv.youtube.com/watch/tonight-show-live',
    imageUrl: '/attached_assets/image_1754436760814.png',
    duration: 60,
    year: 2024,
    rating: 'TV-14',
    isLive: true
  },
  {
    title: 'CNN Breaking News',
    description: 'Live breaking news coverage and analysis of the day\'s most important events.',
    genre: 'news',
    type: 'live',
    service: 'youtube-tv',
    serviceContentId: 'cnn-breaking',
    directUrl: 'https://tv.youtube.com/watch/cnn-breaking',
    imageUrl: '/attached_assets/image_1754436760814.png',
    duration: 60,
    year: 2024,
    rating: 'TV-PG',
    isLive: true
  },
  {
    title: 'Sunday Night Football',
    description: 'The premier Sunday night NFL matchup with expert commentary and analysis.',
    genre: 'sports',
    type: 'live',
    service: 'youtube-tv',
    serviceContentId: 'snf-live',
    directUrl: 'https://tv.youtube.com/watch/snf-live',
    imageUrl: '/attached_assets/image_1754436760814.png',
    duration: 210,
    year: 2024,
    rating: 'TV-G',
    isLive: true
  },
  // Happy Gilmore 2 (Netflix Comedy Movie)
  {
    title: 'Happy Gilmore 2',
    description: 'Happy Gilmore returns to the golf course for another hilarious round of unconventional golfing and hockey-style antics.',
    genre: 'comedy',
    type: 'movie',
    service: 'netflix',
    serviceContentId: 'happy-gilmore-2',
    directUrl: 'https://www.netflix.com/title/happy-gilmore-2',
    imageUrl: '/attached_assets/image_1754437006943.png',
    duration: 120,
    year: 2025,
    rating: 'PG-13'
  },
  // Featured Headliner Content
  {
    id: 'netflix-paul-tyson',
    title: 'Jake Paul vs Mike Tyson',
    description: 'The most anticipated boxing match of the decade. YouTube sensation Jake Paul faces off against heavyweight legend Mike Tyson in an epic showdown.',
    genre: 'sports',
    type: 'live',
    service: 'netflix',
    serviceContentId: 'paul-tyson-fight',
    directUrl: 'https://www.netflix.com/title/paul-tyson-fight',
    imageUrl: '/attached_assets/image_1754368126300.png',
    duration: 180,
    year: 2024,
    rating: 'TV-14',
    isLive: true
  },
  {
    id: 'cnn-presidential-debate',
    title: 'Presidential Debate 2024',
    description: 'Live coverage of the crucial presidential debate that will shape the future of America. Comprehensive analysis and real-time fact-checking.',
    genre: 'news',
    type: 'live',
    service: 'cnn',
    serviceContentId: 'presidential-debate-2024',
    directUrl: 'https://www.cnn.com/live/presidential-debate-2024',
    imageUrl: '/attached_assets/image_1754368633196.png',
    duration: 120,
    year: 2024,
    rating: 'TV-PG',
    isLive: true
  },
  {
    id: 'hulu-bill-burr-drop-dead',
    title: 'Bill Burr: Drop Dead Years',
    description: 'Comedy legend Bill Burr delivers his most personal and hilarious stand-up special yet, tackling marriage, parenting, and the absurdities of modern life.',
    genre: 'comedy',
    type: 'show',
    service: 'hulu',
    serviceContentId: 'bill-burr-drop-dead-years',
    directUrl: 'https://www.hulu.com/watch/bill-burr-drop-dead-years',
    imageUrl: '/attached_assets/image_1754434659807.png',
    duration: 75,
    year: 2024,
    rating: 'TV-MA'
  },
  {
    id: 'espn-5',
    title: 'The Last Dance',
    description: 'The definitive documentary series chronicling Michael Jordan and the Chicago Bulls dynasty. An intimate look at the greatest basketball player of all time.',
    genre: 'sports',
    type: 'show',
    service: 'espn-plus',
    serviceContentId: 'the-last-dance',
    directUrl: 'https://www.espn.com/watch/player/_/id/the-last-dance',
    imageUrl: '/attached_assets/image_1754368126300.png',
    duration: 60,
    year: 2020,
    rating: 'TV-14'
  },
  // ESPN+ Sports Content  
  {
    title: 'Monday Night Football',
    description: 'The premier primetime NFL game of the week featuring top matchups and expert commentary.',
    genre: 'sports',
    type: 'live',
    service: 'espn-plus',
    serviceContentId: 'mnf-live',
    directUrl: 'https://www.espn.com/watch/player/_/id/espn-plus-mnf',
    imageUrl: 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fespn%2Fespn_logos%2Fespn_red.png&w=300&h=200&scale=crop&cquality=80&location=origin&format=jpg',
    duration: 180,
    year: 2024,
    rating: 'TV-G',
    isLive: true
  },
  {
    title: 'College Football Playoff',
    description: 'The biggest games in college football featuring top-ranked teams competing for the national championship.',
    genre: 'sports',
    type: 'live',
    service: 'espn-plus',
    serviceContentId: 'cfp-2024',
    directUrl: 'https://www.espn.com/watch/player/_/id/espn-plus-cfp',
    imageUrl: 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fespn%2Fespn_logos%2Fespn_red.png&w=300&h=200&scale=crop&cquality=80&location=origin&format=jpg',
    duration: 240,
    year: 2024,
    rating: 'TV-G',
    isLive: true
  },
  {
    title: 'NBA on ESPN',
    description: 'Live NBA games featuring the best teams and biggest stars in professional basketball.',
    genre: 'sports',
    type: 'live',
    service: 'espn-plus',
    serviceContentId: 'nba-live',
    directUrl: 'https://www.espn.com/watch/player/_/id/espn-plus-nba',
    imageUrl: 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fespn%2Fespn_logos%2Fespn_red.png&w=300&h=200&scale=crop&cquality=80&location=origin&format=jpg',
    duration: 150,
    year: 2024,
    rating: 'TV-G',
    isLive: true
  },
  {
    title: 'UFC Fight Night',
    description: 'Elite mixed martial arts competition featuring the world\'s best fighters in octagon action.',
    genre: 'sports',
    type: 'live',
    service: 'espn-plus',
    serviceContentId: 'ufc-fight-night',
    directUrl: 'https://www.espn.com/watch/player/_/id/espn-plus-ufc',
    imageUrl: 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fespn%2Fespn_logos%2Fespn_red.png&w=300&h=200&scale=crop&cquality=80&location=origin&format=jpg',
    duration: 180,
    year: 2024,
    rating: 'TV-14',
    isLive: true
  },
  {
    title: 'SportsCenter',
    description: 'ESPN\'s flagship sports news and highlights program covering all the day\'s biggest sports stories.',
    genre: 'sports',
    type: 'show',
    service: 'espn-plus',
    serviceContentId: 'sportscenter-daily',
    directUrl: 'https://www.espn.com/watch/player/_/id/espn-plus-sc',
    imageUrl: 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fespn%2Fespn_logos%2Fespn_red.png&w=300&h=200&scale=crop&cquality=80&location=origin&format=jpg',
    duration: 60,
    year: 2024,
    rating: 'TV-G',
    isLive: false
  },
  {
    title: 'College GameDay',
    description: 'The premier college football pregame show traveling to the biggest games each Saturday.',
    genre: 'sports',
    type: 'show',
    service: 'espn-plus',
    serviceContentId: 'college-gameday',
    directUrl: 'https://www.espn.com/watch/player/_/id/espn-plus-cgd',
    imageUrl: 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fespn%2Fespn_logos%2Fespn_red.png&w=300&h=200&scale=crop&cquality=80&location=origin&format=jpg',
    duration: 180,
    year: 2024,
    rating: 'TV-G',
    isLive: false
  },
  {
    title: 'MLB on ESPN',
    description: 'Live Major League Baseball games featuring America\'s pastime with expert commentary.',
    genre: 'sports',
    type: 'live',
    service: 'espn-plus',
    serviceContentId: 'mlb-live',
    directUrl: 'https://www.espn.com/watch/player/_/id/espn-plus-mlb',
    imageUrl: 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fespn%2Fespn_logos%2Fespn_red.png&w=300&h=200&scale=crop&cquality=80&location=origin&format=jpg',
    duration: 180,
    year: 2024,
    rating: 'TV-G',
    isLive: true
  },
  {
    title: '30 for 30',
    description: 'Award-winning documentary series exploring the biggest stories in sports history.',
    genre: 'sports',
    type: 'show',
    service: 'espn-plus',
    serviceContentId: '30for30-series',
    directUrl: 'https://www.espn.com/watch/player/_/id/espn-plus-30for30',
    imageUrl: 'https://a.espncdn.com/combiner/i?img=%2Fi%2Fespn%2Fespn_logos%2Fespn_red.png&w=300&h=200&scale=crop&cquality=80&location=origin&format=jpg',
    duration: 90,
    year: 2024,
    rating: 'TV-14',
    isLive: false
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
    console.log('🏈 ESPN+ content:', realContent.filter(c => c.service === 'espn-plus').length);
    console.log('📺 YouTube TV content:', realContent.filter(c => c.service === 'youtube-tv').length);
    console.log('🎭 Hulu content:', realContent.filter(c => c.service === 'hulu').length);
    console.log('📰 CNN content:', realContent.filter(c => c.service === 'cnn').length);
    console.log('🎯 Featured headliner content with specific IDs restored');
    console.log('🚀 All content now includes specialized presentation features');
    
  } catch (error) {
    console.error('❌ Error seeding content:', error);
    throw error;
  }
}