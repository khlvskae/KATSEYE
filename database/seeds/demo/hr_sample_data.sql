SET app.username = 'demo-data';

INSERT INTO department (deptcode, deptname) VALUES
    ('MKT', 'Marketing')
ON CONFLICT (deptcode) DO NOTHING;

INSERT INTO job (jobcode, jobdesc) VALUES
    ('MKTS', 'Marketing Specialist'),
    ('MKTL', 'Marketing Lead')
ON CONFLICT (jobcode) DO NOTHING;

INSERT INTO employee (empno, lastname, firstname, gender, birthdate, hiredate, sepdate) VALUES
    ('00065', 'Dela Cruz', 'Andrea',  'F', '1994-03-14', '2012-02-01', NULL),
    ('00067', 'Santos',    'Miguel',  'M', '1991-11-02', '2012-02-01', NULL),
    ('00069', 'Reyes',     'Bea',     'F', '1996-07-25', '2013-06-17', NULL),
    ('00071', 'Garcia',    'Paolo',   'M', '1989-01-30', '2012-05-02', '2014-08-29'),
    ('00073', 'Villanueva','Carmela', 'F', '1993-09-09', '2014-01-06', NULL)
ON CONFLICT (empno) DO NOTHING;

INSERT INTO jobhistory (empno, jobcode, effdate, salary, deptcode) VALUES
    ('00065', 'MKTS', '2012-02-01', 42000, 'MKT'),
    ('00065', 'MKTL', '2013-07-01', 58000, 'MKT'),
    ('00067', 'PR1',  '2012-02-01', 48000, 'IT'),
    ('00067', 'ANYS', '2013-03-01', 55000, 'MKT'),
    ('00069', 'CLK1', '2013-06-17', 34000, 'HRD'),
    ('00069', 'CLK1', '2014-06-17', 36000, 'HRD'),
    ('00071', 'SA1',  '2012-05-02', 36000, 'BR1'),
    ('00071', 'SA2',  '2013-05-02', 38000, 'BR1'),
    ('00073', 'HRS',  '2014-01-06', 45000, 'HRD')
ON CONFLICT (empno, jobcode, effdate) DO NOTHING;

RESET app.username;

SELECT empno, firstname, lastname, jobdesc, deptname, salary, job_since, is_employed
  FROM employee_current_job
 WHERE empno IN ('00065', '00067', '00069', '00071', '00073')
 ORDER BY empno;
