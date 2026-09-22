CREATE TABLE IF NOT EXISTS subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(190) NOT NULL,
  UNIQUE KEY subjects_title_unique (title),
  weight TINYINT NOT NULL DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS topics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  title VARCHAR(190) NOT NULL,
  priority TINYINT NOT NULL DEFAULT 3,
  mastery TINYINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY topics_subject_title_unique (subject_id, title),
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS study_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  topic_id INT NULL,
  studied_on DATE NOT NULL,
  minutes INT NOT NULL,
  activity ENUM('study','test','review','analysis','summary') NOT NULL DEFAULT 'study',
  focus_score TINYINT NOT NULL DEFAULT 3,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  due_on DATE NOT NULL,
  scope ENUM('daily','weekly','long') NOT NULL DEFAULT 'daily',
  subject_id INT NULL,
  topic_id INT NULL,
  title VARCHAR(255) NOT NULL,
  target_minutes INT NOT NULL DEFAULT 0,
  status ENUM('todo','done','missed') NOT NULL DEFAULT 'todo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_type ENUM('topic','flashcard','error') NOT NULL,
  item_id INT NOT NULL,
  due_on DATE NOT NULL,
  status ENUM('due','done','skipped') NOT NULL DEFAULT 'due',
  recall_score TINYINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NULL,
  topic_id INT NULL,
  body TEXT NOT NULL,
  option_a TEXT NULL,
  option_b TEXT NULL,
  option_c TEXT NULL,
  option_d TEXT NULL,
  correct_option CHAR(1) NULL,
  explanation TEXT NULL,
  source VARCHAR(190) NULL,
  difficulty ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  kind ENUM('conceptual','memory','calculation','mixed') NOT NULL DEFAULT 'conceptual',
  status ENUM('raw','review','approved') NOT NULL DEFAULT 'review',
  times_used INT NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(190) NOT NULL,
  subject_id INT NULL,
  topic_id INT NULL,
  total_questions INT NOT NULL DEFAULT 0,
  correct_answers INT NOT NULL DEFAULT 0,
  duration_seconds INT NOT NULL DEFAULT 0,
  taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exam_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exam_id INT NOT NULL,
  question_id INT NOT NULL,
  selected_option CHAR(1) NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  seconds_spent INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS error_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NULL,
  topic_id INT NULL,
  question_id INT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NULL,
  error_type ENUM('conceptual','memory','careless','time','trap','forgotten') NOT NULL DEFAULT 'conceptual',
  status ENUM('new','review','fixed','repeated') NOT NULL DEFAULT 'new',
  occurred_on DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS flashcards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NULL,
  topic_id INT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  difficulty ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  next_review_on DATE NULL,
  created_by ENUM('manual','ai') NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_threads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(190) NOT NULL,
  subject_id INT NULL,
  topic_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  thread_id INT NOT NULL,
  role ENUM('user','assistant') NOT NULL,
  body MEDIUMTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daily_checkins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  checked_on DATE NOT NULL UNIQUE,
  energy TINYINT NOT NULL DEFAULT 3,
  focus TINYINT NOT NULL DEFAULT 3,
  sleep_hours DECIMAL(3,1) NOT NULL DEFAULT 7.0,
  stress TINYINT NOT NULL DEFAULT 3,
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NULL,
  topic_id INT NULL,
  minutes INT NOT NULL DEFAULT 25,
  status ENUM('completed','abandoned') NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO subjects (title, weight) VALUES
('بیوشیمی', 5),
('زیست‌شناسی سلولی و مولکولی', 5),
('ژنتیک', 4),
('میکروبیولوژی', 4),
('بیوتکنولوژی', 5)
ON DUPLICATE KEY UPDATE title = title;

INSERT INTO topics (subject_id, title, priority, mastery)
SELECT s.id, t.title, t.priority, 20
FROM subjects s
JOIN (
  SELECT 'بیوشیمی' subject_title, 'آنزیم‌ها و سینتیک آنزیمی' title, 5 priority UNION ALL
  SELECT 'بیوشیمی', 'متابولیسم کربوهیدرات‌ها', 5 UNION ALL
  SELECT 'زیست‌شناسی سلولی و مولکولی', 'همانندسازی و رونویسی', 5 UNION ALL
  SELECT 'زیست‌شناسی سلولی و مولکولی', 'ترجمه و تنظیم بیان ژن', 5 UNION ALL
  SELECT 'ژنتیک', 'ژنتیک مندلی و جمعیت', 4 UNION ALL
  SELECT 'میکروبیولوژی', 'رشد و کنترل میکروارگانیسم‌ها', 4 UNION ALL
  SELECT 'بیوتکنولوژی', 'کلونینگ و وکتورها', 5 UNION ALL
  SELECT 'بیوتکنولوژی', 'PCR و روش‌های مولکولی', 5
) t ON t.subject_title = s.title
ON DUPLICATE KEY UPDATE title = title;
