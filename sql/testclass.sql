CREATE TABLE testclass (
  id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  student_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)DEFAULT CHARSET = utf8;
