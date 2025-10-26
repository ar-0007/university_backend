-- Updated Database Schema for University Learning Platform
-- Fixed field names to match application code (camelCase)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (UPDATED with camelCase field names)
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    salt VARCHAR(255),
    firstName VARCHAR(100) NOT NULL,  -- Changed from first_name
    lastName VARCHAR(100) NOT NULL,   -- Changed from last_name
    role VARCHAR(20) NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT', 'ADMIN', 'GUEST')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (
        (role = 'GUEST' AND password_hash IS NULL AND salt IS NULL) OR
        (role IN ('STUDENT', 'ADMIN') AND password_hash IS NOT NULL AND salt IS NOT NULL)
    )
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    slug VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Instructors table (UPDATED with camelCase field names)
CREATE TABLE IF NOT EXISTS instructors (
    instructor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    firstName VARCHAR(100) NOT NULL,  -- Changed from first_name
    lastName VARCHAR(100) NOT NULL,   -- Changed from last_name
    email VARCHAR(255) UNIQUE NOT NULL,
    bio TEXT,
    profile_image_url TEXT, -- Cloudinary URL
    specialties TEXT[], -- Array of skills/specialties
    experience_years INTEGER DEFAULT 0,
    education TEXT,
    certifications TEXT[],
    hourly_rate DECIMAL(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    course_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT, -- Cloudinary URL
    intro_video_url TEXT, -- Cloudinary URL for intro video
    price DECIMAL(10, 2) DEFAULT 0 CHECK (price >= 0),
    category_id UUID REFERENCES categories(category_id),
    instructor_id UUID REFERENCES instructors(instructor_id) ON DELETE SET NULL,
    duration_hours INTEGER DEFAULT 0,
    level VARCHAR(20) DEFAULT 'BEGINNER' CHECK (level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
    is_published BOOLEAN DEFAULT false,
    video_series VARCHAR(255), -- Name of the video series (e.g., "Car Detailing Masterclass")
    video_part INTEGER DEFAULT 1, -- Part number in the series
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chapters table
CREATE TABLE IF NOT EXISTS chapters (
    chapter_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    is_unlocked_by_default BOOLEAN DEFAULT true, -- All chapters unlocked by default upon course purchase
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, order_index)
);

-- Chapter Media table
CREATE TABLE IF NOT EXISTS chapter_media (
    media_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES chapters(chapter_id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('VIDEO', 'DOCUMENT')),
    cloudinary_url TEXT NOT NULL,
    file_name VARCHAR(255),
    description TEXT,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(chapter_id, order_index)
);

-- Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
    enrollment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completion_date TIMESTAMP WITH TIME ZONE,
    progress_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- User Chapter Access table
CREATE TABLE IF NOT EXISTS user_chapter_access (
    access_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES chapters(chapter_id) ON DELETE CASCADE,
    is_unlocked BOOLEAN DEFAULT false,
    unlocked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, chapter_id)
);

-- Chapter Progress table
CREATE TABLE IF NOT EXISTS chapter_progress (
    progress_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES chapters(chapter_id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    completion_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, chapter_id)
);

-- Video Progress table
CREATE TABLE IF NOT EXISTS video_progress (
    progress_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES chapter_media(media_id) ON DELETE CASCADE,
    watched_duration INTEGER DEFAULT 0, -- in seconds
    total_duration INTEGER DEFAULT 0, -- in seconds
    is_completed BOOLEAN DEFAULT false,
    last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, media_id)
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
    quiz_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES chapters(chapter_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    passing_score INTEGER DEFAULT 70 CHECK (passing_score >= 0 AND passing_score <= 100),
    time_limit INTEGER, -- in minutes, NULL for no time limit
    max_attempts INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz Questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
    question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL DEFAULT 'MULTIPLE_CHOICE' CHECK (question_type IN ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER')),
    points INTEGER DEFAULT 1 CHECK (points > 0),
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(quiz_id, order_index)
);

-- Quiz Answer Options table
CREATE TABLE IF NOT EXISTS quiz_answer_options (
    option_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES quiz_questions(question_id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(question_id, order_index)
);

-- Quiz Submissions table
CREATE TABLE IF NOT EXISTS quiz_submissions (
    submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0 CHECK (score >= 0),
    total_points INTEGER DEFAULT 0 CHECK (total_points >= 0),
    percentage DECIMAL(5, 2) DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
    is_passed BOOLEAN DEFAULT false,
    attempt_number INTEGER DEFAULT 1,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    time_taken INTEGER, -- in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz Submission Answers table
CREATE TABLE IF NOT EXISTS quiz_submission_answers (
    answer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES quiz_submissions(submission_id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES quiz_questions(question_id) ON DELETE CASCADE,
    selected_option_id UUID REFERENCES quiz_answer_options(option_id) ON DELETE SET NULL,
    answer_text TEXT, -- for short answer questions
    is_correct BOOLEAN DEFAULT false,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(submission_id, question_id)
);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES chapters(chapter_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    max_points INTEGER DEFAULT 100 CHECK (max_points > 0),
    submission_type VARCHAR(20) DEFAULT 'FILE' CHECK (submission_type IN ('FILE', 'TEXT', 'URL')),
    allowed_file_types TEXT[], -- e.g., ['pdf', 'doc', 'docx']
    max_file_size INTEGER DEFAULT 10485760, -- 10MB in bytes
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assignment Submissions table
CREATE TABLE IF NOT EXISTS assignment_submissions (
    submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(assignment_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    submission_text TEXT,
    file_url TEXT, -- Cloudinary URL for uploaded files
    file_name VARCHAR(255),
    submission_url TEXT, -- for URL submissions
    status VARCHAR(20) DEFAULT 'SUBMITTED' CHECK (status IN ('DRAFT', 'SUBMITTED', 'GRADED', 'RETURNED')),
    grade INTEGER CHECK (grade >= 0),
    feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    graded_at TIMESTAMP WITH TIME ZONE,
    graded_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assignment_id, user_id)
);

-- Mentorship Slots table
CREATE TABLE IF NOT EXISTS mentorship_slots (
    slot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_slot TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    is_available BOOLEAN DEFAULT true,
    booked_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    booking_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    meeting_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mentor_user_id, date, time_slot)
);

-- Guest Course Purchases table
CREATE TABLE IF NOT EXISTS guest_course_purchases (
    purchase_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    payment_status VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    payment_intent_id VARCHAR(255),
    stripe_session_id VARCHAR(255),
    access_code VARCHAR(50) UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guest Mentorship Bookings table
CREATE TABLE IF NOT EXISTS guest_mentorship_bookings (
    booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID NOT NULL REFERENCES instructors(instructor_id) ON DELETE CASCADE,
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    payment_status VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    payment_intent_id VARCHAR(255),
    stripe_session_id VARCHAR(255),
    access_code VARCHAR(50) UNIQUE,
    notes TEXT,
    meeting_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published);
CREATE INDEX IF NOT EXISTS idx_chapters_course ON chapters(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_chapter_progress_user ON chapter_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_user ON video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_user ON quiz_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_user ON assignment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_slots_mentor ON mentorship_slots(mentor_user_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_slots_date ON mentorship_slots(date);
CREATE INDEX IF NOT EXISTS idx_guest_purchases_email ON guest_course_purchases(customer_email);
CREATE INDEX IF NOT EXISTS idx_guest_bookings_email ON guest_mentorship_bookings(customer_email);

-- Insert default admin user (optional)
-- You can uncomment and modify this if you want to create a default admin
/*
INSERT INTO users (email, password_hash, salt, firstName, lastName, role, is_active) 
VALUES (
    'admin@example.com',
    '$2a$10$example_hash_here', -- Replace with actual bcrypt hash
    'example_salt_here', -- Replace with actual salt
    'Admin',
    'User',
    'ADMIN',
    true
) ON CONFLICT (email) DO NOTHING;
*/