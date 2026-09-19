# Vireo Testing Checklist

## Setup Required

### 1. Environment Variables
Create a `.env.local` file in the root directory with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get these from your Supabase project settings: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api

### 2. Database Setup
Run these SQL commands in your Supabase SQL editor to create the required tables:

```sql
-- Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  theme_prefs JSONB DEFAULT '{"theme": "system"}',
  dashboard_layout JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Todos table
CREATE TABLE todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  is_complete BOOLEAN DEFAULT FALSE,
  due_date DATE,
  priority TEXT DEFAULT 'medium',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar events table
CREATE TABLE calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  color TEXT DEFAULT 'lime',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journal entries table
CREATE TABLE journal_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  entry_date DATE NOT NULL UNIQUE,
  content TEXT,
  mood INTEGER CHECK (mood >= 1 AND mood <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habits table
CREATE TABLE habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'leaf',
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  tree_stage INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habit logs table
CREATE TABLE habit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID REFERENCES habits(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  completed_at DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(habit_id, completed_at)
);

-- Pomodoro sessions table
CREATE TABLE pomodoro_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  session_type TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routines table
CREATE TABLE routines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  steps JSONB NOT NULL,
  scheduled_days TEXT[] DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for todos
CREATE POLICY "Users can view own todos" ON todos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own todos" ON todos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own todos" ON todos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own todos" ON todos FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for calendar_events
CREATE POLICY "Users can view own events" ON calendar_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON calendar_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON calendar_events FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for journal_entries
CREATE POLICY "Users can view own entries" ON journal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own entries" ON journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own entries" ON journal_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own entries" ON journal_entries FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for habits
CREATE POLICY "Users can view own habits" ON habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habits" ON habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habits" ON habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habits" ON habits FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for habit_logs
CREATE POLICY "Users can view own habit logs" ON habit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habit logs" ON habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own habit logs" ON habit_logs FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for pomodoro_sessions
CREATE POLICY "Users can view own sessions" ON pomodoro_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON pomodoro_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for routines
CREATE POLICY "Users can view own routines" ON routines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own routines" ON routines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own routines" ON routines FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own routines" ON routines FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3. Authentication Setup
In your Supabase dashboard:
1. Go to Authentication → Providers
2. Enable Google OAuth
3. Enable Twitter/X OAuth (optional)
4. Configure redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/`

## Running the App

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Features to Test

### ✅ Landing Page (/)
- [ ] Page loads without errors
- [ ] Dark/light theme toggle works
- [ ] Google sign-in button works
- [ ] X (Twitter) sign-in button works
- [ ] Dashboard preview animation
- [ ] Responsive on mobile/tablet/desktop

### ✅ Dashboard (/dashboard)
- [ ] Redirects to landing if not authenticated
- [ ] Sidebar loads and collapses/expands
- [ ] Theme toggle in sidebar works
- [ ] All default cards appear:
  - [ ] Todo Card
  - [ ] Calendar Card
  - [ ] Journal Card
  - [ ] Habits Card
  - [ ] Pomodoro Card
  - [ ] Routines Card
- [ ] Add card button shows card picker
- [ ] Remove card (X) button works
- [ ] Card layout persists after refresh

### ✅ Todo Card
- [ ] Create new todo
- [ ] Mark todo as complete
- [ ] Delete todo
- [ ] Set due date
- [ ] Priority selection
- [ ] Reorder todos (edit mode)
- [ ] Completion celebration animation

### ✅ Calendar Card
- [ ] Month navigation (prev/next)
- [ ] Today button returns to current month
- [ ] Click date to add event
- [ ] Event appears on correct date
- [ ] Delete event
- [ ] Real-time updates (if multiple tabs open)

### ✅ Journal Card
- [ ] Create entry for today
- [ ] Mood selection (1-5)
- [ ] Text content saves
- [ ] Auto-saves on blur
- [ ] Only one entry per day

### ✅ Habits Card
- [ ] Create new habit
- [ ] Mark habit complete for today
- [ ] Undo completion
- [ ] Streak counter updates
- [ ] Link to forest view

### ✅ Habits Forest (/habits/forest)
- [ ] Tree SVGs render based on streaks
- [ ] Trees grow with higher streaks
- [ ] Click to toggle completion
- [ ] Date selector works
- [ ] Today button works
- [ ] Refresh button recalculates streaks
- [ ] Stats summary displays correctly
- [ ] Legend shows growth stages

### ✅ Pomodoro Card
- [ ] Timer starts/pauses
- [ ] Mode switcher (Focus/Short/Long)
- [ ] Visual countdown
- [ ] Session logged on completion
- [ ] Reset timer

### ✅ Routines Card
- [ ] Create routine with steps
- [ ] Schedule days selection
- [ ] Delete routine
- [ ] Run routine (guided execution)
- [ ] Step-by-step timer

### ✅ Settings Page (/settings)
- [ ] Profile loads
- [ ] Update display name
- [ ] Upload avatar
- [ ] Remove avatar
- [ ] Timezone selection
- [ ] Theme preference (System/Light/Dark)
- [ ] Save settings button
- [ ] Reset dashboard layout
- [ ] Disconnect account

### ✅ Theme Persistence
- [ ] Toggle theme in sidebar
- [ ] Theme persists on refresh
- [ ] Theme syncs with settings page
- [ ] System preference detection

### ✅ Responsive Design
Test on these breakpoints:
- [ ] Mobile (< 640px)
- [ ] Tablet (640px - 1024px)
- [ ] Desktop (> 1024px)

### ✅ Authentication Flow
- [ ] Sign in with Google
- [ ] Sign in with X/Twitter
- [ ] Session persists on refresh
- [ ] Sign out works
- [ ] Protected routes redirect when signed out

### ✅ Data Persistence
- [ ] All data persists across refreshes
- [ ] Data isolated per user (RLS working)
- [ ] Dashboard layout persists
- [ ] Theme preference persists

## Known Issues to Check
- [ ] No console errors in browser dev tools
- [ ] No TypeScript errors in terminal
- [ ] All Supabase queries succeed
- [ ] Real-time subscriptions work

## Performance Checks
- [ ] Initial load time acceptable
- [ ] No unnecessary re-renders
- [ ] Smooth animations (60fps)
- [ ] Fast card operations

## Accessibility
- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] ARIA labels present
- [ ] Screen reader friendly

---

## Quick Start Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Run linting
npm run lint
```

## Database Backup
Remember to backup your Supabase database before testing destructive operations.
