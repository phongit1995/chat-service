package user

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

func (r *Repository) FindByID(id uuid.UUID) (*models.User, error) {
	var user models.User
	err := r.db.First(&user, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *Repository) Update(user *models.User) error {
	return r.db.Save(user).Error
}

func (r *Repository) Search(query string, limit int, excludeUserID *uuid.UUID) ([]*models.User, error) {
	var users []*models.User

	db := r.db.Where("username ILIKE ? OR full_name ILIKE ? OR email ILIKE ?",
		"%"+query+"%", "%"+query+"%", "%"+query+"%")

	if excludeUserID != nil {
		db = db.Where("id != ?", *excludeUserID)
	}

	err := db.Limit(limit).Order("username ASC").Find(&users).Error
	if err != nil {
		return nil, err
	}

	return users, nil
}
