CREATE TABLE IF NOT EXISTS class_enrollment (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  class_id INT NOT NULL,
  simulated_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_class_enrollment_user_class (user_id, class_id),
  KEY ix_class_enrollment_class_created (class_id, created_at),
  KEY ix_class_enrollment_created (created_at),
  CONSTRAINT fk_class_enrollment_user
    FOREIGN KEY (user_id) REFERENCES `user` (id) ON DELETE CASCADE,
  CONSTRAINT fk_class_enrollment_class
    FOREIGN KEY (class_id) REFERENCES `class` (idclass) ON DELETE CASCADE
) ENGINE=InnoDB;
