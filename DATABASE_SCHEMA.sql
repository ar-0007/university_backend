-- Database Schema for University Learning Platform
-- Complete schema based on GraphQL types and backend structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    salt VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
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

-- Instructors table
CREATE TABLE IF NOT EXISTS instructors (
    instructor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
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
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- Chapter Progress table
CREATE TABLE IF NOT EXISTS chapter_progress (
    progress_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES chapters(chapter_id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, chapter_id)
);

-- Video Progress table for detailed video tracking
CREATE TABLE IF NOT EXISTS video_progress (
    video_progress_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(chapter_id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    current_position DECIMAL(10, 2) DEFAULT 0 CHECK (current_position >= 0),
    total_duration DECIMAL(10, 2) DEFAULT 0 CHECK (total_duration >= 0),
    watch_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (watch_percentage >= 0 AND watch_percentage <= 100),
    is_completed BOOLEAN DEFAULT false,
    last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, course_id, video_url)
);

-- User Chapter Access table (tracks which chapters are unlocked for each user)
CREATE TABLE IF NOT EXISTS user_chapter_access (
    access_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES chapters(chapter_id) ON DELETE CASCADE,
    is_unlocked BOOLEAN DEFAULT true,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, chapter_id)
);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(course_id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(chapter_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deadline TIMESTAMP WITH TIME ZONE,
    assignment_file_url TEXT,
    max_score DECIMAL(5, 2) DEFAULT 100 CHECK (max_score >= 0),
    due_date TIMESTAMP WITH TIME ZONE,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK ((course_id IS NOT NULL AND chapter_id IS NULL) OR (course_id IS NULL AND chapter_id IS NOT NULL))
);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
    submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(assignment_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    cloudinary_url TEXT NOT NULL,
    feedback TEXT,
    grade DECIMAL(5, 2) CHECK (grade >= 0 AND grade <= 100),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    graded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assignment_id, user_id)
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
    quiz_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES chapters(chapter_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    questions_data JSONB NOT NULL, -- Array of questions with options and answers
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz Attempts table
CREATE TABLE IF NOT EXISTS quiz_attempts (
    attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    answers_data JSONB NOT NULL,
    score DECIMAL(5, 2) NOT NULL CHECK (score >= 0 AND score <= 100),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mentorship Slots table
CREATE TABLE IF NOT EXISTS mentorship_slots (
    slot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_booked BOOLEAN DEFAULT false,
    booked_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    price DECIMAL(10, 2) DEFAULT 0 CHECK (price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (end_time > start_time)
);

-- Mentorship Bookings table
CREATE TABLE IF NOT EXISTS mentorship_bookings (
    booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id UUID NOT NULL REFERENCES mentorship_slots(slot_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED')),
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    zoom_link TEXT,
    booked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(slot_id, user_id)
);

-- Payments table (Full payments only - no installments)
CREATE TABLE IF NOT EXISTS payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(course_id) ON DELETE SET NULL,
    mentorship_slot_id UUID REFERENCES mentorship_slots(slot_id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    payment_method VARCHAR(20) NOT NULL DEFAULT 'stripe',
    payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK ((course_id IS NOT NULL AND mentorship_slot_id IS NULL) OR (course_id IS NULL AND mentorship_slot_id IS NOT NULL))
);



-- Podcasts table
CREATE TABLE IF NOT EXISTS podcasts (
    podcast_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    video_url TEXT, -- Cloudinary URL
    thumbnail_url TEXT,
    duration INTEGER, -- Duration in seconds
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_at TIMESTAMP WITH TIME ZONE, -- When the podcast should be published
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    plays_count INTEGER DEFAULT 0
);

-- Podcast Likes table (for tracking individual user likes)
CREATE TABLE IF NOT EXISTS podcast_likes (
    like_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    podcast_id UUID NOT NULL REFERENCES podcasts(podcast_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(podcast_id, user_id)
);


-- Marketing Contacts table
CREATE TABLE IF NOT EXISTS marketing_contacts (
    contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_number VARCHAR(20) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guest Bookings table (for non-registered users)
CREATE TABLE IF NOT EXISTS guest_bookings (
    guest_booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID NOT NULL REFERENCES instructors(instructor_id) ON DELETE CASCADE,
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    preferred_date DATE NOT NULL,
    preferred_time TIME NOT NULL,
    message TEXT,
    preferred_topics TEXT[],
    session_price DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'CANCELLED')),
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    meeting_link TEXT,
    booking_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (booking_status IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guest Course Purchases table
CREATE TABLE IF NOT EXISTS guest_course_purchases (
    purchase_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    course_price DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED')),
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    access_code VARCHAR(50) UNIQUE, -- Unique access code for course access
    access_expires_at TIMESTAMP WITH TIME ZONE, -- When access expires (optional)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);





-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published);
CREATE INDEX IF NOT EXISTS idx_chapters_course_id ON chapters(course_id);
CREATE INDEX IF NOT EXISTS idx_chapters_order ON chapters(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_chapter_media_chapter_id ON chapter_media(chapter_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_chapter_progress_user_id ON chapter_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_chapter_progress_chapter_id ON chapter_progress(chapter_id);
CREATE INDEX IF NOT EXISTS idx_user_chapter_access_user_id ON user_chapter_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_chapter_access_chapter_id ON user_chapter_access(chapter_id);
CREATE INDEX IF NOT EXISTS idx_user_chapter_access_unlocked ON user_chapter_access(user_id, is_unlocked);
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_chapter_id ON assignments(chapter_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_chapter_id ON quizzes(chapter_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_slots_mentor ON mentorship_slots(mentor_user_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_slots_booked ON mentorship_slots(is_booked);
CREATE INDEX IF NOT EXISTS idx_mentorship_bookings_slot_id ON mentorship_bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_bookings_user_id ON mentorship_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_course_id ON payments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_mentorship_slot_id ON payments(mentorship_slot_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_intent_id ON payments(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

CREATE INDEX IF NOT EXISTS idx_podcasts_published_at ON podcasts(published_at);
CREATE INDEX IF NOT EXISTS idx_podcasts_status ON podcasts(status);
CREATE INDEX IF NOT EXISTS idx_podcasts_views ON podcasts(views_count DESC);
CREATE INDEX IF NOT EXISTS idx_podcasts_likes ON podcasts(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_podcast_likes_podcast_id ON podcast_likes(podcast_id);
CREATE INDEX IF NOT EXISTS idx_podcast_likes_user_id ON podcast_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_podcast_likes_unique ON podcast_likes(podcast_id, user_id);
CREATE INDEX IF NOT EXISTS idx_guest_bookings_instructor ON guest_bookings(instructor_id);
CREATE INDEX IF NOT EXISTS idx_guest_bookings_email ON guest_bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_guest_bookings_payment_status ON guest_bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_guest_bookings_booking_status ON guest_bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_guest_bookings_created_at ON guest_bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_guest_course_purchases_course ON guest_course_purchases(course_id);
CREATE INDEX IF NOT EXISTS idx_guest_course_purchases_email ON guest_course_purchases(customer_email);
CREATE INDEX IF NOT EXISTS idx_guest_course_purchases_payment_status ON guest_course_purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_guest_course_purchases_access_code ON guest_course_purchases(access_code);
CREATE INDEX IF NOT EXISTS idx_guest_course_purchases_created_at ON guest_course_purchases(created_at);

-- Update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create update triggers for all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON chapters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chapter_media_updated_at BEFORE UPDATE ON chapter_media FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chapter_progress_updated_at BEFORE UPDATE ON chapter_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_video_progress_updated_at BEFORE UPDATE ON video_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_chapter_access_updated_at BEFORE UPDATE ON user_chapter_access FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quiz_attempts_updated_at BEFORE UPDATE ON quiz_attempts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mentorship_slots_updated_at BEFORE UPDATE ON mentorship_slots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mentorship_bookings_updated_at BEFORE UPDATE ON mentorship_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_podcasts_updated_at BEFORE UPDATE ON podcasts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_marketing_contacts_updated_at BEFORE UPDATE ON marketing_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_instructors_updated_at BEFORE UPDATE ON instructors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_guest_bookings_updated_at BEFORE UPDATE ON guest_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_guest_course_purchases_updated_at BEFORE UPDATE ON guest_course_purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();




    -- Migration: Add submission_text column to submissions table
-- This allows submissions to be either file-based (cloudinary_url) or text-based (submission_text)
-- Date: 2024

-- Add the submission_text column to submissions table
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submission_text TEXT;

-- Modify the cloudinary_url column to be nullable (since text submissions won't have files)
ALTER TABLE submissions ALTER COLUMN cloudinary_url DROP NOT NULL;

-- Add a check constraint to ensure either cloudinary_url OR submission_text is provided (but not both)
ALTER TABLE submissions ADD CONSTRAINT submissions_content_check 
    CHECK (
        (cloudinary_url IS NOT NULL AND submission_text IS NULL) OR 
        (cloudinary_url IS NULL AND submission_text IS NOT NULL)
    );

-- Update any existing records if needed (currently none exist)
-- This migration supports both file uploads (images/PDFs) and text submissions

-- Migration: Add answers_data column to quiz_attempts table
-- This stores the user's answers for each quiz attempt
-- Date: 2024

-- Add the answers_data column to quiz_attempts table
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS answers_data JSONB;

-- Update the column to be NOT NULL (after adding it as nullable first)
-- We'll set a default empty JSON object for any existing records
UPDATE quiz_attempts SET answers_data = '{}' WHERE answers_data IS NULL;
ALTER TABLE quiz_attempts ALTER COLUMN answers_data SET NOT NULL;