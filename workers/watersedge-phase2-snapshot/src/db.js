// src/db.js — afo-demo-template
export async function dbFirst(env, sql, params = []) {
  return env.DEMO_DB.prepare(sql).bind(...params).first();
}

export async function dbAll(env, sql, params = []) {
  const r = await env.DEMO_DB.prepare(sql).bind(...params).all();
  return r.results || [];
}

export async function dbRun(env, sql, params = []) {
  return env.DEMO_DB.prepare(sql).bind(...params).run();
}

export async function loadSection(env, slug, section, fallback = null) {
  const row = await dbFirst(env, 'SELECT data FROM demo_content WHERE slug=? AND section=?', [slug, section]);
  if (!row) return fallback;
  try { return JSON.parse(row.data); } catch { return row.data; }
}

export async function loadAllContent(env, slug) {
  const rows = await dbAll(env, 'SELECT section, data FROM demo_content WHERE slug=?', [slug]);
  const content = {};
  for (const row of rows) {
    try { content[row.section] = JSON.parse(row.data); } catch { content[row.section] = row.data; }
  }
  return content;
}

export function defaultContact() {
  return {
    company: 'Your Business Name', phone: '(555) 000-0000', address: 'City, State',
    email: '', hours: 'Mon-Fri 9am-5pm', website: '', tagline: 'A great place to do business.',
    primary_color: '#14110d', secondary_color: '#fff8ee', accent_color: '#b76532',
    hero_image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1800&q=75',
  };
}

export function defaultServices() {
  return [
    { id: 's1', name: 'Service One',   desc: 'Description of your first service or offering.' },
    { id: 's2', name: 'Service Two',   desc: 'Description of your second service or offering.' },
    { id: 's3', name: 'Service Three', desc: 'Description of your third service or offering.' },
  ];
}

export function defaultTestimonials() {
  return [
    { name: 'Happy Customer',  role: 'Client',       quote: 'Excellent service, highly recommend.' },
    { name: 'Satisfied Guest', role: 'Repeat Client', quote: 'Professional, reliable, and easy to work with.' },
  ];
}

