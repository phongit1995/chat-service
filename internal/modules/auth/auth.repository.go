package auth

import (
	"chat-server/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) FindByEmail(email string) (*models.User, error) {
	var user models.User
	err := r.db.Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *Repository) FindByUsername(username string) (*models.User, error) {
	var user models.User
	err := r.db.Where("username = ?", username).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *Repository) Create(user *models.User) error {
	return r.db.Create(user).Error
}

func (r *Repository) FindByID(id uuid.UUID) (*models.User, error) {
	var user models.User
	err := r.db.First(&user, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *Repository) UpdatePassword(userID uuid.UUID, hashedPassword string) error {
	return r.db.Model(&models.User{}).
		Where("id = ?", userID).
		Update("password", hashedPassword).Error
}

func (r *Repository) UpdateLoginInfo(userID uuid.UUID, ip, refreshToken string) error {
	now := gorm.Expr("NOW()")
	return r.db.Model(&models.User{}).
		Where("id = ?", userID).
		Updates(map[string]interface{}{
			"last_login_ip":  ip,
			"last_login_at":  now,
			"refresh_token":  refreshToken,
		}).Error
}

func (r *Repository) UpdateRefreshToken(userID uuid.UUID, refreshToken string) error {
	return r.db.Model(&models.User{}).
		Where("id = ?", userID).
		Update("refresh_token", refreshToken).Error
}

func (r *Repository) ClearRefreshToken(userID uuid.UUID) error {
	return r.db.Model(&models.User{}).
		Where("id = ?", userID).
		Update("refresh_token", "").Error
}
