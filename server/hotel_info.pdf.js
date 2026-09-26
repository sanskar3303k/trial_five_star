// Embedded hotel knowledge base — replace this with real PDF parsing
// when you have a real PDF file. Drop your PDF at server/data/hotel_info.pdf
// and the RAG pipeline will parse it automatically via pdf-parse.
//
// This fallback text is used when no PDF is found.
export const HOTEL_INFO_TEXT = `
SMART RESORT 360 — COMPLETE GUEST GUIDE

=== ABOUT THE RESORT ===
Smart Resort 360 is a luxury 5-star beachfront resort located in Goa, India.
We offer 120 rooms including Garden Rooms, Ocean Suites, and Private Pool Villas.
The resort spans 12 acres with lush tropical gardens and a private beach.

=== DINING ===
The Palms Restaurant:
- Breakfast: 7:00 AM – 10:30 AM (buffet, ₹1,200 per person)
- Lunch: 12:00 PM – 3:00 PM (à la carte)
- Dinner: 7:00 PM – 10:30 PM (à la carte, reservations recommended)

Beachside Bar & Grill:
- Open daily 11:00 AM – 11:00 PM
- Serves light snacks, cocktails, mocktails, and grilled seafood

In-Room Dining:
- Available 7:00 AM – 11:00 PM
- 30-minute delivery guarantee
- Order via the Guest Portal or dial 0 from your room phone

=== SPA & WELLNESS ===
Serenity Spa:
- Open daily 9:00 AM – 8:00 PM
- Treatments: Swedish massage, Ayurvedic therapies, hot stone massage, aromatherapy, facials
- 90-minute Relaxation Journey package: ₹4,500
- Couple's retreat (2 hours): ₹8,000
- Book via Guest Portal or call extension 102
- Advance booking recommended, especially on weekends

Fitness Centre:
- Open 24 hours
- Equipment: treadmills, weights, yoga area, cycling bikes
- Personal trainer available 6:00 AM – 9:00 PM (₹2,000/hour)

=== POOL ===
Infinity Pool:
- Open daily 7:00 AM – 8:00 PM
- Towels provided poolside
- Poolside service available 10:00 AM – 6:00 PM

Kids' Pool:
- Open daily 9:00 AM – 6:00 PM
- Lifeguard on duty at all times

=== CHECK-IN / CHECK-OUT ===
- Check-in time: 2:00 PM
- Check-out time: 11:00 AM
- Early check-in: subject to availability (₹1,500 fee before 10:00 AM)
- Late check-out: subject to availability (₹2,000 fee until 4:00 PM, full-night charge after)
- Express checkout available via Guest Portal

=== ROOM INFORMATION ===
Garden Room (₹6,500/night):
- 35 sqm, garden or pool view
- King or twin bed configuration
- Amenities: AC, minibar, safe, 55" TV, high-speed WiFi

Ocean Suite (₹14,500/night):
- 65 sqm, direct ocean view
- King bed, separate living area
- Amenities: all Garden Room amenities + butler service, private balcony

Private Pool Villa (₹28,000/night):
- 150 sqm, private plunge pool
- Includes daily breakfast for 2, airport transfers, butler service

=== HOUSEKEEPING ===
- Daily turndown service included
- Request fresh towels, extra pillows, or room cleaning via Guest Portal
- Laundry service: drop bag before 9:00 AM for same-day return
- Dry cleaning available (24-hour turnaround)
- Do Not Disturb: use the physical sign or the Guest Portal toggle

=== ACTIVITIES & EXPERIENCES ===
Complimentary:
- Sunrise yoga: daily 7:00 AM at the beachside deck
- Guided garden walk: 4:00 PM (Mon, Wed, Fri)
- Sunset bonfire: 6:30 PM at the private beach

For a fee:
- Parasailing, jet-ski, kayaking (beach activities desk, open 8:00 AM – 5:00 PM)
- Scuba diving certification: ₹8,000 (2-day course)
- Cooking class with Chef: ₹3,500/person (every Thursday 11:00 AM)

=== TRANSPORTATION ===
- Airport transfers: complimentary for Private Pool Villa guests, ₹2,500 for others
- Taxi service: available 24 hours via front desk
- Car rental: partner desk in the lobby, open 8:00 AM – 6:00 PM
- Shuttle to Goa city centre: 9:00 AM and 3:00 PM daily

=== BUSINESS CENTRE ===
- Open 7:00 AM – 10:00 PM
- High-speed WiFi, printing, scanning, meeting room rental
- Meeting rooms for 6–50 persons (book via front desk)

=== CHILDREN ===
- Kids' club open daily 9:00 AM – 6:00 PM (ages 4–12, complimentary)
- Babysitting available (₹500/hour, 4-hour minimum, advance notice required)

=== PETS ===
- Pet-friendly resort (dogs and cats only)
- Pet fee: ₹1,500/night
- Pet amenities: bed, bowls, treats available on request

=== CONTACT ===
- Front desk: Dial 0 from your room or use the Guest Portal
- Concierge: Dial 102 or use Guest Portal "Special Requests"
- Medical emergency: Dial 999 (24-hour nurse on site, doctor on call)
- Emergency: Dial 112
`;
