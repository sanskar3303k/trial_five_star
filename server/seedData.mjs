// Realistic seed data generator for 150 Rooms and Predictive Maintenance
export function seedResortData(db) {
  // Check if rooms are already seeded
  const roomCount = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
  if (roomCount === 0) {
    console.log('[Seed] Seeding 150 rooms with realistic guest profiles...');
    const roomTypes = [
      { type: 'Deluxe Ocean View', price: 18500 },
      { type: 'Garden Villa', price: 24000 },
      { type: 'Private Pool Suite', price: 34000 },
      { type: 'Standard King', price: 12000 },
      { type: 'Presidential Suite', price: 58000 },
    ];

    const firstNames = [
      'Aarav', 'Alex', 'Aditi', 'Ananya', 'Carlos', 'Chloe', 'David', 'Elena', 'Ethan', 'Fatima',
      'Gabriel', 'Hanna', 'Ishaan', 'Jamie', 'Kabir', 'Kavya', 'Liam', 'Maya', 'Nathan', 'Olivia',
      'Pooja', 'Rohan', 'Sara', 'Siddharth', 'Sophie', 'Tanya', 'Vikram', 'Zara', 'Oliver', 'Emma',
      'Lucas', 'Mia', 'Noah', 'Ava', 'Leo', 'Isabella', 'Rajesh', 'Sunita', 'Marcus', 'Meera'
    ];
    const lastNames = [
      'Morgan', 'Lee', 'Sharma', 'Patel', 'Verma', 'Smith', 'Johnson', 'Gupta', 'Tanaka', 'Muller',
      'Dubois', 'Silva', 'Kapoor', 'Reddy', 'Mehta', 'Nair', 'Rossi', 'Taylor', 'Anderson', 'Chen'
    ];
    const specialRequestsPool = [
      'High floor preferred with sunset view',
      'Feather-free hypoallergenic pillows requested',
      'Celebrating 10th anniversary - fruit basket arranged',
      'Late check-out requested at 2:00 PM',
      'Quiet room away from elevators',
      'Baby crib required in room',
      'Extra mineral water and green tea set',
      'Airport transfer scheduled at 10:00 AM on departure day',
      'Twin beds configuration requested',
      'Gluten-free welcome amenities preferred'
    ];
    const vipTiers = ['Standard', 'Silver', 'Gold', 'Platinum'];

    const insertRoom = db.prepare(`
      INSERT INTO rooms (
        room_number, floor, type, price_per_night, status,
        guest_name, guest_age, guest_gender, guest_email, guest_phone,
        check_in, check_out, guest_count, vip_tier, special_requests, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let occupiedTarget = 129; // Exactly 129 occupied of 150
    let occupiedCreated = 0;
    let cleaningCreated = 0;
    let maintenanceCreated = 0;

    for (let floor = 1; floor <= 3; floor++) {
      for (let num = 1; num <= 50; num++) {
        const roomNumber = `${floor}${String(num).padStart(2, '0')}`;
        const typeIndex = (floor * 5 + num) % roomTypes.length;
        const roomType = roomTypes[typeIndex];

        // Specific demo accounts
        if (roomNumber === '204') {
          insertRoom.run(
            roomNumber, floor, 'Deluxe Ocean View', 18500, 'Occupied',
            'Alex Morgan', 34, 'Female', 'alex.morgan@smartresort.demo', '+91 98201 44521',
            '2026-09-24', '2026-09-29', 2, 'Platinum',
            'Celebrating wedding anniversary. Extra bath towels and evening turn-down service.',
            'VIP Guest - Frequent traveler. Prefers sea view and quiet surroundings.'
          );
          occupiedCreated++;
          continue;
        }

        if (roomNumber === '308') {
          insertRoom.run(
            roomNumber, floor, 'Private Pool Suite', 34000, 'Occupied',
            'Jamie Lee', 29, 'Non-binary', 'guest2@smartresort.demo', '+91 97112 88319',
            '2026-09-25', '2026-09-28', 1, 'Gold',
            'Late check-out requested at 1:30 PM. Oat milk for morning espresso.',
            'Enjoys wellness spa packages and poolside dining.'
          );
          occupiedCreated++;
          continue;
        }

        // Determine status to match exactly 129 Occupied, 16 Available, 3 Cleaning, 2 Maintenance
        let status = 'Available';
        let guestName = null;
        let guestAge = null;
        let guestGender = null;
        let guestEmail = null;
        let guestPhone = null;
        let checkIn = null;
        let checkOut = null;
        let guestCount = null;
        let vipTier = null;
        let specialReq = null;
        let notes = null;

        if (occupiedCreated < occupiedTarget) {
          status = 'Occupied';
          const fn = firstNames[(floor * 50 + num) % firstNames.length];
          const ln = lastNames[(floor * 30 + num * 7) % lastNames.length];
          guestName = `${fn} ${ln}`;
          guestAge = 24 + ((floor * 13 + num * 3) % 46); // 24 to 69
          guestGender = (num % 2 === 0) ? 'Female' : (num % 5 === 0 ? 'Other' : 'Male');
          guestEmail = `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`;
          guestPhone = `+91 ${98000 + (num * 17) % 1999} ${10000 + (floor * 1000 + num * 73) % 89999}`;
          
          const inDay = 23 + (num % 4);
          const outDay = inDay + 2 + (num % 5);
          checkIn = `2026-09-${String(inDay).padStart(2, '0')}`;
          checkOut = `2026-09-${String(outDay).padStart(2, '0')}`;
          guestCount = 1 + (num % 3);
          vipTier = vipTiers[(floor + num) % vipTiers.length];
          specialReq = (num % 2 === 0) ? specialRequestsPool[(floor + num) % specialRequestsPool.length] : 'Standard stay amenities';
          notes = `Guest profile active. Keycard issued. Reservation ID #RES-2026-${floor}${num}.`;
          occupiedCreated++;
        } else if (cleaningCreated < 3) {
          status = 'Cleaning';
          notes = 'Housekeeping inspection in progress. Expected ready in 25 minutes.';
          cleaningCreated++;
        } else if (maintenanceCreated < 2) {
          status = 'Maintenance';
          notes = num % 2 === 0 ? 'AC thermostat sensor check scheduled.' : 'Plumbing pressure valve inspection.';
          maintenanceCreated++;
        } else {
          status = 'Available';
          notes = 'Clean and inspected. Ready for guest check-in.';
        }

        insertRoom.run(
          roomNumber, floor, roomType.type, roomType.price, status,
          guestName, guestAge, guestGender, guestEmail, guestPhone,
          checkIn, checkOut, guestCount, vipTier, specialReq, notes
        );
      }
    }
    console.log(`[Seed] Successfully seeded 150 rooms: ${occupiedCreated} Occupied, 16 Available, 3 Cleaning, 2 Maintenance.`);
  }

  // Seed Maintenance Equipment
  const equipCount = db.prepare('SELECT COUNT(*) as count FROM maintenance_equipment').get().count;
  if (equipCount === 0) {
    console.log('[Seed] Seeding maintenance equipment and scheduled tasks...');
    const insertEquip = db.prepare(`
      INSERT INTO maintenance_equipment (
        id, name, location, type, status, health, last_maintenance, next_due, failure_probability, issue, estimated_cost
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const equipmentData = [
      ['eq-1', 'Main Pool Pump', 'Pool Area', 'Pump', 'Critical', 23, '2026-08-15', '2026-09-28', 78, 'Vibration levels critical - bearing wear detected', '₹1.85L'],
      ['eq-2', 'HVAC Unit - Block A', 'Block A Rooftop', 'HVAC', 'Warning', 58, '2026-08-20', '2026-10-05', 42, 'Filter replacement needed, efficiency dropping', '₹45K'],
      ['eq-3', 'Generator #2', 'Power Room', 'Generator', 'Healthy', 92, '2026-09-01', '2026-12-01', 8, null, null],
      ['eq-4', 'Water Treatment Plant', 'Utility Area', 'Treatment', 'Warning', 67, '2026-08-25', '2026-10-10', 35, 'Chemical balance sensors need calibration', '₹28K'],
      ['eq-5', 'Elevator - Building C', 'Building C', 'Elevator', 'Healthy', 95, '2026-09-10', '2026-11-10', 5, null, null],
      ['eq-6', 'Kitchen Exhaust System', 'Main Kitchen', 'Ventilation', 'Critical', 34, '2026-08-10', '2026-09-27', 85, 'Duct buildup exceeds safe levels - fire hazard', '₹92K'],
    ];

    for (const eq of equipmentData) {
      insertEquip.run(...eq);
    }

    const insertTask = db.prepare(`
      INSERT INTO maintenance_tasks (
        id, equipment_id, equipment_name, task, priority, technician, scheduled_date, duration, status, estimated_cost, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const initialTasks = [
      ['task-1', 'eq-1', 'Pool Pump', 'Bearing Replacement', 'Critical', 'Apex ElectroMech', 'Today 2:00 PM', '4 hours', 'Scheduled', '₹1.85L', 'Immediate replacement required to prevent motor burnout.', new Date().toISOString()],
      ['task-2', 'eq-6', 'Kitchen Exhaust', 'Deep Duct Degreasing & Filter Swap', 'Critical', 'SafeFire Services', 'Tomorrow 9:00 AM', '3 hours', 'Scheduled', '₹92K', 'NFPA 96 fire safety compliance service.', new Date().toISOString()],
      ['task-3', 'eq-2', 'HVAC Unit A', 'HEPA Filter Replacement', 'Medium', 'Internal Engineering', '28 Sept 2026', '1 hour', 'Scheduled', '₹45K', 'Preventative maintenance for high season airflow.', new Date().toISOString()],
      ['task-4', 'eq-4', 'Water Treatment', 'Sensor Recalibration & PH testing', 'Low', 'AquaPure Systems', '30 Sept 2026', '2 hours', 'Scheduled', '₹28K', 'Routine monthly water standard calibration.', new Date().toISOString()],
    ];

    for (const t of initialTasks) {
      insertTask.run(...t);
    }
  }

  // Seed Staff Members & Recommendations
  const staffCount = db.prepare('SELECT COUNT(*) as count FROM staff_members').get().count;
  if (staffCount === 0) {
    console.log('[Seed] Seeding staff members and AI recommendations...');
    const insertStaff = db.prepare(`
      INSERT INTO staff_members (
        name, role, department, status, shift, hours, efficiency, avatar, phone, email, experience_years, assigned_area, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const staffSeedList = [
      ['Priya Sharma', 'Housekeeping Lead', 'Housekeeping', 'On Shift', 'Morning', 8, 94, 'PS', '+91 98210 11234', 'priya.s@smartresort.demo', 6, 'Block A & B Suites', new Date().toISOString()],
      ['Rahul Singh', 'Front Desk Executive', 'Front Office', 'On Shift', 'Morning', 8, 89, 'RS', '+91 98111 22345', 'rahul.s@smartresort.demo', 4, 'Main Reception & Arrival', new Date().toISOString()],
      ['Anita Patel', 'Head Line Chef', 'F&B', 'On Shift', 'Morning', 6, 92, 'AP', '+91 98322 33456', 'anita.p@smartresort.demo', 8, 'Central Kitchen & Pantry', new Date().toISOString()],
      ['Vikram Mehta', 'Senior HVAC Technician', 'Engineering', 'On Shift', 'Morning', 8, 88, 'VM', '+91 98433 44567', 'vikram.m@smartresort.demo', 9, 'Plant Room & Rooftop Chillers', new Date().toISOString()],
      ['Sneha Gupta', 'Spa Therapist', 'Spa & Wellness', 'On Break', 'Morning', 4, 96, 'SG', '+91 98544 55678', 'sneha.g@smartresort.demo', 5, 'Lotus Holistic Spa', new Date().toISOString()],
      ['Arjun Reddy', 'Chief Security Officer', 'Security', 'On Shift', 'Night', 12, 91, 'AR', '+91 98655 66789', 'arjun.r@smartresort.demo', 11, 'Resort Perimeter & Gates', new Date().toISOString()],
      ['Maya Krishnan', 'Restaurant Server', 'F&B', 'Off Duty', 'Evening', 0, 87, 'MK', '+91 98766 77890', 'maya.k@smartresort.demo', 2, 'Sunset Beach Bistro', new Date().toISOString()],
      ['Deepak Sharma', 'Pool Attendant', 'F&B', 'On Shift', 'Morning', 7, 93, 'DS', '+91 98877 88901', 'deepak.s@smartresort.demo', 3, 'Infinity Pool Deck', new Date().toISOString()],
      ['Sunita Rao', 'Room Attendant', 'Housekeeping', 'On Shift', 'Morning', 7, 95, 'SR', '+91 98988 99012', 'sunita.r@smartresort.demo', 5, 'Floor 2 Deluxe Rooms', new Date().toISOString()],
      ['Carlos Mendez', 'Master Mixologist', 'F&B', 'On Shift', 'Evening', 6, 90, 'CM', '+91 98099 00123', 'carlos.m@smartresort.demo', 7, 'Horizon Lounge Bar', new Date().toISOString()],
      ['Hanna Dubois', 'Guest Experience Lead', 'Front Office', 'On Shift', 'Morning', 8, 97, 'HD', '+91 98122 11234', 'hanna.d@smartresort.demo', 5, 'VIP Lounge & Check-in', new Date().toISOString()],
      ['David Chen', 'Master Electrician', 'Engineering', 'On Shift', 'Morning', 8, 86, 'DC', '+91 98233 22345', 'david.c@smartresort.demo', 8, 'Power Distribution Substation', new Date().toISOString()],
      ['Aditi Verma', 'Ayurvedic Specialist', 'Spa & Wellness', 'On Shift', 'Morning', 5, 93, 'AV', '+91 98344 33456', 'aditi.v@smartresort.demo', 6, 'Ayurveda Pavilion', new Date().toISOString()],
      ['Kabir Nair', 'Night Guard', 'Security', 'On Shift', 'Night', 10, 89, 'KN', '+91 98455 44567', 'kabir.n@smartresort.demo', 4, 'South Wing Gate', new Date().toISOString()],
      ['Chloe Taylor', 'Pastry Chef', 'F&B', 'On Shift', 'Morning', 7, 94, 'CT', '+91 98566 55678', 'chloe.t@smartresort.demo', 5, 'Resort Patisserie', new Date().toISOString()],
      ['Rohan Kapoor', 'Senior Concierge Porter', 'Front Office', 'On Shift', 'Morning', 8, 91, 'RK', '+91 98677 66789', 'rohan.k@smartresort.demo', 3, 'Arrival Pavilion', new Date().toISOString()]
    ];

    for (const s of staffSeedList) {
      insertStaff.run(...s);
    }

    const insertStaffRec = db.prepare(`
      INSERT INTO staff_recommendations (id, type, title, description, impact, action, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertStaffRec.run(
      1, 'critical', 'Housekeeping Overload Detected',
      'Current workload at 94% due to 86% occupancy (129/150 rooms). Recommend redeploying 2 staff from Spa (45% workload) to support turnover.',
      '35% faster room turnover expected', 'Redeploy Staff', 'active'
    );
    insertStaffRec.run(
      2, 'warning', 'Night Shift Coverage Gap',
      'Security night shift understaffed for upcoming weekend. 2 additional guards needed for peak occupancy.',
      'Maintain safety standards', 'Schedule Overtime', 'active'
    );
    insertStaffRec.run(
      3, 'info', 'Cross-Training Opportunity',
      '3 F&B staff available for pool attendant certification. Would increase flexibility during peak seasons.',
      '20% scheduling flexibility gain', 'Initiate Training', 'active'
    );
  }

  // Seed Inventory
  const invCount = db.prepare('SELECT COUNT(*) as count FROM inventory_items').get().count;
  if (invCount === 0) {
    console.log('[Seed] Seeding inventory items, purchase orders and AI demand insights...');
    const insertInv = db.prepare(`
      INSERT INTO inventory_items (
        name, category, stock, unit, min_stock, max_stock, status, trend, demand, cost, supplier, last_restocked
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const invItemsList = [
      ['Fresh Milk', 'Dairy', 45, 'Liters', 100, 200, 'Low', 'down', 125, 52, 'Heritage Dairy Farms', '2026-09-24'],
      ['Chicken Breast', 'Meat', 28, 'Kg', 30, 60, 'Critical', 'stable', 35, 280, 'Meat Masters Wholesalers', '2026-09-23'],
      ['Rice Basmati', 'Grains', 150, 'Kg', 50, 200, 'Optimal', 'up', 40, 85, 'Royal Grains Exporters', '2026-09-21'],
      ['Olive Oil', 'Oils', 12, 'Liters', 15, 30, 'Low', 'down', 18, 450, 'Mediterranean Gourmet Importers', '2026-09-20'],
      ['Fresh Vegetables', 'Produce', 85, 'Kg', 60, 120, 'Optimal', 'up', 70, 45, 'Fresh Farms Co.', '2026-09-25'],
      ['Toilet Paper', 'Housekeeping', 250, 'Rolls', 200, 500, 'Optimal', 'stable', 80, 12, 'CleanLiving Supplies', '2026-09-22'],
      ['Shampoo Bottles', 'Amenities', 45, 'Units', 100, 250, 'Low', 'down', 60, 85, 'Botanica Luxury Toiletries', '2026-09-19'],
      ['Pool Chemicals', 'Maintenance', 8, 'Kg', 20, 40, 'Critical', 'stable', 15, 320, 'Chemical Supplies Ltd', '2026-09-18']
    ];

    for (const item of invItemsList) {
      insertInv.run(...item);
    }

    const insertPO = db.prepare(`
      INSERT INTO purchase_orders (id, supplier, items_count, total_amount, numeric_amount, status, expected_date, created_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertPO.run('PO-2024-156', 'Fresh Farms Co.', 12, '₹45,200', 45200, 'Pending', '27 Sept 2026', '2026-09-25T14:30:00Z', 'Daily farm fresh fruit & organic vegetables');
    insertPO.run('PO-2024-157', 'Meat Masters', 5, '₹28,750', 28750, 'Approved', '27 Sept 2026', '2026-09-25T16:00:00Z', 'Poultry cuts and premium tenderloins');
    insertPO.run('PO-2024-158', 'Chemical Supplies Ltd', 3, '₹12,400', 12400, 'Shipped', '26 Sept 2026', '2026-09-24T11:15:00Z', 'Pool shock chlorine and pH buffer canisters');

    const insertInsight = db.prepare(`
      INSERT INTO inventory_insights (id, priority, title, description, recommendation, savings, status, action_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertInsight.run(1, 'Critical', 'Milk Stock Depletion', 'Only 45L remaining. 25L shortage predicted by tomorrow morning due to 86% occupancy breakfast service.', 'Expedite emergency order from backup supplier', 'Prevent ₹8,500 revenue loss', 'active', 'order_milk');
    insertInsight.run(2, 'High', 'Chicken Demand Spike', 'Weekend buffet booking increased demand forecast by 40%. Current stock insufficient.', 'Increase meat order by 15kg for Friday delivery', 'Avoid menu compromises', 'active', 'increase_chicken');
    insertInsight.run(3, 'Medium', 'Bulk Purchase Opportunity', 'Rice consumption stable across all 129 occupied rooms. Buying 500kg would secure 12% discount from supplier.', 'Consider bulk purchase before month-end', 'Save ₹4,200 monthly', 'active', 'bulk_rice');
  }
}

