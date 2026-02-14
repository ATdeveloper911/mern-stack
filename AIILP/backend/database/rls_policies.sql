-- Profiles RLS: Users can only view/update their own profile 
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY; 

CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id); 

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id); 

-- Students RLS: Universities can manage (insert/view/update/delete) their own students 
ALTER TABLE students ENABLE ROW LEVEL SECURITY; 

CREATE POLICY "Universities can manage own students" 
ON students FOR ALL 
USING (auth.uid() = university_id) 
WITH CHECK (auth.uid() = university_id); 

-- Internships RLS 
ALTER TABLE internships ENABLE ROW LEVEL SECURITY; 

-- Software houses can insert their own internships 
CREATE POLICY "Software houses can insert own internships" 
ON internships FOR INSERT 
WITH CHECK (auth.uid() = software_house_id); 

-- Admins can update internships (e.g., approve/reject) 
CREATE POLICY "Admins can update internships" 
ON internships FOR UPDATE 
USING ( 
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' 
); 

-- Public can view approved internships only 
CREATE POLICY "Public can view approved internships" 
ON internships FOR SELECT 
USING (status = 'approved'); 

-- CV Forms RLS: Owners can manage their own CV 
ALTER TABLE cv_forms ENABLE ROW LEVEL SECURITY; 

CREATE POLICY "Users can manage own CV" 
ON cv_forms FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id); 

-- Applications RLS 
ALTER TABLE applications ENABLE ROW LEVEL SECURITY; 

-- Applicants can insert their own applications 
CREATE POLICY "Applicants can insert own applications" 
ON applications FOR INSERT 
WITH CHECK (auth.uid() = user_id); 

-- Applicants can view their own applications 
CREATE POLICY "Applicants can view own applications" 
ON applications FOR SELECT 
USING (auth.uid() = user_id); 

-- Software houses can update status on applications for their internships 
CREATE POLICY "Software houses can update application status" 
ON applications FOR UPDATE 
USING ( 
  auth.uid() = (SELECT software_house_id FROM internships WHERE id = internship_id) 
 ) 
WITH CHECK ( 
  auth.uid() = (SELECT software_house_id FROM internships WHERE id = internship_id) 
 ); 

-- Universities can view applications of their students 
CREATE POLICY "Universities can view their students' applications" 
ON applications FOR SELECT 
USING ( 
  auth.uid() = (SELECT university_id FROM profiles WHERE id = user_id) 
 ); 

-- Admin Logs RLS: Admins only 
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY; 

CREATE POLICY "Admins can view logs" 
ON admin_logs FOR SELECT 
USING ( 
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' 
 ); 

CREATE POLICY "Admins can insert logs" 
ON admin_logs FOR INSERT 
WITH CHECK ( 
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' 
 );