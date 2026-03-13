CREATE DATABASE pg_rental_system;
USE pg_rental_system;

-- ADMIN

CREATE TABLE admin (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OWNER

CREATE TABLE owner (
    owner_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(120) UNIQUE,
    phone VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- WARDEN

CREATE TABLE warden (
    warden_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(120),
    phone VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GUEST

CREATE TABLE guest (
    guest_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120),
    email VARCHAR(120),
    phone VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TENANT

CREATE TABLE tenant (
    tenant_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(120),
    phone VARCHAR(15),
    username VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PROPERTY

CREATE TABLE property (
    property_id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    warden_id INT UNIQUE,
    property_name VARCHAR(150),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    status ENUM('pending','approved','rejected'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (owner_id) REFERENCES owner(owner_id),
    FOREIGN KEY (warden_id) REFERENCES warden(warden_id)
);
--SMART ROOMMATE MATCHING
CREATE TABLE tenant_preference (
    preference_id INT AUTO_INCREMENT PRIMARY KEY,
    guest_id INT NOT NULL UNIQUE,
    sleep_schedule ENUM(
        'early_bird',
        'night_owl',
        'flexible',
        'very_late'
    ),
    cleanliness_level ENUM(
        'very_clean',
        'moderately_clean',
        'relaxed'
    ),
    smoking_drinking_preference ENUM(
        'non_smoker_non_drinker',
        'non_smoker_occasional_drinker',
        'non_smoker_social_drinker',
        'okay_with_both'
    ),
    food_preference ENUM(
        'vegetarian',
        'non_vegetarian',
        'vegan'
    ),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (guest_id) REFERENCES guest(guest_id)
);

-- ROOMS

CREATE TABLE room (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    room_number VARCHAR(20),
    room_type ENUM('single','double','triple'),
    capacity INT,
    rent DECIMAL(10,2),
    status ENUM('vacant','occupied','maintenance'),
    UNIQUE ( property_id,room_number),
    FOREIGN KEY (property_id) REFERENCES property(property_id)
);

-- BOOKING REQUEST

CREATE TABLE booking_request (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    guest_id INT NOT NULL,
    property_id INT NOT NULL,
    preferred_checkin DATE,
    preferred_checkout DATE,
    status ENUM('pending','approved','rejected'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (guest_id) REFERENCES guest(guest_id),
    FOREIGN KEY (property_id) REFERENCES property(property_id)
);

-- BOOKING

CREATE TABLE booking (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT,
    tenant_id INT NOT NULL,
    room_id INT NOT NULL,
    property_id INT,
    booking_date DATE,
    check_in_date DATE,
    check_out_date DATE,
    status ENUM('confirmed','cancelled'),

    FOREIGN KEY (request_id) REFERENCES booking_request(request_id),
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id),
    FOREIGN KEY (room_id) REFERENCES room(room_id),
    FOREIGN KEY (property_id) REFERENCES property(property_id)
);

-- TENANT STAY

CREATE TABLE tenant_stay (
    stay_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT,
    property_id INT,
    room_id INT,
    check_in_date DATE,
    check_out_date DATE,
    monthly_rent DECIMAL(10,2),
    status ENUM('active','completed','cancelled'),

    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id),
    FOREIGN KEY (property_id) REFERENCES property(property_id),
    FOREIGN KEY (room_id) REFERENCES room(room_id)
);

-- PAYMENTS

CREATE TABLE payment (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT,
    stay_id INT NULL,
    amount DECIMAL(10,2),
    payment_type ENUM('rent','deposit','utility','late_fee'),
    payment_method ENUM('upi','card','netbanking'),
    transaction_id VARCHAR(120),
    payment_status ENUM('pending','paid','failed'),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (booking_id) REFERENCES booking(booking_id),
    FOREIGN KEY (stay_id) REFERENCES tenant_stay(stay_id)
);

-- COMPLAINTS

CREATE TABLE complaint (
    complaint_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT,
    property_id INT,
    room_id INT,
    warden_id INT,
    title VARCHAR(200),
    description TEXT,
    priority ENUM('low','medium','high'),
    status ENUM('open','in_progress','resolved'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id),
    FOREIGN KEY (property_id) REFERENCES property(property_id),
    FOREIGN KEY (room_id) REFERENCES room(room_id),
    FOREIGN KEY (warden_id) REFERENCES warden(warden_id)
);

-- SERVICES

CREATE TABLE service (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(100),
    description TEXT,
    price DECIMAL(10,2)
);

-- PROPERTY SERVICES

CREATE TABLE property_service (
    property_service_id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT,
    service_id INT,

    FOREIGN KEY (property_id) REFERENCES property(property_id),
    FOREIGN KEY (service_id) REFERENCES service(service_id)
);

-- SERVICE REQUEST

CREATE TABLE service_request (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT,
    property_id INT,
    service_id INT,
    request_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('requested','in_progress','completed'),
    notes TEXT,

    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id),
    FOREIGN KEY (property_id) REFERENCES property(property_id),
    FOREIGN KEY (service_id) REFERENCES service(service_id)
);

-- RULE VIOLATIONS

CREATE TABLE rule_violation (
    violation_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT,
    room_id INT,
    violation_type VARCHAR(120),
    severity ENUM('low','medium','high'),
    warning_count INT DEFAULT 0,
    violation_date DATE,

    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id),
    FOREIGN KEY (room_id) REFERENCES room(room_id)
);

-- NOTIFICATIONS

CREATE TABLE notification (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,

    tenant_id INT NULL,
    owner_id INT NULL,
    warden_id INT NULL,
    admin_id INT NULL,

    title VARCHAR(200),
    message TEXT,

    type ENUM('payment','complaint','service','property','system'),
    status ENUM('unread','read'),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id),
    FOREIGN KEY (owner_id) REFERENCES owner(owner_id),
    FOREIGN KEY (warden_id) REFERENCES warden(warden_id),
    FOREIGN KEY (admin_id) REFERENCES admin(admin_id)
)