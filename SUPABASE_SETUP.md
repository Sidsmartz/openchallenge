# Supabase Integration

## Database Schema

The `users` table stores all onboarding data with the following structure:

### Common Fields

- `id` (uuid, primary key)
- `email` (text, unique)
- `role` (text) - 'student', 'faculty', or 'alumni'
- `full_name` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Student Fields

- `program_branch` (text)
- `year_of_study` (text)
- `interests` (text)
- `courses_enrolled` (text)

### Faculty Fields

- `department` (text)
- `subjects_taught` (text)
- `research_interests` (text)
- `office_hours` (text)

### Alumni Fields

- `graduating_batch` (text)
- `current_company` (text)
- `current_job_title` (text)
- `available_for_mentorship` (boolean)

### Preferences

- `theme` (text) - default: 'light'
- `smart_search` (boolean) - default: true
- `ai_summary` (text) - default: 'brief'
- `gamification` (boolean) - default: true

## Environment Variables

Create a `.env.local` file with:

```
NEXT_PUBLIC_SUPABASE_URL=https://fqsqytljezwtfpmegktr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## Usage

The onboarding page automatically saves user data to Supabase when the user completes all steps.

### Example Query

```typescript
import { supabase } from "@/lib/supabase";

// Get all students
const { data, error } = await supabase
  .from("users")
  .select("*")
  .eq("role", "student");
```

## Security

Row Level Security (RLS) is enabled with a policy that allows all operations for testing. In production, you should update the RLS policies to restrict access based on authentication.
