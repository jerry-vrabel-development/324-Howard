# Supabase setup

The hosted backend: database, photo storage and sign-in. The website talks to it with a
**publishable key**, which is safe to ship in public code. What each person can see or change
is enforced by the database's Row Level Security policies in `migrations/0001_init.sql`.

## 1. Create the project

1. Sign up at [supabase.com](https://supabase.com) and click **New project**.
2. Name it `324-howard`, pick the US region closest to you, and generate a strong database
   password. Save the password in your password manager; you won't need it day to day.

## 2. Create the tables and permissions

1. Open **SQL Editor → New query**.
2. Paste the whole of `migrations/0001_init.sql` and click **Run**.
3. You should see "Success. No rows returned". Under **Table Editor** you'll now have
   `profiles`, `photos`, `tasks`, `task_comments`, `work_sessions` and `journal_entries`, and
   under **Storage** a public bucket called `photos`.

Run the file once only; running it again fails because the tables already exist.

## 3. Lock down sign-ups and set the site address

Under **Authentication**:

- **Sign In / Providers**: keep **Email** enabled, and turn **off** "Allow new users to sign up".
  Only people you invite can sign in.
- **URL Configuration**:
  - **Site URL**: `https://jerry-vrabel-development.github.io/324-Howard/`
  - **Redirect URLs**: add `https://jerry-vrabel-development.github.io/324-Howard/**` and
    `http://localhost:5173/**`

Sign-in links in emails only work for addresses listed here.

**Emails → Magic Link** (optional but recommended): add a line with the code, for example
`Or enter this code on the site: {{ .Token }}`. The link signs in whichever browser opens
it; the code lets you request a link on your laptop and finish signing in there after
reading the email on your phone.

## 4. Add yourself as admin

1. **Authentication → Users → Add user → Send invitation**, with your email. Accept the email.
2. In **SQL Editor**, run (with your email):

   ```sql
   insert into public.profiles (id, display_name, role)
   select id, 'Jerry', 'admin' from auth.users where email = 'you@example.com';
   ```

Signing in by itself grants nothing. Access comes from this row.

## 5. Add the landowner (when ready)

Same as step 4 with their email, their name, and `'landowner'` as the role. They can then
read tasks and hours, request new tasks, comment, and see all photos and journal entries.
They can't edit your tasks, log time, or upload photos.

To remove someone: **Authentication → Users → … → Delete user**. Their profile row is
removed with them.

## 6. Get the keys for the website

**Project Settings → API Keys**:

- **Project URL** (`https://xxxx.supabase.co`)
- **Publishable key** (`sb_publishable_…`)

Both are public by design. **Never** copy the secret key (`sb_secret_…`) or the legacy
`service_role` key into the website, `.env` files, or GitHub: they bypass every permission.

## Permissions summary

|                      | Visitors       | Landowner                                | Admin                       |
| -------------------- | -------------- | ---------------------------------------- | --------------------------- |
| Photos, journal      | Published only | All, read-only                           | Everything                  |
| Tasks                | —              | Read; request new; edit pending requests | Everything                  |
| Comments / feedback  | —              | Read; write and edit own                 | Read; write own; delete any |
| Work sessions (time) | —              | Read                                     | Everything                  |
| Photo uploads        | —              | —                                        | Upload, replace, delete     |

Photo files are served from a public bucket, so anyone with a file's exact URL can view it,
even for an unpublished entry. File names are random, so they can't be guessed.
