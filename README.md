# VDH Queuing System (Hospital Queuing & Dispatch)

The **VDH Queuing System** is a real-time, full-stack web application designed to streamline patient flow in medical facilities. It features dedicated portals for front-desk staff, dispatchers, and patients, along with a high-visibility public display for waiting areas.

## 🚀 Key Features

### 1. Front Desk Portal (`/front-desk`)
- **Quick Registration**: Register patients for specific services (Animal Bite, Prenatal, Medicine).
- **Ticket Generation**: Automatically prints/generates a ticket with a QR code.
- **Capacity Management**: Blocks registration when daily limits are reached.

### 2. Dispatcher Hub (`/dispatcher`)
- **Live Queue Management**: Real-time view of waiting and serving lists.
- **Smart Dispatching**: "Call Next" button triggers instant updates across all screens.
- **Limit Safeguards**: Prevents setting capacity limits lower than current registrations.
- **Reset/Undo**: One-click reset for daily counters or undoing accidental calls.

### 3. Patient Portal (Mobile) (`/register?id=...`)
- **Live Status Tracking**: Patients scan a QR code to see their exact position in line.
- **Smart Notifications**: 
    - "Heads Up": Alerts when 3 people are ahead.
    - "Your Turn": Full-screen alarm and vibration when called.
- **Responsive Design**: Optimized for all mobile devices.

### 4. Public Display (`/display`)
- **High-Visibility Dashboard**: Designed for large TV screens in waiting areas.
- **Real-Time Updates**: Instantly reflects queue changes without refreshing.
- **Audio Cues**: Chime sound when a new number is called.

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Actions)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL + Realtime)
- **Notifications**: [OneSignal](https://onesignal.com/) (Web Push)
- **Icons**: [Lucide React](https://lucide.dev/)
- **QR Codes**: `react-qr-code`

## 📦 Setup Instructions

### 1. Prerequisites
- Node.js 18+ installed.
- A Supabase project.
- A OneSignal project.

### 2. Environment Variables
Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_ONESIGNAL_APP_ID=your_onesignal_app_id
ONESIGNAL_APP_ID=your_onesignal_app_id
ONESIGNAL_REST_API_KEY=your_onesignal_rest_api_key
```

### 3. Database Schema
Run the following SQL in your Supabase SQL Editor:

```sql
-- 1. Create Settings Table
CREATE TABLE queue_settings (
    category TEXT PRIMARY KEY CHECK (category IN ('Animal Bite', 'Prenatal', 'Medicine')),
    max_limit INT DEFAULT 100,
    is_open BOOLEAN DEFAULT TRUE,
    last_reset_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Settings Table (Insert Defaults if empty)
INSERT INTO queue_settings (category, max_limit, is_open) 
VALUES ('Animal Bite', 100, TRUE), ('Prenatal', 100, TRUE), ('Medicine', 100, TRUE)
ON CONFLICT (category) DO NOTHING;

-- 3. Create Queue Table
CREATE TABLE queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT,
    category TEXT NOT NULL CHECK (category IN ('Animal Bite', 'Prenatal', 'Medicine')),
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'serving', 'completed')),
    push_user_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE queue;
ALTER PUBLICATION supabase_realtime ADD TABLE queue_settings;

-- 5. Ticket Number Generator Trigger
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
    prefix TEXT;
    seq_num INT;
    reset_time TIMESTAMPTZ;
BEGIN
    IF NEW.category = 'Animal Bite' THEN prefix := 'AB';
    ELSIF NEW.category = 'Prenatal' THEN prefix := 'PN';
    ELSIF NEW.category = 'Medicine' THEN prefix := 'MD';
    END IF;

    SELECT last_reset_at INTO reset_time FROM queue_settings WHERE category = NEW.category;
    IF reset_time IS NULL THEN reset_time := CURRENT_DATE; END IF;

    -- Count ONLY tickets created AFTER the last reset
    SELECT COUNT(*) + 1 INTO seq_num 
    FROM queue 
    WHERE category = NEW.category 
    AND created_at > reset_time;

    NEW.ticket_number := prefix || '-' || LPAD(seq_num::text, 2, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_ticket_number
BEFORE INSERT ON queue
FOR EACH ROW
EXECUTE FUNCTION generate_ticket_number();
```

### 4. Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.