export function defaultMenu() {
  return {
    source: 'watersedgeventura.com menus + Toast public menu highlights',
    updated_at: '2026-06-09',
    menus: [
      {
        id: 'dinner',
        name: 'Dinner',
        description: 'Waters Edge dinner highlights with seafood, steaks, pastas, shared bites, and desserts.',
        categories: [
          {
            name: 'Shared Bites',
            items: [
              { name: 'Seasonal Bread & Butter', description: 'Fresh seasonal bread served with butter.', price: '', tags: ['starter', 'shareable'] },
              { name: 'Shrimp Lumpia', description: 'Crisp shrimp lumpia with savory aromatics and dipping sauce.', price: '', tags: ['starter', 'seafood', 'shareable'] },
              { name: 'Crispy Brussel Sprouts', description: 'Crispy brussels with bold savory-sweet flavor.', price: '', tags: ['starter', 'vegetable', 'popular'] },
              { name: 'Fried Calamari', description: 'Golden fried calamari, a classic seafood starter.', price: '', tags: ['starter', 'seafood'] },
              { name: 'Steamed Mussels', description: 'Mussels steamed in a flavorful broth.', price: '', tags: ['starter', 'seafood'] },
              { name: 'Shrimp Scampi', description: 'Shrimp with garlic-forward scampi flavors.', price: '', tags: ['starter', 'seafood'] },
              { name: 'Blackened Ahi Tostada Bites', description: 'Blackened ahi served as crisp tostada-style bites.', price: '', tags: ['starter', 'seafood', 'ahi'] },
              { name: 'Margherita Pizza', description: 'Classic margherita pizza with bright tomato and cheese.', price: '', tags: ['pizza', 'shareable'] }
            ]
          },
          {
            name: 'House Favorites',
            items: [
              { name: 'Seasonal Catch Bruschetta', description: 'Seasonal seafood catch served bruschetta-style.', price: '', tags: ['seafood', 'signature'] },
              { name: 'Cioppino', description: 'Seafood stew with rich coastal flavor.', price: '', tags: ['seafood', 'soup', 'signature'] },
              { name: 'Grilled Atlantic Salmon', description: 'Grilled salmon with a refined coastal presentation.', price: '', tags: ['seafood', 'salmon', 'healthy'] },
              { name: 'Pacific Halibut Fish N Chips', description: 'Pacific halibut prepared as crisp fish and chips.', price: '', tags: ['seafood', 'halibut', 'classic'] },
              { name: 'Seared Ahi Steak', description: 'Seared ahi for guests looking for a bold seafood entree.', price: '', tags: ['seafood', 'ahi'] },
              { name: 'Seafood Risotto', description: 'Creamy risotto with seafood flavors.', price: '', tags: ['seafood', 'pasta', 'risotto'] },
              { name: 'Bacon Jam Scallops', description: 'Scallops paired with bacon jam.', price: '', tags: ['seafood', 'scallops', 'signature'] },
              { name: 'Slow Braised Short Rib', description: 'Tender slow-braised short rib.', price: '', tags: ['beef', 'comfort', 'popular'] },
              { name: 'Top Sirloin Steak', description: 'Classic top sirloin steak entree.', price: '', tags: ['steak', 'beef'] },
              { name: 'Flat Iron Steak', description: 'Flat iron steak with hearty steakhouse appeal.', price: '', tags: ['steak', 'beef'] },
              { name: 'Filet Mignon', description: 'Premium filet mignon for a special dinner.', price: '', tags: ['steak', 'date night'] }
            ]
          },
          {
            name: 'Pastas & Burgers',
            items: [
              { name: 'Pasta Favorites', description: 'Comforting pasta options with Waters Edge coastal style.', price: '', tags: ['pasta'] },
              { name: 'Burger Favorites', description: 'Hearty burger options for a casual meal by the water.', price: '', tags: ['burger', 'casual'] }
            ]
          },
          {
            name: 'Desserts',
            items: [
              { name: 'Dessert Selection', description: 'Ask the team about current dessert options.', price: '', tags: ['dessert'] }
            ]
          }
        ]
      },
      {
        id: 'brunch',
        name: 'Brunch',
        description: 'Weekend brunch-style favorites, breakfast classics, seafood, and lunch favorites.',
        categories: [
          {
            name: 'Brunch Bites',
            items: [
              { name: 'Shrimp Lumpia', description: 'Crispy shrimp lumpia, great for sharing.', price: '', tags: ['brunch', 'starter', 'seafood'] },
              { name: 'Crispy Brussel Sprouts', description: 'Crispy brussels for the table.', price: '', tags: ['brunch', 'vegetable'] },
              { name: 'Brunch Calamari Fries', description: 'Calamari fries prepared for brunch service.', price: '', tags: ['brunch', 'seafood'] },
              { name: 'Almond Croissant', description: 'Sweet almond croissant pastry.', price: '', tags: ['brunch', 'pastry'] },
              { name: 'Special Pastry of the Day', description: 'Ask about the current pastry special.', price: '', tags: ['brunch', 'pastry'] }
            ]
          },
          {
            name: 'Breakfast Favorites',
            items: [
              { name: 'Original Avocado Toast', description: 'Avocado toast brunch classic.', price: '', tags: ['brunch', 'vegetarian'] },
              { name: 'Avocado Benedict', description: 'Benedict-style brunch option with avocado.', price: '', tags: ['brunch', 'benedict'] },
              { name: 'Breakfast Burger', description: 'Burger-style brunch favorite.', price: '', tags: ['brunch', 'burger'] },
              { name: 'Chicken & Waffles', description: 'Sweet and savory brunch favorite.', price: '', tags: ['brunch', 'comfort'] },
              { name: 'Breakfast Burrito', description: 'Hearty breakfast burrito.', price: '', tags: ['brunch', 'breakfast'] },
              { name: 'Lobster Benedict', description: 'A premium seafood Benedict option.', price: '', tags: ['brunch', 'lobster', 'seafood'] },
              { name: 'Salmon Burger', description: 'Salmon burger for a seafood brunch choice.', price: '', tags: ['brunch', 'salmon', 'seafood'] },
              { name: 'Pork Chop & Eggs', description: 'Classic pork chop and eggs brunch entree.', price: '', tags: ['brunch', 'eggs'] },
              { name: 'Chorizo Chilaquiles', description: 'Chilaquiles with chorizo brunch flavor.', price: '', tags: ['brunch', 'spicy'] }
            ]
          },
          {
            name: 'Lunch Favorites',
            items: [
              { name: 'Margherita', description: 'Classic pizza-style lunch favorite.', price: '', tags: ['brunch', 'pizza'] },
              { name: 'Anchor’s Way Tacos', description: 'Tacos inspired by the harbor setting.', price: '', tags: ['brunch', 'tacos'] },
              { name: 'Pacific Halibut N’ Chips', description: 'Halibut fish and chips during brunch/lunch.', price: '', tags: ['brunch', 'halibut', 'seafood'] },
              { name: 'Ahi Steak', description: 'Ahi steak lunch favorite.', price: '', tags: ['brunch', 'ahi', 'seafood'] },
              { name: 'Breakfast Salmon', description: 'Salmon-forward brunch entree.', price: '', tags: ['brunch', 'salmon'] },
              { name: 'Shipwreck', description: 'A hearty Waters Edge brunch/lunch item.', price: '', tags: ['brunch', 'signature'] },
              { name: 'Steak & Eggs', description: 'Classic steak and eggs.', price: '', tags: ['brunch', 'steak'] },
              { name: 'Croque-Madame Sandwich', description: 'Classic Croque-Madame style sandwich.', price: '', tags: ['brunch', 'sandwich'] }
            ]
          }
        ]
      }
    ]
  };
}
