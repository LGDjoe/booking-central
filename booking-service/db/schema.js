import {sqliteTable,text,integer,index,uniqueIndex} from 'drizzle-orm/sqlite-core';
export const administrators=sqliteTable('administrators',{id:integer('id').primaryKey(),userId:text('user_id').notNull(),email:text('email').notNull(),createdAt:text('created_at').notNull()});
export const bookings=sqliteTable('bookings',{
 id:text('id').primaryKey(),reference:text('reference').notNull(),userId:text('user_id').notNull(),requestKey:text('request_key').notNull(),fingerprint:text('fingerprint').notNull(),
 venueId:integer('venue_id').notNull(),venueName:text('venue_name').notNull(),facilityId:integer('facility_id').notNull(),facilityName:text('facility_name').notNull(),
 customerName:text('customer_name').notNull(),email:text('email').notNull(),phone:text('phone').notNull(),
 bookingDate:text('booking_date').notNull(),startMinute:integer('start_minute').notNull(),endMinute:integer('end_minute').notNull(),timezone:text('timezone').notNull(),
 notes:text('notes').notNull().default(''),status:text('status').notNull().default('pending'),courtName:text('court_name'),courtKey:text('court_key'),adminNote:text('admin_note').notNull().default(''),
 version:integer('version').notNull().default(1),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()
},t=>[uniqueIndex('bookings_reference_unique').on(t.reference),uniqueIndex('bookings_user_request_unique').on(t.userId,t.requestKey),index('bookings_user_created').on(t.userId,t.createdAt),index('bookings_status_created').on(t.status,t.createdAt),index('bookings_court_date').on(t.venueId,t.courtKey,t.bookingDate,t.status)]);
export const bookingEvents=sqliteTable('booking_events',{id:text('id').primaryKey(),bookingId:text('booking_id').notNull().references(()=>bookings.id),actorId:text('actor_id').notNull(),action:text('action').notNull(),createdAt:text('created_at').notNull()});
