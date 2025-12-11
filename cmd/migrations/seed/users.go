package seed

import (
	"database/sql"
	"fmt"
	"log"
	"math/rand"
	"time"

	"golang.org/x/crypto/bcrypt"
)

var (
	firstNames = []string{
		"James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
		"William", "Barbara", "David", "Elizabeth", "Richard", "Susan", "Joseph", "Jessica",
		"Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
		"Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
		"Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
		"Kenneth", "Dorothy", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa",
		"Edward", "Deborah", "Ronald", "Stephanie", "Timothy", "Rebecca", "Jason", "Sharon",
		"Jeffrey", "Laura", "Ryan", "Cynthia", "Jacob", "Kathleen", "Gary", "Amy",
		"Nicholas", "Shirley", "Eric", "Angela", "Jonathan", "Helen", "Stephen", "Anna",
		"Larry", "Brenda", "Justin", "Pamela", "Scott", "Nicole", "Brandon", "Emma",
		"Benjamin", "Samantha", "Samuel", "Katherine", "Raymond", "Christine", "Gregory", "Debra",
		"Frank", "Rachel", "Alexander", "Catherine", "Patrick", "Carolyn", "Jack", "Janet",
		"Dennis", "Ruth", "Jerry", "Maria", "Tyler", "Heather", "Aaron", "Diane",
	}

	lastNames = []string{
		"Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
		"Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
		"Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
		"Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young",
		"Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
		"Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
		"Carter", "Roberts", "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker",
		"Cruz", "Edwards", "Collins", "Reyes", "Stewart", "Morris", "Morales", "Murphy",
		"Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper", "Peterson", "Bailey",
		"Reed", "Kelly", "Howard", "Ramos", "Kim", "Cox", "Ward", "Richardson",
		"Watson", "Brooks", "Chavez", "Wood", "James", "Bennett", "Gray", "Mendoza",
		"Ruiz", "Hughes", "Price", "Alvarez", "Castillo", "Sanders", "Patel", "Myers",
		"Long", "Ross", "Foster", "Jimenez",
	}

	avatarColors = []string{
		"FF6B6B", "4ECDC4", "45B7D1", "FFA07A", "98D8C8",
		"F7DC6F", "BB8FCE", "85C1E2", "F8B739", "52B788",
		"E63946", "457B9D", "A8DADC", "F1FAEE", "E76F51",
	}
)

func SeedUsers(db *sql.DB, count int) error {
	log.Printf("🌱 Seeding %d test users...\n", count)

	rand.Seed(time.Now().UnixNano())

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}

	successCount := 0
	skipCount := 0

	for i := 1; i <= count; i++ {
		email := fmt.Sprintf("test%d@gmail.com", i)
		username := fmt.Sprintf("test%d", i)
		fullName := generateRandomName()
		avatar := generateAvatar(fullName)

		query := `
			INSERT INTO users (username, email, password, full_name, avatar, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			ON CONFLICT (email) DO NOTHING
		`

		result, err := tx.Exec(
			query,
			username,
			email,
			string(hashedPassword),
			fullName,
			avatar,
			time.Now(),
			time.Now(),
		)

		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to insert user %d: %w", i, err)
		}

		rowsAffected, _ := result.RowsAffected()
		if rowsAffected > 0 {
			successCount++
		} else {
			skipCount++
		}

		if i%10 == 0 {
			log.Printf("   Progress: %d/%d users processed...", i, count)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	log.Println()
	log.Printf("✅ Created: %d users", successCount)
	if skipCount > 0 {
		log.Printf("⏭️  Skipped: %d users (already exist)", skipCount)
	}

	return nil
}

func generateRandomName() string {
	firstName := firstNames[rand.Intn(len(firstNames))]
	lastName := lastNames[rand.Intn(len(lastNames))]
	return fmt.Sprintf("%s %s", firstName, lastName)
}

func generateAvatar(name string) string {
	color := avatarColors[rand.Intn(len(avatarColors))]
	return fmt.Sprintf("https://ui-avatars.com/api/?name=%s&background=%s&color=fff&size=200", name, color)
}
